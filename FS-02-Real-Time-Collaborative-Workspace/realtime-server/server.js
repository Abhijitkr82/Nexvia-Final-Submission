import "dotenv/config";

import http from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import * as Y from "yjs";

import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";

import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";

import {
  connectDatabase,
  disconnectDatabase,
  prisma,
} from "./config/database.js";

import { authenticateRequest } from "./middleware/authenticate.js";
import { handleInternalRequest, setRestoreHandler } from "./services/versionSnapshots.js";

import {
  getDocument,
  replaceDocument,
  flushAllDocuments,
} from "./services/documentStore.js";

import {
  connectRedisPubSub,
  publishDocumentUpdate,
  publishAwarenessUpdate,
  publishDocumentRestore,
  disconnectRedisPubSub,
} from "./services/redisPubSub.js";

const PORT = Number(process.env.PORT || process.env.REALTIME_PORT || 4000);

const EDIT_ROLES = ["OWNER", "ADMIN", "EDITOR"];

// Remote Redis updates use this origin to prevent republishing.
const REDIS_ORIGIN = Symbol("REDIS_ORIGIN");

let redisReady = false;

const server = http.createServer(async (request, response) => {
  if (await handleInternalRequest(request, response)) {
    return;
  }
  if (request.url === "/health" && request.method === "GET") {
    const healthy = redisReady;

    response.writeHead(healthy ? 200 : 503, {
      "Content-Type": "application/json",
    });

    response.end(
      JSON.stringify({
        success: healthy,
        message: healthy
          ? "Nexvia Realtime Server is running"
          : "Redis Pub/Sub is unavailable",
        services: {
          websocket: "running",
          postgres: "connected",
          redis: healthy ? "connected" : "disconnected",
        },
      })
    );

    return;
  }

  response.writeHead(404, {
    "Content-Type": "application/json",
  });

  response.end(
    JSON.stringify({
      success: false,
      message: "Route not found",
    })
  );
});

const wss = new WebSocketServer({
  noServer: true,
  maxPayload: 1024 * 1024,
});

function rejectUpgrade(socket, status, message) {
  if (socket.destroyed) return;

  socket.write(
    `HTTP/1.1 ${status} ${message}\r\n` +
    "Connection: close\r\n" +
    "Content-Length: 0\r\n\r\n"
  );

  socket.destroy();
}

function sendSyncStep1(ws, doc) {
  const encoder = encoding.createEncoder();

  encoding.writeVarUint(encoder, 0);
  syncProtocol.writeSyncStep1(encoder, doc);

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(encoding.toUint8Array(encoder));
  }
}

function broadcastDocumentUpdate(entry, update, origin) {
  const encoder = encoding.createEncoder();

  encoding.writeVarUint(encoder, 0);
  encoding.writeVarUint(encoder, 2);
  encoding.writeVarUint8Array(encoder, update);

  const message = encoding.toUint8Array(encoder);

  for (const connection of entry.connections.keys()) {
    if (connection === origin) continue;

    if (connection.readyState === WebSocket.OPEN) {
      connection.send(message);
    }
  }
}

function broadcastAwarenessUpdate(entry, update, origin) {
  const encoder = encoding.createEncoder();

  encoding.writeVarUint(encoder, 1);
  encoding.writeVarUint8Array(encoder, update);

  const message = encoding.toUint8Array(encoder);

  for (const connection of entry.connections.keys()) {
    if (connection === origin) continue;

    if (connection.readyState === WebSocket.OPEN) {
      connection.send(message);
    }
  }
}

