# 🎓 Placement Command
### Intelligent Campus Placement & Interview Scheduling Platform

**Plan smarter. Resolve conflicts. Make campus placements seamless.**

Placement Command is a campus placement management platform designed to streamline the interview scheduling process for students, placement officers, placement coordinators and interview panels.

It brings student information, company requirements, eligibility tracking, interview schedules and conflict management into a unified system—helping placement teams coordinate recruitment activities more efficiently.

---

## ✨ Overview

Campus placement drives involve multiple companies, hundreds of candidates, limited interview rooms and busy interview panels. Managing these moving parts manually can lead to scheduling conflicts, inefficient resource allocation and communication gaps.

**Placement Command aims to solve these challenges** through centralized placement operations, database-backed scheduling, conflict detection and a structured recovery workflow.

The platform combines a modern web interface with a backend API and PostgreSQL database.

## 🚀 Key Features

### 📊 Placement Operations Dashboard
- Overview of placement activities and interview progress.
- Candidate, company and scheduling metrics derived from application data.
- Centralized visibility into operational activity.
- A foundation for analytics across candidates, companies and interview schedules.

### 👨‍🎓 Student Portal
- Student-specific access to placement information.
- Student profile and academic information.
- Access to the student's interview schedule.
- Support for student notifications and placement-related updates.

### 🏢 Company & Eligibility Management
- Centralized company information.
- Company eligibility criteria, including academic requirements.
- Candidate application and eligibility tracking.
- Structured mandatory and preferred criteria.

### 🗓️ Interview Scheduling
- Centralized interview timetable.
- Interview assignments linked to students, companies and rooms.
- Interview panel information, including multiple interviewers.
- Schedule visibility across interview rooms and time slots.

### ⚠️ Conflict Detection
- Detection of overlapping student interviews.
- Room double-booking detection.
- Interviewer availability conflict detection.
- Cross-company scheduling conflict checks.
- Conflict responses that can be displayed in the scheduling interface.

### 🔄 Schedule Recovery
- Recovery proposal workflow for scheduling conflicts.
- Proposed schedule changes with before-and-after information.
- Approval and application workflow for proposed changes.
- Transaction-based schedule updates and stale-state checks where implemented.

### 📝 Audit Trail & Notifications
- Audit records for important scheduling and approval actions.
- Persistent student notifications for relevant schedule updates.
- Database-backed records to support traceability.

### 🔐 Role-Aware Access
The application is designed around five operational roles:

| Role | Primary responsibility |
|---|---|
| Administrator | System administration and configuration |
| Placement Officer | Student records, company requirements and eligibility |
| Placement Coordinator | Scheduling, recovery and placement operations |
| Panel Coordinator | Assigned interview operations and panel coordination |
| Student | Own profile, placement information and interview schedule |

Actual data access and write permissions must be enforced by the backend. The table describes intended responsibilities; consult the implementation for currently enforced permissions.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 |
| Language | TypeScript |
| Build Tool | Vite |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Database Driver | `pg` |
| Validation | Zod |
| API Communication | HTTP / REST |
| Scheduling Validation | Deterministic server-side validation |

The project uses a centralized frontend API client to communicate with the backend. A mock-data fallback is available for development when configured by the application.

---
### 📄 Resume Management & Privacy

Resume management is handled by the authorized Placement Coordinator to maintain data accuracy and prevent unauthorized document changes.

- **Student:** Can view their own resume status where available, but cannot upload, replace or delete a resume.
- **Placement Coordinator:** Responsible for the initial resume upload and replacing an existing resume when necessary.
- **Privacy:** Resume files must remain private and accessible only to authorized users.
- **Security:** Resume access must be enforced by the backend, not merely by hiding frontend controls.

The student portal must not display resume upload, replacement or deletion actions. All resume changes must follow the authorized coordinator workflow.
## 🏗️ Architecture

```text
┌──────────────────────────────────────────┐
│             React Frontend               │
│                                          │
│ Overview · Students · Companies          │
│ Schedule Board · Recovery · Approvals    │
└───────────────────┬──────────────────────┘
                    │ HTTP / REST
                    ▼
┌──────────────────────────────────────────┐
│          Express + TypeScript API        │
│                                          │
│ Routes · Validation · Business Logic     │
│ Scheduling · Recovery · Audit            │
└───────────────────┬──────────────────────┘
                    │ pg
                    ▼
┌──────────────────────────────────────────┐
│              PostgreSQL                  │
│                                          │
│ Users · Students · Companies             │
│ Applications · Interviews · Rooms        │
│ Recovery Proposals · Notifications       │
│ Audit Records                             │
└──────────────────────────────────────────┘
```

The backend is responsible for database operations and scheduling validation. The frontend presents the results and provides the operational interface.

---

## ⚙️ Getting Started

