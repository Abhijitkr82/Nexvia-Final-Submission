
"use client";

import { useCallback, useEffect, useState } from "react";

const EDIT_ROLES = ["OWNER", "ADMIN", "EDITOR"];

export default function VersionHistory({ pageId, myRole }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restoringId, setRestoringId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canManageVersions = EDIT_ROLES.includes(myRole);

  const loadVersions = useCallback(async () => {
    try {
      setError("");

      const response = await fetch(`/api/pages/${pageId}/versions`, {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Failed to load versions"
        );
      }

      setVersions(data.versions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  async function saveVersion() {
    if (saving) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch(`/api/pages/${pageId}/versions`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Failed to save version"
        );
      }

      setSuccess("Version saved successfully.");
      await loadVersions();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function restoreVersion(version) {
    const confirmed = window.confirm(
      `Restore the version saved on ${formatDate(version.createdAt)}?\n\nYour current document content will be replaced.`
    );

    if (!confirmed) return;

    try {
      setRestoringId(version.id);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/pages/${pageId}/versions/${version.id}/restore`,
        { method: "POST" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Failed to restore version"
        );
      }

      setSuccess("Version restored. Reloading document...");

      // Reconnect the editor with the restored document.
      window.setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      setError(err.message);
      setRestoringId(null);
    }
  }

  function formatDate(date) {
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Version History
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Save document snapshots and restore previous versions.
          </p>
        </div>

        {canManageVersions && (
          <button
            onClick={saveVersion}
            disabled={saving || restoringId !== null}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save version"}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-800">
            Saved versions
          </h3>

          <button
            onClick={loadVersions}
            disabled={loading}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Loading version history...
          </p>
        ) : versions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 py-8 text-center">
            <p className="text-sm font-medium text-slate-700">
              No saved versions yet
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Save a version to create your first document snapshot.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {versions.map((version, index) => (
              <div
                key={version.id}
                className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      Version {versions.length - index}
                    </span>

                    {index === 0 && (
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                        Latest
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm text-slate-600">
                    {version.creator?.name || "Workspace member"}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(version.createdAt)}
                  </p>
                </div>

                {canManageVersions && (
                  <button
                    onClick={() => restoreVersion(version)}
                    disabled={saving || restoringId !== null}
                    className="shrink-0 rounded-lg border border-indigo-200 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {restoringId === version.id
                      ? "Restoring..."
                      : "Restore"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
