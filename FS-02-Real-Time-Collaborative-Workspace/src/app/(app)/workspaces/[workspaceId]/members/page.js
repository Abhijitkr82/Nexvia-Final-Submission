import WorkspaceMembers from "@/components/workspace/WorkspaceMembers";

export default async function WorkspaceMembersPage({ params }) {
  const { workspaceId } = await params;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <WorkspaceMembers workspaceId={workspaceId} />
    </div>
  );
}