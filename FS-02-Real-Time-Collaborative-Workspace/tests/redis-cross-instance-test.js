import WebSocket from "ws";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

const cookie = process.env.TEST_COOKIE;
const pageId = process.env.TEST_PAGE_ID;

if (!cookie || !pageId) {
  console.error("TEST_COOKIE or TEST_PAGE_ID is missing.");
  console.error("Run this test in the PowerShell session where these variables are already set.");
  process.exit(1);
}

class AuthenticatedWebSocket extends WebSocket {
  constructor(url, protocols) {
    super(url, protocols, {
      headers: { Cookie: cookie },
    });
  }
}

const docA = new Y.Doc();
const docB = new Y.Doc();

const providerA = new WebsocketProvider(
  "ws://localhost:4000",
  pageId,
  docA,
  { WebSocketPolyfill: AuthenticatedWebSocket }
);

const providerB = new WebsocketProvider(
  "ws://localhost:4001",
  pageId,
  docB,
  { WebSocketPolyfill: AuthenticatedWebSocket }
);

function waitForSync(provider, label) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`${label} sync timeout`)),
      15000
    );

    const handler = (synced) => {
      if (synced) {
        clearTimeout(timeout);
        provider.off("sync", handler);
        console.log(`${label}: Synced successfully`);
        resolve();
      }
    };

    provider.on("sync", handler);

    if (provider.synced) handler(true);
  });
}

async function waitForRemoteUpdate(text) {
  const deadline = Date.now() + 15000;

  while (Date.now() < deadline) {
    if (docB.getText("content").toString().includes(text)) {
      return true;
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return false;
}

try {
  console.log("Connecting Client A to port 4000...");
  console.log("Connecting Client B to port 4001...");

  await Promise.all([
    waitForSync(providerA, "Client A"),
    waitForSync(providerB, "Client B"),
  ]);

  const marker = `Redis cross-instance test ${Date.now()}`;

  console.log("\nWriting update from Client A...");
  docA.getText("content").insert(
    docA.getText("content").length,
    `\n${marker}`
  );

  const received = await waitForRemoteUpdate(marker);

  if (!received) {
    throw new Error("Client B did not receive the Redis update.");
  }

  console.log("\n==================================");
  console.log("SUCCESS: Redis cross-instance sync verified!");
  console.log("Client A: Port 4000");
  console.log("Client B: Port 4001");
  console.log("Client B received:", marker);
  console.log("==================================");
} catch (error) {
  console.error("\nCROSS-INSTANCE TEST FAILED:", error.message);
  process.exitCode = 1;
} finally {
  providerA.destroy();
  providerB.destroy();
  docA.destroy();
  docB.destroy();
}
