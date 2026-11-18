import Redis from "ioredis";
import { randomUUID } from "node:crypto";

const CHANNEL_PREFIX = "nexvia:realtime:page:";
const INSTANCE_ID = randomUUID();

const MAX_UPDATE_SIZE = 1024 * 1024;
const MAX_SNAPSHOT_SIZE = 10 * 1024 * 1024;

let publisher = null;
let subscriber = null;
let messageHandler = null;

export async function connectRedisPubSub(onUpdate) {
  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL is missing from environment variables");
  }

  if (typeof onUpdate !== "function") {
    throw new Error("Redis update handler is required");
  }

  messageHandler = onUpdate;

  const redisOptions = {
    lazyConnect: true,
    connectTimeout: 10000,
    maxRetriesPerRequest: 2,
    retryStrategy(times) {
      return Math.min(times * 500, 5000);
    },
  };

  publisher = new Redis(process.env.REDIS_URL, redisOptions);
  subscriber = new Redis(process.env.REDIS_URL, redisOptions);

  publisher.on("error", (error) => {
    console.error("Redis publisher error:", error.message);
  });

  subscriber.on("error", (error) => {
    console.error("Redis subscriber error:", error.message);
  });

  try {
    await Promise.all([
      publisher.connect(),
      subscriber.connect(),
    ]);

    const [publisherStatus, subscriberStatus] = await Promise.all([
      publisher.ping(),
      subscriber.ping(),
    ]);

    if (
      publisherStatus !== "PONG" ||
      subscriberStatus !== "PONG"
    ) {
      throw new Error("Redis connection health check failed");
    }

    await subscriber.psubscribe(`${CHANNEL_PREFIX}*`);
    subscriber.on("pmessage", handleRedisMessage);

    console.log("Redis Pub/Sub connected successfully");
    console.log("Redis Instance ID:", INSTANCE_ID);

    return true;
  } catch (error) {
    console.error("Redis Pub/Sub startup failed:", error.message);

    await disconnectRedisPubSub();
    throw error;
  }
}

async function handleRedisMessage(pattern, channel, rawMessage) {
  try {
    const message = JSON.parse(rawMessage);
    const pageId = channel.slice(CHANNEL_PREFIX.length);

    if (!pageId || !/^[A-Za-z0-9_-]{1,64}$/.test(pageId)) {
      return;
    }

    if (message.sender === INSTANCE_ID) {
      return;
    }

    const type = message.type || "document";

    if (
      message.pageId !== pageId ||
      !["document", "awareness", "restore"].includes(type) ||
      typeof message.update !== "string" ||
      message.update.length === 0
    ) {
      return;
    }

    const update = Buffer.from(message.update, "base64");
    const maxSize = type === "restore"
      ? MAX_SNAPSHOT_SIZE
      : MAX_UPDATE_SIZE;

    if (
      update.length === 0 ||
      update.length > maxSize ||
      update.toString("base64") !== message.update
    ) {
      return;
    }

    await messageHandler(pageId, update, type);
  } catch (error) {
    console.error("Redis message processing error:", error.message);
  }
}

async function publishUpdate(pageId, update, type) {
  if (!publisher || publisher.status !== "ready") {
    throw new Error("Redis publisher is not ready");
  }

  if (!/^[A-Za-z0-9_-]{1,64}$/.test(pageId)) {
    throw new Error("Invalid page ID");
  }

  const data = Buffer.from(update);
  const maxSize = type === "restore"
    ? MAX_SNAPSHOT_SIZE
    : MAX_UPDATE_SIZE;

  if (data.length === 0 || data.length > maxSize) {
    throw new Error(`Invalid ${type} payload size`);
  }

  const channel = `${CHANNEL_PREFIX}${pageId}`;

  const message = JSON.stringify({
    sender: INSTANCE_ID,
    pageId,
    type,
    update: data.toString("base64"),
  });

  await publisher.publish(channel, message);
}

export async function publishDocumentUpdate(pageId, update) {
  return publishUpdate(pageId, update, "document");
}

export async function publishAwarenessUpdate(pageId, update) {
  return publishUpdate(pageId, update, "awareness");
}

export async function publishDocumentRestore(pageId, snapshot) {
  return publishUpdate(pageId, snapshot, "restore");
}

export async function disconnectRedisPubSub() {
  const clients = [publisher, subscriber];

  publisher = null;
  subscriber = null;
  messageHandler = null;

  await Promise.all(
    clients.map(async (client) => {
      if (!client) return;

      try {
        if (client.status === "ready") {
          await client.quit();
        } else {
          client.disconnect();
        }
      } catch {
        client.disconnect();
      }
    })
  );

  console.log("Redis Pub/Sub disconnected.");
}
