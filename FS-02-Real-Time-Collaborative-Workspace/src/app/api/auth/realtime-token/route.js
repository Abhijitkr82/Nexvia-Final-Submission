import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import getCurrentUser from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error("JWT_SECRET is not configured");
    }

    const token = jwt.sign(
      {
        userId: user.id,
        purpose: "realtime",
      },
      secret,
      {
        algorithm: "HS256",
        expiresIn: "60s",
      }
    );

    return NextResponse.json(
      { success: true, token },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Realtime token error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to create realtime token" },
      { status: 500 }
    );
  }
}
