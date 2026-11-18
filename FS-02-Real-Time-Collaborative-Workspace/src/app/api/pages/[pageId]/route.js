import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import getCurrentUser from "@/lib/auth/getCurrentUser";
import { can } from "@/lib/permissions";
import { errorResponse, readJsonBody } from "@/lib/http";
import {
  isValidId,
  validatePageTitle,
} from "@/lib/validators/page";
import {
  PAGE_SELECT,
  getPageAccess,
} from "@/lib/pages/access";

const PAGE_NOT_FOUND = "Page not found or access denied";

// GET: Fetch one page's details
export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse(
        "Unauthorized. Please login.",
        401
      );
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
      return errorResponse(
        "You do not have permission to view this page",
        403
      );
    }

    return NextResponse.json({
      success: true,
      page: {
        ...access.page,
        myRole: access.role,
      },
    });
  } catch (error) {
    console.error("Get page error:", error);

    return errorResponse("Failed to fetch page", 500);
  }
}

// PATCH: Update page title
export async function PATCH(request, { params }) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse(
        "Unauthorized. Please login.",
        401
      );
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
      return errorResponse(
        "You do not have permission to edit this page",
        403
      );
    }

    const { body, response } = await readJsonBody(request);

    if (response) {
      return response;
    }

    if (!Object.hasOwn(body, "title")) {
      return errorResponse("Page title is required", 400);
    }

    const { value, error } = validatePageTitle(body.title);

    if (error) {
      return errorResponse(error, 400);
    }

    const page = await prisma.page.update({
      where: { id: pageId },
      data: { title: value },
      select: PAGE_SELECT,
    });

    return NextResponse.json({
      success: true,
      message: "Page updated successfully",
      page: {
        ...page,
        myRole: access.role,
      },
    });
  } catch (error) {
    console.error("Update page error:", error);

    if (error.code === "P2025") {
      return errorResponse(PAGE_NOT_FOUND, 404);
    }

    return errorResponse("Failed to update page", 500);
  }
}

// DELETE: Delete a page
export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse(
        "Unauthorized. Please login.",
        401
      );
    }

    const { pageId } = await params;

    if (!isValidId(pageId)) {
      return errorResponse("Invalid page ID", 400);
    }

    const access = await getPageAccess(pageId, user.id);

    if (!access) {
      return errorResponse(PAGE_NOT_FOUND, 404);
    }

    if (!can(access.role, "page:delete")) {
      return errorResponse(
        "You do not have permission to delete this page",
        403
      );
    }

    await prisma.page.delete({
      where: { id: pageId },
    });

    return NextResponse.json({
      success: true,
      message: "Page deleted successfully",
      pageId,
    });
  } catch (error) {
    console.error("Delete page error:", error);

    if (error.code === "P2025") {
      return errorResponse(PAGE_NOT_FOUND, 404);
    }

    return errorResponse("Failed to delete page", 500);
  }
}