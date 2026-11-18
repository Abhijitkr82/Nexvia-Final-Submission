import { timingSafeEqual } from "node:crypto";
import { prisma } from "../config/database.js";
import * as Y from "yjs";
import {
  getDocument,
  persistDocument,
} from "./documentStore.js";

let restoreHandler = null;

export function setRestoreHandler(handler) {
  if (typeof handler !== "function") {
    throw new Error("Document restore handler must be a function");
  }

  restoreHandler = handler;
}

function isAuthorized(request) {
  const secret = process.env.REALTIME_INTERNAL_SECRET;
  const supplied = request.headers["x-realtime-secret"];

  if (
    typeof secret !== "string" ||
    secret.length < 32 ||
    typeof supplied !== "string"
  ) {
    return false;
  }

  const expectedBuffer = Buffer.from(secret);
  const suppliedBuffer = Buffer.from(supplied);

  return (
    expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer)
  );
}

async function sendJson(response, status, data) {
  response.writeHead(status, {
    "Content-Type": "application/json",
  });

  response.end(JSON.stringify(data));
}

async function readRequestBody(request, maxBytes = 15 * 1024 * 1024) {
  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    totalBytes += chunk.length;

    if (totalBytes > maxBytes) {
      throw new Error("Request body too large");
    }

    chunks.push(chunk);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export async function handleInternalRequest(request, response) {
  const url = new URL(request.url, "http://localhost");

  const snapshotMatch = url.pathname.match(
    /^\/internal\/pages\/([A-Za-z0-9_-]{1,64})\/snapshot$/
  );

  const restoreMatch = url.pathname.match(
    /^\/internal\/pages\/([A-Za-z0-9_-]{1,64})\/restore$/
  );

  if (
    request.method !== "POST" ||
    (!snapshotMatch && !restoreMatch)
  ) {
    return false;
  }

  if (!isAuthorized(request)) {
    await sendJson(response, 401, {
      success: false,
      message: "Unauthorized internal request",
    });

    return true;
  }

  try {
    const pageId = (snapshotMatch || restoreMatch)[1];

    const page = await prisma.page.findUnique({
      where: { id: pageId },
      select: { id: true },
    });

    if (!page) {
      await sendJson(response, 404, {
        success: false,
        message: "Page not found",
      });

      return true;
    }

    if (restoreMatch) {
      if (!restoreHandler) {
        throw new Error("Document restore handler is not configured");
      }

      const body = await readRequestBody(request);

      if (
        typeof body.snapshot !== "string" ||
        body.snapshot.length === 0 ||
        body.snapshot.length > 14 * 1024 * 1024
      ) {
        await sendJson(response, 400, {
          success: false,
          message: "Invalid document snapshot",
        });

        return true;
      }

      const snapshot = Buffer.from(body.snapshot, "base64");

      if (
        snapshot.length === 0 ||
        snapshot.length > 10 * 1024 * 1024 ||
        snapshot.toString("base64") !== body.snapshot
      ) {
        await sendJson(response, 400, {
          success: false,
          message: "Invalid document snapshot encoding",
        });

        return true;
      }

      await restoreHandler(pageId, snapshot);

      await sendJson(response, 200, {
        success: true,
        message: "Document restored successfully",
        pageId,
      });

      return true;
    }

    const entry = await getDocument(pageId);

    await persistDocument(pageId, entry);

    const snapshot = Buffer.from(
      Y.encodeStateAsUpdate(entry.doc)
    );

    await sendJson(response, 200, {
      success: true,
      pageId,
      snapshot: snapshot.toString("base64"),
    });

    return true;
  } catch (error) {
    console.error("Internal document request error:", error.message);

    await sendJson(response, 500, {
      success: false,
      message: "Could not process internal document request",
    });

    return true;
  }
}
