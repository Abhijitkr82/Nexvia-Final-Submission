
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageComments from "@/components/workspace/PageComments";
import VersionHistory from "@/components/workspace/VersionHistory";
import CollaborativeRichEditor from "@/components/workspace/CollaborativeRichEditor";

const REALTIME_URL =
  process.env.NEXT_PUBLIC_REALTIME_URL || "ws://localhost:4000";

const EDIT_ROLES = ["OWNER", "ADMIN", "EDITOR"];

const CURSOR_COLORS = [
  "#4f46e5",
  "#0891b2",
  "#16a34a",
  "#db2777",
  "#ea580c",
  "#9333ea",
];

function getUserColor(userId) {
  const seed = String(userId || "guest")
    .split("")
    .reduce(
      (total, character) => total + character.charCodeAt(0),
      0
    );

  return CURSOR_COLORS[seed % CURSOR_COLORS.length];
}

export default function PageEditor({ workspaceId, pageId }) {
  const [page, setPage] = useState(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [synced, setSynced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [collaboration, setCollaboration] = useState(null);

  const [currentUser, setCurrentUser] = useState({
    id: "guest",
    name: "Collaborator",
    color: "#4f46e5",
  });

  const canEdit = EDIT_ROLES.includes(page?.myRole);

  useEffect(() => {
    let active = true;
    let provider;
    let doc;

    let handleSync;
    let handleStatus;
    let handleAwareness;
    let handleConnectionClose;

    async function initializeEditor() {
      try {
        const response = await fetch(`/api/pages/${pageId}`, {
          credentials: "same-origin",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load page");
        }

        if (!active) return;

        setPage(data.page);
        setTitle(data.page.title);

        let user = {
          id: "guest",
          name: "Collaborator",
        };

        try {
          const userResponse = await fetch("/api/auth/me", {
            credentials: "same-origin",
          });

          const userData = await userResponse.json();

          if (userResponse.ok && userData.user) {
            user = {
              id: userData.user.id,
              name: userData.user.name,
            };
          }
        } catch {
          // Keep fallback identity if profile request fails.
        }

        if (!active) return;

        const userWithColor = {
          ...user,
          color: getUserColor(user.id),
        };

        setCurrentUser(userWithColor);

        // Get a short-lived token for the realtime WebSocket.
        const tokenResponse = await fetch("/api/auth/realtime-token", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok || !tokenData.token) {
          throw new Error(
            tokenData.message ||
              "Unable to authenticate realtime connection"
          );
        }

        if (!active) return;

        const { WebsocketProvider } = await import("y-websocket");
        const Y = await import("yjs");

        if (!active) return;

        doc = new Y.Doc();

        provider = new WebsocketProvider(
          REALTIME_URL,
          pageId,
          doc,
          {
            params: {
              token: tokenData.token,
            },
          }
        );

        provider.awareness.setLocalStateField("user", {
          name: userWithColor.name,
          color: userWithColor.color,
        });

        setCollaboration({ doc, provider });

        handleSync = (isSynced) => {
          if (active) {
            setSynced(isSynced);
          }
        };

        handleStatus = ({ status }) => {
          if (active) {
            setConnected(status === "connected");
          }
        };

        handleAwareness = () => {
          if (!active) return;

          const users = Array.from(
            provider.awareness.getStates().values()
          )
            .map((state) => state.user)
            .filter(Boolean);

          setOnlineUsers(users);
        };

        handleConnectionClose = (event) => {
          if (active && event?.code === 1012) {
            window.location.reload();
          }
        };

        provider.on("sync", handleSync);
        provider.on("status", handleStatus);
        provider.on("connection-close", handleConnectionClose);

        provider.awareness.on("change", handleAwareness);

        handleAwareness();

        setLoading(false);
      } catch (err) {
        if (active) {
          setError(err.message || "Unable to initialize editor");
          setLoading(false);
        }
      }
    }

    initializeEditor();

    return () => {
      active = false;

      if (provider) {
        if (handleSync) provider.off("sync", handleSync);
        if (handleStatus) provider.off("status", handleStatus);

        if (handleConnectionClose) {
          provider.off("connection-close", handleConnectionClose);
        }

        if (handleAwareness) {
          provider.awareness.off("change", handleAwareness);
        }

        provider.destroy();
      }

      if (doc) {
        doc.destroy();
      }
    };
  }, [pageId]);

  async function saveTitle() {
    if (!title.trim() || !page || saving) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/pages/${pageId}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save title");
      }

      setPage(data.page);
      setTitle(data.page.title);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-600">
        Loading page editor...
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex min-h-screen items-center justify-center text-red-600">
        {error || "Page not found"}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <Link
            href={`/workspaces/${workspaceId}`}
            className="text-sm font-medium text-indigo-600 hover:underline"
          >
            ← Back to workspace
          </Link>

          <div className="flex items-center gap-3 text-sm">
            <span
              className={
                connected ? "text-green-600" : "text-amber-600"
              }
            >
              ● {connected ? "Connected" : "Connecting..."}
            </span>

            <span className="text-slate-500">
              {synced ? "Synced" : "Syncing"}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-5">
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              {page.myRole}
            </span>

            <span className="text-sm text-slate-500">
              {onlineUsers.length} online
            </span>
          </div>

          <label className="mb-2 block text-sm font-medium text-slate-700">
            Page title
          </label>

          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={!canEdit}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-xl font-bold text-slate-900 outline-none focus:border-indigo-500 disabled:bg-slate-100"
            />

            {canEdit && (
              <button
                onClick={saveTitle}
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save title"}
              </button>
            )}
          </div>

          <div className="mb-3 flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-slate-700">
              Document content
            </label>

            <span className="text-xs text-slate-500">
              {synced
                ? "Live collaboration enabled"
                : "Waiting for sync"}
            </span>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
            {collaboration && (
              <CollaborativeRichEditor
                doc={collaboration.doc}
                provider={collaboration.provider}
                user={currentUser}
                canEdit={canEdit}
                synced={synced}
              />
            )}

            {!collaboration && (
              <div className="min-h-[420px] p-5 text-sm text-slate-500">
                Connecting to realtime server...
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
            <span>
              {canEdit
                ? "You can edit this document"
                : "Read-only access"}
            </span>

            <span>Changes sync automatically</span>
          </div>
        </section>

        <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-slate-900">
            Active collaborators
          </h2>

          <div className="flex flex-wrap gap-3">
            {onlineUsers.map((user, index) => (
              <div
                key={`${user.name}-${index}`}
                className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-700"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: user.color || "#64748b",
                  }}
                />

                {user.name || "Collaborator"}
              </div>
            ))}

            {onlineUsers.length === 0 && (
              <p className="text-sm text-slate-500">
                No collaborators connected yet.
              </p>
            )}
          </div>
        </section>

        <PageComments pageId={pageId} />

        <VersionHistory
          pageId={pageId}
          myRole={page.myRole}
        />
      </div>
    </main>
  );
}
