import WorkspaceDetails from "@/components/workspace/WorkspaceDetails";

export default async function WorkspacePage({ params }) {
  const { workspaceId } = await params;

  return <WorkspaceDetails workspaceId={workspaceId} />;
}