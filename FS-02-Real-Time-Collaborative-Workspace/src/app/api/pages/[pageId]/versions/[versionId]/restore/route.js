import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import getCurrentUser from "@/lib/auth/getCurrentUser";
import { can } from "@/lib/permissions";
import { errorResponse } from "@/lib/http";
import { isValidId } from "@/lib/validators/page";
import { getPageAccess } from "@/lib/pages/access";

const PAGE_NOT_FOUND = "Page not found or access denied";
const MAX_SNAPSHOT_SIZE = 10 * 1024 * 1024;

export async function POST(request, { params }) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse("Unauthorized. Please login.", 401);
    }

    const { pageId, versionId } = await params;

    if (!isValidId(pageId) || !isValidId(versionId)) {
      return errorResponse("Invalid page or version ID", 400);
    }

    const access = await getPageAccess(pageId, user.id);

    if (!access) {
      return errorResponse(PAGE_NOT_FOUND, 404);
    }

    if (!can(access.role, "page:update")) {
      return errorResponse("You do not have permission to restore versions", 403);
    }

    const version = await prisma.pageVersion.findFirst({
      where: {
        id: versionId,
        pageId,
      },
      select: {
        id: true,
        snapshot: true,
      },
    });

    if (!version) {
      return errorResponse("Version not found", 404);
    }

    const snapshot = Buffer.from(version.snapshot);

    if (snapshot.length === 0 || snapshot.length > MAX_SNAPSHOT_SIZE) {
      return errorResponse("Invalid or oversized document snapshot", 400);
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
        `${realtimeUrl}/internal/pages/${pageId}/restore`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-realtime-secret": secret,
          },
          body: JSON.stringify({
            snapshot: snapshot.toString("base64"),
          }),
          cache: "no-store",
          signal: AbortSignal.timeout(20000),
        }
      );
    } catch (error) {
      console.error("Realtime restore request failed:", error.message);

      return errorResponse("Realtime restore service is unavailable", 503);
    }

    if (!realtimeResponse.ok) {
      console.error(
        "Realtime restore service returned:",
        realtimeResponse.status
      );

      if (realtimeResponse.status === 404) {
        return errorResponse(PAGE_NOT_FOUND, 404);
      }

      return errorResponse("Could not restore the selected version", 502);
    }

    const result = await realtimeResponse.json();

    if (!result.success || result.pageId !== pageId) {
      return errorResponse("Invalid response from realtime restore service", 502);
    }

    return NextResponse.json({
      success: true,
      message: "Page version restored successfully",
      pageId,
      versionId: version.id,
    });
  } catch (error) {
    console.error("Restore page version error:", error);

    return errorResponse("Failed to restore page version", 500);
  }
}
