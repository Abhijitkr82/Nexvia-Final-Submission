
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import getCurrentUser from "@/lib/auth/getCurrentUser";

// POST: Create a new workspace
export async function POST(request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please login." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description } = body;

    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, message: "Workspace name is required" },
        { status: 400 }
      );
    }

    const cleanName = name.trim();

    if (cleanName.length < 3 || cleanName.length > 50) {
      return NextResponse.json(
        {
          success: false,
          message: "Workspace name must be 3-50 characters",
        },
        { status: 400 }
      );
    }

    if (
      description !== undefined &&
      description !== null &&
      (typeof description !== "string" || description.length > 500)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid workspace description" },
        { status: 400 }
      );
    }

    const workspace = await prisma.$transaction(async (tx) => {
      return tx.workspace.create({
        data: {
          name: cleanName,
          description: description?.trim() || null,
          ownerId: user.id,
          members: {
            create: {
              userId: user.id,
              role: "OWNER",
            },
          },
        },
        include: {
          members: {
            select: {
              id: true,
              userId: true,
              role: true,
            },
          },
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: "Workspace created successfully",
        workspace,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create workspace error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to create workspace" },
      { status: 500 }
    );
  }
}

// GET: Fetch all workspaces of logged-in user
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please login." },
        { status: 401 }
      );
    }

    const memberships = await prisma.workspaceMember.findMany({
      where: {
        userId: user.id,
      },
      include: {
        workspace: {
          include: {
            _count: {
              select: {
                members: true,
                pages: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const workspaces = memberships.map((membership) => ({
      ...membership.workspace,
      myRole: membership.role,
      memberCount: membership.workspace._count.members,
      pageCount: membership.workspace._count.pages,
      _count: undefined,
    }));

    return NextResponse.json({
      success: true,
      count: workspaces.length,
      workspaces,
    });
  } catch (error) {
    console.error("Get workspaces error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch workspaces" },
      { status: 500 }
    );
  }
}
