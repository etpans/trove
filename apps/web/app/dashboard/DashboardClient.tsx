"use client";

import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import Button from "@mui/material/Button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

type SessionState = {
  authenticated: boolean;
  message?: string;
  user?: {
    email?: string;
    userId?: string;
  };
};

type ClassRecord = {
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

type SubjectRecord = {
  color: string;
  id: number;
  name: string;
};

type TagRecord = {
  color: string;
  id: number;
  name: string;
};

type ShareLinkRecord = {
  id: string;
  token: string;
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
  shareLinks?: ShareLinkRecord[];
  student?: StudentRecord;
  studentId: number;
  subject?: SubjectRecord | null;
  subjectId?: number | null;
  tags?: TagRecord[];
  title: string;
  updatedAt?: string;
};

type ResourceKey = "classes" | "students" | "subjects" | "tags" | "notes";

type ClassFormState = {
  name: string;
  session: string;
};

type StudentFormState = {
  classId: string;
  name: string;
  rollNumber: string;
};

type NamedColorFormState = {
  color: string;
  name: string;
};

type NoteFormState = {
  content: string;
  studentId: string;
  subjectId: string;
  tagIds: string[];
  title: string;
};

const emptyClassForm: ClassFormState = {
  name: "",
  session: "",
};

const emptyStudentForm: StudentFormState = {
  classId: "",
  name: "",
  rollNumber: "",
};

const emptySubjectForm: NamedColorFormState = {
  color: "#378ADD",
  name: "",
};

const emptyTagForm: NamedColorFormState = {
  color: "#3BAA73",
  name: "",
};

const emptyNoteForm: NoteFormState = {
  content: "",
  studentId: "",
  subjectId: "",
  tagIds: [],
  title: "",
};

const tabs: Array<{ key: ResourceKey; label: string }> = [
  { key: "classes", label: "Classes" },
  { key: "students", label: "Students" },
  { key: "subjects", label: "Subjects" },
  { key: "tags", label: "Tags" },
  { key: "notes", label: "Notes" },
];

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

function formatDate(value?: string | null) {
  if (!value) {
    return "Not set";
  }

  const [dateOnly] = value.split("T");
  const [year, month, day] = dateOnly.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function toDateInput(value?: string | null) {
  return value?.slice(0, 10) ?? "";
}

function getShareUrl(token: string) {
  if (typeof window === "undefined") {
    return `/share/${token}`;
  }

  return `${window.location.origin}/share/${token}`;
}

function isImageAttachment(attachment: NoteAttachmentRecord) {
  return attachment.fileType.startsWith("image/");
}

function getAttachmentKind(attachment: NoteAttachmentRecord) {
  if (attachment.fileType.startsWith("image/")) {
    return "Image";
  }

  if (attachment.fileType === "application/pdf") {
    return "PDF";
  }

  if (attachment.fileType.startsWith("video/")) {
    return "Video";
  }

  if (attachment.fileType.startsWith("audio/")) {
    return "Audio";
  }

  return "File";
}

function getAttachmentLabel(attachment: NoteAttachmentRecord, index: number) {
  return (
    attachment.caption?.trim() || `${getAttachmentKind(attachment)} ${index + 1}`
  );
}

function FieldLabel({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <span className="mb-1.5 block text-sm font-medium text-[#4d4d4d]">
        {children}
      </span>
    </label>
  );
}

const inputClass =
  "h-11 w-full rounded-lg border border-[#d7dce5] bg-white px-3 text-sm outline-none transition focus:border-[#378ADD]";
const textAreaClass =
  "min-h-28 w-full rounded-lg border border-[#d7dce5] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#378ADD]";

function ErrorBox({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <div className="rounded-lg border border-[#e3b7a6] bg-[#fff7f3] p-3 text-sm text-[#8a3517]">
      {message}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-[#cfd6df] bg-white p-8 text-sm leading-6 text-[#6b6b6b]">
      {children}
    </div>
  );
}

function AttachmentGrid({
  attachments,
}: {
  attachments?: NoteAttachmentRecord[];
}) {
  if (!attachments?.length) {
    return null;
  }

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {attachments.map((attachment, index) => {
        const label = getAttachmentLabel(attachment, index);

        return (
          <a
            className="group overflow-hidden rounded-lg border border-[#d7dce5] bg-[#fafaf8] text-sm text-[#111111] transition hover:border-[#378ADD]"
            href={attachment.fileUrl}
            key={attachment.id}
            rel="noreferrer"
            target="_blank"
          >
            {isImageAttachment(attachment) ? (
              <div
                aria-label={label}
                className="h-32 w-full bg-white bg-cover bg-center"
                role="img"
                style={{ backgroundImage: `url(${attachment.fileUrl})` }}
              />
            ) : (
              <div className="flex h-32 items-center justify-center bg-white text-xs font-semibold uppercase tracking-[0.12em] text-[#6b6b6b]">
                {getAttachmentKind(attachment)}
              </div>
            )}
            <div className="border-t border-[#d7dce5] px-3 py-2">
              <span className="block truncate font-medium text-[#245f99] group-hover:underline">
                {label}
              </span>
            </div>
          </a>
        );
      })}
    </div>
  );
}

function UnauthorizedDashboard() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafaf8] px-5 py-12 text-[#111111]">
      <main className="w-full max-w-md rounded-lg border border-[#e7e5df] bg-white p-7 text-center shadow-[0_18px_60px_rgba(17,17,17,0.08)]">
        <Link className="text-lg font-semibold lowercase" href="/">
          trove
        </Link>
        <p className="mt-8 text-sm font-semibold text-[#378ADD]">401</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight">
          Sign in required
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#5f5f5f]">
          You need to be logged in before you can view your dashboard.
        </p>
        <Button
          disableElevation
          href="/"
          sx={{
            backgroundColor: "#111111",
            borderRadius: "8px",
            color: "#ffffff",
            fontWeight: 700,
            mt: 4,
            minHeight: "44px",
            px: 3,
            textTransform: "none",
          }}
          variant="contained"
        >
          Go to sign in
        </Button>
      </main>
    </div>
  );
}

function DashboardLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafaf8] px-5 py-12 text-[#111111]">
      <main className="w-full max-w-md rounded-lg border border-[#e7e5df] bg-white p-7 text-center">
        <Link className="text-lg font-semibold lowercase" href="/">
          trove
        </Link>
        <div
          aria-label="Loading dashboard"
          className="mx-auto mt-9 h-10 w-10 animate-spin rounded-full border-2 border-[#d7dce5] border-t-[#378ADD]"
          role="status"
        />
        <h1 className="mt-6 text-2xl font-semibold leading-tight">
          Loading dashboard
        </h1>
      </main>
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ResourceKey>("classes");
  const [classForm, setClassForm] = useState<ClassFormState>(emptyClassForm);
  const [studentForm, setStudentForm] =
    useState<StudentFormState>(emptyStudentForm);
  const [subjectForm, setSubjectForm] =
    useState<NamedColorFormState>(emptySubjectForm);
  const [tagForm, setTagForm] = useState<NamedColorFormState>(emptyTagForm);
  const [noteForm, setNoteForm] = useState<NoteFormState>(emptyNoteForm);
  const [noteAttachmentFiles, setNoteAttachmentFiles] = useState<File[]>([]);
  const [editingClassId, setEditingClassId] = useState<number | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
  const [editingSubjectId, setEditingSubjectId] = useState<number | null>(null);
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [latestShareUrl, setLatestShareUrl] = useState<string | null>(null);

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
  const subjectsQuery = useQuery({
    enabled,
    queryFn: () => fetchJson<SubjectRecord[]>("/api/subjects"),
    queryKey: ["subjects"],
  });
  const tagsQuery = useQuery({
    enabled,
    queryFn: () => fetchJson<TagRecord[]>("/api/tags"),
    queryKey: ["tags"],
  });
  const notesQuery = useQuery({
    enabled,
    queryFn: () => fetchJson<NoteRecord[]>("/api/notes"),
    queryKey: ["notes"],
  });

  const counts = {
    classes: classesQuery.data?.length ?? 0,
    notes: notesQuery.data?.length ?? 0,
    students: studentsQuery.data?.length ?? 0,
    subjects: subjectsQuery.data?.length ?? 0,
    tags: tagsQuery.data?.length ?? 0,
  };

  const selectedClass = useMemo(
    () =>
      classesQuery.data?.find((classItem) => classItem.id === editingClassId) ??
      null,
    [classesQuery.data, editingClassId],
  );
  const selectedStudent = useMemo(
    () =>
      studentsQuery.data?.find((student) => student.id === editingStudentId) ??
      null,
    [studentsQuery.data, editingStudentId],
  );
  const selectedSubject = useMemo(
    () =>
      subjectsQuery.data?.find((subject) => subject.id === editingSubjectId) ??
      null,
    [subjectsQuery.data, editingSubjectId],
  );
  const selectedTag = useMemo(
    () => tagsQuery.data?.find((tag) => tag.id === editingTagId) ?? null,
    [tagsQuery.data, editingTagId],
  );
  const selectedNote = useMemo(
    () => notesQuery.data?.find((note) => note.id === editingNoteId) ?? null,
    [notesQuery.data, editingNoteId],
  );

  const saveClassMutation = useMutation({
    mutationFn: (payload: ClassFormState & { id?: number }) =>
      fetchJson<ClassRecord>(
        payload.id ? `/api/classes/${payload.id}` : "/api/classes",
        {
          body: JSON.stringify({
            name: payload.name.trim(),
            session: payload.session,
          }),
          method: payload.id ? "PATCH" : "POST",
        },
      ),
    onSuccess: async () => {
      setClassForm(emptyClassForm);
      setEditingClassId(null);
      await queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
  });

  const saveStudentMutation = useMutation({
    mutationFn: (payload: StudentFormState & { id?: number }) =>
      fetchJson<StudentRecord>(
        payload.id ? `/api/students/${payload.id}` : "/api/students",
        {
          body: JSON.stringify({
            classId: Number(payload.classId),
            name: payload.name.trim(),
            rollNumber: payload.rollNumber.trim() || undefined,
          }),
          method: payload.id ? "PATCH" : "POST",
        },
      ),
    onSuccess: async () => {
      setStudentForm(emptyStudentForm);
      setEditingStudentId(null);
      await queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });

  const saveSubjectMutation = useMutation({
    mutationFn: (payload: NamedColorFormState & { id?: number }) =>
      fetchJson<SubjectRecord>(
        payload.id ? `/api/subjects/${payload.id}` : "/api/subjects",
        {
          body: JSON.stringify({
            color: payload.color,
            name: payload.name.trim(),
          }),
          method: payload.id ? "PATCH" : "POST",
        },
      ),
    onSuccess: async () => {
      setSubjectForm(emptySubjectForm);
      setEditingSubjectId(null);
      await queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
  });

  const saveTagMutation = useMutation({
    mutationFn: (payload: NamedColorFormState & { id?: number }) =>
      fetchJson<TagRecord>(payload.id ? `/api/tags/${payload.id}` : "/api/tags", {
        body: JSON.stringify({
          color: payload.color,
          name: payload.name.trim(),
        }),
        method: payload.id ? "PATCH" : "POST",
      }),
    onSuccess: async () => {
      setTagForm(emptyTagForm);
      setEditingTagId(null);
      await queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });

  const saveNoteMutation = useMutation({
    mutationFn: async (
      payload: NoteFormState & { attachments: File[]; id?: number },
    ) => {
      const note = await fetchJson<NoteRecord>(
        payload.id ? `/api/notes/${payload.id}` : "/api/notes",
        {
          body: JSON.stringify({
            content: payload.content.trim(),
            studentId: Number(payload.studentId),
            subjectId: payload.subjectId ? Number(payload.subjectId) : null,
            tagIds: payload.tagIds.map(Number),
            title: payload.title.trim(),
          }),
          method: payload.id ? "PATCH" : "POST",
        },
      );

      await Promise.all(
        payload.attachments.map((file) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("caption", file.name);

          return fetchMultipartJson<NoteAttachmentRecord>(
            `/api/notes/${note.id}/attachments`,
            formData,
          );
        }),
      );

      return note;
    },
    onSuccess: async () => {
      setNoteForm(emptyNoteForm);
      setNoteAttachmentFiles([]);
      setEditingNoteId(null);
      await queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: ({ file, noteId }: { file: File; noteId: number }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("caption", file.name);

      return fetchMultipartJson<NoteAttachmentRecord>(
        `/api/notes/${noteId}/attachments`,
        formData,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, resource }: { id: number; resource: ResourceKey }) =>
      fetchJson<{ deleted: boolean }>(`/api/${resource}/${id}`, {
        method: "DELETE",
      }),
    onSuccess: async (_data, variables) => {
      if (variables.resource === "classes") {
        setEditingClassId(null);
        setClassForm(emptyClassForm);
        await queryClient.invalidateQueries({ queryKey: ["classes"] });
        await queryClient.invalidateQueries({ queryKey: ["students"] });
      }
      if (variables.resource === "students") {
        setEditingStudentId(null);
        setStudentForm(emptyStudentForm);
        await queryClient.invalidateQueries({ queryKey: ["students"] });
        await queryClient.invalidateQueries({ queryKey: ["notes"] });
      }
      if (variables.resource === "subjects") {
        setEditingSubjectId(null);
        setSubjectForm(emptySubjectForm);
        await queryClient.invalidateQueries({ queryKey: ["subjects"] });
        await queryClient.invalidateQueries({ queryKey: ["notes"] });
      }
      if (variables.resource === "tags") {
        setEditingTagId(null);
        setTagForm(emptyTagForm);
        await queryClient.invalidateQueries({ queryKey: ["tags"] });
        await queryClient.invalidateQueries({ queryKey: ["notes"] });
      }
      if (variables.resource === "notes") {
        setEditingNoteId(null);
        setNoteForm(emptyNoteForm);
        setNoteAttachmentFiles([]);
        await queryClient.invalidateQueries({ queryKey: ["notes"] });
      }
    },
  });

  const shareMutation = useMutation({
    mutationFn: (noteId: number) =>
      fetchJson<ShareLinkRecord>(`/api/notes/${noteId}/share`, {
        method: "POST",
      }),
    onSuccess: async (shareLink) => {
      const url = getShareUrl(shareLink.token);
      setLatestShareUrl(url);
      await navigator.clipboard?.writeText(url).catch(() => undefined);
      await queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
  }

  function handleClassSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!classForm.name.trim() || !classForm.session) {
      return;
    }
    saveClassMutation.mutate({
      ...classForm,
      id: editingClassId ?? undefined,
    });
  }

  function handleStudentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!studentForm.name.trim() || !studentForm.classId) {
      return;
    }
    saveStudentMutation.mutate({
      ...studentForm,
      id: editingStudentId ?? undefined,
    });
  }

  function handleSubjectSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!subjectForm.name.trim()) {
      return;
    }
    saveSubjectMutation.mutate({
      ...subjectForm,
      id: editingSubjectId ?? undefined,
    });
  }

  function handleTagSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tagForm.name.trim()) {
      return;
    }
    saveTagMutation.mutate({
      ...tagForm,
      id: editingTagId ?? undefined,
    });
  }

  function handleNoteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!noteForm.title.trim() || !noteForm.content.trim() || !noteForm.studentId) {
      return;
    }
    saveNoteMutation.mutate({
      ...noteForm,
      attachments: noteAttachmentFiles,
      id: editingNoteId ?? undefined,
    });
  }

  const isLoadingDashboard =
    sessionQuery.isLoading ||
    (enabled &&
      (classesQuery.isLoading ||
        studentsQuery.isLoading ||
        subjectsQuery.isLoading ||
        tagsQuery.isLoading ||
        notesQuery.isLoading));

  if (sessionQuery.isLoading) {
    return <DashboardLoading />;
  }

  if (sessionQuery.isError || sessionQuery.data?.authenticated === false) {
    return <UnauthorizedDashboard />;
  }

  return (
    <div className="min-h-screen bg-[#fafaf8] px-5 py-6 text-[#111111] sm:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link className="text-lg font-semibold lowercase" href="/">
          trove
        </Link>
        <Button
          onClick={handleLogout}
          sx={{
            borderColor: "#d7dce5",
            borderRadius: "8px",
            color: "#111111",
            fontSize: "0.875rem",
            fontWeight: 600,
            textTransform: "none",
          }}
          variant="outlined"
        >
          Log out
        </Button>
      </div>

      <main className="mx-auto mt-8 max-w-6xl">
        <section className="border-b border-[#e7e5df] pb-6">
          <p className="text-sm font-medium text-[#378ADD]">
            {sessionQuery.data?.user?.email ?? "Signed in"}
          </p>
          <h1 className="mt-2 text-4xl font-semibold leading-tight">
            Classroom notes
          </h1>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
            {tabs.map((tab) => (
              <button
                className={`rounded-lg border p-3 text-left transition ${
                  activeTab === tab.key
                    ? "border-[#111111] bg-[#111111] text-white"
                    : "border-[#e7e5df] bg-white text-[#111111]"
                }`}
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                type="button"
              >
                <span className="block text-2xl font-semibold">
                  {counts[tab.key]}
                </span>
                <span className="mt-1 block">{tab.label}</span>
              </button>
            ))}
          </div>
        </section>

        {isLoadingDashboard ? (
          <div className="mt-8 rounded-lg border border-[#e7e5df] bg-white p-6 text-sm text-[#6b6b6b]">
            Loading workspace...
          </div>
        ) : (
          <section className="grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="min-h-[420px]">
              {activeTab === "classes" ? (
                <div>
                  <h2 className="text-lg font-semibold">Classes</h2>
                  <div className="mt-4 grid gap-3">
                    {classesQuery.data?.length ? (
                      classesQuery.data.map((classItem) => (
                        <article
                          className="rounded-lg border border-[#e7e5df] bg-white p-5"
                          key={classItem.id}
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <h3 className="text-base font-semibold">
                                {classItem.name}
                              </h3>
                              <p className="mt-1 text-sm text-[#6b6b6b]">
                                Session {formatDate(classItem.session)}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => {
                                  setEditingClassId(classItem.id);
                                  setClassForm({
                                    name: classItem.name,
                                    session: toDateInput(classItem.session),
                                  });
                                }}
                                size="small"
                                sx={{ textTransform: "none" }}
                              >
                                Edit
                              </Button>
                              <Button
                                color="error"
                                onClick={() =>
                                  deleteMutation.mutate({
                                    id: classItem.id,
                                    resource: "classes",
                                  })
                                }
                                size="small"
                                sx={{ textTransform: "none" }}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </article>
                      ))
                    ) : (
                      <EmptyState>Create a class before adding students.</EmptyState>
                    )}
                  </div>
                </div>
              ) : null}

              {activeTab === "students" ? (
                <div>
                  <h2 className="text-lg font-semibold">Students</h2>
                  <div className="mt-4 grid gap-3">
                    {studentsQuery.data?.length ? (
                      studentsQuery.data.map((student) => (
                        <article
                          className="rounded-lg border border-[#e7e5df] bg-white p-5"
                          key={student.id}
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <h3 className="text-base font-semibold">
                                {student.name}
                              </h3>
                              <p className="mt-1 text-sm text-[#6b6b6b]">
                                {student.class?.name ?? "Class not loaded"}
                                {student.rollNumber
                                  ? ` - ${student.rollNumber}`
                                  : ""}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => {
                                  setEditingStudentId(student.id);
                                  setStudentForm({
                                    classId: String(student.classId),
                                    name: student.name,
                                    rollNumber: student.rollNumber ?? "",
                                  });
                                }}
                                size="small"
                                sx={{ textTransform: "none" }}
                              >
                                Edit
                              </Button>
                              <Button
                                color="error"
                                onClick={() =>
                                  deleteMutation.mutate({
                                    id: student.id,
                                    resource: "students",
                                  })
                                }
                                size="small"
                                sx={{ textTransform: "none" }}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </article>
                      ))
                    ) : (
                      <EmptyState>Add students to build note history.</EmptyState>
                    )}
                  </div>
                </div>
              ) : null}

              {activeTab === "subjects" ? (
                <div>
                  <h2 className="text-lg font-semibold">Subjects</h2>
                  <div className="mt-4 grid gap-3">
                    {subjectsQuery.data?.length ? (
                      subjectsQuery.data.map((subject) => (
                        <ColorResourceRow
                          key={subject.id}
                          color={subject.color}
                          name={subject.name}
                          onDelete={() =>
                            deleteMutation.mutate({
                              id: subject.id,
                              resource: "subjects",
                            })
                          }
                          onEdit={() => {
                            setEditingSubjectId(subject.id);
                            setSubjectForm({
                              color: subject.color,
                              name: subject.name,
                            });
                          }}
                        />
                      ))
                    ) : (
                      <EmptyState>Create subjects for filtering notes.</EmptyState>
                    )}
                  </div>
                </div>
              ) : null}

              {activeTab === "tags" ? (
                <div>
                  <h2 className="text-lg font-semibold">Tags</h2>
                  <div className="mt-4 grid gap-3">
                    {tagsQuery.data?.length ? (
                      tagsQuery.data.map((tag) => (
                        <ColorResourceRow
                          key={tag.id}
                          color={tag.color}
                          name={tag.name}
                          onDelete={() =>
                            deleteMutation.mutate({
                              id: tag.id,
                              resource: "tags",
                            })
                          }
                          onEdit={() => {
                            setEditingTagId(tag.id);
                            setTagForm({
                              color: tag.color,
                              name: tag.name,
                            });
                          }}
                        />
                      ))
                    ) : (
                      <EmptyState>Create tags for quick note labels.</EmptyState>
                    )}
                  </div>
                </div>
              ) : null}

              {activeTab === "notes" ? (
                <div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <h2 className="text-lg font-semibold">Notes</h2>
                    {latestShareUrl ? (
                      <a
                        className="text-sm font-medium text-[#245f99] underline"
                        href={latestShareUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Latest shared note
                      </a>
                    ) : null}
                  </div>
                  <div className="mt-4 grid gap-3">
                    <ErrorBox message={uploadAttachmentMutation.error?.message} />
                    {notesQuery.data?.length ? (
                      notesQuery.data.map((note) => {
                        const share = note.shareLinks?.[0];
                        const shareUrl = share ? getShareUrl(share.token) : null;

                        return (
                          <article
                            className="rounded-lg border border-[#e7e5df] bg-white p-5"
                            key={note.id}
                          >
                            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
                              <div>
                                <h3 className="text-base font-semibold">
                                  {note.title}
                                </h3>
                                <p className="mt-1 text-sm text-[#6b6b6b]">
                                  {note.student?.name ?? "Student"}{" "}
                                  {note.subject ? `- ${note.subject.name}` : ""}
                                </p>
                                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#333333]">
                                  {note.content}
                                </p>
                                {note.tags?.length ? (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {note.tags.map((tag) => (
                                      <span
                                        className="rounded-full border border-[#e7e5df] bg-[#fafaf8] px-2.5 py-1 text-xs font-medium"
                                        key={tag.id}
                                      >
                                        {tag.name}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                                {shareUrl ? (
                                  <a
                                    className="mt-3 block break-all text-sm text-[#245f99] underline"
                                    href={shareUrl}
                                    rel="noreferrer"
                                    target="_blank"
                                  >
                                    {shareUrl}
                                  </a>
                                ) : null}
                                <AttachmentGrid attachments={note.attachments} />
                              </div>
                              <div className="flex shrink-0 flex-wrap gap-2">
                                <Button
                                  component="label"
                                  disabled={uploadAttachmentMutation.isPending}
                                  size="small"
                                  sx={{ textTransform: "none" }}
                                >
                                  Attach file
                                  <input
                                    hidden
                                    onChange={(event) => {
                                      const file = event.target.files?.[0];

                                      if (file) {
                                        uploadAttachmentMutation.mutate({
                                          file,
                                          noteId: note.id,
                                        });
                                      }

                                      event.target.value = "";
                                    }}
                                    type="file"
                                  />
                                </Button>
                                <Button
                                  onClick={() => {
                                    setEditingNoteId(note.id);
                                    setNoteForm({
                                      content: note.content ?? "",
                                      studentId: String(note.studentId),
                                      subjectId: note.subjectId
                                        ? String(note.subjectId)
                                        : "",
                                      tagIds:
                                        note.tags?.map((tag) => String(tag.id)) ??
                                        [],
                                      title: note.title,
                                    });
                                    setNoteAttachmentFiles([]);
                                  }}
                                  size="small"
                                  sx={{ textTransform: "none" }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  disabled={shareMutation.isPending}
                                  onClick={() => shareMutation.mutate(note.id)}
                                  size="small"
                                  sx={{ textTransform: "none" }}
                                >
                                  Share
                                </Button>
                                <Button
                                  color="error"
                                  onClick={() =>
                                    deleteMutation.mutate({
                                      id: note.id,
                                      resource: "notes",
                                    })
                                  }
                                  size="small"
                                  sx={{ textTransform: "none" }}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </article>
                        );
                      })
                    ) : (
                      <EmptyState>
                        Add a student first, then capture rough classroom notes.
                      </EmptyState>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <aside className="rounded-lg border border-[#e7e5df] bg-white p-5">
              {activeTab === "classes" ? (
                <form className="space-y-4" onSubmit={handleClassSubmit}>
                  <h2 className="text-lg font-semibold">
                    {selectedClass ? "Edit class" : "Create class"}
                  </h2>
                  <div>
                    <FieldLabel>Name</FieldLabel>
                    <input
                      className={inputClass}
                      maxLength={30}
                      minLength={2}
                      onChange={(event) =>
                        setClassForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Grade 3 Math"
                      required
                      value={classForm.name}
                    />
                  </div>
                  <div>
                    <FieldLabel>Session</FieldLabel>
                    <input
                      className={inputClass}
                      onChange={(event) =>
                        setClassForm((current) => ({
                          ...current,
                          session: event.target.value,
                        }))
                      }
                      required
                      type="date"
                      value={classForm.session}
                    />
                  </div>
                  <FormActions
                    isEditing={Boolean(selectedClass)}
                    isSaving={saveClassMutation.isPending}
                    onCancel={() => {
                      setEditingClassId(null);
                      setClassForm(emptyClassForm);
                    }}
                  />
                  <ErrorBox message={saveClassMutation.error?.message} />
                </form>
              ) : null}

              {activeTab === "students" ? (
                <form className="space-y-4" onSubmit={handleStudentSubmit}>
                  <h2 className="text-lg font-semibold">
                    {selectedStudent ? "Edit student" : "Create student"}
                  </h2>
                  <div>
                    <FieldLabel>Name</FieldLabel>
                    <input
                      className={inputClass}
                      onChange={(event) =>
                        setStudentForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Student name"
                      required
                      value={studentForm.name}
                    />
                  </div>
                  <div>
                    <FieldLabel>Class</FieldLabel>
                    <select
                      className={inputClass}
                      onChange={(event) =>
                        setStudentForm((current) => ({
                          ...current,
                          classId: event.target.value,
                        }))
                      }
                      required
                      value={studentForm.classId}
                    >
                      <option value="">Select class</option>
                      {classesQuery.data?.map((classItem) => (
                        <option key={classItem.id} value={classItem.id}>
                          {classItem.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Roll number</FieldLabel>
                    <input
                      className={inputClass}
                      onChange={(event) =>
                        setStudentForm((current) => ({
                          ...current,
                          rollNumber: event.target.value,
                        }))
                      }
                      placeholder="Optional"
                      value={studentForm.rollNumber}
                    />
                  </div>
                  <FormActions
                    isEditing={Boolean(selectedStudent)}
                    isSaving={saveStudentMutation.isPending}
                    onCancel={() => {
                      setEditingStudentId(null);
                      setStudentForm(emptyStudentForm);
                    }}
                  />
                  <ErrorBox message={saveStudentMutation.error?.message} />
                </form>
              ) : null}

              {activeTab === "subjects" ? (
                <NamedColorForm
                  error={saveSubjectMutation.error?.message}
                  form={subjectForm}
                  isEditing={Boolean(selectedSubject)}
                  isSaving={saveSubjectMutation.isPending}
                  label="subject"
                  onCancel={() => {
                    setEditingSubjectId(null);
                    setSubjectForm(emptySubjectForm);
                  }}
                  onChange={setSubjectForm}
                  onSubmit={handleSubjectSubmit}
                />
              ) : null}

              {activeTab === "tags" ? (
                <NamedColorForm
                  error={saveTagMutation.error?.message}
                  form={tagForm}
                  isEditing={Boolean(selectedTag)}
                  isSaving={saveTagMutation.isPending}
                  label="tag"
                  onCancel={() => {
                    setEditingTagId(null);
                    setTagForm(emptyTagForm);
                  }}
                  onChange={setTagForm}
                  onSubmit={handleTagSubmit}
                />
              ) : null}

              {activeTab === "notes" ? (
                <form className="space-y-4" onSubmit={handleNoteSubmit}>
                  <h2 className="text-lg font-semibold">
                    {selectedNote ? "Edit note" : "Create note"}
                  </h2>
                  <div>
                    <FieldLabel>Title</FieldLabel>
                    <input
                      className={inputClass}
                      onChange={(event) =>
                        setNoteForm((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      placeholder="Quick observation"
                      required
                      value={noteForm.title}
                    />
                  </div>
                  <div>
                    <FieldLabel>Student</FieldLabel>
                    <select
                      className={inputClass}
                      onChange={(event) =>
                        setNoteForm((current) => ({
                          ...current,
                          studentId: event.target.value,
                        }))
                      }
                      required
                      value={noteForm.studentId}
                    >
                      <option value="">Select student</option>
                      {studentsQuery.data?.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Subject</FieldLabel>
                    <select
                      className={inputClass}
                      onChange={(event) =>
                        setNoteForm((current) => ({
                          ...current,
                          subjectId: event.target.value,
                        }))
                      }
                      value={noteForm.subjectId}
                    >
                      <option value="">No subject</option>
                      {subjectsQuery.data?.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Tags</FieldLabel>
                    <select
                      className="min-h-28 w-full rounded-lg border border-[#d7dce5] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#378ADD]"
                      multiple
                      onChange={(event) =>
                        setNoteForm((current) => ({
                          ...current,
                          tagIds: Array.from(event.target.selectedOptions).map(
                            (option) => option.value,
                          ),
                        }))
                      }
                      value={noteForm.tagIds}
                    >
                      {tagsQuery.data?.map((tag) => (
                        <option key={tag.id} value={tag.id}>
                          {tag.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Content</FieldLabel>
                    <textarea
                      className={textAreaClass}
                      onChange={(event) =>
                        setNoteForm((current) => ({
                          ...current,
                          content: event.target.value,
                        }))
                      }
                      placeholder="What happened?"
                      required
                      value={noteForm.content}
                    />
                  </div>
                  <div>
                    <FieldLabel>Attachments</FieldLabel>
                    <Button
                      component="label"
                      sx={{
                        borderColor: "#d7dce5",
                        borderRadius: "8px",
                        color: "#111111",
                        fontWeight: 600,
                        minHeight: "44px",
                        textTransform: "none",
                        width: "100%",
                      }}
                      variant="outlined"
                    >
                      Add files
                      <input
                        hidden
                        multiple
                        onChange={(event) => {
                          const files = Array.from(event.target.files ?? []);

                          if (files.length > 0) {
                            setNoteAttachmentFiles((current) => [
                              ...current,
                              ...files,
                            ]);
                          }

                          event.target.value = "";
                        }}
                        type="file"
                      />
                    </Button>
                    {noteAttachmentFiles.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {noteAttachmentFiles.map((file, index) => (
                          <div
                            className="flex items-center justify-between gap-3 rounded-lg border border-[#e7e5df] bg-[#fafaf8] px-3 py-2 text-sm"
                            key={`${file.name}-${file.lastModified}-${index}`}
                          >
                            <span className="min-w-0 truncate">{file.name}</span>
                            <button
                              className="shrink-0 text-xs font-semibold text-[#b42318] hover:underline"
                              onClick={() =>
                                setNoteAttachmentFiles((current) =>
                                  current.filter((_, fileIndex) => fileIndex !== index),
                                )
                              }
                              type="button"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <FormActions
                    isEditing={Boolean(selectedNote)}
                    isSaving={saveNoteMutation.isPending}
                    onCancel={() => {
                      setEditingNoteId(null);
                      setNoteForm(emptyNoteForm);
                      setNoteAttachmentFiles([]);
                    }}
                  />
                  <ErrorBox message={saveNoteMutation.error?.message} />
                  <ErrorBox message={shareMutation.error?.message} />
                </form>
              ) : null}
              <ErrorBox message={deleteMutation.error?.message} />
            </aside>
          </section>
        )}
      </main>
    </div>
  );
}

function ColorResourceRow({
  color,
  name,
  onDelete,
  onEdit,
}: {
  color: string;
  name: string;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <article className="rounded-lg border border-[#e7e5df] bg-white p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            className="h-4 w-4 rounded-full border border-black/10"
            style={{ backgroundColor: color }}
          />
          <h3 className="text-base font-semibold">{name}</h3>
        </div>
        <div className="flex gap-2">
          <Button onClick={onEdit} size="small" sx={{ textTransform: "none" }}>
            Edit
          </Button>
          <Button
            color="error"
            onClick={onDelete}
            size="small"
            sx={{ textTransform: "none" }}
          >
            Delete
          </Button>
        </div>
      </div>
    </article>
  );
}

function FormActions({
  isEditing,
  isSaving,
  onCancel,
}: {
  isEditing: boolean;
  isSaving: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button
        disabled={isSaving}
        type="submit"
        sx={{
          backgroundColor: "#111111",
          borderRadius: "8px",
          color: "#ffffff",
          flex: 1,
          fontWeight: 700,
          minHeight: "44px",
          textTransform: "none",
        }}
        variant="contained"
      >
        {isSaving ? "Saving" : isEditing ? "Save changes" : "Create"}
      </Button>
      {isEditing ? (
        <Button
          disabled={isSaving}
          onClick={onCancel}
          sx={{
            borderColor: "#d7dce5",
            borderRadius: "8px",
            color: "#111111",
            fontWeight: 600,
            minHeight: "44px",
            textTransform: "none",
          }}
          type="button"
          variant="outlined"
        >
          Cancel
        </Button>
      ) : null}
    </div>
  );
}

function NamedColorForm({
  error,
  form,
  isEditing,
  isSaving,
  label,
  onCancel,
  onChange,
  onSubmit,
}: {
  error?: string;
  form: NamedColorFormState;
  isEditing: boolean;
  isSaving: boolean;
  label: string;
  onCancel: () => void;
  onChange: (form: NamedColorFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <h2 className="text-lg font-semibold">
        {isEditing ? `Edit ${label}` : `Create ${label}`}
      </h2>
      <div>
        <FieldLabel>Name</FieldLabel>
        <input
          className={inputClass}
          maxLength={30}
          minLength={2}
          onChange={(event) => onChange({ ...form, name: event.target.value })}
          placeholder={`New ${label}`}
          required
          value={form.name}
        />
      </div>
      <div>
        <FieldLabel>Color</FieldLabel>
        <input
          className={inputClass}
          onChange={(event) => onChange({ ...form, color: event.target.value })}
          type="color"
          value={form.color}
        />
      </div>
      <FormActions
        isEditing={isEditing}
        isSaving={isSaving}
        onCancel={onCancel}
      />
      <ErrorBox message={error} />
    </form>
  );
}

export default function DashboardClient() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContent />
    </QueryClientProvider>
  );
}
