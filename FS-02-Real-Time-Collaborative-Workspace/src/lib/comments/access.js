import { prisma } from "@/lib/prisma";
import { can, getMembership } from "@/lib/permissions";

// Explicit select. The author's email and password hash are never exposed.
export const COMMENT_SELECT = {
  id: true,
  pageId: true,
  authorId: true,
  content: true,
  resolved: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: { id: true, name: true, avatarUrl: true },
  },
};

/**
 * Loads a comment plus the user's role in the comment's workspace.
 * Returns { comment, role }, or null if the comment is missing or the user
 * is not a member of its workspace (so callers can answer 404 for both and
 * never reveal whether a comment ID exists).
 */
export async function getCommentAccess(commentId, userId) {
  const record = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      ...COMMENT_SELECT,
      page: { select: { workspaceId: true } },
    },
  });

  if (!record) {
    return null;
  }

  const { page, ...comment } = record;
  const membership = await getMembership(page.workspaceId, userId);

  if (!membership) {
    return null;
  }

  return { comment, role: membership.role };
}

/**
 * Single source of truth for what a user may do with one comment.
 * Authors keep rights over their own comments only while their role still
 * allows commenting (a demoted VIEWER can no longer edit or delete).
 */
export function getCommentPermissions(role, comment, userId) {
  const isAuthor = comment.authorId === userId;
  const authorCanWrite = isAuthor && can(role, "comment:create");

  return {
    canEdit: authorCanWrite,
    canDelete: authorCanWrite || can(role, "comment:moderate"),
    canResolve: authorCanWrite || can(role, "comment:resolve"),
  };
}

/**
 * Returns the comment with a `permissions` object, so the frontend can
 * show/hide buttons without duplicating the rules above.
 */
export function withPermissions(comment, role, userId) {
  return {
    ...comment,
    permissions: getCommentPermissions(role, comment, userId),
  };
}