function attachDocumentListeners(entry, pageId) {
  if (entry.realtimeListenersAttached) return;

  entry.realtimeListenersAttached = true;

  // Local and remote Yjs document changes.
  entry.doc.on("update", (update, origin) => {
    // Broadcast to local WebSocket connections.
    broadcastDocumentUpdate(entry, update, origin);

    // Remote Redis updates must not be published again.
    if (origin === REDIS_ORIGIN) return;

    // Publish local updates to other realtime server instances.
    publishDocumentUpdate(pageId, update).catch((error) => {
      console.error(
        `Failed to publish document update for ${pageId}:`,
        error.message
      );
    });
  });

  // User presence and cursor awareness.
  entry.awareness.on(
    "update",
    ({ added, updated, removed }, origin) => {
      if (entry.replacingDocument) return;

      const changedIds = [...added, ...updated, ...removed];

      if (origin && entry.connections.has(origin)) {
        const controlledIds = entry.connections.get(origin);

        added.forEach((id) => controlledIds.add(id));
        removed.forEach((id) => controlledIds.delete(id));
      }

      if (changedIds.length === 0) return;

      const update = awarenessProtocol.encodeAwarenessUpdate(
        entry.awareness,
        changedIds
      );

      // Broadcast awareness to local WebSocket clients.
      broadcastAwarenessUpdate(entry, update, origin);

      // Do not republish updates received from Redis.
      if (origin === REDIS_ORIGIN) return;

      // Publish local awareness updates to other instances.
      publishAwarenessUpdate(pageId, update).catch((error) => {
        console.error(
          `Failed to publish awareness update for ${pageId}:`,
          error.message
        );
      });
    }
  );
}


// Apply updates received through Redis.
function closeDocumentConnections(entry) {
  const clients = Array.from(entry.connections.keys());

  entry.connections.clear();

  for (const client of clients) {
    if (
      client.readyState === WebSocket.OPEN ||
      client.readyState === WebSocket.CONNECTING
    ) {
      client.close(1012, "Document restored; reconnect");
    }
  }
}

async function handleRemoteUpdate(pageId, update, type) {
  const entry = await getDocument(pageId);

  if (type === "restore") {
    await replaceDocument(pageId, update);
    closeDocumentConnections(entry);
    attachDocumentListeners(entry, pageId);

    console.log(`Document restored from Redis for page ${pageId}`);
    return;
  }

  if (type === "awareness") {
    awarenessProtocol.applyAwarenessUpdate(
      entry.awareness,
      update,
      REDIS_ORIGIN
    );
    return;
  }

  Y.applyUpdate(entry.doc, update, REDIS_ORIGIN);
}

async function restoreLocalDocument(pageId, snapshot) {
  const entry = await replaceDocument(pageId, snapshot);

  closeDocumentConnections(entry);
  attachDocumentListeners(entry, pageId);

  await publishDocumentRestore(pageId, snapshot);

  console.log(`Document restored locally and published to Redis for page ${pageId}`);
}

setRestoreHandler(restoreLocalDocument);
function handleDocumentMessage(ws, entry, message) {
  const decoder = decoding.createDecoder(message);
  const messageType = decoding.readVarUint(decoder);
  const bytes = message;

  // Yjs document synchronization.
  if (messageType === 0) {
    const messageSubtype = decoding.readVarUint(decoder);

    // Read-only users cannot submit document state or updates.
    if (
      !ws.canEdit &&
      (messageSubtype === 1 || messageSubtype === 2)
    ) {
      return;
    }

    const syncDecoder = decoding.createDecoder(bytes);
    const encoder = encoding.createEncoder();

    // Skip outer message type.
    decoding.readVarUint(syncDecoder);

    try {
      encoding.writeVarUint(encoder, 0);

      syncProtocol.readSyncMessage(
        syncDecoder,
        encoder,
        entry.doc,
        ws
      );

      if (encoding.length(encoder) > 1) {
        ws.send(encoding.toUint8Array(encoder));
      }
    } catch (error) {
      console.error("Yjs synchronization error:", error.message);
    }

    return;
  }

  // User presence and cursor updates.
  if (messageType === 1) {
    try {
      const update = decoding.readVarUint8Array(decoder);

      awarenessProtocol.applyAwarenessUpdate(
        entry.awareness,
        update,
        ws
      );
    } catch (error) {
      console.error("Awareness update error:", error.message);
    }
  }


}

