import WebSocket from "ws";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

const cookie = process.env.TEST_COOKIE;
const pageId = process.env.TEST_PAGE_ID;
const versionId = process.env.TEST_VERSION_ID;

class AuthenticatedWebSocket extends WebSocket {
  constructor(url, protocols) {
    super(url, protocols, {
      headers: { Cookie: cookie },
    });
  }
}

const doc = new Y.Doc();
const provider = new WebsocketProvider(
  "ws://localhost:4001",
  pageId,
  doc,
  { WebSocketPolyfill: AuthenticatedWebSocket }
);

function waitForSync() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("WebSocket sync timeout")),
      15000
    );

    const handler = (synced) => {
      if (synced) {
        clearTimeout(timeout);
        provider.off("sync", handler);
        resolve();
      }
    };

    provider.on("sync", handler);
    if (provider.synced) handler(true);
  });
}

try {
  console.log("Connecting WebSocket client to port 4001...");
  await waitForSync();
  console.log("WebSocket connected and synced.");

  const socket = provider.ws;

  if (!socket) {
    throw new Error("WebSocket connection not available.");
  }

  const closePromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Connection was not closed within 15 seconds.")),
      15000
    );

    socket.once("close", (code, reason) => {
      clearTimeout(timeout);
      resolve({
        code,
        reason: reason.toString(),
      });
    });
  });

  console.log("Triggering version restore through Next.js API...");

  const response = await fetch(
    `http://localhost:3000/api/pages/${pageId}/versions/${versionId}/restore`,
    {
      method: "POST",
      headers: {
        Cookie: cookie,
      },
    }
  );

  const result = await response.json();

  console.log("Restore API status:", response.status);
  console.log("Restore API result:", result.message || result.error);

  if (!response.ok) {
    throw new Error("Restore API request failed.");
  }

  const closed = await closePromise;

  console.log("WebSocket close code:", closed.code);
  console.log("WebSocket close reason:", closed.reason);

  if (closed.code !== 1012) {
    throw new Error(`Expected close code 1012, received ${closed.code}`);
  }

  console.log("\nSUCCESS: Cross-instance restore reconnect signal verified!");
} catch (error) {
  console.error("\nTEST FAILED:", error.message);
  process.exitCode = 1;
} finally {
  provider.destroy();
  doc.destroy();
}
