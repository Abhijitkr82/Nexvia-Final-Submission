# Nexvia FS-02 — Real-Time Collaborative Workspace

A full-stack collaborative workspace application that allows multiple users to work together on shared pages with real-time synchronization, role-based access control, comments, and version history.

## Features

- User registration, login, and cookie-based authentication
- Workspace creation and management
- Workspace member management
- Role-based access control:
  - OWNER
  - ADMIN
  - EDITOR
  - COMMENTER
  - VIEWER
- Collaborative rich-text editing
- Real-time document synchronization using Yjs and WebSockets
- Online collaborator presence and awareness
- Page comments and comment resolution
- Page version history
- Document version restoration
- PostgreSQL database persistence
- Redis Pub/Sub for cross-instance real-time synchronization

## Technology Stack

**Frontend**
- Next.js 16
- React 19
- JavaScript
- Tailwind CSS
- Tiptap

**Backend**
- Next.js API Routes
- Node.js
- WebSocket (`ws`)
- Yjs and y-websocket

**Database and Infrastructure**
- PostgreSQL
- Neon
- Prisma ORM
- Redis / Upstash
- JWT authentication
- bcryptjs

## Project Structure

```text
nexvia-fs02/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── realtime-server/
│   ├── config/
│   ├── middleware/
│   ├── services/
│   └── server.js
├── src/
│   ├── app/
│   │   ├── (app)/
│   │   ├── (auth)/
│   │   ├── api/
│   │   └── workspaces/
│   ├── components/
│   ├── lib/
│   └── services/
├── tests/
├── prisma.config.ts
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 24 or compatible supported version
- npm
- PostgreSQL database
- Redis instance

### Installation

Clone the repository:

```bash
git clone https://github.com/Abhijitkr82/nexvia-fs02.git
cd nexvia-fs02
```

Install dependencies:

```bash
npm install
```

Create a local `.env` file using `.env.example` as a template and configure the required environment variables.

Generate Prisma Client:

```bash
npx prisma generate
```

Apply database migrations:

```bash
npx prisma migrate deploy
```

### Run the Application

Start the Next.js development server:

```bash
npm run dev
```

Start the realtime WebSocket server in a separate terminal:

```bash
npm run realtime
```

Open:

```text
http://localhost:3000
```

## Environment Variables

The application requires database, authentication, realtime server, and Redis configuration.

See `.env.example` for the variable names and placeholder format.

Never commit actual credentials, tokens, or environment files.

## API Overview

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register a user |
| POST | `/api/auth/login` | Authenticate a user |
| POST | `/api/auth/logout` | Log out |
| GET | `/api/auth/me` | Get current user |
| GET / POST | `/api/workspaces` | List or create workspaces |
| GET | `/api/workspaces/[workspaceId]` | Get workspace |
| GET / POST | `/api/workspaces/[workspaceId]/members` | List or add members |
| GET / PATCH / DELETE | `/api/workspaces/[workspaceId]/members/[memberId]` | Manage members |
| GET / POST | `/api/workspaces/[workspaceId]/pages` | List or create pages |
| GET / PATCH | `/api/pages/[pageId]` | Get or update page |
| GET / POST | `/api/pages/[pageId]/comments` | List or create comments |
| PATCH / DELETE | `/api/comments/[commentId]` | Update or delete comment |
| GET / POST | `/api/pages/[pageId]/versions` | List or create versions |
| POST | `/api/pages/[pageId]/versions/[versionId]/restore` | Restore a version |
| GET | `/api/health/db` | Database health check |

## Realtime Architecture

The application uses Yjs shared documents with a WebSocket server to synchronize collaborative editing sessions.

Redis Pub/Sub distributes document updates and awareness information across realtime server instances.

PostgreSQL stores workspace data, users, comments, page metadata, and document version snapshots.

## Build

Run the production build:

```bash
npm run build
```

The build script generates Prisma Client before building Next.js.

## Security Notes

- Authentication uses JWT stored in an HTTP cookie.
- Passwords are hashed using bcryptjs.
- Workspace roles control access to collaborative features.
- Internal version snapshot operations use a separate shared secret.
- Never expose private environment variables in frontend code.
- Use HTTPS/WSS and production environment variables when deployed.

## Project Status

Developed as part of the Nexvia FS-02 internship project.

Further deployment details and live demo information will be added after production deployment.

:::