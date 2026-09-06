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

type ClassView = "overview" | "students" | "notes" | "calendar" | "resources";
type ManageView = "class" | "student" | "subject" | "tag" | "note";
type StudentSort = "recent" | "name" | "noteCount";
type NoteSort = "newest" | "oldest" | "title" | "student" | "updated";

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
  sessionDate: string;
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

const todayInputValue = () => new Date().toISOString().slice(0, 10);

const emptyNoteForm = (): NoteFormState => ({
  content: "",
  sessionDate: todayInputValue(),
  studentId: "",
  subjectId: "",
  tagIds: [],
  title: "",
});

const classViews: Array<{ key: ClassView; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "students", label: "Students" },
  { key: "notes", label: "All notes" },
  { key: "calendar", label: "Calendar" },
  { key: "resources", label: "Resources" },
];

const manageViews: Array<{ key: ManageView; label: string }> = [
  { key: "class", label: "Class" },
  { key: "student", label: "Student" },
  { key: "subject", label: "Subject" },
  { key: "tag", label: "Tag" },
  { key: "note", label: "Note" },
];

const resourcePaths: Record<ManageView, string> = {
  class: "classes",
  note: "notes",
  student: "students",
  subject: "subjects",
  tag: "tags",
};

const inputClass =
  "h-10 w-full rounded-md border border-[#d8ddd4] bg-white px-3 text-sm text-[#20221f] outline-none transition focus:border-[#2f6f55] focus:ring-2 focus:ring-[#d8eadf]";
const textAreaClass =
  "min-h-24 w-full rounded-md border border-[#d8ddd4] bg-white px-3 py-2 text-sm text-[#20221f] outline-none transition focus:border-[#2f6f55] focus:ring-2 focus:ring-[#d8eadf]";
const quietButtonClass =
  "rounded-md border border-[#d8ddd4] bg-white px-3 py-2 text-sm font-medium text-[#343731] transition hover:border-[#9baa9b] hover:bg-[#f8f8f3] focus:outline-none focus:ring-2 focus:ring-[#d8eadf]";
const activeButtonClass =
  "rounded-md border border-[#20221f] bg-[#20221f] px-3 py-2 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-[#d8eadf]";

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

