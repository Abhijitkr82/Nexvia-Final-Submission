import { apiRequest } from "@/services/apiClient";

export function getWorkspaces() {
  return apiRequest("/api/workspaces");
}

export function createWorkspace(name, description) {
  return apiRequest("/api/workspaces", {
    method: "POST",
    body: { name, description },
  });
}

export function getWorkspace(workspaceId) {
  return apiRequest(`/api/workspaces/${workspaceId}`);
}

export function getWorkspacePages(workspaceId) {
  return apiRequest(`/api/workspaces/${workspaceId}/pages`);
}

export function createWorkspacePage(workspaceId, title) {
  return apiRequest(`/api/workspaces/${workspaceId}/pages`, {
    method: "POST",
    body: { title },
  });
}
