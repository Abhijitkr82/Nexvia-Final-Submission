import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/permissions";

export const PAGE_SELECT = {
  id: true,
  title: true,
  workspaceId: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  creator: {
    select: {
      id: true,
      name: true,
    },
  },
};

export async function getPageAccess(pageId, userId) {
  const page = await prisma.page.findUnique({
    where: { id: pageId },
    select: PAGE_SELECT,
  });

  if (!page) {
    return null;
  }

  const membership = await getMembership(
    page.workspaceId,
    userId
  );

  if (!membership) {
    return null;
  }

  return {
    page,
    role: membership.role,
  };
}