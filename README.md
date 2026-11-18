# Nexvia — Final Project Submission

This repository contains the source code and documentation for both projects completed as part of the Nexvia Full-Stack Development Program.

## FS-02 — Real-Time Collaborative Workspace

A collaborative workspace application where users can create workspaces, manage members and roles, edit pages together in real time, add comments, and save document versions.

**Technology Stack:** Next.js, React, JavaScript, Tailwind CSS, Tiptap, Yjs, WebSockets, Node.js, PostgreSQL, Prisma, and Redis.

**Key Features:**
- User authentication
- Workspace and page management
- Role-based member permissions
- Real-time collaborative editing
- Collaborator presence and page comments
- Version snapshots

**Deployment:**
- Frontend: https://nexvia-fs02.vercel.app
- Realtime server: https://nexvia-fs02-realtime.onrender.com

Project folder: `FS-02-Real-Time-Collaborative-Workspace/`

## FS-01 — Multi-Vendor E-Commerce Marketplace

A multi-vendor marketplace with customer, vendor, and admin functionality, product management, cart and checkout workflows, order management, and coupon support.

**Technology Stack:** React, Vite, Tailwind CSS, Node.js, Express, MongoDB, Mongoose, Redis, Elasticsearch, JWT, bcrypt, Razorpay, and AWS S3.

**Key Features:**
- Customer, vendor, and admin roles
- Product and inventory management
- Cart and order workflows
- Coupon management
- Payment integration and invoice support
- Private product image URLs

Project folder: `FS-01-Multi-Vendor-Marketplace/`

The frontend and backend have separate README files with setup instructions.

## Repository Structure

- `FS-02-Real-Time-Collaborative-Workspace/` — FS-02 source code and documentation
- `FS-01-Multi-Vendor-Marketplace/` — FS-01 frontend and backend source code
- `.gitignore` — excludes dependencies, build output, and environment secrets

## Setup Instructions

1. Clone this repository.
2. Open the relevant project folder.
3. Follow that project's README for dependencies, environment variables, database configuration, and startup commands.
4. Use the available `.env.example` files as configuration templates.
5. Configure your own service credentials before running the applications.

Each project has separate dependencies and setup requirements.

## Documentation and Testing

Project-specific architecture, database, API, and test documentation is included in the respective project folders wherever available.

Formal load testing and quantified latency benchmarks were not performed for FS-02. Refer to its test report for the testing scope and results.

## Security

- Real environment files and credentials are not included.
- Use `.env.example` files as configuration templates.
- Never commit database passwords, API keys, JWT secrets, or payment credentials.

## Submission Deliverables

This repository contains the source code and available technical documentation for both projects. Presentation slides, individual reflections, and demo recordings are provided separately in the supporting submission folder.
