
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  createWorkspace,
  getWorkspaces,
} from "@/services/workspaceService";

export default function WorkspaceDashboard() {
  const [workspaces, setWorkspaces] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadWorkspaces = useCallback(async () => {
    setError("");

    try {
      const data = await getWorkspaces();
      setWorkspaces(data.workspaces || []);
    } catch (err) {
      setError(err.message || "Failed to load workspaces");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  async function handleCreateWorkspace(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const cleanName = name.trim();

    if (cleanName.length < 3 || cleanName.length > 50) {
      setError("Workspace name must be 3-50 characters");
      return;
    }

    setCreating(true);

    try {
      await createWorkspace(cleanName, description.trim());
      setName("");
      setDescription("");
      setMessage("Workspace created successfully!");
      await loadWorkspaces();
    } catch (err) {
      setError(err.message || "Failed to create workspace");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            My Workspaces
          </h1>
          <p className="mt-2 text-slate-600">
            Create and manage your collaborative workspaces.
          </p>
        </div>

        <section className="mb-10 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            Create a workspace
          </h2>

          <form onSubmit={handleCreateWorkspace} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="workspace-name"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Workspace name
              </label>

              <input
                id="workspace-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. My Team Workspace"
                maxLength={50}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label
                htmlFor="workspace-description"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Description (optional)
              </label>

              <textarea
                id="workspace-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What is this workspace for?"
                maxLength={500}
                rows={3}
                className="w-full resize-y rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}

            {message && (
              <p role="status" className="text-sm text-green-600">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? "Creating..." : "+ Create Workspace"}
            </button>
          </form>
        </section>

        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">
              Your workspaces
            </h2>

            <span className="text-sm text-slate-500">
              {workspaces.length} total
            </span>
          </div>

          {loading ? (
            <p className="py-8 text-center text-slate-500">
              Loading workspaces...
            </p>
          ) : workspaces.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <h3 className="font-semibold text-slate-800">
                No workspaces yet
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Create your first workspace to get started.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {workspaces.map((workspace) => (
                <Link
                  href={`/workspaces/${workspace.id}`}
                  key={workspace.id}
                  className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <h3 className="truncate text-lg font-semibold text-slate-900">
                    {workspace.name}
                  </h3>

                  <p className="mt-2 min-h-10 text-sm text-slate-500">
                    {workspace.description || "No description provided."}
                  </p>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
                    <span>{workspace.memberCount} members</span>
                    <span>{workspace.pageCount} pages</span>
                  </div>

                  <div className="mt-3">
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                      {workspace.myRole}
                    </span>
                  </div>

                  <p className="mt-4 text-sm font-semibold text-indigo-600">
                    Open workspace →
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
