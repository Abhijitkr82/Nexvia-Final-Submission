import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import getCurrentUser from "@/lib/auth/getCurrentUser";
import { can } from "@/lib/permissions";
import { errorResponse, readJsonBody } from "@/lib/http";
import { isValidId } from "@/lib/validators/page";
import { validateCommentContent } from "@/lib/validators/comment";
import { getPageAccess } from "@/lib/pages/access";
import { COMMENT_SELECT, withPermissions } from "@/lib/comments/access";

const PAGE_NOT_FOUND = "Page not found or access denied";

// GET: list all comments on a page (oldest first)
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

    if (!can(access.role, "comment:read")) {
      return errorResponse("You do not have permission to view comments", 403);
    }

    const comments = await prisma.comment.findMany({
      where: { pageId },
      select: COMMENT_SELECT,
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      count: comments.length,
      myRole: access.role,
      comments: comments.map((comment) =>
        withPermissions(comment, access.role, user.id)
      ),
    });
  } catch (error) {
    console.error("List comments error:", error);

    return errorResponse("Failed to fetch comments", 500);
  }
}

// POST: add a comment to a page
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

    if (!can(access.role, "comment:create")) {
      return errorResponse("You do not have permission to add comments", 403);
    }

    const { body, response } = await readJsonBody(request);

    if (response) {
      return response;
    }

    if (!Object.hasOwn(body, "content")) {
      return errorResponse("Comment content is required", 400);
    }

    const { value, error } = validateCommentContent(body.content);

    if (error) {
      return errorResponse(error, 400);
    }

    // Only whitelisted data is used. authorId always comes from the verified
    // user; any authorId, resolved or anchor in the body is ignored.
    const comment = await prisma.comment.create({
      data: {
        pageId,
        authorId: user.id,
        content: value,
      },
      select: COMMENT_SELECT,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Comment added successfully",
        comment: withPermissions(comment, access.role, user.id),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create comment error:", error);

    // Page was deleted between the access check and the insert.
    if (error.code === "P2003") {
      return errorResponse(PAGE_NOT_FOUND, 404);
    }

    return errorResponse("Failed to add comment", 500);
  }
}