function getDateKey(value?: string | null) {
  return value?.slice(0, 10) || "unscheduled";
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

function compareDates(a?: string, b?: string) {
  return new Date(b ?? 0).getTime() - new Date(a ?? 0).getTime();
}

function getNoteDate(note?: Pick<NoteRecord, "createdAt" | "updatedAt">) {
  return note?.createdAt ?? note?.updatedAt;
}

function getNoteVisibility(note: NoteRecord) {
  return note.shareLinks?.length ? "Shared by link" : "Private";
}

function getNoteSummary(note: NoteRecord) {
  return note.content?.trim() || "No body content";
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
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-[#6a7067]">
        {children}
      </span>
    </label>
  );
}

function ErrorBox({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <div className="rounded-md border border-[#e1b49f] bg-[#fff7f2] p-3 text-sm text-[#843614]">
      {message}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-[#cfd8cd] bg-white p-6 text-sm leading-6 text-[#6a7067]">
      {children}
    </div>
  );
}

function Pill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "green" | "amber" | "blue";
}) {
  const toneClass = {
    amber: "border-[#ead6a8] bg-[#fff8e7] text-[#745616]",
    blue: "border-[#bdd6e9] bg-[#eef7fd] text-[#245d7c]",
    default: "border-[#dfe3dc] bg-[#f8f8f3] text-[#5a6057]",
    green: "border-[#bfdbc8] bg-[#edf8f0] text-[#285b3b]",
  }[tone];

  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-full border px-2.5 text-xs font-medium ${toneClass}`}
    >
      {children}
    </span>
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
            className="group overflow-hidden rounded-md border border-[#d8ddd4] bg-[#f8f8f3] text-sm text-[#20221f] transition hover:border-[#2f6f55]"
            href={attachment.fileUrl}
            key={attachment.id}
            rel="noreferrer"
            target="_blank"
          >
            {isImageAttachment(attachment) ? (
              <div
                aria-label={label}
                className="h-28 w-full bg-white bg-cover bg-center"
                role="img"
                style={{ backgroundImage: `url(${attachment.fileUrl})` }}
              />
            ) : (
              <div className="flex h-28 items-center justify-center bg-white text-xs font-semibold uppercase tracking-[0.12em] text-[#6a7067]">
                {getAttachmentKind(attachment)}
              </div>
            )}
            <div className="border-t border-[#d8ddd4] px-3 py-2">
              <span className="block truncate font-medium text-[#285b3b] group-hover:underline">
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
    <div className="flex min-h-screen items-center justify-center bg-[#f7f6ef] px-5 py-12 text-[#20221f]">
      <main className="w-full max-w-md rounded-md border border-[#dedfd7] bg-white p-7 text-center shadow-[0_18px_60px_rgba(32,34,31,0.08)]">
        <Link className="text-lg font-semibold lowercase" href="/">
          trove
        </Link>
        <p className="mt-8 text-sm font-semibold text-[#2f6f55]">401</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight">
          Sign in required
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#5f655c]">
          You need to be logged in before you can view your dashboard.
        </p>
        <Button
          disableElevation
          href="/"
          sx={{
            backgroundColor: "#20221f",
            borderRadius: "6px",
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
    <div className="flex min-h-screen items-center justify-center bg-[#f7f6ef] px-5 py-12 text-[#20221f]">
      <main className="w-full max-w-md rounded-md border border-[#dedfd7] bg-white p-7 text-center">
        <Link className="text-lg font-semibold lowercase" href="/">
          trove
        </Link>
        <div
          aria-label="Loading dashboard"
          className="mx-auto mt-9 h-10 w-10 animate-spin rounded-full border-2 border-[#d8ddd4] border-t-[#2f6f55]"
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
  const [activeView, setActiveView] = useState<ClassView>("overview");
  const [manageView, setManageView] = useState<ManageView>("note");
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [focusedStudentId, setFocusedStudentId] = useState<number | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentSort, setStudentSort] = useState<StudentSort>("recent");
  const [noteSearch, setNoteSearch] = useState("");
  const [noteSort, setNoteSort] = useState<NoteSort>("newest");
  const [noteStudentFilter, setNoteStudentFilter] = useState("");
  const [noteTagFilter, setNoteTagFilter] = useState("");
  const [noteSubjectFilter, setNoteSubjectFilter] = useState("");
  const [noteAttachmentFilter, setNoteAttachmentFilter] = useState("");
  const [noteVisibilityFilter, setNoteVisibilityFilter] = useState("");
  const [noteStartDate, setNoteStartDate] = useState("");
  const [noteEndDate, setNoteEndDate] = useState("");
  const [selectedNoteIds, setSelectedNoteIds] = useState<number[]>([]);
  const [bulkTagId, setBulkTagId] = useState("");
  const [bulkStudentId, setBulkStudentId] = useState("");
  const [classForm, setClassForm] = useState<ClassFormState>(emptyClassForm);
  const [studentForm, setStudentForm] =
    useState<StudentFormState>(emptyStudentForm);
  const [subjectForm, setSubjectForm] =
    useState<NamedColorFormState>(emptySubjectForm);
  const [tagForm, setTagForm] = useState<NamedColorFormState>(emptyTagForm);
  const [noteForm, setNoteForm] = useState<NoteFormState>(() => emptyNoteForm());
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

  const classes = useMemo(() => classesQuery.data ?? [], [classesQuery.data]);
  const students = useMemo(() => studentsQuery.data ?? [], [studentsQuery.data]);
  const subjects = useMemo(() => subjectsQuery.data ?? [], [subjectsQuery.data]);
  const tags = useMemo(() => tagsQuery.data ?? [], [tagsQuery.data]);
  const notes = useMemo(() => notesQuery.data ?? [], [notesQuery.data]);
  const activeClassId = selectedClassId ?? classes[0]?.id ?? null;

  const selectedClass = useMemo(
    () => classes.find((classItem) => classItem.id === activeClassId) ?? null,
    [activeClassId, classes],
  );

  const selectedSubject = useMemo(
    () =>
      subjects.find((subject) => subject.id === editingSubjectId) ?? null,
    [subjects, editingSubjectId],
  );
  const selectedTag = useMemo(
    () => tags.find((tag) => tag.id === editingTagId) ?? null,
    [tags, editingTagId],
  );
  const selectedNote = useMemo(
    () => notes.find((note) => note.id === editingNoteId) ?? null,
    [notes, editingNoteId],
  );

  const classStudents = useMemo(
    () =>
      activeClassId
        ? students.filter((student) => student.classId === activeClassId)
        : [],
    [activeClassId, students],
  );
  const classStudentIds = useMemo(
    () => new Set(classStudents.map((student) => student.id)),
    [classStudents],
  );
  const classNotes = useMemo(
    () => notes.filter((note) => classStudentIds.has(note.studentId)),
    [notes, classStudentIds],
  );

  const selectedStudent = useMemo(
    () =>
      classStudents.find((student) => student.id === focusedStudentId) ?? null,
    [classStudents, focusedStudentId],
  );

  const defaultStudentId = classStudents[0] ? String(classStudents[0].id) : "";
  const displayedNoteForm = {
    ...noteForm,
    studentId: noteForm.studentId || defaultStudentId,
  };

  const noteCountsByStudent = useMemo(() => {
    const counts = new Map<number, number>();
    for (const note of classNotes) {
      counts.set(note.studentId, (counts.get(note.studentId) ?? 0) + 1);
    }
    return counts;
  }, [classNotes]);

  const latestNoteByStudent = useMemo(() => {
    const latest = new Map<number, NoteRecord>();
    for (const note of classNotes) {
      const current = latest.get(note.studentId);
      if (!current || compareDates(getNoteDate(note), getNoteDate(current)) < 0) {
        latest.set(note.studentId, note);
      }
    }
    return latest;
  }, [classNotes]);

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    const filtered = classStudents.filter((student) => {
      if (!query) {
        return true;
      }

      return [student.name, student.rollNumber ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });

    return [...filtered].sort((a, b) => {
      if (studentSort === "name") {
        return a.name.localeCompare(b.name);
      }
      if (studentSort === "noteCount") {
        return (
          (noteCountsByStudent.get(b.id) ?? 0) -
          (noteCountsByStudent.get(a.id) ?? 0)
        );
      }

      const aDate = getNoteDate(latestNoteByStudent.get(a.id));
      const bDate = getNoteDate(latestNoteByStudent.get(b.id));
      return compareDates(aDate, bDate);
    });
  }, [
    classStudents,
    latestNoteByStudent,
    noteCountsByStudent,
    studentSearch,
    studentSort,
  ]);

  const filteredNotes = useMemo(() => {
    const query = noteSearch.trim().toLowerCase();
    const filtered = classNotes.filter((note) => {
      const noteDate = getDateKey(getNoteDate(note));
      const matchesQuery =
        !query ||
        [note.title, note.content ?? "", note.student?.name ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesStudent =
        !noteStudentFilter || note.studentId === Number(noteStudentFilter);
      const matchesTag =
        !noteTagFilter ||
        note.tags?.some((tag) => tag.id === Number(noteTagFilter));
      const matchesSubject =
        !noteSubjectFilter ||
        (noteSubjectFilter === "none"
          ? !note.subjectId
          : note.subjectId === Number(noteSubjectFilter));
      const matchesAttachment =
        !noteAttachmentFilter ||
        (noteAttachmentFilter === "with"
          ? Boolean(note.attachments?.length)
          : !note.attachments?.length);
      const matchesVisibility =
        !noteVisibilityFilter ||
        (noteVisibilityFilter === "shared"
          ? Boolean(note.shareLinks?.length)
          : !note.shareLinks?.length);
      const matchesStart = !noteStartDate || noteDate >= noteStartDate;
      const matchesEnd = !noteEndDate || noteDate <= noteEndDate;

      return (
        matchesQuery &&
        matchesStudent &&
        matchesTag &&
        matchesSubject &&
        matchesAttachment &&
        matchesVisibility &&
        matchesStart &&
        matchesEnd
      );
    });

    return [...filtered].sort((a, b) => {
      if (noteSort === "oldest") {
        return compareDates(getNoteDate(b), getNoteDate(a));
      }
      if (noteSort === "title") {
        return a.title.localeCompare(b.title);
      }
      if (noteSort === "student") {
        return (a.student?.name ?? "").localeCompare(b.student?.name ?? "");
      }
      if (noteSort === "updated") {
        return compareDates(a.updatedAt, b.updatedAt);
      }

      return compareDates(getNoteDate(a), getNoteDate(b));
    });
  }, [
    classNotes,
    noteAttachmentFilter,
    noteEndDate,
    noteSearch,
    noteSort,
    noteStartDate,
    noteStudentFilter,
    noteSubjectFilter,
    noteTagFilter,
    noteVisibilityFilter,
  ]);

  const recentNotes = useMemo(() => classNotes.slice(0, 5), [classNotes]);

  const calendarGroups = useMemo(() => {
    const groups = new Map<string, NoteRecord[]>();
    for (const note of classNotes) {
      const key = getDateKey(getNoteDate(note));
      groups.set(key, [...(groups.get(key) ?? []), note]);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 12);
  }, [classNotes]);

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
    onSuccess: async (savedClass) => {
      setClassForm(emptyClassForm);
      setEditingClassId(null);
      setSelectedClassId(savedClass.id);
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
    onSuccess: async (student) => {
      setStudentForm({
        ...emptyStudentForm,
        classId: activeClassId ? String(activeClassId) : "",
      });
      setEditingStudentId(null);
      setFocusedStudentId(student.id);
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
      await queryClient.invalidateQueries({ queryKey: ["notes"] });
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
      await queryClient.invalidateQueries({ queryKey: ["notes"] });
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
            title: payload.title.trim() || payload.content.trim().slice(0, 60),
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
    onSuccess: async (note) => {
      setNoteForm({
        ...emptyNoteForm(),
        studentId: selectedStudent ? String(selectedStudent.id) : noteForm.studentId,
      });
      setNoteAttachmentFiles([]);
      setEditingNoteId(null);
      setFocusedStudentId(note.studentId);
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
    mutationFn: ({ id, resource }: { id: number; resource: ManageView }) =>
      fetchJson<{ deleted: boolean }>(`/api/${resourcePaths[resource]}/${id}`, {
        method: "DELETE",
      }),
    onSuccess: async (_data, variables) => {
      if (variables.resource === "class") {
        setEditingClassId(null);
        setSelectedClassId(null);
        setClassForm(emptyClassForm);
        await queryClient.invalidateQueries({ queryKey: ["classes"] });
        await queryClient.invalidateQueries({ queryKey: ["students"] });
      }
      if (variables.resource === "student") {
        setEditingStudentId(null);
        setFocusedStudentId(null);
        await queryClient.invalidateQueries({ queryKey: ["students"] });
        await queryClient.invalidateQueries({ queryKey: ["notes"] });
      }
      if (variables.resource === "subject") {
        setEditingSubjectId(null);
        await queryClient.invalidateQueries({ queryKey: ["subjects"] });
        await queryClient.invalidateQueries({ queryKey: ["notes"] });
      }
      if (variables.resource === "tag") {
        setEditingTagId(null);
        await queryClient.invalidateQueries({ queryKey: ["tags"] });
        await queryClient.invalidateQueries({ queryKey: ["notes"] });
      }
      if (variables.resource === "note") {
        setEditingNoteId(null);
        setSelectedNoteIds((current) =>
          current.filter((noteId) => noteId !== variables.id),
        );
        await queryClient.invalidateQueries({ queryKey: ["notes"] });
      }
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<NoteFormState> }) =>
      fetchJson<NoteRecord>(`/api/notes/${id}`, {
        body: JSON.stringify({
          content: payload.content?.trim(),
          studentId: payload.studentId ? Number(payload.studentId) : undefined,
          subjectId:
            payload.subjectId === undefined
              ? undefined
              : payload.subjectId
                ? Number(payload.subjectId)
                : null,
          tagIds: payload.tagIds?.map(Number),
          title: payload.title?.trim(),
        }),
        method: "PATCH",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notes"] });
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

  function selectClass(classId: number) {
    setSelectedClassId(classId);
    setSelectedNoteIds([]);
    setFocusedStudentId(null);
    setNoteStudentFilter("");
    setNoteTagFilter("");
    setNoteSubjectFilter("");
    setNoteAttachmentFilter("");
    setNoteVisibilityFilter("");
    setStudentForm((current) => ({ ...current, classId: String(classId) }));
    setNoteForm((current) => ({ ...current, studentId: "" }));
  }

  function openNoteEditor(note: NoteRecord) {
    setManageView("note");
    setEditingNoteId(note.id);
    setNoteForm({
      content: note.content ?? "",
      sessionDate: toDateInput(getNoteDate(note)) || todayInputValue(),
      studentId: String(note.studentId),
      subjectId: note.subjectId ? String(note.subjectId) : "",
      tagIds: note.tags?.map((tag) => String(tag.id)) ?? [],
      title: note.title,
    });
    setNoteAttachmentFiles([]);
  }

  function startNote(studentId?: number) {
    setManageView("note");
    setEditingNoteId(null);
    setNoteForm({
      ...emptyNoteForm(),
      studentId: studentId
        ? String(studentId)
        : classStudents[0]
          ? String(classStudents[0].id)
          : "",
    });
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
    if (
      (!noteForm.title.trim() && !noteForm.content.trim()) ||
      !displayedNoteForm.studentId
    ) {
      return;
    }
    saveNoteMutation.mutate({
      ...displayedNoteForm,
      attachments: noteAttachmentFiles,
      id: editingNoteId ?? undefined,
    });
  }

  function confirmDelete(resource: ManageView, id: number, label: string) {
    if (window.confirm(`Delete ${label}? This cannot be undone.`)) {
      deleteMutation.mutate({ id, resource });
    }
  }

  function toggleNoteSelection(noteId: number) {
    setSelectedNoteIds((current) =>
      current.includes(noteId)
        ? current.filter((id) => id !== noteId)
        : [...current, noteId],
    );
  }

  function clearNoteSelection() {
    setSelectedNoteIds([]);
    setBulkTagId("");
    setBulkStudentId("");
  }

  async function addTagToSelected() {
    if (!bulkTagId) {
      return;
    }

    await Promise.all(
      classNotes
        .filter((note) => selectedNoteIds.includes(note.id))
        .map((note) => {
          const existingTagIds = note.tags?.map((tag) => String(tag.id)) ?? [];
          return updateNoteMutation.mutateAsync({
            id: note.id,
            payload: {
              tagIds: Array.from(new Set([...existingTagIds, bulkTagId])),
            },
          });
        }),
    );
    clearNoteSelection();
  }

  async function removeTagFromSelected() {
    if (!bulkTagId) {
      return;
    }

    await Promise.all(
      classNotes
        .filter((note) => selectedNoteIds.includes(note.id))
        .map((note) =>
          updateNoteMutation.mutateAsync({
            id: note.id,
            payload: {
              tagIds:
                note.tags
                  ?.map((tag) => String(tag.id))
                  .filter((tagId) => tagId !== bulkTagId) ?? [],
            },
          }),
        ),
    );
    clearNoteSelection();
  }

  async function reassignSelected() {
    if (!bulkStudentId) {
      return;
    }

    await Promise.all(
      selectedNoteIds.map((id) =>
        updateNoteMutation.mutateAsync({
          id,
          payload: { studentId: bulkStudentId },
        }),
      ),
    );
    clearNoteSelection();
  }

  async function shareSelected() {
    await Promise.all(selectedNoteIds.map((id) => shareMutation.mutateAsync(id)));
    clearNoteSelection();
  }

  async function deleteSelected() {
    if (
      !window.confirm(
        `Delete ${selectedNoteIds.length} selected note${
          selectedNoteIds.length === 1 ? "" : "s"
        }? This cannot be undone.`,
      )
    ) {
      return;
    }

    await Promise.all(
      selectedNoteIds.map((id) =>
        deleteMutation.mutateAsync({ id, resource: "note" }),
      ),
    );
    clearNoteSelection();
  }

  function exportSelected() {
    const selected = classNotes.filter((note) => selectedNoteIds.includes(note.id));
    const blob = new Blob([JSON.stringify(selected, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedClass?.name ?? "class"}-notes.json`;
    link.click();
    URL.revokeObjectURL(url);
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
    <div className="min-h-screen bg-[#f7f6ef] text-[#20221f]">
      <header className="border-b border-[#dedfd7] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Link className="shrink-0 text-lg font-semibold lowercase" href="/">
              trove
            </Link>
            <div className="min-w-0 border-l border-[#dedfd7] pl-4">
              <p className="truncate text-xs font-medium text-[#6a7067]">
                {sessionQuery.data?.user?.email ?? "Signed in"}
              </p>
              <h1 className="truncate text-xl font-semibold leading-tight">
                {selectedClass?.name ?? "Class notes"}
              </h1>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              aria-label="Select class"
              className={inputClass}
              onChange={(event) => selectClass(Number(event.target.value))}
              value={activeClassId ?? ""}
            >
              {classes.length === 0 ? <option value="">No classes</option> : null}
              {classes.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.name}
                </option>
              ))}
            </select>
            <button className={activeButtonClass} onClick={() => startNote()} type="button">
              Quick note
            </button>
            <button className={quietButtonClass} onClick={handleLogout} type="button">
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[248px_minmax(0,1fr)_360px]">
        <aside className="lg:sticky lg:top-5 lg:self-start">
          <nav
            aria-label="Dashboard sections"
            className="grid gap-2 rounded-md border border-[#dedfd7] bg-white p-2"
          >
            {classViews.map((view) => (
              <button
                className={
                  activeView === view.key ? activeButtonClass : quietButtonClass
                }
                key={view.key}
                onClick={() => setActiveView(view.key)}
                type="button"
              >
                {view.label}
              </button>
            ))}
          </nav>

          <section className="mt-4 rounded-md border border-[#dedfd7] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6a7067]">
              Class context
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-[#6a7067]">Students</dt>
                <dd className="text-lg font-semibold">{classStudents.length}</dd>
              </div>
              <div>
                <dt className="text-[#6a7067]">Notes</dt>
                <dd className="text-lg font-semibold">{classNotes.length}</dd>
              </div>
              <div>
                <dt className="text-[#6a7067]">Shared</dt>
                <dd className="text-lg font-semibold">
                  {classNotes.filter((note) => note.shareLinks?.length).length}
                </dd>
              </div>
              <div>
                <dt className="text-[#6a7067]">Files</dt>
                <dd className="text-lg font-semibold">
                  {classNotes.reduce(
                    (total, note) => total + (note.attachments?.length ?? 0),
                    0,
                  )}
                </dd>
              </div>
            </dl>
          </section>
        </aside>

        <section className="min-w-0">
          {isLoadingDashboard ? (
            <div className="rounded-md border border-[#dedfd7] bg-white p-6 text-sm text-[#6a7067]">
              Loading workspace...
            </div>
          ) : classes.length === 0 ? (
            <EmptyState>Create a class in the setup panel to start capturing notes.</EmptyState>
          ) : (
            <>
              <QuickNoteComposer
                classStudents={classStudents}
                form={displayedNoteForm}
                isSaving={saveNoteMutation.isPending}
                onChange={setNoteForm}
                onSubmit={handleNoteSubmit}
              />
              <ErrorBox message={saveNoteMutation.error?.message} />
              <ErrorBox message={shareMutation.error?.message} />
              <ErrorBox message={updateNoteMutation.error?.message} />
              <ErrorBox message={deleteMutation.error?.message} />

              <div className="mt-5">
                {activeView === "overview" ? (
                  <OverviewView
                    classNotes={classNotes}
                    classStudents={classStudents}
                    latestNoteByStudent={latestNoteByStudent}
                    noteCountsByStudent={noteCountsByStudent}
                    onOpenNote={openNoteEditor}
                    onSelectStudent={(studentId) => {
                      setFocusedStudentId(studentId);
                      setActiveView("students");
                    }}
                    onViewNotes={() => setActiveView("notes")}
                    recentNotes={recentNotes}
                    subjects={subjects}
                    tags={tags}
                  />
                ) : null}

                {activeView === "students" ? (
                  <StudentsView
                    focusedStudent={selectedStudent}
                    latestNoteByStudent={latestNoteByStudent}
                    noteCountsByStudent={noteCountsByStudent}
                    onAddNote={startNote}
                    onEditStudent={(student) => {
                      setManageView("student");
                      setEditingStudentId(student.id);
                      setStudentForm({
                        classId: String(student.classId),
                        name: student.name,
                        rollNumber: student.rollNumber ?? "",
                      });
                    }}
                    onOpenNote={openNoteEditor}
                    onSearch={setStudentSearch}
                    onSelectStudent={setFocusedStudentId}
                    onSort={setStudentSort}
                    search={studentSearch}
                    sort={studentSort}
                    studentNotes={selectedStudent ? classNotes.filter((note) => note.studentId === selectedStudent.id) : []}
                    students={filteredStudents}
                  />
                ) : null}

                {activeView === "notes" ? (
                  <NotesView
                    classStudents={classStudents}
                    filteredNotes={filteredNotes}
                    latestShareUrl={latestShareUrl}
                    noteAttachmentFilter={noteAttachmentFilter}
                    noteEndDate={noteEndDate}
                    noteSearch={noteSearch}
                    noteSort={noteSort}
                    noteStartDate={noteStartDate}
                    noteStudentFilter={noteStudentFilter}
                    noteSubjectFilter={noteSubjectFilter}
                    noteTagFilter={noteTagFilter}
                    noteVisibilityFilter={noteVisibilityFilter}
                    onAttachmentFilter={setNoteAttachmentFilter}
                    onClearFilters={() => {
                      setNoteSearch("");
                      setNoteStudentFilter("");
                      setNoteTagFilter("");
                      setNoteSubjectFilter("");
                      setNoteAttachmentFilter("");
                      setNoteVisibilityFilter("");
                      setNoteStartDate("");
                      setNoteEndDate("");
                    }}
                    onEditNote={openNoteEditor}
                    onEndDate={setNoteEndDate}
                    onSearch={setNoteSearch}
                    onSelectNote={toggleNoteSelection}
                    onShareNote={(noteId) => shareMutation.mutate(noteId)}
                    onSort={setNoteSort}
                    onStartDate={setNoteStartDate}
                    onStudentFilter={setNoteStudentFilter}
                    onSubjectFilter={setNoteSubjectFilter}
                    onTagFilter={setNoteTagFilter}
                    onUploadAttachment={(noteId, file) =>
                      uploadAttachmentMutation.mutate({ file, noteId })
                    }
                    onVisibilityFilter={setNoteVisibilityFilter}
                    selectedNoteIds={selectedNoteIds}
                    subjects={subjects}
                    tags={tags}
                  />
                ) : null}

                {activeView === "calendar" ? (
                  <CalendarView groups={calendarGroups} onOpenNote={openNoteEditor} />
                ) : null}

                {activeView === "resources" ? (
                  <ResourcesView
                    classNotes={classNotes}
                    onOpenNote={openNoteEditor}
                    subjects={subjects}
                    tags={tags}
                  />
                ) : null}
              </div>

              {selectedNoteIds.length > 0 ? (
                <BulkActions
                  bulkStudentId={bulkStudentId}
                  bulkTagId={bulkTagId}
                  classStudents={classStudents}
                  isWorking={
                    updateNoteMutation.isPending ||
                    deleteMutation.isPending ||
                    shareMutation.isPending
                  }
                  onAddTag={addTagToSelected}
                  onArchive={() =>
                    window.alert("Archiving needs an archive field in the notes API.")
                  }
                  onChangeSharing={shareSelected}
                  onClear={clearNoteSelection}
                  onDelete={deleteSelected}
                  onExport={exportSelected}
                  onReassign={reassignSelected}
                  onRemoveTag={removeTagFromSelected}
                  selectedCount={selectedNoteIds.length}
                  setBulkStudentId={setBulkStudentId}
                  setBulkTagId={setBulkTagId}
                  tags={tags}
                />
              ) : null}
            </>
          )}
        </section>

        <aside className="lg:sticky lg:top-5 lg:self-start">
          <section className="rounded-md border border-[#dedfd7] bg-white p-4">
            <div className="flex flex-wrap gap-2">
              {manageViews.map((view) => (
                <button
                  className={
                    manageView === view.key
                      ? "rounded-md bg-[#20221f] px-3 py-1.5 text-xs font-semibold text-white"
                      : "rounded-md border border-[#d8ddd4] bg-white px-3 py-1.5 text-xs font-semibold text-[#5a6057]"
                  }
                  key={view.key}
                  onClick={() => setManageView(view.key)}
                  type="button"
                >
                  {view.label}
                </button>
              ))}
            </div>

            <div className="mt-5">
              {manageView === "class" ? (
                <ClassForm
                  classForm={classForm}
                  classes={classes}
                  error={saveClassMutation.error?.message}
                  isEditing={Boolean(editingClassId)}
                  isSaving={saveClassMutation.isPending}
                  onCancel={() => {
                    setEditingClassId(null);
                    setClassForm(emptyClassForm);
                  }}
                  onDelete={(classItem) =>
                    confirmDelete("class", classItem.id, classItem.name)
                  }
                  onEdit={(classItem) => {
                    setEditingClassId(classItem.id);
                    setClassForm({
                      name: classItem.name,
                      session: toDateInput(classItem.session),
                    });
                  }}
                  onSelect={selectClass}
                  onSubmit={handleClassSubmit}
                  selectedClassId={activeClassId}
                  setClassForm={setClassForm}
                />
              ) : null}

              {manageView === "student" ? (
                <StudentForm
                  classStudents={classStudents}
                  error={saveStudentMutation.error?.message}
                  form={
                    studentForm.classId
                      ? studentForm
                      : {
                          ...studentForm,
                          classId: activeClassId ? String(activeClassId) : "",
                        }
                  }
                  isEditing={Boolean(editingStudentId)}
                  isSaving={saveStudentMutation.isPending}
                  onCancel={() => {
                    setEditingStudentId(null);
                    setStudentForm({
                      ...emptyStudentForm,
                      classId: activeClassId ? String(activeClassId) : "",
                    });
                  }}
                  onDelete={(student) =>
                    confirmDelete("student", student.id, student.name)
                  }
                  onEdit={(student) => {
                    setEditingStudentId(student.id);
                    setStudentForm({
                      classId: String(student.classId),
                      name: student.name,
                      rollNumber: student.rollNumber ?? "",
                    });
                  }}
                  onSubmit={handleStudentSubmit}
                  setForm={setStudentForm}
                />
              ) : null}

              {manageView === "subject" ? (
                <NamedColorManager
                  error={saveSubjectMutation.error?.message}
                  form={subjectForm}
                  isEditing={Boolean(selectedSubject)}
                  isSaving={saveSubjectMutation.isPending}
                  items={subjects}
                  label="subject"
                  onCancel={() => {
                    setEditingSubjectId(null);
                    setSubjectForm(emptySubjectForm);
                  }}
                  onChange={setSubjectForm}
                  onDelete={(subject) =>
                    confirmDelete("subject", subject.id, subject.name)
                  }
                  onEdit={(subject) => {
                    setEditingSubjectId(subject.id);
                    setSubjectForm({ color: subject.color, name: subject.name });
                  }}
                  onSubmit={handleSubjectSubmit}
                />
              ) : null}

              {manageView === "tag" ? (
                <NamedColorManager
                  error={saveTagMutation.error?.message}
                  form={tagForm}
                  isEditing={Boolean(selectedTag)}
                  isSaving={saveTagMutation.isPending}
                  items={tags}
                  label="tag"
                  onCancel={() => {
                    setEditingTagId(null);
                    setTagForm(emptyTagForm);
                  }}
                  onChange={setTagForm}
                  onDelete={(tag) => confirmDelete("tag", tag.id, tag.name)}
                  onEdit={(tag) => {
                    setEditingTagId(tag.id);
                    setTagForm({ color: tag.color, name: tag.name });
                  }}
                  onSubmit={handleTagSubmit}
                />
              ) : null}

              {manageView === "note" ? (
                <NoteForm
                  classStudents={classStudents}
                  error={saveNoteMutation.error?.message}
                  form={displayedNoteForm}
                  isEditing={Boolean(selectedNote)}
                  isSaving={saveNoteMutation.isPending}
                  noteAttachmentFiles={noteAttachmentFiles}
                  onCancel={() => {
                    setEditingNoteId(null);
                    setNoteForm(emptyNoteForm());
                    setNoteAttachmentFiles([]);
                  }}
                  onDelete={() =>
                    selectedNote
                      ? confirmDelete("note", selectedNote.id, selectedNote.title)
                      : undefined
                  }
                  onSubmit={handleNoteSubmit}
                  setForm={setNoteForm}
                  setNoteAttachmentFiles={setNoteAttachmentFiles}
                  subjects={subjects}
                  tags={tags}
                />
              ) : null}
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}

