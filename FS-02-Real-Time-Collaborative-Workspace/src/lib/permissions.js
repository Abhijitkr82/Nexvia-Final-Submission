import { prisma } from "@/lib/prisma";

export const WORKSPACE_ROLES = [
  "OWNER",
  "ADMIN",
  "EDITOR",
  "COMMENTER",
  "VIEWER",
];

const PAGE_WRITE_ROLES = ["OWNER", "ADMIN", "EDITOR"];

const COMMENT_CREATE_ROLES = ["OWNER", "ADMIN", "EDITOR", "COMMENTER"];
const COMMENT_RESOLVE_ROLES = ["OWNER", "ADMIN", "EDITOR"];
const COMMENT_MODERATE_ROLES = ["OWNER", "ADMIN"];

// Action -> roles allowed to perform it.
const PERMISSIONS = {
  "page:read": WORKSPACE_ROLES,
  "page:create": PAGE_WRITE_ROLES,
  "page:update": PAGE_WRITE_ROLES,
  "page:delete": PAGE_WRITE_ROLES,

  // Comments. Authors additionally get edit/delete/resolve rights over their
  // OWN comments (see src/lib/comments/access.js), but only while they still
  // hold a role that allows creating comments.
  "comment:read": WORKSPACE_ROLES,
  "comment:create": COMMENT_CREATE_ROLES,
  "comment:resolve": COMMENT_RESOLVE_ROLES, // resolve/reopen any comment
  "comment:moderate": COMMENT_MODERATE_ROLES, // delete any comment
};

/**
 * Returns true if the given workspace role may perform the action.
 * Unknown actions and unknown roles are always denied.
 */
export function can(role, action) {
  const allowedRoles = PERMISSIONS[action];
  return Array.isArray(allowedRoles) && allowedRoles.includes(role);
}

/**
 * Looks up a user's membership (and role) in a workspace.
 * Returns null if the user is not a member.
 */
export async function getMembership(workspaceId, userId) {
  return prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
    select: { id: true, role: true },
  });
}