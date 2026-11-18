import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL, {
  lazyConnect: true,
  connectTimeout: 10000,
  maxRetriesPerRequest: 1
});

try {
  await redis.connect();
  console.log("Redis PING:", await redis.ping());
  console.log("Redis connection successful.");
} catch (error) {
  console.log("Redis connection failed:", error.message);
} finally {
  redis.disconnect();
}
