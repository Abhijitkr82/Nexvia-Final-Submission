
import PageEditor from "@/components/workspace/PageEditor";

export default async function PageEditorRoute({ params }) {
  const { workspaceId, pageId } = await params;

  return (
    <PageEditor
      workspaceId={workspaceId}
      pageId={pageId}
    />
  );
}
