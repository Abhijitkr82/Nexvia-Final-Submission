
# Nexvia FS-02 - API Documentation

## 1. Overview

Nexvia FS-02 is a real-time collaborative workspace application.

The backend API is implemented using Next.js App Router route handlers. It uses JSON for request and response data, cookie-based authentication, Prisma ORM, and PostgreSQL.

### Local API Base URL

`http://localhost:3000`

### Authentication

Authenticated endpoints use the `auth_token` HTTP cookie.

Requests must include the valid authentication cookie. Authorization is checked by the relevant route handlers using workspace membership and role-based permissions.

---

## 2. API Endpoints

### 2.1 Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Log in a user |
| POST | `/api/auth/logout` | Log out the current user |
| GET | `/api/auth/me` | Get the current authenticated user |

### 2.2 Database Health

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health/db` | Check database connectivity |

### 2.3 Workspaces

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/workspaces` | List workspaces accessible to the current user |
| POST | `/api/workspaces` | Create a workspace |
| GET | `/api/workspaces/[workspaceId]` | Get workspace details |

### 2.4 Workspace Members

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/workspaces/[workspaceId]/members` | List workspace members |
| POST | `/api/workspaces/[workspaceId]/members` | Add a workspace member |
| PATCH | `/api/workspaces/[workspaceId]/members/[memberId]` | Update a member's role |
| DELETE | `/api/workspaces/[workspaceId]/members/[memberId]` | Remove a workspace member |

### 2.5 Workspace Pages

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/workspaces/[workspaceId]/pages` | List pages in a workspace |
| POST | `/api/workspaces/[workspaceId]/pages` | Create a page |

### 2.6 Page Operations

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/pages/[pageId]` | Fetch page details |
| PATCH | `/api/pages/[pageId]` | Update page details |
| DELETE | `/api/pages/[pageId]` | Delete a page |

### 2.7 Comments

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/pages/[pageId]/comments` | List page comments |
| POST | `/api/pages/[pageId]/comments` | Create a comment |
| PATCH | `/api/comments/[commentId]` | Update comment content or resolution status |
| DELETE | `/api/comments/[commentId]` | Delete a comment |

### 2.8 Version History

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/pages/[pageId]/versions` | List page versions |
| POST | `/api/pages/[pageId]/versions` | Create a version snapshot |
| POST | `/api/pages/[pageId]/versions/[versionId]/restore` | Restore a previous version |

---

## 3. Request and Response Format

The API uses JSON for request bodies and responses where applicable.

Example page title update:

**PATCH** `/api/pages/[pageId]`

```json
{
  "title": "Project Documentation"
}
```

Example comment creation:

**POST** `/api/pages/[pageId]/comments`

```json
{
  "content": "This section needs more details."
}
```

The authenticated user is used as the comment author by the server.

---

## 4. Authentication and Authorization

- Authentication is handled using the `auth_token` cookie.
- Protected endpoints require an authenticated user.
- Workspace membership and role-based permissions control access to workspace resources.
- Authorization checks are performed by individual route handlers.
- The supported workspace roles are:

| Role | Description |
|---|---|
| OWNER | Workspace owner |
| ADMIN | Workspace administrator |
| EDITOR | Can edit permitted workspace content |
| COMMENTER | Can perform permitted comment operations |
| VIEWER | Read-only access where permitted |

The exact permissions depend on the operation and are enforced by the backend.

---

## 5. Version Snapshot and Restore

The version history API stores and retrieves page snapshots.

- `GET /api/pages/[pageId]/versions` returns up to 50 versions, ordered newest first.
- `POST /api/pages/[pageId]/versions` requests a snapshot from the internal real-time service.
- The internal snapshot request uses `REALTIME_INTERNAL_SECRET` for authentication.
- The restore endpoint requests restoration of a selected previous version.

The internal real-time service URL defaults to `http://localhost:4000` when `REALTIME_INTERNAL_URL` is not configured.

---

## 6. Real-Time Collaboration

Real-time document collaboration is handled separately from the standard HTTP API.

The application uses:

- WebSocket connections for real-time communication.
- Yjs for collaborative document synchronization.
- Awareness updates for online presence and collaborator information.
- Redis for cross-instance real-time coordination.
- PostgreSQL for persistent application and document data.

The real-time WebSocket service is configured through `NEXT_PUBLIC_REALTIME_URL`.

---

## 7. Common HTTP Status Codes

| Status Code | Meaning |
|---|---|
| 200 | Request completed successfully |
| 201 | Resource created successfully |
| 400 | Invalid request data |
| 401 | Authentication required or invalid |
| 403 | Permission denied |
| 404 | Resource not found |
| 500 | Internal server error |
| 502 | Internal service communication error |
| 503 | Required service unavailable |

---

## 8. API Summary

The application contains 15 HTTP route-handler files supporting 24 HTTP methods across authentication, database health, workspaces, members, pages, comments, and version history.

The separate WebSocket service provides real-time collaborative editing and presence functionality.
