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
type CreateMode = "class" | "student" | "note" | "classActions" | null;

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
  fileType: string;
  fileUrl: string;
  id: string;
};

type NoteRecord = {
  attachments?: NoteAttachmentRecord[];
  content: string | null;
  createdAt?: string;
  id: number;
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
  const classStudents = useMemo(() => {
    return selectedClassId
      ? students.filter((student) => student.classId === selectedClassId)
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

  function openCreateNote(studentId?: number) {
    setNoteForm({
      ...emptyNoteForm,
      studentId: studentId ? String(studentId) : "",
    });
    setFormError(null);
    setCreateMode("note");
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

  async function handleAttachment(noteId: number, file?: File) {
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

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
            <BoardTitle subtitle="Your classroom boards" title="Classes" />
            <KeepGrid
              emptyText="Create your first class."
              items={visibleClasses}
              renderItem={(classItem, index) => (
                <button
                  className="min-h-40 rounded-lg p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(60,64,67,0.16)]"
                  key={classItem.id}
                  onClick={() => openClass(classItem.id)}
                  style={{
                    backgroundColor: getCardColor(index, classItem.color),
                  }}
                  type="button"
                >
                  <span className="block text-2xl font-semibold leading-tight">
                    {classItem.name}
                  </span>
                  <span className="mt-5 block text-sm text-[#5f6368]">
                    {formatDate(classItem.session)}
                  </span>
                </button>
              )}
            />
          </>
        ) : null}

        {screen === "class" ? (
          <>
            <BoardTitle
              onBack={() => setScreen("home")}
              subtitle="Latest notes"
              title={selectedClass?.name || "Class"}
            />
            <KeepGrid
              emptyText="Create a student, then add the first note."
              items={classNotes}
              renderItem={(note, index) => (
                <NoteCard
                  key={note.id}
                  color={getCardColor(index)}
                  note={note}
                  onAttach={handleAttachment}
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
              onBack={() => setScreen("class")}
              subtitle="Pinned notes stay first"
              title={selectedStudent?.name || "Student"}
            />
            <KeepGrid
              emptyText="Add the first note for this student."
              items={studentNotes}
              renderItem={(note, index) => (
                <NoteCard
                  key={note.id}
                  color={getCardColor(index)}
                  isPinned={pinnedNoteIds.includes(note.id)}
                  note={note}
                  onAttach={handleAttachment}
                  onPin={() => togglePinned(note.id)}
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
    </main>
  );
}

function BoardTitle({
  onBack,
  subtitle,
  title,
}: {
  onBack?: () => void;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="mb-5 flex items-center gap-3">
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

function NoteCard({
  color,
  isPinned = false,
  note,
  onAttach,
  onPin,
  studentName,
}: {
  color: string;
  isPinned?: boolean;
  note: NoteRecord;
  onAttach: (noteId: number, file?: File) => void;
  onPin?: () => void;
  studentName?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#3c4043]">
        {note.content || "No body content"}
      </p>
      {studentName ? (
        <p className="mt-4 text-xs font-semibold text-[#5f6368]">
          {studentName}
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
        <button
          className="rounded-full bg-white/45 px-3 py-1.5 text-xs font-semibold text-[#303134] transition hover:bg-white/70"
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          + media
        </button>
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

function sortNewest(a: NoteRecord, b: NoteRecord) {
  return compareDates(a.createdAt ?? a.updatedAt, b.createdAt ?? b.updatedAt);
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
