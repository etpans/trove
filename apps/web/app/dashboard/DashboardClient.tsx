"use client";

import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import Link from "next/link";
import DashboardShell, { type DashboardSection } from "./DashboardShell";
import CoursesPanel from "./CoursesPanel";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";

type SessionState = {
  authenticated: boolean;
  message?: string;
  user?: {
    email?: string;
    userId?: string;
  };
};

type Screen = DashboardSection | "class" | "student";
type CreateMode =
  | "class"
  | "student"
  | "note"
  | "classActions"
  | "editClass"
  | "editStudent"
  | null;
type StudentSortMode = "lastName" | "firstName" | "newest";
type StudentViewMode = "chips" | "list";

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

type PendingAttachment = {
  caption: string;
  file: File;
  id: string;
};

type AttachmentCaptionDraft = {
  caption: string;
  file: File;
  noteId: number;
};

type AttachmentViewerState = {
  attachment: NoteAttachmentRecord;
  index: number;
};

const cardColors = [
  "#FFFFFF",
  "#F8FAFC",
  "#F9FAFB",
  "#F3F4F6",
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
    signal: AbortSignal.timeout(20_000),
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) throw new Error("Your session has expired. Sign in again to continue.");
    throw new Error(
      Array.isArray(data.message) ? data.message.join(" ") : typeof data.message === "string" ? data.message : "Request failed.",
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
  const [screen, setScreen] = useState<Screen>("overview");
  const [studentClassId, setStudentClassId] = useState("");
  const writePending = useRef(false);
  const createdNoteDraftId = useRef<number | null>(null);
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
  const [deleteClassTarget, setDeleteClassTarget] =
    useState<ClassRecord | null>(null);
  const [deleteClassNameInput, setDeleteClassNameInput] = useState("");
  const [shareDialogNoteId, setShareDialogNoteId] = useState<number | null>(
    null,
  );
  const [pendingNoteAttachments, setPendingNoteAttachments] = useState<
    PendingAttachment[]
  >([]);
  const [attachmentCaptionDraft, setAttachmentCaptionDraft] =
    useState<AttachmentCaptionDraft | null>(null);
  const [attachmentViewer, setAttachmentViewer] =
    useState<AttachmentViewerState | null>(null);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [studentSortMode, setStudentSortMode] =
    useState<StudentSortMode>("lastName");
  const [studentViewMode, setStudentViewMode] =
    useState<StudentViewMode>("chips");
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
  const shareDialogNote = notes.find((note) => note.id === shareDialogNoteId);
  const classStudents = useMemo(() => {
    const nextStudents = selectedClassId
      ? students.filter((student) => student.classId === selectedClassId)
      : [];

    if (studentSortMode === "newest") {
      return nextStudents.sort((a, b) => compareDates(a.createdAt, b.createdAt));
    }

    if (studentSortMode === "firstName") {
      return nextStudents.sort((a, b) => a.name.localeCompare(b.name));
    }

    return nextStudents.sort(sortStudentsByName);
  }, [selectedClassId, studentSortMode, students]);

  const drawerStudents = useMemo(() => {
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
      queryClient.invalidateQueries({ queryKey: ["subjects"] }),
    ]);
  }

  function openClass(classId: number) {
    setSelectedClassId(classId);
    setSelectedStudentId(null);
    setSearch("");
    setScreen("class");
  }

  function openStudent(studentId: number) {
    const student = students.find((item) => item.id === studentId);
    setSelectedClassId(student?.classId ?? null);
    setSelectedStudentId(studentId);
    setDrawerOpen(false);
    setSearch("");
    setScreen("student");
  }

  function openEditClass(classItem: ClassRecord) {
    setSelectedClassId(classItem.id);
    setClassForm({
      name: classItem.name,
      session: normalizeDateInput(classItem.session),
    });
    setFormError(null);
    setCreateMode("editClass");
  }

  function openEditStudent(student: StudentRecord) {
    setSelectedStudentId(student.id);
    setSelectedClassId(student.classId);
    setStudentForm({
      name: student.name,
      rollNumber: student.rollNumber || "",
    });
    setFormError(null);
    setCreateMode("editStudent");
  }

  function openCreateNote(studentId?: number) {
    if (!students.length) {
      setScreen("students");
      setFormError("Add a student before creating a note.");
      return;
    }
    createdNoteDraftId.current = null;
    setNoteForm({
      ...emptyNoteForm,
      studentId: studentId ? String(studentId) : "",
    });
    setPendingNoteAttachments([]);
    setFormError(null);
    setCreateMode("note");
  }

  function openDeleteClassDialog(classItem: ClassRecord) {
    setDeleteClassTarget(classItem);
    setDeleteClassNameInput("");
    setFormError(null);
  }

  function openNote(note: NoteRecord) {
    const student = students.find((item) => item.id === note.studentId);
    setSelectedClassId(student?.classId ?? null);
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
    if (writePending.current) return;
    if (classForm.name.trim().length < 2 || classForm.name.trim().length > 30 || !classForm.session) {
      setFormError("Enter a class name between 2 and 30 characters and a session date.");
      return;
    }
    writePending.current = true;
    setSubmitting(true);
    setFormError(null);

    try {
      await fetchJson<ClassRecord>("/api/classes", {
        body: JSON.stringify({
          color: "#004aad",
          name: classForm.name.trim(),
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
      writePending.current = false;
      setSubmitting(false);
    }
  }

  async function handleCreateStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (writePending.current) return;
    const classId = Number(studentClassId || selectedClassId);
    if (!classes.some((item) => item.id === classId) || !studentForm.name.trim()) {
      setFormError("Choose a class and enter the student's name.");
      return;
    }
    writePending.current = true;
    setSubmitting(true);
    setFormError(null);

    try {
      await fetchJson<StudentRecord>("/api/students", {
        body: JSON.stringify({
          classId,
          name: studentForm.name.trim(),
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
      writePending.current = false;
      setSubmitting(false);
    }
  }

  async function handleUpdateClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (writePending.current) return;
    if (!selectedClass || classForm.name.trim().length < 2 || classForm.name.trim().length > 30 || !classForm.session) {
      setFormError("Enter a class name between 2 and 30 characters and a session date.");
      return;
    }
    writePending.current = true;
    setSubmitting(true);
    setFormError(null);

    try {
      await fetchJson<ClassRecord>(`/api/classes/${selectedClass.id}`, {
        body: JSON.stringify({
          name: classForm.name.trim(),
          session: classForm.session,
        }),
        method: "PATCH",
      });
      setCreateMode(null);
      await invalidateDashboard();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      writePending.current = false;
      setSubmitting(false);
    }
  }

  async function handleUpdateStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (writePending.current) return;
    if (!selectedStudent || !studentForm.name.trim()) {
      setFormError("Enter the student's name.");
      return;
    }
    writePending.current = true;
    setSubmitting(true);
    setFormError(null);

    try {
      await fetchJson<StudentRecord>(`/api/students/${selectedStudent.id}`, {
        body: JSON.stringify({
          name: studentForm.name.trim(),
          rollNumber: studentForm.rollNumber || undefined,
        }),
        method: "PATCH",
      });
      setCreateMode(null);
      await invalidateDashboard();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      writePending.current = false;
      setSubmitting(false);
    }
  }

  async function handleCreateNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (writePending.current) return;
    const studentId = Number(noteForm.studentId || selectedStudentId);

    if (!students.some((item) => item.id === studentId) || !noteForm.title.trim() || !noteForm.content.trim()) {
      setFormError("Choose a student and enter a title and note content.");
      return;
    }
    writePending.current = true;
    setSubmitting(true);
    setFormError(null);

    try {
      const savedId = createdNoteDraftId.current;
      const createdNote = await fetchJson<NoteRecord>(savedId ? `/api/notes/${savedId}` : "/api/notes", {
        body: JSON.stringify({
          content: noteForm.content,
          studentId,
          title: noteForm.title.trim(),
        }),
        method: savedId ? "PATCH" : "POST",
      });
      createdNoteDraftId.current = createdNote.id;
      for (const attachment of pendingNoteAttachments) {
          const formData = new FormData();
          formData.append("file", attachment.file);
          if (attachment.caption.trim()) {
            formData.append("caption", attachment.caption.trim());
          }

          await fetchMultipartJson(
            `/api/notes/${createdNote.id}/attachments`,
            formData,
          );
          setPendingNoteAttachments((current) => current.filter((item) => item.id !== attachment.id));
      }

      setNoteForm(emptyNoteForm);
      setPendingNoteAttachments([]);
      setCreateMode(null);
      createdNoteDraftId.current = null;
      await invalidateDashboard();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      writePending.current = false;
      setSubmitting(false);
    }
  }

  async function handleUpdateNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (writePending.current) return;
    if (!selectedNote) {
      return;
    }

    const studentId = Number(noteForm.studentId || selectedNote.studentId);
    if (!studentId || !noteForm.title.trim() || !noteForm.content.trim()) {
      setFormError("Choose a student and enter a title and note content.");
      return;
    }

    writePending.current = true;
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
      writePending.current = false;
      setSubmitting(false);
    }
  }

  async function handleDeleteClass(classItem: ClassRecord) {
    setSubmitting(true);
    setFormError(null);

    try {
      await fetchJson(`/api/classes/${classItem.id}`, {
        method: "DELETE",
      });
      if (selectedClassId === classItem.id) {
        setSelectedClassId(null);
        setSelectedStudentId(null);
        setScreen("classes");
      }
      setDeleteClassTarget(null);
      setDeleteClassNameInput("");
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

  function handleAttachment(noteId: number, file?: File) {
    if (!file) {
      return;
    }

    setAttachmentCaptionDraft({
      caption: "",
      file,
      noteId,
    });
  }

  async function handleAttachmentCaptionSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!attachmentCaptionDraft) {
      return;
    }

    const formData = new FormData();
    formData.append("file", attachmentCaptionDraft.file);
    if (attachmentCaptionDraft.caption.trim()) {
      formData.append("caption", attachmentCaptionDraft.caption.trim());
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await fetchMultipartJson(
        `/api/notes/${attachmentCaptionDraft.noteId}/attachments`,
        formData,
      );
      setAttachmentCaptionDraft(null);
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

  function handlePendingAttachment(file?: File) {
    if (!file) {
      return;
    }

    setPendingNoteAttachments((current) => [
      ...current,
      {
        caption: "",
        file,
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
      },
    ]);
  }

  function updatePendingAttachmentCaption(id: string, caption: string) {
    setPendingNoteAttachments((current) =>
      current.map((attachment) => {
        if (attachment.id !== id) {
          return attachment;
        }

        return {
          ...attachment,
          caption,
        };
      }),
    );
  }

  function removePendingAttachment(id: string) {
    setPendingNoteAttachments((current) =>
      current.filter((attachment) => attachment.id !== id),
    );
  }

  async function handleLogout() {
    try {
      await fetchJson("/api/auth/logout", { method: "POST" });
      queryClient.clear();
      window.location.href = "/login";
    } catch (error) {
      setFormError(getErrorMessage(error));
      setProfileOpen(false);
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

  function navigate(section: DashboardSection) {
    setScreen(section);
    setSearch("");
    setFormError(null);
    setDrawerOpen(false);
    setProfileOpen(false);
  }

  function createStudent() {
    if (!classes.length) {
      setScreen("classes");
      setFormError("Create a class before adding a student.");
      return;
    }
    setStudentClassId(String(selectedClassId || classes[0].id));
    setStudentForm(emptyStudentForm);
    setFormError(null);
    setCreateMode("student");
  }

  const section: DashboardSection = screen === "class" ? "classes" : screen === "student" ? "students" : screen;
  const matchingStudents = students.filter((student) => [student.name, student.rollNumber, classes.find((item) => item.id === student.classId)?.name].some((value) => includesSearch(value, search)));
  const matchingNotes = notes.filter((note) => noteMatchesSearch(note, search) || includesSearch(students.find((student) => student.id === note.studentId)?.name, search)).sort(sortNewest);

  if (sessionQuery.isLoading) {
    return <DashboardLoading />;
  }

  if (sessionQuery.isError) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f9fafb] p-6"><section className="max-w-md"><h1 className="mb-4 text-2xl font-semibold">Unable to open your workspace</h1><ErrorBanner message={getErrorMessage(sessionQuery.error)} /><ActionButton onClick={() => void sessionQuery.refetch()}>Try again</ActionButton></section></main>;
  }

  if (sessionQuery.data?.authenticated !== true) {
    return <UnauthorizedDashboard />;
  }

  return (
    <DashboardShell
      section={section}
      onNavigate={navigate}
      onCreateClass={() => { setFormError(null); setCreateMode("class"); }}
      onCreateStudent={createStudent}
      onCreateNote={() => openCreateNote(screen === "student" ? selectedStudentId || undefined : undefined)}
      classCount={classes.length}
      studentCount={students.length}
      noteCount={notes.length}
      header={<header>
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          {screen === "class" || screen === "student" ? <button aria-label="Open class students" className="rounded-md p-2" onClick={() => setDrawerOpen(true)} type="button"><IconMenu /></button> : null}
          <input
            className="h-12 min-w-0 flex-1 rounded-md border border-[#eceff1] bg-white px-4 text-base shadow-[0_1px_4px_rgba(60,64,67,0.18)] outline-none transition placeholder:text-[#80868b] focus:border-[#004aad]"
            aria-label="Search workspace"
            onChange={(event) => { setSearch(event.target.value); if (screen !== "courses") setScreen("search"); }}
            placeholder={screen === "courses" ? "Search courses" : "Search your workspace…"}
            value={search}
          />
          <button
            className="hidden h-11 cursor-pointer rounded-md px-3 text-sm font-semibold text-[#3c4043] transition hover:bg-[#f1f3f4] active:scale-95 sm:block"
            onClick={() => invalidateDashboard()}
            type="button"
          >
            Refresh
          </button>
          <ProfileMenu
            onLogout={handleLogout}
            onToggle={() => setProfileOpen((current) => !current)}
            open={profileOpen}
            user={sessionQuery.data?.user}
          />
        </div>
      </header>}
    >

      {profileOpen ? (
        <button
          aria-label="Close account menu"
          className="fixed inset-0 z-40 cursor-default bg-transparent"
          onClick={() => setProfileOpen(false)}
          type="button"
        />
      ) : null}

      <section className="mx-auto max-w-6xl px-5 pb-28 pt-7">
        {pageError ? <ErrorBanner message={getErrorMessage(pageError)} /> : null}
        {formError ? <ErrorBanner message={formError} /> : null}
        {pageBusy ? <LoadingBar /> : null}

        {screen === "overview" ? (
          <>
            <BoardTitle title="A little space to teach." subtitle="Your classes, students, and everyday observations. All together." />
            <div className="dashboard-summary-grid">
              {([{ label: "Classes", count: classes.length, destination: "classes" }, { label: "Students", count: students.length, destination: "students" }, { label: "Notes", count: notes.length, destination: "notes" }] as const).map((item) => <button className="dashboard-summary-card" type="button" key={item.label} onClick={() => navigate(item.destination)}><span>{item.label}</span><strong>{item.count}</strong><span>Open {item.label.toLowerCase()} <span aria-hidden="true">↗</span></span></button>)}
            </div>
            <div className="mb-5 mt-9 flex items-center justify-between"><h2 className="text-lg font-semibold">Recent notes</h2><ActionButton onClick={() => navigate("notes")}>View all notes</ActionButton></div>
            <KeepGrid emptyText="Capture your first classroom observation. Start with a class and student, then add a note." emptyActionLabel={classes.length ? students.length ? "Add note" : "Add student" : "Add class"} onEmptyAction={() => { if (!classes.length) { setFormError(null); setCreateMode("class"); } else if (!students.length) createStudent(); else openCreateNote(); }} items={[...notes].sort(sortNewest).slice(0, 4)} renderItem={(note, index) => <NoteCard key={note.id} color={getCardColor(index)} note={note} onAttach={handleAttachment} onOpen={() => openNote(note)} onShare={() => setShareDialogNoteId(note.id)} onViewAttachment={(attachment, attachmentIndex) => setAttachmentViewer({ attachment, index: attachmentIndex })} studentName={students.find((student) => student.id === note.studentId)?.name} />} />
          </>
        ) : null}

        {screen === "courses" ? <CoursesPanel search={search} /> : null}

        {screen === "search" ? <BoardTitle title="Search" subtitle={search.trim() ? `Results for “${search.trim()}”` : "Find classes, students, and notes across your workspace."} /> : null}

        {screen === "classes" || screen === "search" ? (
          <>
            {screen === "search" ? <h2 className="mb-4 text-lg font-semibold">Classes <span className="text-sm text-[#6b7280]">{visibleClasses.length}</span></h2> : <BoardTitle
              subtitle={`${visibleClasses.length} classroom board${
                visibleClasses.length === 1 ? "" : "s"
              }`}
              title="Classes"
            />}
            <KeepGrid
              emptyActionLabel="Create class"
              onEmptyAction={() => {
                setFormError(null);
                setCreateMode("class");
              }}
              emptyText={
                search.trim()
                  ? "No classes match your search."
                  : "Create your first class."
              }
              items={visibleClasses}
              renderItem={(classItem, index) => (
                <article
                  className="min-h-40 cursor-pointer rounded-lg p-5 text-left transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(60,64,67,0.16)] focus-within:ring-2 focus-within:ring-[#202124]/20"
                  key={classItem.id}
                  onClick={() => openClass(classItem.id)}
                  onKeyDown={(event) => {
                    if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                      event.preventDefault();
                      openClass(classItem.id);
                    }
                  }}
                  role="button"
                  style={{
                    backgroundColor: getCardColor(index),
                    borderTop: `3px solid ${classItem.color || "#004aad"}`,
                  }}
                  tabIndex={0}
                >
                  <span className="block text-2xl font-semibold leading-tight">
                    {classItem.name}
                  </span>
                  <span className="mt-5 block text-sm text-[#5f6368]">
                    {formatDate(classItem.session)}
                  </span>
                  <div className="mt-6 flex gap-2">
                    <ActionButton
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditClass(classItem);
                      }}
                    >
                      Edit
                    </ActionButton>
                    <ActionButton
                      danger
                      onClick={(event) => {
                        event.stopPropagation();
                        openDeleteClassDialog(classItem);
                      }}
                    >
                      Delete
                    </ActionButton>
                  </div>
                </article>
              )}
            />
          </>
        ) : null}

        {screen === "students" || screen === "search" ? (
          <div className={screen === "search" ? "mt-8" : ""}>
            {screen === "students" ? <BoardTitle title="Students" subtitle={`${matchingStudents.length} students across your classes`} actions={<ActionButton onClick={createStudent}>Add student</ActionButton>} /> : <h2 className="mb-4 text-lg font-semibold">Students <span className="text-sm text-[#6b7280]">{matchingStudents.length}</span></h2>}
            <KeepGrid emptyText={search.trim() ? "No students match your search." : "Add a student to start keeping observations."} emptyActionLabel="Add student" onEmptyAction={createStudent} items={matchingStudents} renderItem={(student) => <article className="dashboard-student-card" key={student.id}><button type="button" onClick={() => openStudent(student.id)}><span className="dashboard-student-avatar" aria-hidden="true">{student.name.slice(0, 1).toUpperCase()}</span><strong>{student.name}</strong><span>{classes.find((item) => item.id === student.classId)?.name || "Class unavailable"}</span>{student.rollNumber ? <span>Roll {student.rollNumber}</span> : null}</button><ActionButton onClick={() => openEditStudent(student)}>Edit student</ActionButton></article>} />
          </div>
        ) : null}

        {screen === "notes" || screen === "search" ? (
          <div className={screen === "search" ? "mt-8" : ""}>
            {screen === "notes" ? <BoardTitle title="Notes" subtitle={`${matchingNotes.length} observations, ready when you need them`} actions={<ActionButton onClick={() => openCreateNote()}>Add note</ActionButton>} /> : <h2 className="mb-4 text-lg font-semibold">Notes <span className="text-sm text-[#6b7280]">{matchingNotes.length}</span></h2>}
            <KeepGrid emptyText={search.trim() ? "No notes match your search." : "Create your first note for a student."} emptyActionLabel="Add note" onEmptyAction={() => openCreateNote()} items={matchingNotes} renderItem={(note, index) => <NoteCard key={note.id} color={getCardColor(index)} note={note} onAttach={handleAttachment} onOpen={() => openNote(note)} onShare={() => setShareDialogNoteId(note.id)} onViewAttachment={(attachment, attachmentIndex) => setAttachmentViewer({ attachment, index: attachmentIndex })} studentName={students.find((student) => student.id === note.studentId)?.name} />} />
          </div>
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
                      onClick={() => openDeleteClassDialog(selectedClass)}
                    >
                      Delete class
                    </ActionButton>
                  </>
                ) : null
              }
              onBack={() => navigate("classes")}
              subtitle={`${classStudents.length} student${
                classStudents.length === 1 ? "" : "s"
              } · ${classNotes.length} visible note${
                classNotes.length === 1 ? "" : "s"
              }`}
              title={selectedClass?.name || "Class"}
            />
            <StudentStrip
              onEditStudent={openEditStudent}
              onNewStudent={createStudent}
              onOpenStudent={openStudent}
              onSortChange={setStudentSortMode}
              onViewChange={setStudentViewMode}
              sortMode={studentSortMode}
              students={classStudents}
              viewMode={studentViewMode}
            />
            <KeepGrid
              emptyActionLabel={classStudents.length ? "Create note" : "Create student"}
              onEmptyAction={() => {
                if (classStudents.length) {
                  openCreateNote();
                  return;
                }

                createStudent();
              }}
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
                  onShare={() => setShareDialogNoteId(note.id)}
                  onViewAttachment={(attachment, attachmentIndex) =>
                    setAttachmentViewer({
                      attachment,
                      index: attachmentIndex,
                    })
                  }
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
              emptyActionLabel="Create note"
              onEmptyAction={() => openCreateNote(selectedStudentId || undefined)}
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
                  onShare={() => setShareDialogNoteId(note.id)}
                  onViewAttachment={(attachment, attachmentIndex) =>
                    setAttachmentViewer({
                      attachment,
                      index: attachmentIndex,
                    })
                  }
                />
              )}
            />
          </>
        ) : null}
      </section>

      {screen !== "courses" ? <button
        aria-label="Create"
        className="fixed bottom-7 right-7 z-30 grid h-16 w-16 cursor-pointer place-items-center rounded-full bg-[#004aad] text-white shadow-[0_10px_30px_rgba(0,74,173,0.35)] transition duration-150 hover:scale-105 hover:bg-[#003b8a] hover:shadow-[0_14px_36px_rgba(0,74,173,0.42)] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#004aad]"
        onClick={() => {
          if (screen === "overview" || screen === "classes") {
            setFormError(null);
            setCreateMode("class");
          } else if (screen === "class") {
            setFormError(null);
            setCreateMode("classActions");
          } else if (screen === "students") {
            createStudent();
          } else {
            openCreateNote(screen === "student" ? selectedStudentId || undefined : undefined);
          }
        }}
        type="button"
      >
        <IconPlus />
      </button> : null}

      <StudentDrawer
        onClose={() => setDrawerOpen(false)}
        onOpenStudent={openStudent}
        open={drawerOpen}
        students={drawerStudents}
      />

      <CreateModal onClose={() => { if (!submitting) setCreateMode(null); }} open={createMode !== null}>
        {createMode === "classActions" ? (
          <div>
            <ModalHeading
              subtitle="Choose what you want to add to this class."
              title="Create"
            />
            <button
              className="mt-5 block w-full cursor-pointer rounded-md border border-[#eceff1] px-4 py-4 text-left text-base font-semibold transition hover:bg-[#f8f9fa] active:scale-[0.99]"
              onClick={createStudent}
              type="button"
            >
              Student
            </button>
            <button
              className="mt-2 block w-full cursor-pointer rounded-md border border-[#eceff1] px-4 py-4 text-left text-base font-semibold transition hover:bg-[#f8f9fa] active:scale-[0.99]"
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
            subtitle="Give the class a name and session date."
            title="New class"
          >
            <FieldLabel label="Class name">
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
            </FieldLabel>
            <FieldLabel label="Session date">
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
            </FieldLabel>
          </CreateForm>
        ) : null}

        {createMode === "editClass" ? (
          <CreateForm
            error={formError}
            onSubmit={handleUpdateClass}
            submitting={submitting}
            submitText="Save class"
            subtitle="Update class details."
            title="Edit class"
          >
            <FieldLabel label="Class name">
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
            </FieldLabel>
            <FieldLabel label="Session date">
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
            </FieldLabel>
          </CreateForm>
        ) : null}

        {createMode === "student" ? (
          <CreateForm
            error={formError}
            onSubmit={handleCreateStudent}
            submitting={submitting}
            submitText="Create student"
            subtitle="Add a student to the selected class."
            title="New student"
          >
            <FieldLabel label="Class">
              <select className={inputClass} value={studentClassId || String(selectedClassId || "")} onChange={(event) => setStudentClassId(event.target.value)} required>
                <option value="" disabled>Choose a class</option>
                {classes.map((classItem) => <option key={classItem.id} value={classItem.id}>{classItem.name}</option>)}
              </select>
            </FieldLabel>
            <FieldLabel label="Student name">
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
            </FieldLabel>
            <FieldLabel label="Roll number" optional>
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
            </FieldLabel>
          </CreateForm>
        ) : null}

        {createMode === "editStudent" ? (
          <CreateForm
            error={formError}
            onSubmit={handleUpdateStudent}
            submitting={submitting}
            submitText="Save student"
            subtitle="Update student details."
            title="Edit student"
          >
            <FieldLabel label="Student name">
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
            </FieldLabel>
            <FieldLabel label="Roll number" optional>
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
            </FieldLabel>
          </CreateForm>
        ) : null}

        {createMode === "note" ? (
          <CreateForm
            error={formError}
            onSubmit={handleCreateNote}
            submitting={submitting}
            submitText="Create note"
            subtitle="Capture an observation and attach files before saving."
            title="New note"
          >
            <FieldLabel label="Student">
              <select className={inputClass} value={noteForm.studentId} onChange={(event) => setNoteForm((current) => ({ ...current, studentId: event.target.value }))} required>
                <option value="" disabled>Choose a student</option>
                {students.map((student) => <option key={student.id} value={student.id}>{student.name} · {classes.find((item) => item.id === student.classId)?.name || "Class"}</option>)}
              </select>
            </FieldLabel>
            {screen === "class" ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {classStudents.map((student) => {
                  const selected = noteForm.studentId === String(student.id);

                  return (
                    <button
                      className={`shrink-0 cursor-pointer rounded-full border px-3 py-2 text-sm font-semibold transition ${
                        selected
                          ? "border-[#004aad] bg-[#004aad] text-white"
                          : "border-[#dfe3e7] bg-white text-[#3c4043] hover:bg-[#f1f3f4]"
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
            <FieldLabel label="Title">
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
            </FieldLabel>
            <FieldLabel label="Note">
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
            </FieldLabel>
            <PendingAttachmentPicker
              attachments={pendingNoteAttachments}
              onAdd={handlePendingAttachment}
              onCaptionChange={updatePendingAttachmentCaption}
              onRemove={removePendingAttachment}
            />
          </CreateForm>
        ) : null}

        {createMode === "classActions" ? (
          <button
            className="mt-6 h-12 w-full cursor-pointer rounded-md border border-[#dfe3e7] text-sm font-semibold transition hover:bg-[#f8f9fa] active:scale-[0.99]"
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
        onShare={(noteId) => setShareDialogNoteId(noteId)}
        onSubmit={handleUpdateNote}
        onViewAttachment={(attachment, attachmentIndex) =>
          setAttachmentViewer({
            attachment,
            index: attachmentIndex,
          })
        }
        setNoteForm={setNoteForm}
        students={classStudents}
        submitting={submitting}
      />
      <ShareDialog
        copiedShareId={copiedShareId}
        note={shareDialogNote}
        onClose={() => setShareDialogNoteId(null)}
        onCopyShare={handleCopyShare}
        onCreateShare={handleCreateShare}
        onRevokeShare={handleRevokeShare}
        submitting={submitting}
      />
      <AttachmentCaptionDialog
        draft={attachmentCaptionDraft}
        onCaptionChange={(caption) =>
          setAttachmentCaptionDraft((current) =>
            current ? { ...current, caption } : current,
          )
        }
        onClose={() => setAttachmentCaptionDraft(null)}
        onSubmit={handleAttachmentCaptionSubmit}
        submitting={submitting}
      />
      <AttachmentViewer
        attachment={attachmentViewer?.attachment}
        index={attachmentViewer?.index ?? 0}
        onClose={() => setAttachmentViewer(null)}
      />
      <DeleteClassDialog
        classItem={deleteClassTarget}
        confirmationValue={deleteClassNameInput}
        onClose={() => {
          setDeleteClassTarget(null);
          setDeleteClassNameInput("");
        }}
        onConfirm={() => {
          if (deleteClassTarget) {
            void handleDeleteClass(deleteClassTarget);
          }
        }}
        onConfirmationChange={setDeleteClassNameInput}
        submitting={submitting}
      />
    </DashboardShell>
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
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-[#3c4043] transition hover:bg-[#f1f3f4] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004aad]"
            onClick={onBack}
            type="button"
          >
            <IconBack />
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
  emptyActionLabel,
  emptyText,
  items,
  onEmptyAction,
  renderItem,
}: {
  emptyActionLabel?: string;
  emptyText: string;
  items: T[];
  onEmptyAction?: () => void;
  renderItem: (item: T, index: number) => React.ReactNode;
}) {
  if (items.length === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-[#dfe3e7] bg-[#f8fafd] px-6 text-center text-[#6f7478]">
        <p className="max-w-sm text-sm leading-6">{emptyText}</p>
        {emptyActionLabel && onEmptyAction ? (
          <button
            className="mt-4 inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-[#004aad] px-4 text-sm font-semibold text-white transition hover:bg-[#003b8a] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004aad]"
            onClick={onEmptyAction}
            type="button"
          >
            {emptyActionLabel}
          </button>
        ) : null}
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
  onNewStudent,
  onOpenStudent,
  onSortChange,
  onViewChange,
  sortMode,
  students,
  viewMode,
}: {
  onEditStudent: (student: StudentRecord) => void;
  onNewStudent: () => void;
  onOpenStudent: (studentId: number) => void;
  onSortChange: (mode: StudentSortMode) => void;
  onViewChange: (mode: StudentViewMode) => void;
  sortMode: StudentSortMode;
  students: StudentRecord[];
  viewMode: StudentViewMode;
}) {
  if (!students.length) {
    return (
      <div className="mb-5 rounded-lg border border-dashed border-[#dfe3e7] bg-[#f8fafd] px-5 py-4">
        <p className="text-sm text-[#6f7478]">No students in this class yet.</p>
        <button
          className="mt-3 inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-[#004aad] px-4 text-sm font-semibold text-white transition hover:bg-[#003b8a] active:scale-[0.98]"
          onClick={onNewStudent}
          type="button"
        >
          Create student
        </button>
      </div>
    );
  }

  return (
    <section className="mb-5 rounded-lg border border-[#eceff1] bg-white p-3 shadow-[0_1px_2px_rgba(60,64,67,0.08)]">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#202124]">Students</p>
          <p className="text-xs text-[#6f7478]">
            Sort and open student views for this class.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="h-9 cursor-pointer rounded-md border border-[#dfe3e7] bg-white px-2 text-sm font-semibold text-[#303134] outline-none transition hover:bg-[#f8f9fa] focus:border-[#004aad]"
            onChange={(event) =>
              onSortChange(event.target.value as StudentSortMode)
            }
            value={sortMode}
          >
            <option value="lastName">Last name</option>
            <option value="firstName">First name</option>
            <option value="newest">Newest</option>
          </select>
          <SegmentButton
            active={viewMode === "chips"}
            onClick={() => onViewChange("chips")}
          >
            Chips
          </SegmentButton>
          <SegmentButton
            active={viewMode === "list"}
            onClick={() => onViewChange("list")}
          >
            List
          </SegmentButton>
          <ActionButton onClick={onNewStudent}>New student</ActionButton>
        </div>
      </div>

      <div
        className={
          viewMode === "list"
            ? "grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
            : "flex gap-2 overflow-x-auto pb-1"
        }
      >
        {students.map((student) => (
          <div
            className={
              viewMode === "list"
                ? "flex items-center justify-between gap-3 rounded-md border border-[#dfe3e7] bg-[#f8fafd] px-3 py-2"
                : "flex shrink-0 items-center overflow-hidden rounded-full border border-[#dfe3e7] bg-white shadow-[0_1px_2px_rgba(60,64,67,0.08)] transition hover:shadow-[0_2px_8px_rgba(60,64,67,0.12)]"
            }
            key={student.id}
          >
            <button
              className={
                viewMode === "list"
                  ? "min-w-0 flex-1 cursor-pointer text-left text-sm font-semibold text-[#303134] transition hover:text-[#004aad]"
                  : "cursor-pointer px-3 py-2 text-sm font-semibold text-[#303134] transition hover:bg-[#f8f9fa] active:scale-[0.98]"
              }
              onClick={() => onOpenStudent(student.id)}
              type="button"
            >
              <span className="block truncate">{student.name}</span>
              {viewMode === "list" && student.rollNumber ? (
                <span className="mt-0.5 block truncate text-xs font-normal text-[#6f7478]">
                  {student.rollNumber}
                </span>
              ) : null}
            </button>
            <button
              aria-label={`Edit ${student.name}`}
              className={
                viewMode === "list"
                  ? "cursor-pointer rounded-md px-2 py-1 text-xs font-semibold text-[#5f6368] transition hover:bg-white"
                  : "cursor-pointer border-l border-[#dfe3e7] px-2 py-2 text-xs font-semibold text-[#5f6368] transition hover:bg-[#f8f9fa]"
              }
              onClick={() => onEditStudent(student)}
              type="button"
            >
              Edit
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function SegmentButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={`h-9 cursor-pointer rounded-md border px-3 text-sm font-semibold transition active:scale-[0.98] ${
        active
          ? "border-[#004aad] bg-[#004aad] text-white"
          : "border-[#dfe3e7] bg-white text-[#303134] hover:bg-[#f8f9fa]"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
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
  onViewAttachment,
  studentName,
}: {
  color: string;
  isPinned?: boolean;
  note: NoteRecord;
  onAttach: (noteId: number, file?: File) => void;
  onOpen: () => void;
  onPin?: () => void;
  onShare: () => void;
  onViewAttachment: (attachment: NoteAttachmentRecord, index: number) => void;
  studentName?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeShare = getActiveShareLink(note);

  return (
    <article
      className="min-h-44 cursor-pointer rounded-lg p-4 text-[#202124] shadow-[0_1px_2px_rgba(60,64,67,0.08)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(60,64,67,0.16)] focus-within:ring-2 focus-within:ring-[#202124]/20 sm:p-5"
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onOpen();
        }
      }}
      role="button"
      style={{ backgroundColor: color }}
      tabIndex={0}
    >
      <div className="flex items-start gap-3">
        <h2 className="min-w-0 flex-1 text-lg font-semibold leading-snug sm:text-xl">
          {note.title}
        </h2>
        {onPin ? (
          <button
            aria-label={isPinned ? "Unpin note" : "Pin note"}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/40 text-lg transition hover:bg-white/70 active:scale-95"
            onClick={(event) => {
              event.stopPropagation();
              onPin();
            }}
            type="button"
          >
            {isPinned ? <IconPinned /> : <IconPin />}
          </button>
        ) : null}
      </div>
      <div className="mt-3 block w-full rounded-md text-left">
        <p className="line-clamp-5 whitespace-pre-line text-sm leading-6 text-[#3c4043]">
          {note.content || "No body content"}
        </p>
      </div>
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
            <button
              className="block truncate rounded-md bg-white/45 px-3 py-2 text-left text-xs font-semibold text-[#303134] transition hover:bg-white/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#202124]/30"
              key={attachment.id}
              onClick={(event) => {
                event.stopPropagation();
                onViewAttachment(attachment, index);
              }}
              type="button"
            >
              {attachment.caption || getAttachmentLabel(attachment, index)}
            </button>
          ))}
        </div>
      ) : null}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-[#5f6368]">
          {formatDate(note.createdAt)}
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            className="cursor-pointer rounded-full bg-white/45 px-3 py-1.5 text-xs font-semibold text-[#303134] transition hover:bg-white/75 active:scale-95"
            onClick={(event) => {
              event.stopPropagation();
              onOpen();
            }}
            type="button"
          >
            Open
          </button>
          <button
            className="cursor-pointer rounded-full bg-white/45 px-3 py-1.5 text-xs font-semibold text-[#303134] transition hover:bg-white/75 active:scale-95"
            onClick={(event) => {
              event.stopPropagation();
              onShare();
            }}
            type="button"
          >
            Share
          </button>
          <button
            className="cursor-pointer rounded-full bg-white/45 px-3 py-1.5 text-xs font-semibold text-[#303134] transition hover:bg-white/75 active:scale-95"
            onClick={(event) => {
              event.stopPropagation();
              fileInputRef.current?.click();
            }}
            type="button"
          >
            + media
          </button>
        </div>
        <input
          className="hidden"
          onClick={(event) => event.stopPropagation()}
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
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-[#5f6368] transition hover:bg-[#f1f3f4] active:scale-95"
            onClick={onClose}
            type="button"
          >
            <IconClose />
          </button>
        </div>
        <div className="mt-5">
          {students.length === 0 ? (
            <p className="text-sm text-[#6f7478]">No students yet.</p>
          ) : (
            students.map((student) => (
              <button
                className="block w-full cursor-pointer border-b border-[#eceff1] py-4 text-left transition hover:bg-[#f8f9fa]"
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
  onShare,
  onSubmit,
  onViewAttachment,
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
  onShare: (noteId: number) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onViewAttachment: (attachment: NoteAttachmentRecord, index: number) => void;
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#202124]/30 p-0 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Edit student note"
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white p-6 shadow-[0_20px_70px_rgba(32,33,36,0.25)] sm:rounded-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[#6f7478]">
            {note.student?.name || "Student note"}
          </p>
          <button
            aria-label="Close note"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-[#5f6368] transition hover:bg-[#f1f3f4] active:scale-95"
            onClick={onClose}
            type="button"
          >
            <IconClose />
          </button>
        </div>

        <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
          {error ? <ErrorBanner message={error} /> : null}
          <input
            aria-label="Note title"
            maxLength={120}
            required
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
            aria-label="Student"
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
            aria-label="Note content"
            required
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
              className="h-11 cursor-pointer rounded-md bg-[#004aad] px-4 text-sm font-semibold text-white transition hover:bg-[#003b8a] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
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
                  onView={onViewAttachment}
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
            <ActionButton onClick={() => onShare(note.id)}>
              Share settings
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
  onView,
}: {
  attachment: NoteAttachmentRecord;
  index: number;
  noteId: number;
  onDelete: (noteId: number, attachmentId: string) => void;
  onReplace: (noteId: number, attachmentId: string, file?: File) => void;
  onView: (attachment: NoteAttachmentRecord, index: number) => void;
}) {
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="rounded-md border border-[#dfe3e7] p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          className="min-w-0 flex-1 cursor-pointer truncate text-left text-sm font-semibold text-[#202124] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004aad]"
          onClick={() => onView(attachment, index)}
          type="button"
        >
          {getAttachmentLabel(attachment, index)}
        </button>
        <div className="flex flex-wrap gap-2">
          <ActionButton onClick={() => onView(attachment, index)}>
            View
          </ActionButton>
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
        <button
          className="mt-3 block cursor-pointer rounded-md border border-[#eceff1] bg-[#f8fafd] p-2 transition hover:border-[#004aad]"
          onClick={() => onView(attachment, index)}
          type="button"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={attachment.caption || "Attachment preview"}
            className="max-h-64 rounded object-contain"
            src={attachment.fileUrl}
          />
        </button>
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

function AttachmentViewer({
  attachment,
  index,
  onClose,
}: {
  attachment?: NoteAttachmentRecord;
  index: number;
  onClose: () => void;
}) {
  if (!attachment) {
    return null;
  }

  const label = getAttachmentLabel(attachment, index);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-[#202124]/40 p-0 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <section
        className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_20px_70px_rgba(32,33,36,0.28)] sm:rounded-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#eceff1] px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-[#202124]">
              {label}
            </h2>
            <p className="mt-1 text-sm text-[#6f7478]">
              {getAttachmentKind(attachment)} · {attachment.fileType || "file"}
            </p>
          </div>
          <button
            aria-label="Close attachment preview"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-[#5f6368] transition hover:bg-[#f1f3f4] active:scale-95"
            onClick={onClose}
            type="button"
          >
            <IconClose />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-auto bg-[#f8fafd] p-4 sm:p-5">
          <AttachmentPreview attachment={attachment} label={label} />
        </div>

        <footer className="flex flex-wrap justify-end gap-2 border-t border-[#eceff1] px-5 py-4">
          <a
            className="inline-flex h-10 items-center justify-center rounded-md border border-[#dfe3e7] px-4 text-sm font-semibold text-[#303134] transition hover:bg-[#f8f9fa]"
            href={attachment.fileUrl}
            rel="noreferrer"
            target="_blank"
          >
            Open in new tab
          </a>
          <a
            className="inline-flex h-10 items-center justify-center rounded-md bg-[#004aad] px-4 text-sm font-semibold text-white transition hover:bg-[#003b8a]"
            download
            href={attachment.fileUrl}
          >
            Download
          </a>
        </footer>
      </section>
    </div>
  );
}

function AttachmentPreview({
  attachment,
  label,
}: {
  attachment: NoteAttachmentRecord;
  label: string;
}) {
  if (attachment.fileType.startsWith("image/")) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={label}
          className="max-h-[70vh] max-w-full rounded-lg border border-[#eceff1] bg-white object-contain"
          src={attachment.fileUrl}
        />
      </div>
    );
  }

  if (attachment.fileType.startsWith("video/")) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <video
          className="max-h-[70vh] w-full max-w-4xl rounded-lg bg-black"
          controls
          src={attachment.fileUrl}
        />
      </div>
    );
  }

  if (attachment.fileType.startsWith("audio/")) {
    return (
      <div className="mx-auto flex min-h-[35vh] max-w-2xl flex-col justify-center rounded-lg border border-[#eceff1] bg-white p-6">
        <p className="mb-4 text-sm font-semibold text-[#202124]">{label}</p>
        <audio className="w-full" controls src={attachment.fileUrl} />
      </div>
    );
  }

  if (isEmbeddableDocument(attachment)) {
    return (
      <iframe
        className="h-[70vh] w-full rounded-lg border border-[#dfe3e7] bg-white"
        src={attachment.fileUrl}
        title={label}
      />
    );
  }

  return (
    <div className="mx-auto flex min-h-[45vh] max-w-lg flex-col items-center justify-center rounded-lg border border-dashed border-[#dfe3e7] bg-white p-8 text-center">
      <p className="text-base font-semibold text-[#202124]">
        Preview unavailable
      </p>
      <p className="mt-2 text-sm leading-6 text-[#6f7478]">
        This file type cannot be previewed in the browser. Open it in a new tab
        or download it to view the contents.
      </p>
    </div>
  );
}

function IconMenu() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 20 20">
      <path
        d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function IconBack() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 20 20">
      <path
        d="M12.5 4.5 7 10l5.5 5.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function IconClose() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20">
      <path
        d="m5.5 5.5 9 9m0-9-9 9"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg aria-hidden="true" className="h-7 w-7" viewBox="0 0 20 20">
      <path
        d="M10 4v12M4 10h12"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}

function IconPin() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20">
      <path
        d="m7.3 3.5 9.2 9.2-3.5.8-2.9 2.9-1.9-4.6-4.6-1.9 2.9-2.9.8-3.5Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function IconPinned() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20">
      <path
        d="m7.3 3.5 9.2 9.2-3.5.8-2.9 2.9-1.9-4.6-4.6-1.9 2.9-2.9.8-3.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ActionButton({
  children,
  danger = false,
  onClick,
}: {
  children: React.ReactNode;
  danger?: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      className={`h-9 cursor-pointer rounded-md border px-3 text-sm font-semibold transition active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004aad] ${
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeRef.current();
      if (event.key !== "Tab") return;
      const controls = dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]");
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [open]);
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#202124]/30 p-0 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        aria-label="Create or edit record"
        aria-modal="true"
        role="dialog"
        ref={dialogRef}
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 pt-6 shadow-[0_20px_70px_rgba(32,33,36,0.25)] transition sm:rounded-lg sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          aria-label="Close modal"
          className="absolute right-4 top-4 flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-[#5f6368] transition hover:bg-[#f1f3f4] active:scale-95"
          onClick={onClose}
          type="button"
        >
          <IconClose />
        </button>
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
  subtitle,
  submitText,
  title,
}: {
  children: React.ReactNode;
  error: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitting: boolean;
  subtitle?: string;
  submitText: string;
  title: string;
}) {
  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <ModalHeading subtitle={subtitle} title={title} />
      {error ? <ErrorBanner message={error} /> : null}
      {children}
      <button
        className="mt-1 h-11 cursor-pointer rounded-md bg-[#004aad] px-4 text-sm font-semibold text-white transition hover:bg-[#003b8a] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={submitting}
        type="submit"
      >
        {submitting ? "Saving..." : submitText}
      </button>
    </form>
  );
}

function ModalHeading({
  subtitle,
  title,
}: {
  subtitle?: string;
  title: string;
}) {
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-normal text-[#202124]">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-1 text-sm leading-6 text-[#6f7478]">{subtitle}</p>
      ) : null}
    </div>
  );
}

function FieldLabel({
  children,
  label,
  optional = false,
}: {
  children: React.ReactNode;
  label: string;
  optional?: boolean;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-[#3c4043]">
      <span>
        {label}
        {optional ? (
          <span className="ml-1 font-normal text-[#80868b]">(optional)</span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

function PendingAttachmentPicker({
  attachments,
  onAdd,
  onCaptionChange,
  onRemove,
}: {
  attachments: PendingAttachment[];
  onAdd: (file?: File) => void;
  onCaptionChange: (id: string, caption: string) => void;
  onRemove: (id: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <section className="rounded-lg border border-[#dfe3e7] bg-[#f8fafd] p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#202124]">Attachments</p>
          <p className="text-xs text-[#6f7478]">Add files before saving.</p>
        </div>
        <ActionButton onClick={() => fileInputRef.current?.click()}>
          Add file
        </ActionButton>
      </div>
      {attachments.length ? (
        <div className="mt-3 grid gap-2">
          {attachments.map((attachment) => (
            <div
              className="rounded-md border border-[#eceff1] bg-white p-3"
              key={attachment.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#202124]">
                    {attachment.file.name}
                  </p>
                  <p className="mt-1 text-xs text-[#6f7478]">
                    {formatFileSize(attachment.file.size)}
                  </p>
                </div>
                <button
                  className="cursor-pointer rounded-md px-2 py-1 text-xs font-semibold text-[#a50e0e] transition hover:bg-[#fce8e6]"
                  onClick={() => onRemove(attachment.id)}
                  type="button"
                >
                  Remove
                </button>
              </div>
              <input
                className="mt-3 min-h-10 w-full rounded-md border border-[#dfe3e7] px-3 text-sm outline-none transition placeholder:text-[#80868b] focus:border-[#004aad]"
                onChange={(event) =>
                  onCaptionChange(attachment.id, event.target.value)
                }
                placeholder="Caption"
                value={attachment.caption}
              />
            </div>
          ))}
        </div>
      ) : null}
      <input
        className="hidden"
        onChange={(event) => {
          onAdd(event.target.files?.[0]);
          event.target.value = "";
        }}
        ref={fileInputRef}
        type="file"
      />
    </section>
  );
}

function ProfileMenu({
  onLogout,
  onToggle,
  open,
  user,
}: {
  onLogout: () => void;
  onToggle: () => void;
  open: boolean;
  user?: SessionState["user"];
}) {
  const email = user?.email || "Account";
  const initials = getInitials(email);

  return (
    <div className="relative">
      <button
        aria-expanded={open}
        aria-label="Account settings"
        className="relative z-[60] flex h-11 cursor-pointer items-center gap-2 rounded-full border border-[#dfe3e7] bg-white px-2 pr-3 text-sm font-semibold text-[#3c4043] shadow-[0_1px_2px_rgba(60,64,67,0.08)] transition hover:bg-[#f8f9fa] hover:shadow-[0_2px_8px_rgba(60,64,67,0.14)] active:scale-[0.98]"
        onClick={onToggle}
        type="button"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-[#e8f0fe] text-xs font-bold text-[#004aad]">
          {initials}
        </span>
        <span className="hidden max-w-36 truncate sm:block">{email}</span>
      </button>
      {open ? (
        <div className="absolute right-0 top-12 z-[60] w-72 rounded-lg border border-[#dfe3e7] bg-white p-2 shadow-[0_12px_32px_rgba(60,64,67,0.2)]">
          <div className="flex items-center gap-3 rounded-md px-3 py-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#e8f0fe] text-sm font-bold text-[#004aad]">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#202124]">
                {email}
              </p>
              <p className="text-xs text-[#6f7478]">Teacher workspace</p>
            </div>
          </div>
          <button
            className="mt-1 block w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm font-semibold text-[#a50e0e] transition hover:bg-[#fce8e6]"
            onClick={onLogout}
            type="button"
          >
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ShareDialog({
  copiedShareId,
  note,
  onClose,
  onCopyShare,
  onCreateShare,
  onRevokeShare,
  submitting,
}: {
  copiedShareId: string | null;
  note?: NoteRecord;
  onClose: () => void;
  onCopyShare: (shareLink: ShareLinkRecord) => void;
  onCreateShare: (noteId: number) => void;
  onRevokeShare: (shareLink: ShareLinkRecord) => void;
  submitting: boolean;
}) {
  const activeShare = note ? getActiveShareLink(note) : undefined;

  if (!note) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-[#202124]/30 p-0 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <section
        className="w-full max-w-xl rounded-t-2xl bg-white p-5 shadow-[0_20px_70px_rgba(32,33,36,0.25)] sm:rounded-lg sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-semibold text-[#202124]">
              Share note
            </h2>
            <p className="mt-1 truncate text-sm text-[#6f7478]">{note.title}</p>
          </div>
          <button
            aria-label="Close sharing"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-[#5f6368] transition hover:bg-[#f1f3f4] active:scale-95"
            onClick={onClose}
            type="button"
          >
            <IconClose />
          </button>
        </div>

        <section className="mt-5 rounded-lg border border-[#dfe3e7] p-4">
          <label className="grid gap-2 text-sm font-semibold text-[#3c4043]">
            Share with people
            <input
              className="min-h-11 rounded-md border border-[#dfe3e7] bg-[#f8f9fa] px-3 text-sm text-[#80868b]"
              disabled
              placeholder="Email sharing is not enabled yet"
            />
          </label>
          <p className="mt-2 text-xs leading-5 text-[#6f7478]">
            The backend currently supports shareable links. Email-specific access
            can be added when recipient permissions are implemented.
          </p>
        </section>

        <section className="mt-4 rounded-lg border border-[#dfe3e7] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#202124]">
                General access
              </h3>
              <p className="mt-1 text-xs leading-5 text-[#6f7478]">
                {activeShare
                  ? "Anyone with the link can view this shared note."
                  : "Create a link before this note can be shared."}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                activeShare
                  ? "bg-[#e6f4ea] text-[#137333]"
                  : "bg-[#f1f3f4] text-[#5f6368]"
              }`}
            >
              {activeShare ? "Link active" : "Restricted"}
            </span>
          </div>

          {activeShare ? (
            <div className="mt-4 rounded-md bg-[#f8fafd] p-3">
              <p className="break-all text-sm text-[#3c4043]">
                {getShareUrl(activeShare.token)}
              </p>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            {activeShare ? (
              <>
                <ActionButton onClick={() => onCopyShare(activeShare)}>
                  {copiedShareId === activeShare.id ? "Copied" : "Copy link"}
                </ActionButton>
                <ActionButton danger onClick={() => onRevokeShare(activeShare)}>
                  Revoke link
                </ActionButton>
              </>
            ) : (
              <button
                className="h-10 cursor-pointer rounded-md bg-[#004aad] px-4 text-sm font-semibold text-white transition hover:bg-[#003b8a] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={submitting}
                onClick={() => onCreateShare(note.id)}
                type="button"
              >
                {submitting ? "Creating..." : "Create share link"}
              </button>
            )}
          </div>
        </section>
      </section>
    </div>
  );
}

function AttachmentCaptionDialog({
  draft,
  onCaptionChange,
  onClose,
  onSubmit,
  submitting,
}: {
  draft: AttachmentCaptionDraft | null;
  onCaptionChange: (caption: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitting: boolean;
}) {
  if (!draft) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[65] flex items-end justify-center bg-[#202124]/30 p-0 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <section
        className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-[0_20px_70px_rgba(32,33,36,0.25)] sm:rounded-lg sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <ModalHeading
            subtitle="Add a short label so the file is easier to recognize later."
            title="Attach file"
          />
          <button
            aria-label="Close attachment form"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-[#5f6368] transition hover:bg-[#f1f3f4] active:scale-95"
            onClick={onClose}
            type="button"
          >
            <IconClose />
          </button>
        </div>

        <form className="mt-5 grid gap-4" onSubmit={onSubmit}>
          <div className="rounded-lg border border-[#eceff1] bg-[#f8fafd] p-3">
            <p className="truncate text-sm font-semibold text-[#202124]">
              {draft.file.name}
            </p>
            <p className="mt-1 text-xs text-[#6f7478]">
              {formatFileSize(draft.file.size)}
            </p>
          </div>

          <FieldLabel label="Caption" optional>
            <input
              className={inputClass}
              onChange={(event) => onCaptionChange(event.target.value)}
              placeholder="Student work sample, parent note, rubric..."
              value={draft.caption}
            />
          </FieldLabel>

          <div className="flex justify-end gap-2">
            <ActionButton onClick={onClose}>Cancel</ActionButton>
            <button
              className="h-10 cursor-pointer rounded-md bg-[#004aad] px-4 text-sm font-semibold text-white transition hover:bg-[#003b8a] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Attaching..." : "Attach file"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function DeleteClassDialog({
  classItem,
  confirmationValue,
  onClose,
  onConfirm,
  onConfirmationChange,
  submitting,
}: {
  classItem: ClassRecord | null;
  confirmationValue: string;
  onClose: () => void;
  onConfirm: () => void;
  onConfirmationChange: (value: string) => void;
  submitting: boolean;
}) {
  if (!classItem) {
    return null;
  }

  const canDelete = confirmationValue.trim() === classItem.name;

  return (
    <div
      className="fixed inset-0 z-[65] flex items-end justify-center bg-[#202124]/30 p-0 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <section
        className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-[0_20px_70px_rgba(32,33,36,0.25)] sm:rounded-lg sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <ModalHeading
            subtitle="This will remove the class from your active dashboard. Type the class name to confirm."
            title="Delete class"
          />
          <button
            aria-label="Close delete confirmation"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-[#5f6368] transition hover:bg-[#f1f3f4] active:scale-95"
            onClick={onClose}
            type="button"
          >
            <IconClose />
          </button>
        </div>

        <div className="mt-5 rounded-lg border border-[#f2b8b5] bg-[#fff8f7] p-4">
          <p className="text-sm font-semibold text-[#a50e0e]">
            {classItem.name}
          </p>
          <p className="mt-1 text-sm leading-6 text-[#7a2e27]">
            Students and notes attached to this class may no longer be visible
            after deletion.
          </p>
        </div>

        <form
          className="mt-5 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (canDelete) {
              onConfirm();
            }
          }}
        >
          <FieldLabel label={`Type "${classItem.name}" to delete`}>
            <input
              className={inputClass}
              onChange={(event) => onConfirmationChange(event.target.value)}
              placeholder={classItem.name}
              value={confirmationValue}
            />
          </FieldLabel>

          <div className="flex justify-end gap-2">
            <ActionButton onClick={onClose}>Cancel</ActionButton>
            <button
              className="h-10 cursor-pointer rounded-md bg-[#a50e0e] px-4 text-sm font-semibold text-white transition hover:bg-[#7f0b0b] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canDelete || submitting}
              type="submit"
            >
              {submitting ? "Deleting..." : "Delete class"}
            </button>
          </div>
        </form>
      </section>
    </div>
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
          className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-[#004aad] px-5 text-sm font-semibold text-white"
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
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#dfe3e7] border-t-[#004aad]" />
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
      <div className="h-full w-1/3 animate-pulse rounded-full bg-[#004aad]" />
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div role="alert" className="mb-4 rounded-md border border-[#f2b8b5] bg-[#fce8e6] px-4 py-3 text-sm font-medium text-[#a50e0e]">
      {message}
      {message.includes("session has expired") ? <Link href="/login" className="ml-2 underline">Sign in</Link> : null}
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

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`;
  }

  return `${(kilobytes / 1024).toFixed(1)} MB`;
}

function getInitials(value: string) {
  const [namePart] = value.split("@");
  const parts = namePart
    .split(/[.\s_-]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "A";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
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

  if (isTextDocument(attachment)) {
    return "Text";
  }

  return "File";
}

function isTextDocument(attachment: NoteAttachmentRecord) {
  return (
    attachment.fileType === "text/plain" ||
    attachment.fileType === "text/markdown" ||
    attachment.fileType === "text/csv" ||
    attachment.fileType === "application/json"
  );
}

function isEmbeddableDocument(attachment: NoteAttachmentRecord) {
  return attachment.fileType === "application/pdf" || isTextDocument(attachment);
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
  "min-h-12 w-full rounded-md border border-[#dfe3e7] bg-white px-4 text-base text-[#202124] outline-none transition placeholder:text-[#80868b] focus:border-[#004aad]";

export default function DashboardClient() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContent />
    </QueryClientProvider>
  );
}
