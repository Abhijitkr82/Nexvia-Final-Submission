
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import getCurrentUser from "@/lib/auth/getCurrentUser";

const ALLOWED_ROLES = ["ADMIN", "EDITOR", "COMMENTER", "VIEWER"];

export async function POST(request, { params }) {
  try {
    // 1. Authenticate current user
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please login." },
        { status: 401 }
      );
    }

    // 2. Get workspace ID
    const { workspaceId } = await params;

    // 3. Check current user's membership and role
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
        { success: false, message: "You do not have permission to add members" },
        { status: 403 }
      );
    }

    // 4. Read and validate request body
    const body = await request.json();
    const { email, role } = body;

    if (typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { success: false, message: "Member email is required" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, message: "Invalid member role" },
        { status: 400 }
      );
    }

    // 5. Prevent ADMIN from adding another ADMIN
    if (currentMembership.role === "ADMIN" && role === "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Only the owner can assign ADMIN role" },
        { status: 403 }
      );
    }

    // 6. Find user by email
    const targetUser = await prisma.user.findUnique({
      where: {
        email: cleanEmail,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: "User with this email does not exist" },
        { status: 404 }
      );
    }

    // 7. Prevent duplicate membership
    const existingMembership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: targetUser.id,
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { success: false, message: "User is already a workspace member" },
        { status: 409 }
      );
    }

    // 8. Add member
    const membership = await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: targetUser.id,
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

    return NextResponse.json(
      {
        success: true,
        message: "Member added successfully",
        membership,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Add workspace member error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to add workspace member" },
      { status: 500 }
    );
  }
}


export async function GET(request, { params }) {
  try {
    // 1. Authenticate current user
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please login." },
        { status: 401 }
      );
    }

    // 2. Get workspace ID
    const { workspaceId } = await params;

    // 3. Verify workspace membership
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: currentUser.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, message: "Workspace not found or access denied" },
        { status: 404 }
      );
    }

    // 4. Fetch all workspace members
    const members = await prisma.workspaceMember.findMany({
      where: {
        workspaceId,
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
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      count: members.length,
      members,
    });
  } catch (error) {
    console.error("Get workspace members error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch workspace members" },
      { status: 500 }
    );
  }
}
