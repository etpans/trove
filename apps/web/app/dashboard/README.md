# Dashboard

The dashboard uses the existing authenticated Next.js API proxies and React
Query cache. It provides an overview, workspace search, classes, courses,
students, and notes. On small screens, the navigation opens as a dismissible
drawer with keyboard focus management.

- **Overview:** live class, student, and note totals and recent observations.
- **Search:** matches class names and session dates, student names and roll
  numbers, and note titles, content, student names, and attachment metadata.
- **Classes:** existing classroom boards, student rosters, and class notes.
- **Courses:** browse, search, create, and edit the existing teacher-owned
  subject records through `/api/subjects`. Courses are separate from classroom
  rosters; this change introduces no new database model. Course deletion and
  assigning courses to notes are outside this MVP.
- **Students:** browse across classes and open each student's existing notes.
- **Notes:** browse all observations and retain editing, attachments, and
  sharing workflows.

Quick Add actions are available in the sidebar. Adding a student requires a
class; adding a note requires a student. The forms allow selecting the
appropriate class or student from anywhere in the workspace. Failed saves
retain the draft. If an attachment upload fails after creating a note, retrying
updates that note and retries only attachments that have not finished uploading.

Search and navigation state are local to the mounted dashboard. Refreshing the
page returns to Overview. Pins retain their existing in-memory behavior.

The visual direction takes inspiration from Atlas's sidebar and workspace
layout, with Trove branding, warm neutral surfaces, restrained accent colors,
and compact controls. No external assets or additional dependencies are needed.

Use the repository's isolated `Dockerfile.checks` verification workflow. Without
Docker, the existing workspace tools can run:

```bash
pnpm --filter web exec tsc --noEmit --incremental false
pnpm --filter web lint
pnpm --filter web build
```

Use mocked API responses or a disposable database for interaction checks.
Never use a shared database for destructive tests or seed scripts.
