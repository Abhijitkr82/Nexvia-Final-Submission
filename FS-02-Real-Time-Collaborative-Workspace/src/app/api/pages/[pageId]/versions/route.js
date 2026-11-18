import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import getCurrentUser from "@/lib/auth/getCurrentUser";
import { can } from "@/lib/permissions";
import { errorResponse } from "@/lib/http";
import { isValidId } from "@/lib/validators/page";
import { getPageAccess } from "@/lib/pages/access";

const PAGE_NOT_FOUND = "Page not found or access denied";

const VERSION_SELECT = {
  id: true,
  pageId: true,
  createdAt: true,
  creator: {
    select: {
      id: true,
      name: true,
    },
  },
};

// GET: list saved versions (newest first)
export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse("Unauthorized. Please login.", 401);
    }

    const { pageId } = await params;

    if (!isValidId(pageId)) {
      return errorResponse("Invalid page ID", 400);
    }

    const access = await getPageAccess(pageId, user.id);

    if (!access) {
      return errorResponse(PAGE_NOT_FOUND, 404);
    }

    if (!can(access.role, "page:read")) {
      return errorResponse("You do not have permission to view versions", 403);
    }

    const versions = await prisma.pageVersion.findMany({
      where: { pageId },
      select: VERSION_SELECT,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      count: versions.length,
      myRole: access.role,
      versions,
    });
  } catch (error) {
    console.error("List page versions error:", error);

    return errorResponse("Failed to fetch page versions", 500);
  }
}

// POST: save a snapshot of the current live document
export async function POST(request, { params }) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse("Unauthorized. Please login.", 401);
    }

    const { pageId } = await params;

    if (!isValidId(pageId)) {
      return errorResponse("Invalid page ID", 400);
    }

    const access = await getPageAccess(pageId, user.id);

    if (!access) {
      return errorResponse(PAGE_NOT_FOUND, 404);
    }

    if (!can(access.role, "page:update")) {
      return errorResponse("You do not have permission to save versions", 403);
    }

    const secret = process.env.REALTIME_INTERNAL_SECRET;
    const realtimeUrl = (
      process.env.REALTIME_INTERNAL_URL || "http://localhost:4000"
    ).replace(/\/+$/, "");

    if (!secret || secret.length < 32) {
      console.error("REALTIME_INTERNAL_SECRET is missing or invalid");

      return errorResponse("Version history service is not configured", 503);
    }

    let realtimeResponse;

    try {
      realtimeResponse = await fetch(
        `${realtimeUrl}/internal/pages/${pageId}/snapshot`,
        {
          method: "POST",
          headers: {
            "x-realtime-secret": secret,
          },
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
        }
      );
    } catch (error) {
      console.error("Realtime snapshot request failed:", error.message);

      return errorResponse("Realtime snapshot service is unavailable", 503);
    }

    if (!realtimeResponse.ok) {
      console.error(
        "Realtime snapshot service returned:",
        realtimeResponse.status
      );

      if (realtimeResponse.status === 404) {
        return errorResponse(PAGE_NOT_FOUND, 404);
      }

      return errorResponse("Could not capture the current document", 502);
    }

    const result = await realtimeResponse.json();

    if (
      !result.success ||
      result.pageId !== pageId ||
      typeof result.snapshot !== "string" ||
      result.snapshot.length === 0
    ) {
      return errorResponse("Invalid snapshot returned by realtime service", 502);
    }

    const snapshot = Buffer.from(result.snapshot, "base64");

    if (
      snapshot.length === 0 ||
      snapshot.toString("base64") !== result.snapshot
    ) {
      return errorResponse("Invalid document snapshot", 502);
    }

    const version = await prisma.pageVersion.create({
      data: {
        pageId,
        createdById: user.id,
        snapshot,
      },
      select: VERSION_SELECT,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Page version saved successfully",
        version,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create page version error:", error);

    if (error.code === "P2003") {
      return errorResponse(PAGE_NOT_FOUND, 404);
    }

    return errorResponse("Failed to save page version", 500);
  }
}
