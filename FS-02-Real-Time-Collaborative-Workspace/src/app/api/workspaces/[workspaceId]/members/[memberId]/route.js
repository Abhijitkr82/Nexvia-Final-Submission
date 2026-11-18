
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import getCurrentUser from "@/lib/auth/getCurrentUser";

const ALLOWED_ROLES = ["ADMIN", "EDITOR", "COMMENTER", "VIEWER"];

export async function PATCH(request, { params }) {
  try {
    // 1. Authenticate current user
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please login." },
        { status: 401 }
      );
    }

    // 2. Get workspace and member IDs
    const { workspaceId, memberId } = await params;

    // 3. Check current user's workspace membership
    const currentMembership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: currentUser.id,
        },
      },
    });

    if (
      !currentMembership ||
      !["OWNER", "ADMIN"].includes(currentMembership.role)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "You do not have permission to update member roles",
        },
        { status: 403 }
      );
    }

    // 4. Validate requested role
    const body = await request.json();
    const { role } = body || {};

    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, message: "Invalid member role" },
        { status: 400 }
      );
    }

    // 5. Find target member in this workspace
    const targetMembership = await prisma.workspaceMember.findFirst({
      where: {
        id: memberId,
        workspaceId,
      },
    });

    if (!targetMembership) {
      return NextResponse.json(
        { success: false, message: "Workspace member not found" },
        { status: 404 }
      );
    }

    // 6. Protect workspace owner
    if (targetMembership.role === "OWNER") {
      return NextResponse.json(
        {
          success: false,
          message: "Workspace owner's role cannot be changed",
        },
        { status: 403 }
      );
    }

    // 7. Only OWNER can assign ADMIN role
    if (
      currentMembership.role === "ADMIN" &&
      role === "ADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Only the owner can assign ADMIN role",
        },
        { status: 403 }
      );
    }

    // 8. ADMIN cannot modify another ADMIN
    if (
      currentMembership.role === "ADMIN" &&
      targetMembership.role === "ADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Only the owner can modify an ADMIN",
        },
        { status: 403 }
      );
    }

    // 9. Update member role
    const updatedMembership = await prisma.workspaceMember.update({
      where: {
        id: memberId,
      },
      data: {
        role,
      },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Member role updated successfully",
      membership: updatedMembership,
    });
  } catch (error) {
    console.error("Update member role error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update member role",
      },
      { status: 500 }
    );
  }
}

// DELETE: Remove a member from workspace
export async function DELETE(request, { params }) {
  try {
    // 1. Authenticate current user
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please login." },
        { status: 401 }
      );
    }

    // 2. Get workspace and member IDs
    const { workspaceId, memberId } = await params;

    // 3. Check current user's membership
    const currentMembership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: currentUser.id,
        },
      },
    });

    if (
      !currentMembership ||
      !["OWNER", "ADMIN"].includes(currentMembership.role)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "You do not have permission to remove members",
        },
        { status: 403 }
      );
    }

    // 4. Find target member in this workspace
    const targetMembership = await prisma.workspaceMember.findFirst({
      where: {
        id: memberId,
        workspaceId,
      },
    });

    if (!targetMembership) {
      return NextResponse.json(
        { success: false, message: "Workspace member not found" },
        { status: 404 }
      );
    }

    // 5. Prevent self-removal
    if (targetMembership.userId === currentUser.id) {
      return NextResponse.json(
        {
          success: false,
          message: "You cannot remove yourself from the workspace",
        },
        { status: 403 }
      );
    }

    // 6. Protect workspace OWNER
    if (targetMembership.role === "OWNER") {
      return NextResponse.json(
        {
          success: false,
          message: "Workspace owner cannot be removed",
        },
        { status: 403 }
      );
    }

    // 7. ADMIN cannot remove another ADMIN
    if (
      currentMembership.role === "ADMIN" &&
      targetMembership.role === "ADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Only the owner can remove an ADMIN",
        },
        { status: 403 }
      );
    }

    // 8. Delete with role restrictions to protect against role changes
    const deleteResult = await prisma.workspaceMember.deleteMany({
      where: {
        id: memberId,
        workspaceId,
        ...(currentMembership.role === "ADMIN"
          ? { role: { in: ["EDITOR", "COMMENTER", "VIEWER"] } }
          : { role: { not: "OWNER" } }),
      },
    });

    if (deleteResult.count === 0) {
      return NextResponse.json(
        { success: false, message: "Workspace member not found or cannot be removed" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Workspace member removed successfully",
      memberId,
    });
  } catch (error) {
    console.error("Remove workspace member error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to remove workspace member",
      },
      { status: 500 }
    );
  }
}