### Prerequisites

Install the following before running the project:

- Node.js and npm.
- PostgreSQL.
- Git.
- A code editor such as Visual Studio Code.

### 1. Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd "Campus interview"
```

Replace `<YOUR_REPOSITORY_URL>` with the actual repository URL.

### 2. Install dependencies

Install the frontend dependencies from the project root:

```bash
npm install
```

Install the backend dependencies:

```bash
npm --prefix server install
```

### 3. Configure PostgreSQL

Create a PostgreSQL database for the project:

```sql
CREATE DATABASE placement_command;
```

Configure the backend environment using the existing `.env.example` as the reference.

Create `server/.env` with the variables required by the actual backend configuration. Typical settings include:

```env
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/placement_command
```

Replace `YOUR_PASSWORD` with your local PostgreSQL password. If your password contains URL-special characters, encode them correctly.

Never commit `.env` files or credentials to GitHub.

### 4. Apply database migrations

From the project root, run the migration commands defined by the repository:

```bash
npm run migrate:status
npm run migrate:up
npm run migrate:status
```

If the initial migration is already applied, the migration status should report it as applied.

**Do not reset or drop an existing database to complete setup.**

### 5. Seed development data

For a new development database, use the project's development seed command:

```bash
npm run seed:dev
```

The seed is intended for development and should be used only after checking the environment and the current database state.

### 6. Start the backend

Open a terminal in the project root:

```bash
npm run dev:server
```

The backend is configured to run on port `4000` in the standard local setup.

### 7. Start the frontend

Open a second terminal in the project root:

```bash
npm run dev
```

Vite commonly serves the frontend at:

```text
http://localhost:5173
```

Use the actual URL printed by the development server if the port differs.

---

## 🔌 API Endpoints

The following endpoints have been reported as implemented. Verify the current route definitions before relying on them.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Backend health check |
| GET | `/api/health/db` | Database connection check |
| GET | `/api/overview` | Placement overview metrics |
| GET | `/api/students` | Retrieve student records |
| GET | `/api/students/:id` | Retrieve an individual student |
| GET | `/api/companies` | Retrieve companies |
| GET | `/api/companies/:id` | Retrieve a company |
| GET | `/api/interviews` | Retrieve interview assignments |
| PUT | `/api/interviews/:id/move` | Request an interview move |
| POST | `/api/recovery-proposals/generate` | Generate recovery proposals |
| POST | `/api/recovery-proposals` | Create a recovery proposal |
| POST | `/api/recovery-proposals/:id/decide` | Approve or reject a proposal |
| POST | `/api/recovery-proposals/:id/apply` | Apply an approved proposal |
| GET | `/api/audit` | Retrieve audit records |
| GET | `/api/users` | Retrieve user records |
| GET | `/api/notifications/:studentId` | Retrieve student notifications |

API availability, authorization requirements and response schemas depend on the current implementation.

---

## 🧪 Testing

Run the scripts available in the repository.

Examples of the reported project commands:

```bash
npm --prefix server run test:schema
npm --prefix server run test:api
npm --prefix server run typecheck
npm --prefix server run build
npm run build
```

These checks cover different aspects of the application:

- Database schema verification.
- API behavior and database-backed responses.
- Backend TypeScript correctness.
- Backend production compilation.
- Frontend TypeScript checks and production build.

A successful build does not, by itself, prove that every workflow works end-to-end. Verify interview moves, recovery proposals, approval permissions, transaction rollback and notifications against a development database.

---

## 🔒 Security & Privacy

Security is essential for a placement platform containing student records and resumes.

The intended security principles include:

- Server-side role-based authorization.
- Student access restricted to their own records.
- Private resume storage and authorized access.
- No plaintext password storage.
- No database credentials or API keys in frontend code.
- Parameterized database queries.
- Validation of incoming requests.
- Audit records for sensitive administrative actions.

**Production readiness requires verified authentication, authorization and private file-access controls.** Demo login functionality alone does not establish production-grade identity security.

---

## 🗺️ Roadmap

Potential improvements, subject to the current implementation and project requirements:

- Gemini-powered resume parsing and company-requirement matching.
- Enhanced placement analytics and interactive graphs.
- More advanced schedule optimization.
- Secure resume upload and document management.
- Improved real-time notifications.
- Expanded automated integration and concurrency testing.

Only mark these capabilities as completed after they have been implemented and verified.

---

## 🎯 Project Goal

Placement Command aims to make campus placement operations more organized, transparent and reliable by bringing student information, company requirements, interview scheduling and recovery workflows together in one platform.

The focus is not merely on generating schedules, but on making scheduling conflicts understandable and enabling safe, auditable recovery.

---

## 👥 Team

Team NULL STACKS

---

## 📄 License

Add the license selected by the project team before distributing or reusing this software.
