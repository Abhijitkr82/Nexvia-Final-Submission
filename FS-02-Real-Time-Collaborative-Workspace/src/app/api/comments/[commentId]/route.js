import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import getCurrentUser from "@/lib/auth/getCurrentUser";
import { errorResponse, readJsonBody } from "@/lib/http";
import { isValidId } from "@/lib/validators/page";
import {
  validateCommentContent,
  validateResolved,
} from "@/lib/validators/comment";
import {
  COMMENT_SELECT,
  getCommentAccess,
  getCommentPermissions,
  withPermissions,
} from "@/lib/comments/access";

const COMMENT_NOT_FOUND = "Comment not found or access denied";

// PATCH: edit content and/or resolve / reopen
export async function PATCH(request, { params }) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse("Unauthorized. Please login.", 401);
    }

    const { commentId } = await params;

    if (!isValidId(commentId)) {
      return errorResponse("Invalid comment ID", 400);
    }

    const access = await getCommentAccess(commentId, user.id);

    if (!access) {
      return errorResponse(COMMENT_NOT_FOUND, 404);
    }

    const { comment, role } = access;

    const { body, response } = await readJsonBody(request);

    if (response) {
      return response;
    }

    const hasContent = Object.hasOwn(body, "content");
    const hasResolved = Object.hasOwn(body, "resolved");

    if (!hasContent && !hasResolved) {
      return errorResponse("Provide content and/or resolved to update", 400);
    }

    // Authorization: every requested change must be allowed.
    const permissions = getCommentPermissions(role, comment, user.id);

    if (hasContent && !permissions.canEdit) {
      return errorResponse("You can only edit your own comments", 403);
    }

    if (hasResolved && !permissions.canResolve) {
      return errorResponse(
        "You do not have permission to resolve this comment",
        403
      );
    }

    // Validation of values.
    const data = {};

    if (hasContent) {
      const { value, error } = validateCommentContent(body.content);

      if (error) {
        return errorResponse(error, 400);
      }

      data.content = value;
    }

    if (hasResolved) {
      const { value, error } = validateResolved(body.resolved);

      if (error) {
        return errorResponse(error, 400);
      }

      data.resolved = value;
    }

    // Resolve/reopen to the state it already has: nothing to write, and
    // updatedAt stays untouched.
    if (!hasContent && comment.resolved === data.resolved) {
      return NextResponse.json({
        success: true,
        message: "Comment already up to date",
        comment: withPermissions(comment, role, user.id),
      });
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data,
      select: COMMENT_SELECT,
    });

    return NextResponse.json({
      success: true,
      message: "Comment updated successfully",
      comment: withPermissions(updated, role, user.id),
    });
  } catch (error) {
    console.error("Update comment error:", error);

    // Comment (or its page) was deleted by someone else in the meantime.
    if (error.code === "P2025") {
      return errorResponse(COMMENT_NOT_FOUND, 404);
    }

    return errorResponse("Failed to update comment", 500);
  }
}

// DELETE: remove a comment (author, or OWNER/ADMIN as moderator)
export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse("Unauthorized. Please login.", 401);
    }

    const { commentId } = await params;

    if (!isValidId(commentId)) {
      return errorResponse("Invalid comment ID", 400);
    }

    const access = await getCommentAccess(commentId, user.id);

    if (!access) {
      return errorResponse(COMMENT_NOT_FOUND, 404);
    }

    const permissions = getCommentPermissions(
      access.role,
      access.comment,
      user.id
    );

    if (!permissions.canDelete) {
      return errorResponse(
        "You do not have permission to delete this comment",
        403
      );
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({
      success: true,
      message: "Comment deleted successfully",
      commentId,
    });
  } catch (error) {
    console.error("Delete comment error:", error);

    if (error.code === "P2025") {
      return errorResponse(COMMENT_NOT_FOUND, 404);
    }

    return errorResponse("Failed to delete comment", 500);
  }
}