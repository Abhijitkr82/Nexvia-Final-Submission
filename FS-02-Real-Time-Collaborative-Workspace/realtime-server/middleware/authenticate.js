
import jwt from "jsonwebtoken";
import { prisma } from "../config/database.js";

export async function authenticateRequest(request) {
  const url = new URL(request.url, "http://localhost");
  const token = url.searchParams.get("token");

  if (!token) {
    throw new Error("Realtime token missing");
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  let decoded;

  try {
    decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
    });
    } catch (error) {
    console.error(
      "Realtime JWT verification failed:",
      error.name,
      error.message
    );

    throw new Error("Invalid or expired realtime token");
  }

  if (
    !decoded ||
    typeof decoded.userId !== "string" ||
    decoded.purpose !== "realtime"
  ) {
    throw new Error("Invalid realtime token");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: decoded.userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
    },
  });

  if (!user) {
    throw new Error("User account not found");
  }

  return user;
}
