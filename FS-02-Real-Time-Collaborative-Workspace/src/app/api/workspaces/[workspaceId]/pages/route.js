import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import getCurrentUser from "@/lib/auth/getCurrentUser";
import { can, getMembership } from "@/lib/permissions";
import { errorResponse, readJsonBody } from "@/lib/http";
import {
  isValidId,
  validatePageTitle,
} from "@/lib/validators/page";
import { PAGE_SELECT } from "@/lib/pages/access";

const WORKSPACE_NOT_FOUND =
  "Workspace not found or access denied";

// GET: List all pages in a workspace
export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse(
        "Unauthorized. Please login.",
        401
      );
    }

    const { workspaceId } = await params;

    if (!isValidId(workspaceId)) {
      return errorResponse("Invalid workspace ID", 400);
    }

    const membership = await getMembership(
      workspaceId,
      user.id
    );

    if (!membership) {
      return errorResponse(WORKSPACE_NOT_FOUND, 404);
    }

    if (!can(membership.role, "page:read")) {
      return errorResponse(
        "You do not have permission to view pages",
        403
      );
    }

    const pages = await prisma.page.findMany({
      where: { workspaceId },
      select: PAGE_SELECT,
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      count: pages.length,
      myRole: membership.role,
      pages,
    });
  } catch (error) {
    console.error("List pages error:", error);

    return errorResponse("Failed to fetch pages", 500);
  }
}

// POST: Create a page in a workspace
export async function POST(request, { params }) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse(
        "Unauthorized. Please login.",
        401
      );
    }

    const { workspaceId } = await params;

    if (!isValidId(workspaceId)) {
      return errorResponse("Invalid workspace ID", 400);
    }

    const membership = await getMembership(
      workspaceId,
      user.id
    );

    if (!membership) {
      return errorResponse(WORKSPACE_NOT_FOUND, 404);
    }

    if (!can(membership.role, "page:create")) {
      return errorResponse(
        "You do not have permission to create pages",
        403
      );
    }

    const { body, response } = await readJsonBody(request);

    if (response) {
      return response;
    }

    const data = {
      workspaceId,
      createdById: user.id,
    };

    if (Object.hasOwn(body, "title")) {
      const { value, error } = validatePageTitle(body.title);

      if (error) {
        return errorResponse(error, 400);
      }

      data.title = value;
    }

    const page = await prisma.page.create({
      data,
      select: PAGE_SELECT,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Page created successfully",
        page,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create page error:", error);

    if (error.code === "P2003") {
      return errorResponse(WORKSPACE_NOT_FOUND, 404);
    }

    return errorResponse("Failed to create page", 500);
  }
}