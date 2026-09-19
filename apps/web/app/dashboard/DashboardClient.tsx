"use client";

import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useRef, useState, type FormEvent } from "react";

type SessionState = {
  authenticated: boolean;
  message?: string;
  user?: {
    email?: string;
    userId?: string;
  };
};

type Screen = "home" | "class" | "student";
type CreateMode =
  | "class"
  | "student"
  | "note"
  | "classActions"
  | "editClass"
  | "editStudent"
  | null;

type ClassRecord = {
  color?: string;
  createdAt?: string;
  id: number;
  name: string;
  session: string;
};

type StudentRecord = {
  class?: ClassRecord;
  classId: number;
  createdAt?: string;
  id: number;
  name: string;
  rollNumber?: string | null;
};

type NoteAttachmentRecord = {
  caption?: string | null;
  createdAt?: string;
  fileType: string;
  fileUrl: string;
  id: string;
};

type ShareLinkRecord = {
  createdAt?: string;
  expiresAt?: string | null;
  id: string;
  isActive?: boolean;
  token: string;
};

type NoteRecord = {
  attachments?: NoteAttachmentRecord[];
  content: string | null;
  createdAt?: string;
  id: number;
  shareLinks?: ShareLinkRecord[];
  student?: StudentRecord;
  studentId: number;
  title: string;
  updatedAt?: string;
};

type ClassForm = {
  name: string;
  session: string;
};

type StudentForm = {
  name: string;
  rollNumber: string;
};

type NoteForm = {
  content: string;
  studentId: string;
  title: string;
};

const queryClient = new QueryClient();

const cardColors = [
  "#F8E36D",
  "#B7D1F6",
  "#F5AAA6",
  "#A7F3D0",
  "#FFD166",
  "#C7D2FE",
  "#F9C6D3",
  "#BDE0FE",
];

const emptyClassForm = (): ClassForm => ({
  name: "",
  session: new Date().toISOString().slice(0, 10),
});

const emptyStudentForm: StudentForm = {
  name: "",
  rollNumber: "",
};

const emptyNoteForm: NoteForm = {
  content: "",
  studentId: "",
  title: "",
};

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Request failed.",
    );
  }

  return data as T;
}

async function fetchMultipartJson<T>(url: string, formData: FormData) {
  const response = await fetch(url, {
    body: formData,
    method: "POST",
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Request failed.",
    );
  }

  return data as T;
}

async function patchMultipartJson<T>(url: string, formData: FormData) {
  const response = await fetch(url, {
    body: formData,
    method: "PATCH",
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Request failed.",
    );
  }

  return data as T;
}