function QuickNoteComposer({
  classStudents,
  form,
  isSaving,
  onChange,
  onSubmit,
}: {
  classStudents: StudentRecord[];
  form: NoteFormState;
  isSaving: boolean;
  onChange: (form: NoteFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      className="rounded-md border border-[#cfd8cd] bg-white p-4 shadow-[0_12px_36px_rgba(32,34,31,0.06)]"
      onSubmit={onSubmit}
    >
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_144px_auto] md:items-end">
        <div>
          <FieldLabel>Quick note</FieldLabel>
          <textarea
            className="min-h-16 w-full resize-y rounded-md border border-[#d8ddd4] bg-[#fbfbf8] px-3 py-2 text-sm outline-none transition focus:border-[#2f6f55] focus:ring-2 focus:ring-[#d8eadf]"
            onChange={(event) =>
              onChange({
                ...form,
                content: event.target.value,
                title: form.title || event.target.value.slice(0, 60),
              })
            }
            placeholder="Capture a classroom observation..."
            value={form.content}
          />
        </div>
        <div>
          <FieldLabel>Student</FieldLabel>
          <select
            className={inputClass}
            onChange={(event) => onChange({ ...form, studentId: event.target.value })}
            required
            value={form.studentId}
          >
            <option value="">Select student</option>
            {classStudents.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>Session date</FieldLabel>
          <input
            className={inputClass}
            onChange={(event) => onChange({ ...form, sessionDate: event.target.value })}
            type="date"
            value={form.sessionDate}
          />
        </div>
        <button className={activeButtonClass} disabled={isSaving} type="submit">
          {isSaving ? "Saving" : "Save"}
        </button>
      </div>
    </form>
  );
}

function OverviewView({
  classNotes,
  classStudents,
  latestNoteByStudent,
  noteCountsByStudent,
  onOpenNote,
  onSelectStudent,
  onViewNotes,
  recentNotes,
  subjects,
  tags,
}: {
  classNotes: NoteRecord[];
  classStudents: StudentRecord[];
  latestNoteByStudent: Map<number, NoteRecord>;
  noteCountsByStudent: Map<number, number>;
  onOpenNote: (note: NoteRecord) => void;
  onSelectStudent: (studentId: number) => void;
  onViewNotes: () => void;
  recentNotes: NoteRecord[];
  subjects: SubjectRecord[];
  tags: TagRecord[];
}) {
  return (
    <div className="grid gap-5">
      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Students" value={classStudents.length} />
        <Metric label="Recent notes" value={classNotes.length} />
        <Metric
          label="Attachments"
          value={classNotes.reduce(
            (total, note) => total + (note.attachments?.length ?? 0),
            0,
          )}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <Panel
          action={<button className={quietButtonClass} onClick={onViewNotes} type="button">View all</button>}
          title="Recent activity"
        >
          {recentNotes.length ? (
            <div className="grid gap-3">
              {recentNotes.map((note) => (
                <NoteListItem
                  key={note.id}
                  note={note}
                  onEdit={() => onOpenNote(note)}
                />
              ))}
            </div>
          ) : (
            <EmptyState>No notes in this class yet.</EmptyState>
          )}
        </Panel>

        <Panel title="Students">
          {classStudents.length ? (
            <div className="grid gap-2">
              {classStudents.slice(0, 6).map((student) => {
                const latest = latestNoteByStudent.get(student.id);
                return (
                  <button
                    className="rounded-md border border-[#e2e5df] bg-[#fbfbf8] p-3 text-left transition hover:border-[#9baa9b] focus:outline-none focus:ring-2 focus:ring-[#d8eadf]"
                    key={student.id}
                    onClick={() => onSelectStudent(student.id)}
                    type="button"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-semibold">{student.name}</span>
                      <Pill>{noteCountsByStudent.get(student.id) ?? 0} notes</Pill>
                    </span>
                    <span className="mt-1 block truncate text-sm text-[#6a7067]">
                      {latest ? latest.title : "No notes yet"}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState>Add students before capturing notes.</EmptyState>
          )}
        </Panel>
      </section>

      <Panel title="Pinned references">
        <div className="grid gap-3 md:grid-cols-2">
          <ReferenceBlock title="Subjects" items={subjects.map((subject) => subject.name)} />
          <ReferenceBlock title="Tags" items={tags.map((tag) => tag.name)} />
        </div>
      </Panel>
    </div>
  );
}

function StudentsView({
  focusedStudent,
  latestNoteByStudent,
  noteCountsByStudent,
  onAddNote,
  onEditStudent,
  onOpenNote,
  onSearch,
  onSelectStudent,
  onSort,
  search,
  sort,
  studentNotes,
  students,
}: {
  focusedStudent: StudentRecord | null;
  latestNoteByStudent: Map<number, NoteRecord>;
  noteCountsByStudent: Map<number, number>;
  onAddNote: (studentId?: number) => void;
  onEditStudent: (student: StudentRecord) => void;
  onOpenNote: (note: NoteRecord) => void;
  onSearch: (value: string) => void;
  onSelectStudent: (id: number) => void;
  onSort: (sort: StudentSort) => void;
  search: string;
  sort: StudentSort;
  studentNotes: NoteRecord[];
  students: StudentRecord[];
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Panel title="Student directory">
        <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
          <input
            className={inputClass}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search students"
            value={search}
          />
          <select
            className={inputClass}
            onChange={(event) => onSort(event.target.value as StudentSort)}
            value={sort}
          >
            <option value="recent">Recently updated</option>
            <option value="name">Student name</option>
            <option value="noteCount">Note count</option>
          </select>
        </div>
        {students.length ? (
          <div className="grid gap-2">
            {students.map((student) => {
              const latest = latestNoteByStudent.get(student.id);
              return (
                <article
                  className="rounded-md border border-[#e2e5df] bg-white p-4"
                  key={student.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      className="min-w-0 text-left focus:outline-none focus:ring-2 focus:ring-[#d8eadf]"
                      onClick={() => onSelectStudent(student.id)}
                      type="button"
                    >
                      <h3 className="truncate text-base font-semibold">{student.name}</h3>
                      <p className="mt-1 truncate text-sm text-[#6a7067]">
                        {latest ? latest.title : "No notes yet"}
                      </p>
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill>{noteCountsByStudent.get(student.id) ?? 0} notes</Pill>
                      <Pill tone={latest?.shareLinks?.length ? "blue" : "default"}>
                        {latest?.shareLinks?.length ? "Shared latest" : "Private"}
                      </Pill>
                      <button className={quietButtonClass} onClick={() => onAddNote(student.id)} type="button">
                        Add note
                      </button>
                      <button className={quietButtonClass} onClick={() => onEditStudent(student)} type="button">
                        Edit
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState>No students match the current search.</EmptyState>
        )}
      </Panel>

      <Panel title={focusedStudent ? focusedStudent.name : "Student focus"}>
        {focusedStudent ? (
          <div>
            <div className="flex flex-wrap gap-2">
              <Pill tone="green">{studentNotes.length} notes</Pill>
              {focusedStudent.rollNumber ? <Pill>{focusedStudent.rollNumber}</Pill> : null}
            </div>
            <button
              className={`${activeButtonClass} mt-4 w-full`}
              onClick={() => onAddNote(focusedStudent.id)}
              type="button"
            >
              Add note for this student
            </button>
            <div className="mt-4 grid gap-3">
              {studentNotes.length ? (
                studentNotes.map((note) => (
                  <NoteListItem key={note.id} note={note} onEdit={() => onOpenNote(note)} />
                ))
              ) : (
                <EmptyState>No notes for this student yet.</EmptyState>
              )}
            </div>
          </div>
        ) : (
          <EmptyState>Select a student to review their notes.</EmptyState>
        )}
      </Panel>
    </div>
  );
}

function NotesView({
  classStudents,
  filteredNotes,
  latestShareUrl,
  noteAttachmentFilter,
  noteEndDate,
  noteSearch,
  noteSort,
  noteStartDate,
  noteStudentFilter,
  noteSubjectFilter,
  noteTagFilter,
  noteVisibilityFilter,
  onAttachmentFilter,
  onClearFilters,
  onEditNote,
  onEndDate,
  onSearch,
  onSelectNote,
  onShareNote,
  onSort,
  onStartDate,
  onStudentFilter,
  onSubjectFilter,
  onTagFilter,
  onUploadAttachment,
  onVisibilityFilter,
  selectedNoteIds,
  subjects,
  tags,
}: {
  classStudents: StudentRecord[];
  filteredNotes: NoteRecord[];
  latestShareUrl: string | null;
  noteAttachmentFilter: string;
  noteEndDate: string;
  noteSearch: string;
  noteSort: NoteSort;
  noteStartDate: string;
  noteStudentFilter: string;
  noteSubjectFilter: string;
  noteTagFilter: string;
  noteVisibilityFilter: string;
  onAttachmentFilter: (value: string) => void;
  onClearFilters: () => void;
  onEditNote: (note: NoteRecord) => void;
  onEndDate: (value: string) => void;
  onSearch: (value: string) => void;
  onSelectNote: (noteId: number) => void;
  onShareNote: (noteId: number) => void;
  onSort: (sort: NoteSort) => void;
  onStartDate: (value: string) => void;
  onStudentFilter: (value: string) => void;
  onSubjectFilter: (value: string) => void;
  onTagFilter: (value: string) => void;
  onUploadAttachment: (noteId: number, file: File) => void;
  onVisibilityFilter: (value: string) => void;
  selectedNoteIds: number[];
  subjects: SubjectRecord[];
  tags: TagRecord[];
}) {
  return (
    <Panel
      action={
        latestShareUrl ? (
          <a className="text-sm font-medium text-[#285b3b] underline" href={latestShareUrl} rel="noreferrer" target="_blank">
            Latest share
          </a>
        ) : null
      }
      title="All notes"
    >
      <div className="grid gap-3">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_180px_180px]">
          <input
            className={inputClass}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search title, body, or student"
            value={noteSearch}
          />
          <select
            className={inputClass}
            onChange={(event) => onStudentFilter(event.target.value)}
            value={noteStudentFilter}
          >
            <option value="">All students</option>
            {classStudents.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
          <select
            className={inputClass}
            onChange={(event) => onSort(event.target.value as NoteSort)}
            value={noteSort}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="updated">Recently updated</option>
            <option value="title">Title</option>
            <option value="student">Student</option>
          </select>
        </div>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <select className={inputClass} onChange={(event) => onTagFilter(event.target.value)} value={noteTagFilter}>
            <option value="">Any tag</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
          <select className={inputClass} onChange={(event) => onSubjectFilter(event.target.value)} value={noteSubjectFilter}>
            <option value="">Any subject</option>
            <option value="none">No subject</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
          <select className={inputClass} onChange={(event) => onAttachmentFilter(event.target.value)} value={noteAttachmentFilter}>
            <option value="">Any files</option>
            <option value="with">Has files</option>
            <option value="without">No files</option>
          </select>
          <select className={inputClass} onChange={(event) => onVisibilityFilter(event.target.value)} value={noteVisibilityFilter}>
            <option value="">Any visibility</option>
            <option value="private">Private</option>
            <option value="shared">Shared</option>
          </select>
          <input className={inputClass} onChange={(event) => onStartDate(event.target.value)} type="date" value={noteStartDate} />
          <input className={inputClass} onChange={(event) => onEndDate(event.target.value)} type="date" value={noteEndDate} />
        </div>
        <button className={`${quietButtonClass} w-fit`} onClick={onClearFilters} type="button">
          Clear filters
        </button>
      </div>

      <div className="mt-5 overflow-x-auto">
        {filteredNotes.length ? (
          <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-[0.08em] text-[#6a7067]">
                <th className="border-b border-[#dedfd7] pb-2 pr-3">Select</th>
                <th className="border-b border-[#dedfd7] pb-2 pr-3">Note</th>
                <th className="border-b border-[#dedfd7] pb-2 pr-3">Student</th>
                <th className="border-b border-[#dedfd7] pb-2 pr-3">Date</th>
                <th className="border-b border-[#dedfd7] pb-2 pr-3">State</th>
                <th className="border-b border-[#dedfd7] pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredNotes.map((note) => (
                <tr key={note.id}>
                  <td className="border-b border-[#eef0eb] py-3 pr-3 align-top">
                    <input
                      aria-label={`Select ${note.title}`}
                      checked={selectedNoteIds.includes(note.id)}
                      onChange={() => onSelectNote(note.id)}
                      type="checkbox"
                    />
                  </td>
                  <td className="border-b border-[#eef0eb] py-3 pr-3 align-top">
                    <button className="text-left font-semibold text-[#20221f] hover:underline" onClick={() => onEditNote(note)} type="button">
                      {note.title}
                    </button>
                    <p className="mt-1 line-clamp-2 max-w-md text-[#6a7067]">
                      {getNoteSummary(note)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {note.tags?.map((tag) => (
                        <Pill key={tag.id}>{tag.name}</Pill>
                      ))}
                    </div>
                  </td>
                  <td className="border-b border-[#eef0eb] py-3 pr-3 align-top">
                    {note.student?.name ?? "Student"}
                  </td>
                  <td className="border-b border-[#eef0eb] py-3 pr-3 align-top">
                    {formatDate(getNoteDate(note))}
                  </td>
                  <td className="border-b border-[#eef0eb] py-3 pr-3 align-top">
                    <div className="flex flex-wrap gap-1.5">
                      <Pill tone={note.attachments?.length ? "amber" : "default"}>
                        {note.attachments?.length ? "Files" : "No files"}
                      </Pill>
                      <Pill tone={note.shareLinks?.length ? "blue" : "default"}>
                        {getNoteVisibility(note)}
                      </Pill>
                    </div>
                  </td>
                  <td className="border-b border-[#eef0eb] py-3 align-top">
                    <div className="flex flex-wrap gap-2">
                      <button className={quietButtonClass} onClick={() => onEditNote(note)} type="button">
                        Edit
                      </button>
                      <button className={quietButtonClass} onClick={() => onShareNote(note.id)} type="button">
                        Share
                      </button>
                      <label className={quietButtonClass}>
                        Attach
                        <input
                          hidden
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              onUploadAttachment(note.id, file);
                            }
                            event.target.value = "";
                          }}
                          type="file"
                        />
                      </label>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState>No notes match the current filters.</EmptyState>
        )}
      </div>
    </Panel>
  );
}

function CalendarView({
  groups,
  onOpenNote,
}: {
  groups: Array<[string, NoteRecord[]]>;
  onOpenNote: (note: NoteRecord) => void;
}) {
  return (
    <Panel title="Calendar">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {groups.length ? (
          groups.map(([dateKey, notes]) => (
            <section className="rounded-md border border-[#e2e5df] bg-[#fbfbf8] p-4" key={dateKey}>
              <p className="text-sm font-semibold">{formatDate(dateKey)}</p>
              <div className="mt-3 grid gap-2">
                {notes.map((note) => (
                  <button
                    className="rounded-md bg-white p-3 text-left text-sm transition hover:bg-[#edf8f0] focus:outline-none focus:ring-2 focus:ring-[#d8eadf]"
                    key={note.id}
                    onClick={() => onOpenNote(note)}
                    type="button"
                  >
                    <span className="block font-medium">{note.title}</span>
                    <span className="mt-1 block text-[#6a7067]">
                      {note.student?.name ?? "Student"}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))
        ) : (
          <EmptyState>No dated notes to show.</EmptyState>
        )}
      </div>
    </Panel>
  );
}

function ResourcesView({
  classNotes,
  onOpenNote,
  subjects,
  tags,
}: {
  classNotes: NoteRecord[];
  onOpenNote: (note: NoteRecord) => void;
  subjects: SubjectRecord[];
  tags: TagRecord[];
}) {
  const notesWithAttachments = classNotes.filter((note) => note.attachments?.length);

  return (
    <div className="grid gap-5">
      <Panel title="Class files">
        {notesWithAttachments.length ? (
          <div className="grid gap-3">
            {notesWithAttachments.map((note) => (
              <article className="rounded-md border border-[#e2e5df] bg-white p-4" key={note.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold">{note.title}</h3>
                    <p className="text-sm text-[#6a7067]">
                      {note.student?.name ?? "Student"} - {formatDate(getNoteDate(note))}
                    </p>
                  </div>
                  <button className={quietButtonClass} onClick={() => onOpenNote(note)} type="button">
                    Open note
                  </button>
                </div>
                <AttachmentGrid attachments={note.attachments} />
              </article>
            ))}
          </div>
        ) : (
          <EmptyState>Class-level resources are not available in the current API. Note attachments appear here when they exist.</EmptyState>
        )}
      </Panel>
      <Panel title="Pinned references">
        <div className="grid gap-3 md:grid-cols-2">
          <ReferenceBlock title="Subjects" items={subjects.map((subject) => subject.name)} />
          <ReferenceBlock title="Tags" items={tags.map((tag) => tag.name)} />
        </div>
      </Panel>
    </div>
  );
}

function BulkActions({
  bulkStudentId,
  bulkTagId,
  classStudents,
  isWorking,
  onAddTag,
  onArchive,
  onChangeSharing,
  onClear,
  onDelete,
  onExport,
  onReassign,
  onRemoveTag,
  selectedCount,
  setBulkStudentId,
  setBulkTagId,
  tags,
}: {
  bulkStudentId: string;
  bulkTagId: string;
  classStudents: StudentRecord[];
  isWorking: boolean;
  onAddTag: () => void;
  onArchive: () => void;
  onChangeSharing: () => void;
  onClear: () => void;
  onDelete: () => void;
  onExport: () => void;
  onReassign: () => void;
  onRemoveTag: () => void;
  selectedCount: number;
  setBulkStudentId: (value: string) => void;
  setBulkTagId: (value: string) => void;
  tags: TagRecord[];
}) {
  return (
    <div className="fixed inset-x-4 bottom-4 z-20 rounded-md border border-[#c4cec2] bg-white p-3 shadow-[0_18px_60px_rgba(32,34,31,0.18)] lg:left-[calc(50%-260px)] lg:right-[calc(50%-420px)]">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <p className="text-sm font-semibold">{selectedCount} selected</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <select className={inputClass} onChange={(event) => setBulkTagId(event.target.value)} value={bulkTagId}>
            <option value="">Select tag</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
          <button className={quietButtonClass} disabled={isWorking || !bulkTagId} onClick={onAddTag} type="button">
            Add tag
          </button>
          <button className={quietButtonClass} disabled={isWorking || !bulkTagId} onClick={onRemoveTag} type="button">
            Remove tag
          </button>
          <select className={inputClass} onChange={(event) => setBulkStudentId(event.target.value)} value={bulkStudentId}>
            <option value="">Move to student</option>
            {classStudents.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
          <button className={quietButtonClass} disabled={isWorking || !bulkStudentId} onClick={onReassign} type="button">
            Move
          </button>
          <button className={quietButtonClass} disabled={isWorking} onClick={onChangeSharing} type="button">
            Share
          </button>
          <button className={quietButtonClass} onClick={onExport} type="button">
            Export
          </button>
          <button className={quietButtonClass} onClick={onArchive} type="button">
            Archive
          </button>
          <button className="rounded-md border border-[#e1b49f] bg-[#fff7f2] px-3 py-2 text-sm font-semibold text-[#843614]" disabled={isWorking} onClick={onDelete} type="button">
            Delete
          </button>
          <button className={quietButtonClass} onClick={onClear} type="button">
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

function NoteListItem({
  note,
  onEdit,
}: {
  note: NoteRecord;
  onEdit: () => void;
}) {
  return (
    <article className="rounded-md border border-[#e2e5df] bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <button className="text-left font-semibold hover:underline" onClick={onEdit} type="button">
            {note.title}
          </button>
          <p className="mt-1 text-sm text-[#6a7067]">
            {note.student?.name ?? "Student"} - {formatDate(getNoteDate(note))}
          </p>
          <p className="mt-2 line-clamp-2 text-sm text-[#444941]">
            {getNoteSummary(note)}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          <Pill tone={note.shareLinks?.length ? "blue" : "default"}>
            {getNoteVisibility(note)}
          </Pill>
          {note.attachments?.length ? <Pill tone="amber">Files</Pill> : null}
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[#dedfd7] bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6a7067]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold leading-none">{value}</p>
    </div>
  );
}

function Panel({
  action,
  children,
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-md border border-[#dedfd7] bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ReferenceBlock({ items, title }: { items: string[]; title: string }) {
  return (
    <div className="rounded-md border border-[#e2e5df] bg-[#fbfbf8] p-4">
      <h3 className="font-semibold">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length ? (
          items.map((item) => <Pill key={item}>{item}</Pill>)
        ) : (
          <span className="text-sm text-[#6a7067]">None yet</span>
        )}
      </div>
    </div>
  );
}

function ClassForm({
  classForm,
  classes,
  error,
  isEditing,
  isSaving,
  onCancel,
  onDelete,
  onEdit,
  onSelect,
  onSubmit,
  selectedClassId,
  setClassForm,
}: {
  classForm: ClassFormState;
  classes: ClassRecord[];
  error?: string;
  isEditing: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onDelete: (classItem: ClassRecord) => void;
  onEdit: (classItem: ClassRecord) => void;
  onSelect: (id: number) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  selectedClassId: number | null;
  setClassForm: (form: ClassFormState) => void;
}) {
  return (
    <div>
      <form className="space-y-4" onSubmit={onSubmit}>
        <h2 className="text-lg font-semibold">{isEditing ? "Edit class" : "Create class"}</h2>
        <div>
          <FieldLabel>Name</FieldLabel>
          <input
            className={inputClass}
            maxLength={30}
            minLength={2}
            onChange={(event) => setClassForm({ ...classForm, name: event.target.value })}
            placeholder="Grade 3 Math"
            required
            value={classForm.name}
          />
        </div>
        <div>
          <FieldLabel>Session</FieldLabel>
          <input
            className={inputClass}
            onChange={(event) => setClassForm({ ...classForm, session: event.target.value })}
            required
            type="date"
            value={classForm.session}
          />
        </div>
        <FormActions isEditing={isEditing} isSaving={isSaving} onCancel={onCancel} />
        <ErrorBox message={error} />
      </form>

      <div className="mt-6 grid gap-2">
        {classes.map((classItem) => (
          <div className="rounded-md border border-[#e2e5df] p-3" key={classItem.id}>
            <button
              className="block w-full text-left font-semibold"
              onClick={() => onSelect(classItem.id)}
              type="button"
            >
              {classItem.name}
            </button>
            <p className="text-sm text-[#6a7067]">{formatDate(classItem.session)}</p>
            <div className="mt-2 flex gap-2">
              {selectedClassId === classItem.id ? <Pill tone="green">Active</Pill> : null}
              <button className="text-sm font-semibold text-[#285b3b]" onClick={() => onEdit(classItem)} type="button">
                Edit
              </button>
              <button className="text-sm font-semibold text-[#843614]" onClick={() => onDelete(classItem)} type="button">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudentForm({
  classStudents,
  error,
  form,
  isEditing,
  isSaving,
  onCancel,
  onDelete,
  onEdit,
  onSubmit,
  setForm,
}: {
  classStudents: StudentRecord[];
  error?: string;
  form: StudentFormState;
  isEditing: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onDelete: (student: StudentRecord) => void;
  onEdit: (student: StudentRecord) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  setForm: (form: StudentFormState) => void;
}) {
  return (
    <div>
      <form className="space-y-4" onSubmit={onSubmit}>
        <h2 className="text-lg font-semibold">{isEditing ? "Edit student" : "Create student"}</h2>
        <input type="hidden" value={form.classId} />
        <div>
          <FieldLabel>Name</FieldLabel>
          <input
            className={inputClass}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Student name"
            required
            value={form.name}
          />
        </div>
        <div>
          <FieldLabel>Roll number</FieldLabel>
          <input
            className={inputClass}
            onChange={(event) => setForm({ ...form, rollNumber: event.target.value })}
            placeholder="Optional"
            value={form.rollNumber}
          />
        </div>
        <FormActions isEditing={isEditing} isSaving={isSaving} onCancel={onCancel} />
        <ErrorBox message={error} />
      </form>

      <div className="mt-6 grid gap-2">
        {classStudents.map((student) => (
          <div className="rounded-md border border-[#e2e5df] p-3" key={student.id}>
            <p className="font-semibold">{student.name}</p>
            <p className="text-sm text-[#6a7067]">{student.rollNumber || "No roll number"}</p>
            <div className="mt-2 flex gap-2">
              <button className="text-sm font-semibold text-[#285b3b]" onClick={() => onEdit(student)} type="button">
                Edit
              </button>
              <button className="text-sm font-semibold text-[#843614]" onClick={() => onDelete(student)} type="button">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NamedColorManager({
  error,
  form,
  isEditing,
  isSaving,
  items,
  label,
  onCancel,
  onChange,
  onDelete,
  onEdit,
  onSubmit,
}: {
  error?: string;
  form: NamedColorFormState;
  isEditing: boolean;
  isSaving: boolean;
  items: Array<{ color: string; id: number; name: string }>;
  label: string;
  onCancel: () => void;
  onChange: (form: NamedColorFormState) => void;
  onDelete: (item: { color: string; id: number; name: string }) => void;
  onEdit: (item: { color: string; id: number; name: string }) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div>
      <form className="space-y-4" onSubmit={onSubmit}>
        <h2 className="text-lg font-semibold">{isEditing ? `Edit ${label}` : `Create ${label}`}</h2>
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
        <FormActions isEditing={isEditing} isSaving={isSaving} onCancel={onCancel} />
        <ErrorBox message={error} />
      </form>
      <div className="mt-6 flex flex-wrap gap-2">
        {items.map((item) => (
          <span className="inline-flex items-center gap-2 rounded-full border border-[#dfe3dc] bg-[#f8f8f3] px-3 py-1.5 text-sm" key={item.id}>
            <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: item.color }} />
            {item.name}
            <button className="font-semibold text-[#285b3b]" onClick={() => onEdit(item)} type="button">
              Edit
            </button>
            <button className="font-semibold text-[#843614]" onClick={() => onDelete(item)} type="button">
              Delete
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

function NoteForm({
  classStudents,
  error,
  form,
  isEditing,
  isSaving,
  noteAttachmentFiles,
  onCancel,
  onDelete,
  onSubmit,
  setForm,
  setNoteAttachmentFiles,
  subjects,
  tags,
}: {
  classStudents: StudentRecord[];
  error?: string;
  form: NoteFormState;
  isEditing: boolean;
  isSaving: boolean;
  noteAttachmentFiles: File[];
  onCancel: () => void;
  onDelete: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  setForm: (form: NoteFormState) => void;
  setNoteAttachmentFiles: React.Dispatch<React.SetStateAction<File[]>>;
  subjects: SubjectRecord[];
  tags: TagRecord[];
}) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <h2 className="text-lg font-semibold">{isEditing ? "Edit note" : "Expanded note"}</h2>
      <div>
        <FieldLabel>Title</FieldLabel>
        <input
          className={inputClass}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          placeholder="Quick observation"
          value={form.title}
        />
      </div>
      <div>
        <FieldLabel>Student</FieldLabel>
        <select
          className={inputClass}
          onChange={(event) => setForm({ ...form, studentId: event.target.value })}
          required
          value={form.studentId}
        >
          <option value="">Select student</option>
          {classStudents.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <FieldLabel>Session date</FieldLabel>
        <input
          className={inputClass}
          onChange={(event) => setForm({ ...form, sessionDate: event.target.value })}
          type="date"
          value={form.sessionDate}
        />
      </div>
      <div>
        <FieldLabel>Subject</FieldLabel>
        <select
          className={inputClass}
          onChange={(event) => setForm({ ...form, subjectId: event.target.value })}
          value={form.subjectId}
        >
          <option value="">No subject</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <FieldLabel>Tags</FieldLabel>
        <select
          className="min-h-28 w-full rounded-md border border-[#d8ddd4] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#2f6f55] focus:ring-2 focus:ring-[#d8eadf]"
          multiple
          onChange={(event) =>
            setForm({
              ...form,
              tagIds: Array.from(event.target.selectedOptions).map(
                (option) => option.value,
              ),
            })
          }
          value={form.tagIds}
        >
          {tags.map((tag) => (
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
          onChange={(event) => setForm({ ...form, content: event.target.value })}
          placeholder="What happened?"
          value={form.content}
        />
      </div>
      <div>
        <FieldLabel>Attachments</FieldLabel>
        <Button
          component="label"
          sx={{
            borderColor: "#d8ddd4",
            borderRadius: "6px",
            color: "#20221f",
            fontWeight: 600,
            minHeight: "40px",
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
                setNoteAttachmentFiles((current) => [...current, ...files]);
              }
              event.target.value = "";
            }}
            type="file"
          />
        </Button>
        {noteAttachmentFiles.length > 0 ? (
          <div className="mt-3 space-y-2">
            {noteAttachmentFiles.map((file, index) => (
              <div className="flex items-center justify-between gap-3 rounded-md border border-[#e2e5df] bg-[#fbfbf8] px-3 py-2 text-sm" key={`${file.name}-${file.lastModified}-${index}`}>
                <span className="min-w-0 truncate">{file.name}</span>
                <button
                  className="shrink-0 text-xs font-semibold text-[#843614] hover:underline"
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
      <FormActions isEditing={isEditing} isSaving={isSaving} onCancel={onCancel} />
      {isEditing ? (
        <button className="text-sm font-semibold text-[#843614]" onClick={onDelete} type="button">
          Delete note
        </button>
      ) : null}
      <ErrorBox message={error} />
    </form>
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
          backgroundColor: "#20221f",
          borderRadius: "6px",
          color: "#ffffff",
          flex: 1,
          fontWeight: 700,
          minHeight: "42px",
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
            borderColor: "#d8ddd4",
            borderRadius: "6px",
            color: "#20221f",
            fontWeight: 600,
            minHeight: "42px",
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

export default function DashboardClient() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContent />
    </QueryClientProvider>
  );
}
