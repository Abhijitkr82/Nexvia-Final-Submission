"use client";

import { useCallback, useEffect, useState } from "react";

const ROLES = ["ADMIN", "EDITOR", "COMMENTER", "VIEWER"];

const ROLE_DESCRIPTIONS = {
  OWNER: "Full workspace control",
  ADMIN: "Manage workspace and members",
  EDITOR: "Edit workspace pages",
  COMMENTER: "View and comment",
  VIEWER: "View-only access",
};

export default function WorkspaceMembers({ workspaceId }) {
  const [members, setMembers] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState({});
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState("EDITOR");

  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busyMemberId, setBusyMemberId] = useState("");

  const membersUrl = `/api/workspaces/${workspaceId}/members`;

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(membersUrl);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load members");
      }

      setMembers(data.members || []);

      const roles = {};
      (data.members || []).forEach((member) => {
        roles[member.id] = member.role;
      });

      setSelectedRoles(roles);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [membersUrl]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  async function handleAddMember(event) {
    event.preventDefault();

    try {
      setAdding(true);
      setError("");
      setMessage("");

      const response = await fetch(membersUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          role: newRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to add member");
      }

      setMessage(data.message || "Member added successfully");
      setEmail("");
      await loadMembers();
    } catch (err) {
      setError(err.message || "Failed to add member");
    } finally {
      setAdding(false);
    }
  }

  async function handleRoleUpdate(member) {
    const updatedRole = selectedRoles[member.id];

    if (updatedRole === member.role) {
      return;
    }

    try {
      setBusyMemberId(member.id);
      setError("");
      setMessage("");

      const response = await fetch(
        `${membersUrl}/${member.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role: updatedRole }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update role");
      }

      setMessage(data.message || "Member role updated");
      await loadMembers();
    } catch (err) {
      setError(err.message || "Failed to update role");
      await loadMembers();
    } finally {
      setBusyMemberId("");
    }
  }

  async function handleRemoveMember(member) {
    const confirmed = window.confirm(
      `Remove ${member.user.name} from this workspace?`
    );

    if (!confirmed) return;

    try {
      setBusyMemberId(member.id);
      setError("");
      setMessage("");

      const response = await fetch(
        `${membersUrl}/${member.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to remove member");
      }

      setMessage(data.message || "Member removed successfully");
      await loadMembers();
    } catch (err) {
      setError(err.message || "Failed to remove member");
    } finally {
      setBusyMemberId("");
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Workspace Members
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Manage people and their permissions in this workspace.
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Add member */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Add a member
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          The person must already have a Nexvia account.
        </p>

        <form
          onSubmit={handleAddMember}
          className="mt-5 flex flex-col gap-3 sm:flex-row"
        >
          <input
            type="email"
            required
            placeholder="Enter member email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />

          <select
            value={newRole}
            onChange={(event) => setNewRole(event.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-indigo-500"
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={adding}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {adding ? "Adding..." : "Add member"}
          </button>
        </form>
      </section>

      {/* Members list */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="font-semibold text-gray-900">
            All members ({members.length})
          </h2>

          <button
            type="button"
            onClick={loadMembers}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Loading members...
          </div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No members found.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {members.map((member) => {
              const isOwner = member.role === "OWNER";
              const isBusy = busyMemberId === member.id;

              return (
                <div
                  key={member.id}
                  className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
                      {member.user.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">
                        {member.user.name}
                      </p>
                      <p className="truncate text-sm text-gray-500">
                        {member.user.email}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {ROLE_DESCRIPTIONS[member.role]}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {isOwner ? (
                      <span className="rounded-full bg-purple-100 px-3 py-1.5 text-xs font-semibold text-purple-700">
                        OWNER
                      </span>
                    ) : (
                      <>
                        <select
                          value={selectedRoles[member.id] || member.role}
                          disabled={isBusy}
                          onChange={(event) =>
                            setSelectedRoles((previous) => ({
                              ...previous,
                              [member.id]: event.target.value,
                            }))
                          }
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-500 disabled:opacity-60"
                        >
                          {ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          disabled={
                            isBusy ||
                            selectedRoles[member.id] === member.role
                          }
                          onClick={() => handleRoleUpdate(member)}
                          className="rounded-lg border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isBusy ? "Saving..." : "Save"}
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleRemoveMember(member)}
                          className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}