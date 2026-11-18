
"use client";

import { useCallback, useEffect, useState } from "react";

export default function PageComments({ pageId }) {
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");

  const loadComments = useCallback(async () => {
    try {
      setError("");

      const response = await fetch(
        `/api/pages/${pageId}/comments`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load comments");
      }

      setComments(data.comments || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  async function addComment(e) {
    e.preventDefault();

    if (!content.trim()) return;

    try {
      setSubmitting(true);
      setError("");

      const response = await fetch(
        `/api/pages/${pageId}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: content.trim() }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add comment");
      }

      setComments((prev) => [...prev, data.comment]);
      setContent("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function updateComment(commentId, payload) {
    try {
      setError("");

      const response = await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update comment");
      }

      setComments((prev) =>
        prev.map((item) =>
          item.id === commentId ? data.comment : item
        )
      );

      setEditingId(null);
      setEditContent("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteComment(commentId) {
    if (!window.confirm("Delete this comment?")) return;

    try {
      setError("");

      const response = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete comment");
      }

      setComments((prev) =>
        prev.filter((item) => item.id !== commentId)
      );
    } catch (err) {
      setError(err.message);
    }
  }

  function formatDate(date) {
    return new Date(date).toLocaleString();
  }

  return (
    <section className="mt-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Comments
          </h2>
          <p className="text-sm text-gray-500">
            Discuss this page with your workspace members.
          </p>
        </div>

        <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
          {comments.length}
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={addComment} className="mb-6">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a comment..."
          rows={3}
          maxLength={2000}
          className="w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />

        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            Share your thoughts with the team
          </span>

          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Posting..." : "Add comment"}
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {loading ? (
          <p className="py-5 text-center text-sm text-gray-500">
            Loading comments...
          </p>
        ) : comments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center">
            <p className="text-sm font-medium text-gray-700">
              No comments yet
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Be the first to start a discussion.
            </p>
          </div>
        ) : (
          comments.map((comment) => {
            const permissions = comment.permissions || {};

            return (
              <article
                key={comment.id}
                className={`rounded-lg border p-4 ${
                  comment.resolved
                    ? "border-green-200 bg-green-50/50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {comment.author?.name || "Workspace member"}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {formatDate(comment.createdAt)}
                    </p>
                  </div>

                  {comment.resolved && (
                    <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                      Resolved
                    </span>
                  )}
                </div>

                {editingId === comment.id ? (
                  <div className="mt-3">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      maxLength={2000}
                      className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 outline-none focus:border-indigo-500"
                    />

                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() =>
                          updateComment(comment.id, {
                            content: editContent.trim(),
                          })
                        }
                        disabled={!editContent.trim()}
                        className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                      >
                        Save
                      </button>

                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditContent("");
                        }}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm text-gray-700">
                    {comment.content}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-200 pt-3">
                  {permissions.canEdit && editingId !== comment.id && (
                    <button
                      onClick={() => {
                        setEditingId(comment.id);
                        setEditContent(comment.content);
                      }}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      Edit
                    </button>
                  )}

                  {permissions.canResolve && (
                    <button
                      onClick={() =>
                        updateComment(comment.id, {
                          resolved: !comment.resolved,
                        })
                      }
                      className="text-xs font-medium text-green-700 hover:text-green-900"
                    >
                      {comment.resolved ? "Reopen" : "Resolve"}
                    </button>
                  )}

                  {permissions.canDelete && (
                    <button
                      onClick={() => deleteComment(comment.id)}
                      className="text-xs font-medium text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