function DashboardContent() {
  const queryClient = useQueryClient();
  const [screen, setScreen] = useState<Screen>("home");
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createMode, setCreateMode] = useState<CreateMode>(null);
  const [classForm, setClassForm] = useState<ClassForm>(() => emptyClassForm());
  const [studentForm, setStudentForm] =
    useState<StudentForm>(emptyStudentForm);
  const [noteForm, setNoteForm] = useState<NoteForm>(emptyNoteForm);
  const [pinnedNoteIds, setPinnedNoteIds] = useState<number[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const sessionQuery = useQuery({
    queryFn: () => fetchJson<SessionState>("/api/auth/session"),
    queryKey: ["session"],
    retry: false,
  });

  const enabled = sessionQuery.data?.authenticated === true;

  const classesQuery = useQuery({
    enabled,
    queryFn: () => fetchJson<ClassRecord[]>("/api/classes"),
    queryKey: ["classes"],
  });
  const studentsQuery = useQuery({
    enabled,
    queryFn: () => fetchJson<StudentRecord[]>("/api/students"),
    queryKey: ["students"],
  });
  const notesQuery = useQuery({
    enabled,
    queryFn: () => fetchJson<NoteRecord[]>("/api/notes"),
    queryKey: ["notes"],
  });

  const classes = useMemo(() => classesQuery.data ?? [], [classesQuery.data]);
  const students = useMemo(() => studentsQuery.data ?? [], [studentsQuery.data]);
  const notes = useMemo(() => notesQuery.data ?? [], [notesQuery.data]);

  const selectedClass = classes.find((classItem) => {
    return classItem.id === selectedClassId;
  });
  const selectedStudent = students.find((student) => {
    return student.id === selectedStudentId;
  });
  const selectedNote = notes.find((note) => note.id === selectedNoteId);
  const classStudents = useMemo(() => {
    return selectedClassId
      ? students
          .filter((student) => student.classId === selectedClassId)
          .sort(sortStudentsByName)
      : [];
  }, [selectedClassId, students]);
  const classStudentIds = useMemo(() => {
    return new Set(classStudents.map((student) => student.id));
  }, [classStudents]);

  const visibleClasses = useMemo(() => {
    return classes
      .filter((classItem) => {
        return [classItem.name, classItem.session].some((value) => {
          return includesSearch(value, search);
        });
      })
      .sort((a, b) => compareDates(a.createdAt, b.createdAt));
  }, [classes, search]);

  const classNotes = useMemo(() => {
    return notes
      .filter((note) => classStudentIds.has(note.studentId))
      .filter((note) => noteMatchesSearch(note, search))
      .sort(sortNewest);
  }, [classStudentIds, notes, search]);

  const studentNotes = useMemo(() => {
    return notes
      .filter((note) => note.studentId === selectedStudentId)
      .filter((note) => noteMatchesSearch(note, search))
      .sort((a, b) => {
        const aPinned = pinnedNoteIds.includes(a.id);
        const bPinned = pinnedNoteIds.includes(b.id);

        if (aPinned !== bPinned) {
          return aPinned ? -1 : 1;
        }

        return sortNewest(a, b);
      });
  }, [notes, pinnedNoteIds, search, selectedStudentId]);

  const pageBusy =
    sessionQuery.isLoading ||
    classesQuery.isLoading ||
    studentsQuery.isLoading ||
    notesQuery.isLoading;

  const pageError =
    sessionQuery.error ||
    classesQuery.error ||
    studentsQuery.error ||
    notesQuery.error;

  async function invalidateDashboard() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["classes"] }),
      queryClient.invalidateQueries({ queryKey: ["students"] }),
      queryClient.invalidateQueries({ queryKey: ["notes"] }),
    ]);
  }

  function openClass(classId: number) {
    setSelectedClassId(classId);
    setSelectedStudentId(null);
    setSearch("");
    setScreen("class");
  }

  function openStudent(studentId: number) {
    setSelectedStudentId(studentId);
    setDrawerOpen(false);
    setSearch("");
    setScreen("student");
  }

  function openEditClass(classItem: ClassRecord) {
    setClassForm({
      name: classItem.name,
      session: normalizeDateInput(classItem.session),
    });
    setFormError(null);
    setCreateMode("editClass");
  }

  function openEditStudent(student: StudentRecord) {
    setStudentForm({
      name: student.name,
      rollNumber: student.rollNumber || "",
    });
    setFormError(null);
    setCreateMode("editStudent");
  }

  function openCreateNote(studentId?: number) {
    setNoteForm({
      ...emptyNoteForm,
      studentId: studentId ? String(studentId) : "",
    });
    setFormError(null);
    setCreateMode("note");
  }

  function openNote(note: NoteRecord) {
    setSelectedNoteId(note.id);
    setNoteForm({
      content: note.content || "",
      studentId: String(note.studentId),
      title: note.title,
    });
    setFormError(null);
  }

  async function handleCreateClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      await fetchJson<ClassRecord>("/api/classes", {
        body: JSON.stringify({
          color: getCardColor(classes.length),
          name: classForm.name,
          session: classForm.session,
        }),
        method: "POST",
      });
      setClassForm(emptyClassForm());
      setCreateMode(null);
      await invalidateDashboard();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClassId) {
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await fetchJson<StudentRecord>("/api/students", {
        body: JSON.stringify({
          classId: selectedClassId,
          name: studentForm.name,
          rollNumber: studentForm.rollNumber || undefined,
        }),
        method: "POST",
      });
      setStudentForm(emptyStudentForm);
      setCreateMode(null);
      await invalidateDashboard();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedClass) {
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await fetchJson<ClassRecord>(`/api/classes/${selectedClass.id}`, {
        body: JSON.stringify({
          name: classForm.name,
          session: classForm.session,
        }),
        method: "PATCH",
      });
      setCreateMode(null);
      await invalidateDashboard();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedStudent) {
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await fetchJson<StudentRecord>(`/api/students/${selectedStudent.id}`, {
        body: JSON.stringify({
          name: studentForm.name,
          rollNumber: studentForm.rollNumber || undefined,
        }),
        method: "PATCH",
      });
      setCreateMode(null);
      await invalidateDashboard();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const studentId = Number(noteForm.studentId || selectedStudentId);

    if (!studentId) {
      setFormError("Choose a student for this note.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await fetchJson<NoteRecord>("/api/notes", {
        body: JSON.stringify({
          content: noteForm.content,
          studentId,
          title: noteForm.title,
        }),
        method: "POST",
      });
      setNoteForm(emptyNoteForm);
      setCreateMode(null);
      await invalidateDashboard();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedNote) {
      return;
    }

    const studentId = Number(noteForm.studentId || selectedNote.studentId);
    if (!studentId) {
      setFormError("Choose a student for this note.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await fetchJson<NoteRecord>(`/api/notes/${selectedNote.id}`, {
        body: JSON.stringify({
          content: noteForm.content,
          studentId,
          title: noteForm.title,
        }),
        method: "PATCH",
      });
      await invalidateDashboard();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteClass(classItem: ClassRecord) {
    const confirmed = window.confirm(
      `Delete ${classItem.name}? This also removes its students and notes if the API allows it.`,
    );

    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await fetchJson(`/api/classes/${classItem.id}`, {
        method: "DELETE",
      });
      if (selectedClassId === classItem.id) {
        setSelectedClassId(null);
        setSelectedStudentId(null);
        setScreen("home");
      }
      await invalidateDashboard();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteStudent(student: StudentRecord) {
    const confirmed = window.confirm(
      `Delete ${student.name}? This also removes this student's notes if the API allows it.`,
    );

    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await fetchJson(`/api/students/${student.id}`, {
        method: "DELETE",
      });
      if (selectedStudentId === student.id) {
        setSelectedStudentId(null);
        setScreen("class");
      }
      await invalidateDashboard();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteNote(note: NoteRecord) {
    const confirmed = window.confirm(`Delete "${note.title}"?`);

    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await fetchJson(`/api/notes/${note.id}`, {
        method: "DELETE",
      });
      setSelectedNoteId(null);
      await invalidateDashboard();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAttachment(noteId: number, file?: File) {
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    const caption = window.prompt("Caption for this attachment", "");
    if (caption?.trim()) {
      formData.append("caption", caption.trim());
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await fetchMultipartJson(`/api/notes/${noteId}/attachments`, formData);
      await invalidateDashboard();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReplaceAttachment(
    noteId: number,
    attachmentId: string,
    file?: File,
  ) {
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setSubmitting(true);
    setFormError(null);

    try {
      await patchMultipartJson(
        `/api/notes/${noteId}/attachments/${attachmentId}`,
        formData,
      );
      await invalidateDashboard();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteAttachment(noteId: number, attachmentId: string) {
    const confirmed = window.confirm("Remove this attachment?");

    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await fetchJson(`/api/notes/${noteId}/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      await invalidateDashboard();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateShare(noteId: number) {
    setSubmitting(true);
    setFormError(null);

    try {
      const shareLink = await fetchJson<ShareLinkRecord>(
        `/api/notes/${noteId}/share`,
        {
          method: "POST",
        },
      );
      await copyShareLink(shareLink);
      await invalidateDashboard();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopyShare(shareLink: ShareLinkRecord) {
    try {
      await copyShareLink(shareLink);
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  }

  async function copyShareLink(shareLink: ShareLinkRecord) {
    const shareUrl = getShareUrl(shareLink.token);
    await navigator.clipboard.writeText(shareUrl);
    setCopiedShareId(shareLink.id);
    window.setTimeout(() => setCopiedShareId(null), 1600);
  }

  async function handleRevokeShare(shareLink: ShareLinkRecord) {
    const confirmed = window.confirm("Revoke this share link?");

    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await fetchJson(`/api/notes/share/${shareLink.id}`, {
        method: "DELETE",
      });
      await invalidateDashboard();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  function togglePinned(noteId: number) {
    setPinnedNoteIds((current) => {
      if (current.includes(noteId)) {
        return current.filter((id) => id !== noteId);
      }

      return [noteId, ...current];
    });
  }

  if (sessionQuery.isLoading) {
    return <DashboardLoading />;
  }

  if (sessionQuery.data?.authenticated !== true) {
    return <UnauthorizedDashboard />;
  }

  return (
    <main className="min-h-screen bg-white text-[#202124]">
      <header className="sticky top-0 z-20 border-b border-[#eceff1] bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <button
            aria-label="Open students"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-2xl text-[#5f6368] transition hover:bg-[#f1f3f4] disabled:opacity-30"
            disabled={screen === "home"}
            onClick={() => setDrawerOpen(true)}
            type="button"
          >
            ☰
          </button>
          <input
            className="h-12 min-w-0 flex-1 rounded-md border border-[#eceff1] bg-white px-4 text-base shadow-[0_1px_4px_rgba(60,64,67,0.18)] outline-none transition placeholder:text-[#80868b] focus:border-[#4285f4]"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={
              screen === "home"
                ? "Search classes"
                : "Search students, notes, files"
            }
            value={search}
          />
          <button
            className="hidden h-11 rounded-md px-3 text-sm font-semibold text-[#3c4043] transition hover:bg-[#f1f3f4] sm:block"
            onClick={() => invalidateDashboard()}
            type="button"
          >
            Refresh
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-28 pt-7">
        {pageError ? <ErrorBanner message={getErrorMessage(pageError)} /> : null}
        {formError ? <ErrorBanner message={formError} /> : null}
        {pageBusy ? <LoadingBar /> : null}

        {screen === "home" ? (
          <>
            <BoardTitle
              subtitle={`${visibleClasses.length} classroom board${
                visibleClasses.length === 1 ? "" : "s"
              }`}
              title="Classes"
            />
            <KeepGrid
              emptyText={
                search.trim()
                  ? "No classes match your search."
                  : "Create your first class."
              }
              items={visibleClasses}
              renderItem={(classItem, index) => (
                <article
                  className="min-h-40 rounded-lg p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(60,64,67,0.16)]"
                  key={classItem.id}
                  style={{
                    backgroundColor: getCardColor(index, classItem.color),
                  }}
                >
                  <button
                    className="block w-full text-left"
                    onClick={() => openClass(classItem.id)}
                    type="button"
                  >
                    <span className="block text-2xl font-semibold leading-tight">
                      {classItem.name}
                    </span>
                    <span className="mt-5 block text-sm text-[#5f6368]">
                      {formatDate(classItem.session)}
                    </span>
                  </button>
                  <div className="mt-6 flex gap-2">
                    <ActionButton onClick={() => openEditClass(classItem)}>
                      Edit
                    </ActionButton>
                    <ActionButton
                      danger
                      onClick={() => handleDeleteClass(classItem)}
                    >
                      Delete
                    </ActionButton>
                  </div>
                </article>
              )}
            />
          </>
        ) : null}

        {screen === "class" ? (
          <>
            <BoardTitle
              actions={
                selectedClass ? (
                  <>
                    <ActionButton onClick={() => openEditClass(selectedClass)}>
                      Edit class
                    </ActionButton>
                    <ActionButton
                      danger
                      onClick={() => handleDeleteClass(selectedClass)}
                    >
                      Delete class
                    </ActionButton>
                  </>
                ) : null
              }
              onBack={() => setScreen("home")}
              subtitle={`${classStudents.length} student${
                classStudents.length === 1 ? "" : "s"
              } · ${classNotes.length} visible note${
                classNotes.length === 1 ? "" : "s"
              }`}
              title={selectedClass?.name || "Class"}
            />
            <StudentStrip
              onEditStudent={openEditStudent}
              onOpenStudent={openStudent}
              students={classStudents}
            />
            <KeepGrid
              emptyText={
                search.trim()
                  ? "No notes match your search."
                  : "Create a student, then add the first note."
              }
              items={classNotes}
              renderItem={(note, index) => (
                <NoteCard
                  key={note.id}
                  color={getCardColor(index)}
                  note={note}
                  onAttach={handleAttachment}
                  onOpen={() => openNote(note)}
                  onShare={() => handleCreateShare(note.id)}
                  studentName={
                    students.find((student) => student.id === note.studentId)
                      ?.name
                  }
                />
              )}
            />
          </>
        ) : null}

        {screen === "student" ? (
          <>
            <BoardTitle
              actions={
                selectedStudent ? (
                  <>
                    <ActionButton onClick={() => openEditStudent(selectedStudent)}>
                      Edit student
                    </ActionButton>
                    <ActionButton
                      danger
                      onClick={() => handleDeleteStudent(selectedStudent)}
                    >
                      Delete student
                    </ActionButton>
                  </>
                ) : null
              }
              onBack={() => setScreen("class")}
              subtitle={`${studentNotes.length} visible note${
                studentNotes.length === 1 ? "" : "s"
              } · pinned notes stay first`}
              title={selectedStudent?.name || "Student"}
            />
            <KeepGrid
              emptyText={
                search.trim()
                  ? "No notes match your search."
                  : "Add the first note for this student."
              }
              items={studentNotes}
              renderItem={(note, index) => (
                <NoteCard
                  key={note.id}
                  color={getCardColor(index)}
                  isPinned={pinnedNoteIds.includes(note.id)}
                  note={note}
                  onAttach={handleAttachment}
                  onOpen={() => openNote(note)}
                  onPin={() => togglePinned(note.id)}
                  onShare={() => handleCreateShare(note.id)}
                />
              )}
            />
          </>
        ) : null}
      </section>

      <button
        aria-label="Create"
        className="fixed bottom-7 right-7 z-30 flex h-16 w-16 items-center justify-center rounded-full bg-white text-5xl leading-none text-[#4285f4] shadow-[0_8px_28px_rgba(60,64,67,0.32)] transition hover:scale-105"
        onClick={() => {
          if (screen === "home") {
            setFormError(null);
            setCreateMode("class");
          } else if (screen === "class") {
            setFormError(null);
            setCreateMode("classActions");
          } else {
            openCreateNote(selectedStudentId || undefined);
          }
        }}
        type="button"
      >
        +
      </button>

      <StudentDrawer
        onClose={() => setDrawerOpen(false)}
        onOpenStudent={openStudent}
        open={drawerOpen}
        students={classStudents}
      />

      <CreateModal onClose={() => setCreateMode(null)} open={createMode !== null}>
        {createMode === "classActions" ? (
          <div>
            <h2 className="text-2xl font-semibold">Create</h2>
            <button
              className="mt-5 block w-full border-b border-[#eceff1] py-4 text-left text-lg font-semibold"
              onClick={() => {
                setStudentForm(emptyStudentForm);
                setCreateMode("student");
              }}
              type="button"
            >
              Student
            </button>
            <button
              className="block w-full border-b border-[#eceff1] py-4 text-left text-lg font-semibold"
              onClick={() => openCreateNote()}
              type="button"
            >
              Note
            </button>
          </div>
        ) : null}

        {createMode === "class" ? (
          <CreateForm
            error={formError}
            onSubmit={handleCreateClass}
            submitting={submitting}
            submitText="Create class"
            title="New class"
          >
            <input
              className={inputClass}
              onChange={(event) =>
                setClassForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Class name"
              value={classForm.name}
            />
            <input
              className={inputClass}
              onChange={(event) =>
                setClassForm((current) => ({
                  ...current,
                  session: event.target.value,
                }))
              }
              type="date"
              value={classForm.session}
            />
          </CreateForm>
        ) : null}

        {createMode === "editClass" ? (
          <CreateForm
            error={formError}
            onSubmit={handleUpdateClass}
            submitting={submitting}
            submitText="Save class"
            title="Edit class"
          >
            <input
              className={inputClass}
              onChange={(event) =>
                setClassForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Class name"
              value={classForm.name}
            />
            <input
              className={inputClass}
              onChange={(event) =>
                setClassForm((current) => ({
                  ...current,
                  session: event.target.value,
                }))
              }
              type="date"
              value={classForm.session}
            />
          </CreateForm>
        ) : null}

        {createMode === "student" ? (
          <CreateForm
            error={formError}
            onSubmit={handleCreateStudent}
            submitting={submitting}
            submitText="Create student"
            title="New student"
          >
            <input
              className={inputClass}
              onChange={(event) =>
                setStudentForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Student name"
              value={studentForm.name}
            />
            <input
              className={inputClass}
              onChange={(event) =>
                setStudentForm((current) => ({
                  ...current,
                  rollNumber: event.target.value,
                }))
              }
              placeholder="Roll number"
              value={studentForm.rollNumber}
            />
          </CreateForm>
        ) : null}

        {createMode === "editStudent" ? (
          <CreateForm
            error={formError}
            onSubmit={handleUpdateStudent}
            submitting={submitting}
            submitText="Save student"
            title="Edit student"
          >
            <input
              className={inputClass}
              onChange={(event) =>
                setStudentForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Student name"
              value={studentForm.name}
            />
            <input
              className={inputClass}
              onChange={(event) =>
                setStudentForm((current) => ({
                  ...current,
                  rollNumber: event.target.value,
                }))
              }
              placeholder="Roll number"
              value={studentForm.rollNumber}
            />
          </CreateForm>
        ) : null}

        {createMode === "note" ? (
          <CreateForm
            error={formError}
            onSubmit={handleCreateNote}
            submitting={submitting}
            submitText="Create note"
            title="New note"
          >
            {screen === "class" ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {classStudents.map((student) => {
                  const selected = noteForm.studentId === String(student.id);

                  return (
                    <button
                      className={`shrink-0 rounded-full border px-3 py-2 text-sm font-semibold transition ${
                        selected
                          ? "border-[#202124] bg-[#202124] text-white"
                          : "border-[#dfe3e7] bg-white text-[#3c4043]"
                      }`}
                      key={student.id}
                      onClick={() =>
                        setNoteForm((current) => ({
                          ...current,
                          studentId: String(student.id),
                        }))
                      }
                      type="button"
                    >
                      {student.name}
                    </button>
                  );
                })}
              </div>
            ) : null}
            <input
              className={inputClass}
              onChange={(event) =>
                setNoteForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Title"
              value={noteForm.title}
            />
            <textarea
              className={`${inputClass} min-h-32 py-3`}
              onChange={(event) =>
                setNoteForm((current) => ({
                  ...current,
                  content: event.target.value,
                }))
              }
              placeholder="Note"
              value={noteForm.content}
            />
          </CreateForm>
        ) : null}

        {createMode === "classActions" ? (
          <button
            className="mt-6 h-12 w-full rounded-md border border-[#dfe3e7] text-sm font-semibold"
            onClick={() => setCreateMode(null)}
            type="button"
          >
            Cancel
          </button>
        ) : null}
      </CreateModal>

      <NoteModal
        copiedShareId={copiedShareId}
        error={formError}
        note={selectedNote}
        noteForm={noteForm}
        onAttach={handleAttachment}
        onClose={() => setSelectedNoteId(null)}
        onCopyShare={handleCopyShare}
        onDeleteAttachment={handleDeleteAttachment}
        onDeleteNote={handleDeleteNote}
        onReplaceAttachment={handleReplaceAttachment}
        onRevokeShare={handleRevokeShare}
        onShare={handleCreateShare}
        onSubmit={handleUpdateNote}
        setNoteForm={setNoteForm}
        students={classStudents}
        submitting={submitting}
      />
    </main>
  );
}

function BoardTitle({
  actions,
  onBack,
  subtitle,
  title,
}: {
  actions?: React.ReactNode;
  onBack?: () => void;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-center gap-3">
        {onBack ? (
          <button
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-md text-3xl text-[#3c4043] transition hover:bg-[#f1f3f4]"
            onClick={onBack}
            type="button"
          >
            {"<"}
          </button>
        ) : null}
        <div>
          <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-[#6f7478]">{subtitle}</p>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

function KeepGrid<T>({
  emptyText,
  items,
  renderItem,
}: {
  emptyText: string;
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
}) {
  if (items.length === 0) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-md border border-dashed border-[#dfe3e7] px-6 text-center text-[#6f7478]">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map(renderItem)}
    </div>
  );
}

function StudentStrip({
  onEditStudent,
  onOpenStudent,
  students,
}: {
  onEditStudent: (student: StudentRecord) => void;
  onOpenStudent: (studentId: number) => void;
  students: StudentRecord[];
}) {
  if (!students.length) {
    return null;
  }

  return (
    <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
      {students.map((student) => (
        <div
          className="flex shrink-0 items-center overflow-hidden rounded-full border border-[#dfe3e7] bg-white"
          key={student.id}
        >
          <button
            className="px-3 py-2 text-sm font-semibold text-[#303134] transition hover:bg-[#f8f9fa]"
            onClick={() => onOpenStudent(student.id)}
            type="button"
          >
            {student.name}
          </button>
          <button
            aria-label={`Edit ${student.name}`}
            className="border-l border-[#dfe3e7] px-2 py-2 text-xs font-semibold text-[#5f6368] transition hover:bg-[#f8f9fa]"
            onClick={() => onEditStudent(student)}
            type="button"
          >
            Edit
          </button>
        </div>
      ))}
    </div>
  );
}

function NoteCard({
  color,
  isPinned = false,
  note,
  onAttach,
  onOpen,
  onPin,
  onShare,
  studentName,
}: {
  color: string;
  isPinned?: boolean;
  note: NoteRecord;
  onAttach: (noteId: number, file?: File) => void;
  onOpen: () => void;
  onPin?: () => void;
  onShare: () => void;
  studentName?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeShare = getActiveShareLink(note);

  return (
    <article
      className="min-h-44 rounded-lg p-5 text-[#202124]"
      style={{ backgroundColor: color }}
    >
      <div className="flex items-start gap-3">
        <h2 className="min-w-0 flex-1 text-xl font-semibold leading-snug">
          {note.title}
        </h2>
        {onPin ? (
          <button
            aria-label={isPinned ? "Unpin note" : "Pin note"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/35 text-lg"
            onClick={onPin}
            type="button"
          >
            {isPinned ? "*" : "^"}
          </button>
        ) : null}
      </div>
      <button className="mt-3 block w-full text-left" onClick={onOpen} type="button">
        <p className="line-clamp-5 whitespace-pre-line text-sm leading-6 text-[#3c4043]">
          {note.content || "No body content"}
        </p>
      </button>
      {studentName ? (
        <p className="mt-4 text-xs font-semibold text-[#5f6368]">
          {studentName}
        </p>
      ) : null}
      {activeShare ? (
        <p className="mt-3 rounded-full bg-white/40 px-3 py-1 text-xs font-semibold text-[#303134]">
          Shared
        </p>
      ) : null}
      {note.attachments?.length ? (
        <div className="mt-4 grid gap-2">
          {note.attachments.map((attachment, index) => (
            <a
              className="block truncate rounded-md bg-white/45 px-3 py-2 text-xs font-semibold text-[#303134] transition hover:bg-white/70"
              href={attachment.fileUrl}
              key={attachment.id}
              rel="noreferrer"
              target="_blank"
            >
              {attachment.caption || getAttachmentLabel(attachment, index)}
            </a>
          ))}
        </div>
      ) : null}
      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="text-xs text-[#5f6368]">{formatDate(note.createdAt)}</span>
        <div className="flex gap-2">
          <button
            className="rounded-full bg-white/45 px-3 py-1.5 text-xs font-semibold text-[#303134] transition hover:bg-white/70"
            onClick={onOpen}
            type="button"
          >
            Open
          </button>
          <button
            className="rounded-full bg-white/45 px-3 py-1.5 text-xs font-semibold text-[#303134] transition hover:bg-white/70"
            onClick={onShare}
            type="button"
          >
            Share
          </button>
          <button
            className="rounded-full bg-white/45 px-3 py-1.5 text-xs font-semibold text-[#303134] transition hover:bg-white/70"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            + media
          </button>
        </div>
        <input
          className="hidden"
          onChange={(event) => onAttach(note.id, event.target.files?.[0])}
          ref={fileInputRef}
          type="file"
        />
      </div>
    </article>
  );
}

function StudentDrawer({
  onClose,
  onOpenStudent,
  open,
  students,
}: {
  onClose: () => void;
  onOpenStudent: (studentId: number) => void;
  open: boolean;
  students: StudentRecord[];
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 bg-[#202124]/30" onClick={onClose}>
      <aside
        className="h-full w-full max-w-sm bg-white px-6 py-8 shadow-[8px_0_30px_rgba(32,33,36,0.16)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Students</h2>
          <button
            aria-label="Close students"
            className="flex h-10 w-10 items-center justify-center rounded-md text-xl transition hover:bg-[#f1f3f4]"
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </div>
        <div className="mt-5">
          {students.length === 0 ? (
            <p className="text-sm text-[#6f7478]">No students yet.</p>
          ) : (
            students.map((student) => (
              <button
                className="block w-full border-b border-[#eceff1] py-4 text-left transition hover:bg-[#f8f9fa]"
                key={student.id}
                onClick={() => onOpenStudent(student.id)}
                type="button"
              >
                <span className="block text-base font-semibold text-[#202124]">
                  {student.name}
                </span>
                {student.rollNumber ? (
                  <span className="mt-1 block text-xs text-[#80868b]">
                    {student.rollNumber}
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}

function NoteModal({
  copiedShareId,
  error,
  note,
  noteForm,
  onAttach,
  onClose,
  onCopyShare,
  onDeleteAttachment,
  onDeleteNote,
  onReplaceAttachment,
  onRevokeShare,
  onShare,
  onSubmit,
  setNoteForm,
  students,
  submitting,
}: {
  copiedShareId: string | null;
  error: string | null;
  note?: NoteRecord;
  noteForm: NoteForm;
  onAttach: (noteId: number, file?: File) => void;
  onClose: () => void;
  onCopyShare: (shareLink: ShareLinkRecord) => void;
  onDeleteAttachment: (noteId: number, attachmentId: string) => void;
  onDeleteNote: (note: NoteRecord) => void;
  onReplaceAttachment: (
    noteId: number,
    attachmentId: string,
    file?: File,
  ) => void;
  onRevokeShare: (shareLink: ShareLinkRecord) => void;
  onShare: (noteId: number) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  setNoteForm: React.Dispatch<React.SetStateAction<NoteForm>>;
  students: StudentRecord[];
  submitting: boolean;
}) {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const activeShare = note ? getActiveShareLink(note) : undefined;

  if (!note) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#202124]/30 p-0 sm:items-center sm:p-6">
      <section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white p-6 shadow-[0_20px_70px_rgba(32,33,36,0.25)] sm:rounded-lg">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[#6f7478]">
            {note.student?.name || "Student note"}
          </p>
          <button
            aria-label="Close note"
            className="flex h-9 w-9 items-center justify-center rounded-md text-lg transition hover:bg-[#f1f3f4]"
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </div>

        <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
          {error ? <ErrorBanner message={error} /> : null}
          <input
            className={`${inputClass} text-xl font-semibold`}
            onChange={(event) =>
              setNoteForm((current) => ({
                ...current,
                title: event.target.value,
              }))
            }
            placeholder="Title"
            value={noteForm.title}
          />
          <select
            className={inputClass}
            onChange={(event) =>
              setNoteForm((current) => ({
                ...current,
                studentId: event.target.value,
              }))
            }
            value={noteForm.studentId}
          >
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
          <textarea
            className={`${inputClass} min-h-48 py-3`}
            onChange={(event) =>
              setNoteForm((current) => ({
                ...current,
                content: event.target.value,
              }))
            }
            placeholder="Note"
            value={noteForm.content}
          />
          <div className="flex flex-wrap gap-2">
            <button
              className="h-11 rounded-md bg-[#202124] px-4 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Saving..." : "Save note"}
            </button>
            <ActionButton danger onClick={() => onDeleteNote(note)}>
              Delete note
            </ActionButton>
          </div>
        </form>

        <section className="mt-8 border-t border-[#eceff1] pt-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Attachments</h2>
            <ActionButton onClick={() => uploadInputRef.current?.click()}>
              Add media
            </ActionButton>
            <input
              className="hidden"
              onChange={(event) => onAttach(note.id, event.target.files?.[0])}
              ref={uploadInputRef}
              type="file"
            />
          </div>
          {note.attachments?.length ? (
            <div className="mt-3 grid gap-3">
              {note.attachments.map((attachment, index) => (
                <AttachmentRow
                  attachment={attachment}
                  index={index}
                  key={attachment.id}
                  noteId={note.id}
                  onDelete={onDeleteAttachment}
                  onReplace={onReplaceAttachment}
                />
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-md border border-dashed border-[#dfe3e7] px-4 py-6 text-sm text-[#6f7478]">
              No attachments yet.
            </p>
          )}
        </section>

        <section className="mt-8 border-t border-[#eceff1] pt-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Sharing</h2>
            <ActionButton
              onClick={() =>
                activeShare ? onCopyShare(activeShare) : onShare(note.id)
              }
            >
              {activeShare ? "Copy link" : "Create link"}
            </ActionButton>
          </div>
          {activeShare ? (
            <div className="mt-3 rounded-md border border-[#dfe3e7] p-4">
              <p className="break-all text-sm text-[#3c4043]">
                {getShareUrl(activeShare.token)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <ActionButton onClick={() => onCopyShare(activeShare)}>
                  {copiedShareId === activeShare.id ? "Copied" : "Copy"}
                </ActionButton>
                <ActionButton danger onClick={() => onRevokeShare(activeShare)}>
                  Revoke
                </ActionButton>
              </div>
            </div>
          ) : (
            <p className="mt-3 rounded-md border border-dashed border-[#dfe3e7] px-4 py-6 text-sm text-[#6f7478]">
              This note has not been shared.
            </p>
          )}
        </section>
      </section>
    </div>
  );
}

function AttachmentRow({
  attachment,
  index,
  noteId,
  onDelete,
  onReplace,
}: {
  attachment: NoteAttachmentRecord;
  index: number;
  noteId: number;
  onDelete: (noteId: number, attachmentId: string) => void;
  onReplace: (noteId: number, attachmentId: string, file?: File) => void;
}) {
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="rounded-md border border-[#dfe3e7] p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <a
          className="min-w-0 flex-1 truncate text-sm font-semibold text-[#202124] underline-offset-4 hover:underline"
          href={attachment.fileUrl}
          rel="noreferrer"
          target="_blank"
        >
          {getAttachmentLabel(attachment, index)}
        </a>
        <div className="flex flex-wrap gap-2">
          <ActionButton onClick={() => replaceInputRef.current?.click()}>
            Replace
          </ActionButton>
          <ActionButton danger onClick={() => onDelete(noteId, attachment.id)}>
            Remove
          </ActionButton>
        </div>
      </div>
      <p className="mt-2 text-xs text-[#6f7478]">
        {getAttachmentKind(attachment)} · {formatDate(attachment.createdAt)}
      </p>
      {attachment.fileType.startsWith("image/") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={attachment.caption || "Attachment preview"}
          className="mt-3 max-h-64 rounded-md border border-[#eceff1] object-contain"
          src={attachment.fileUrl}
        />
      ) : null}
      <input
        className="hidden"
        onChange={(event) =>
          onReplace(noteId, attachment.id, event.target.files?.[0])
        }
        ref={replaceInputRef}
        type="file"
      />
    </div>
  );
}

function ActionButton({
  children,
  danger = false,
  onClick,
}: {
  children: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`h-9 rounded-md border px-3 text-sm font-semibold transition ${
        danger
          ? "border-[#f2b8b5] text-[#a50e0e] hover:bg-[#fce8e6]"
          : "border-[#dfe3e7] text-[#303134] hover:bg-[#f8f9fa]"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function CreateModal({
  children,
  onClose,
  open,
}: {
  children: React.ReactNode;
  onClose: () => void;
  open: boolean;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#202124]/30 p-0 sm:items-center sm:p-6">
      <div className="w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-[0_20px_70px_rgba(32,33,36,0.25)] sm:rounded-lg">
        <div className="flex justify-end">
          <button
            aria-label="Close modal"
            className="flex h-9 w-9 items-center justify-center rounded-md text-lg transition hover:bg-[#f1f3f4]"
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CreateForm({
  children,
  error,
  onSubmit,
  submitting,
  submitText,
  title,
}: {
  children: React.ReactNode;
  error: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitting: boolean;
  submitText: string;
  title: string;
}) {
  return (
    <form className="grid gap-3" onSubmit={onSubmit}>
      <h2 className="text-2xl font-semibold">{title}</h2>
      {error ? <ErrorBanner message={error} /> : null}
      {children}
      <button
        className="mt-2 h-12 rounded-md bg-[#202124] px-4 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
        disabled={submitting}
        type="submit"
      >
        {submitting ? "Saving..." : submitText}
      </button>
    </form>
  );
}

function UnauthorizedDashboard() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-5 text-[#202124]">
      <section className="w-full max-w-md text-center">
        <Link className="text-lg font-semibold lowercase" href="/">
          trove
        </Link>
        <h1 className="mt-8 text-3xl font-semibold">Sign in required</h1>
        <p className="mt-3 text-sm leading-6 text-[#5f6368]">
          Log in or register before opening your notes dashboard.
        </p>
        <Link
          className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-[#202124] px-5 text-sm font-semibold text-white"
          href="/"
        >
          Go to sign in
        </Link>
      </section>
    </main>
  );
}

function DashboardLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-5 text-[#202124]">
      <section className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#dfe3e7] border-t-[#4285f4]" />
        <p className="mt-5 text-sm font-semibold text-[#5f6368]">
          Loading dashboard
        </p>
      </section>
    </main>
  );
}

function LoadingBar() {
  return (
    <div className="mb-4 h-1 overflow-hidden rounded-full bg-[#eceff1]">
      <div className="h-full w-1/3 animate-pulse rounded-full bg-[#4285f4]" />
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-4 rounded-md border border-[#f2b8b5] bg-[#fce8e6] px-4 py-3 text-sm font-medium text-[#a50e0e]">
      {message}
    </div>
  );
}

function getCardColor(index: number, color?: string) {
  return color || cardColors[index % cardColors.length];
}

function includesSearch(value: string | null | undefined, search: string) {
  return (value || "").toLowerCase().includes(search.trim().toLowerCase());
}

function noteMatchesSearch(note: NoteRecord, search: string) {
  if (!search.trim()) {
    return true;
  }

  return (
    includesSearch(note.title, search) ||
    includesSearch(note.content, search) ||
    includesSearch(note.student?.name, search) ||
    Boolean(
      note.attachments?.some((attachment) => {
        return (
          includesSearch(attachment.caption, search) ||
          includesSearch(attachment.fileType, search) ||
          includesSearch(attachment.fileUrl, search)
        );
      }),
    )
  );
}

function compareDates(a?: string, b?: string) {
  return new Date(b ?? 0).getTime() - new Date(a ?? 0).getTime();
}

function normalizeDateInput(value?: string | null) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function sortNewest(a: NoteRecord, b: NoteRecord) {
  return compareDates(a.createdAt ?? a.updatedAt, b.createdAt ?? b.updatedAt);
}

function sortStudentsByName(a: StudentRecord, b: StudentRecord) {
  const aKey = getStudentSortKey(a.name);
  const bKey = getStudentSortKey(b.name);

  return (
    aKey.last.localeCompare(bKey.last, undefined, { sensitivity: "base" }) ||
    aKey.first.localeCompare(bKey.first, undefined, { sensitivity: "base" }) ||
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}

function getStudentSortKey(name: string) {
  const suffixes = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"]);
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length <= 1) {
    return {
      first: parts[0] || "",
      last: parts[0] || "",
    };
  }

  const lastPart = parts[parts.length - 1].toLowerCase();
  const lastNameIndex = suffixes.has(lastPart) ? parts.length - 2 : parts.length - 1;

  return {
    first: parts.slice(0, lastNameIndex).join(" "),
    last: parts[lastNameIndex] || parts[0] || "",
  };
}

function formatDate(value?: string | null) {
  if (!value) {
    return "No date";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getAttachmentLabel(attachment: NoteAttachmentRecord, index: number) {
  if (attachment.caption?.trim()) {
    return attachment.caption;
  }

  if (attachment.fileType.startsWith("image/")) {
    return `Image ${index + 1}`;
  }

  if (attachment.fileType.startsWith("video/")) {
    return `Video ${index + 1}`;
  }

  return `File ${index + 1}`;
}

function getAttachmentKind(attachment: NoteAttachmentRecord) {
  if (attachment.fileType.startsWith("image/")) {
    return "Image";
  }

  if (attachment.fileType.startsWith("video/")) {
    return "Video";
  }

  if (attachment.fileType.startsWith("audio/")) {
    return "Audio";
  }

  if (attachment.fileType === "application/pdf") {
    return "PDF";
  }

  return "File";
}

function getActiveShareLink(note: NoteRecord) {
  return note.shareLinks?.find((shareLink) => {
    if (shareLink.isActive === false) {
      return false;
    }

    if (!shareLink.expiresAt) {
      return true;
    }

    return new Date(shareLink.expiresAt).getTime() > Date.now();
  });
}

function getShareUrl(token: string) {
  if (typeof window === "undefined") {
    return `/share/${token}`;
  }

  return `${window.location.origin}/share/${token}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Request failed.";
}

const inputClass =
  "min-h-12 w-full rounded-md border border-[#dfe3e7] bg-white px-4 text-base text-[#202124] outline-none transition placeholder:text-[#80868b] focus:border-[#4285f4]";

export default function DashboardClient() {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContent />
    </QueryClientProvider>
  );
}
