import WebSocket from "ws";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

const cookie = process.env.TEST_COOKIE;
const pageId = process.env.TEST_PAGE_ID;

if (!cookie || !pageId) {
  console.error("TEST_COOKIE or TEST_PAGE_ID is missing.");
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

async function waitForCondition(condition, message) {
  const deadline = Date.now() + 15000;

  while (Date.now() < deadline) {
    if (condition()) return true;
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error(message);
}

try {
  console.log("Connecting Client A to port 4000...");
  console.log("Connecting Client B to port 4001...");

  await Promise.all([
    waitForSync(providerA, "Client A"),
    waitForSync(providerB, "Client B"),
  ]);

  const marker = `Nexvia User ${Date.now()}`;

  console.log("\nPublishing presence from Client A...");

  providerA.awareness.setLocalStateField("user", {
    name: marker,
  });

  await waitForCondition(
    () =>
      [...providerB.awareness.getStates().values()].some(
        (state) => state.user?.name === marker
      ),
    "Client B did not receive Client A awareness update."
  );

  console.log("SUCCESS: Client B received Client A presence!");

  console.log("\nRemoving presence from Client A...");

  providerA.awareness.setLocalState(null);

  await waitForCondition(
    () =>
      ![...providerB.awareness.getStates().values()].some(
        (state) => state.user?.name === marker
      ),
    "Client B did not receive Client A presence removal."
  );

  console.log("SUCCESS: Client B received presence removal!");

  console.log("\n==================================");
  console.log("SUCCESS: Redis cross-instance awareness verified!");
  console.log("Client A: Port 4000");
  console.log("Client B: Port 4001");
  console.log("Presence sharing: PASSED");
  console.log("Presence removal: PASSED");
  console.log("==================================");
} catch (error) {
  console.error("\nAWARENESS TEST FAILED:", error.message);
  process.exitCode = 1;
} finally {
  providerA.destroy();
  providerB.destroy();
  docA.destroy();
  docB.destroy();
}
