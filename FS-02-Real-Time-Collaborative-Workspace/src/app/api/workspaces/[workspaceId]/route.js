
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import getCurrentUser from "@/lib/auth/getCurrentUser";

export async function GET(request, { params }) {
  try {
    // 1. Verify logged-in user
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please login." },
        { status: 401 }
      );
    }

    // 2. Get workspace ID from URL
    const { workspaceId } = await params;

    // 3. Check workspace membership
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
      include: {
        workspace: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                members: true,
                pages: true,
              },
            },
          },
        },
      },
    });

    // 4. Reject non-members
    if (!membership) {
      return NextResponse.json(
        { success: false, message: "Workspace not found or access denied" },
        { status: 404 }
      );
    }

    // 5. Return workspace details
    const workspace = {
      ...membership.workspace,
      myRole: membership.role,
      memberCount: membership.workspace._count.members,
      pageCount: membership.workspace._count.pages,
      _count: undefined,
    };

    return NextResponse.json({
      success: true,
      workspace,
    });
  } catch (error) {
    console.error("Get workspace details error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch workspace details" },
      { status: 500 }
    );
  }
}
