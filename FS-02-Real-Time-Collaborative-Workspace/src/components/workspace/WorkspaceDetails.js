
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  getWorkspace,
  getWorkspacePages,
  createWorkspacePage,
} from "@/services/workspaceService";

export default function WorkspaceDetails({ workspaceId }) {
  const [workspace, setWorkspace] = useState(null);
  const [pages, setPages] = useState([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    try {
      setError("");

      const [workspaceData, pagesData] = await Promise.all([
        getWorkspace(workspaceId),
        getWorkspacePages(workspaceId),
      ]);

      setWorkspace(workspaceData.workspace);
      setPages(pagesData.pages || []);
    } catch (err) {
      setError(err.message || "Failed to load workspace");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreatePage(event) {
    event.preventDefault();
    if (title.trim().length < 2) {
      setError("Page title must contain at least 2 characters");
      return;
    }

    try {
      setCreating(true);
      setError("");
      setMessage("");

      await createWorkspacePage(workspaceId, title.trim());
      setTitle("");
      setMessage("Page created successfully!");
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to create page");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return <main className="p-8 text-slate-600">Loading workspace...</main>;
  }

  if (!workspace) {
    return (
      <main className="p-8">
        <p className="text-red-600">{error || "Workspace not found"}</p>
        <Link href="/dashboard" className="text-indigo-600">
          Back to dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Back to workspaces
        </Link>

        <section className="mt-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {workspace.name}
              </h1>
              <p className="mt-2 text-slate-600">
                {workspace.description || "No description provided."}
              </p>
            </div>

            <span className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
              {workspace.myRole}
            </span>
          </div>

          <div className="mt-6 flex gap-8 border-t border-slate-100 pt-5 text-sm text-slate-600">
            <span>{workspace.memberCount} Members</span>
            <span>{workspace.pageCount} Pages</span>
          </div>

          <Link
            href={`/workspaces/${workspaceId}/members`}
            className="mt-5 inline-block text-sm font-medium text-indigo-600 hover:underline"
          >
            Manage members →
          </Link>
        </section>

        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            Create a new page
          </h2>

          <form onSubmit={handleCreatePage} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Enter page title"
              maxLength={100}
              required
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />

            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {creating ? "Creating..." : "+ Create Page"}
            </button>
          </form>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {message && <p className="mt-3 text-sm text-green-600">{message}</p>}
        </section>

        <section className="mt-8">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">
            Workspace pages ({pages.length})
          </h2>

          {pages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="font-medium text-slate-800">No pages yet</p>
              <p className="mt-2 text-sm text-slate-500">
                Create your first page to start collaborating.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pages.map((page) => (
                <article
                  key={page.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <h3 className="font-semibold text-slate-900">{page.title}</h3>
                  <p className="mt-2 text-xs text-slate-500">
                    Updated: {new Date(page.updatedAt).toLocaleString()}
                  </p>
                  <Link
                    href={`/workspaces/${workspaceId}/pages/${page.id}`}
                    className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline"
                  >
                    Open page →
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