async function handleUpgrade(request, socket, head) {
  try {
    const url = new URL(request.url, "http://localhost");

    const pageId = url.pathname.split("/").filter(Boolean)[0];

    if (!pageId || !/^[A-Za-z0-9_-]{1,64}$/.test(pageId)) {
      rejectUpgrade(socket, 400, "Bad Request");
      return;
    }

    // Authenticate using the existing HTTP-only login cookie.
    const user = await authenticateRequest(request);

    // Check whether requested page exists.
    const page = await prisma.page.findUnique({
      where: { id: pageId },
      select: {
        id: true,
        workspaceId: true,
      },
    });

    if (!page) {
      rejectUpgrade(socket, 404, "Not Found");
      return;
    }

    // Check workspace membership.
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: page.workspaceId,
          userId: user.id,
        },
      },
      select: {
        role: true,
      },
    });

    if (!membership) {
      rejectUpgrade(socket, 403, "Forbidden");
      return;
    }

    // Load the Yjs document from PostgreSQL.
    const entry = await getDocument(pageId);

    // Attach listeners once per document.
    attachDocumentListeners(entry, pageId);

    wss.handleUpgrade(request, socket, head, (ws) => {
      ws.user = user;
      ws.pageId = pageId;
      ws.role = membership.role;
      ws.canEdit = EDIT_ROLES.includes(membership.role);

      wss.emit("connection", ws, request, entry);
    });
  } catch (error) {
    console.error("WebSocket authentication error:", error.message);

    rejectUpgrade(socket, 401, "Unauthorized");
  }
}

server.on("upgrade", (request, socket, head) => {
  handleUpgrade(request, socket, head);
});

wss.on("connection", (ws, request, entry) => {
  // Track awareness client IDs controlled by this connection.
  entry.connections.set(ws, new Set());

  console.log(
    `${ws.user.name} connected to page ${ws.pageId} (${ws.role})`
  );

  // Send current document state to the new client.
  sendSyncStep1(ws, entry.doc);

  // Send awareness of users already connected.
  const existingAwarenessIds = Array.from(
    entry.awareness.getStates().keys()
  );

  if (existingAwarenessIds.length > 0) {
    const update = awarenessProtocol.encodeAwarenessUpdate(
      entry.awareness,
      existingAwarenessIds
    );

    const encoder = encoding.createEncoder();

    encoding.writeVarUint(encoder, 1);
    encoding.writeVarUint8Array(encoder, update);

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(encoding.toUint8Array(encoder));
    }
  }

  ws.on("message", (message) => {
    if (ws.readyState !== WebSocket.OPEN) return;

    handleDocumentMessage(ws, entry, message);
  });

  ws.on("close", () => {
    const controlledIds = entry.connections.get(ws);

    if (controlledIds?.size > 0) {
      awarenessProtocol.removeAwarenessStates(
        entry.awareness,
        Array.from(controlledIds),
        null
      );
    }

    entry.connections.delete(ws);

    console.log(
      `${ws.user.name} disconnected from page ${ws.pageId}`
    );
  });

  ws.on("error", (error) => {
    console.error("WebSocket connection error:", error.message);
  });
});

async function startServer() {
  try {
    await connectDatabase();

    // Connect Redis before accepting realtime connections.
   await connectRedisPubSub(handleRemoteUpdate);

    redisReady = true;

    server.listen(PORT, () => {
      console.log("-----------------------------------");
      console.log("Nexvia Realtime Server Started");
      console.log(`Port: ${PORT}`);
      console.log(`Health: http://localhost:${PORT}/health`);
      console.log("PostgreSQL: Connected");
      console.log("Redis Pub/Sub: Connected");
      console.log("-----------------------------------");
    });
  } catch (error) {
    console.error("Realtime server startup failed:", error);

    redisReady = false;

    await disconnectRedisPubSub().catch(() => { });
    await disconnectDatabase().catch(() => { });

    process.exit(1);
  }
}

let shuttingDown = false;

async function shutdown() {
  if (shuttingDown) return;

  shuttingDown = true;

  console.log("Shutting down Nexvia Realtime Server...");

  try {
    // Save all loaded documents before stopping.
    await flushAllDocuments();

    // Close WebSocket clients.
    for (const client of wss.clients) {
      client.close(1001, "Server shutting down");
    }

    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    // Close Redis connections.
    await disconnectRedisPubSub();

    redisReady = false;

    // Close PostgreSQL connection.
    await disconnectDatabase();

    console.log("Realtime server stopped successfully.");

    process.exit(0);
  } catch (error) {
    console.error("Realtime server shutdown error:", error);

    await disconnectRedisPubSub().catch(() => { });
    await disconnectDatabase().catch(() => { });

    process.exit(1);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

startServer();