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

type ClassFormState = {
  name: string;
  session: string;
};

const emptyClassForm: ClassFormState = {
  name: "",
  session: "",
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

function formatSessionDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function UnauthorizedDashboard() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafaf8] px-5 py-12 text-[#111111]">
      <main className="w-full max-w-md rounded-lg border border-[#e7e5df] bg-white p-7 text-center shadow-[0_18px_60px_rgba(17,17,17,0.08)]">
        <Link
          className="text-lg font-semibold tracking-[-0.04em] lowercase"
          href="/"
        >
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
            "&:hover": {
              backgroundColor: "#2b2b2b",
            },
          }}
          variant="contained"
        >
          Go to sign in
        </Button>
      </main>
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [classForm, setClassForm] = useState<ClassFormState>(emptyClassForm);
  const [editingClassId, setEditingClassId] = useState<number | null>(null);

  const sessionQuery = useQuery({
    queryFn: () => fetchJson<SessionState>("/api/auth/session"),
    queryKey: ["session"],
    retry: false,
  });

  const classesQuery = useQuery({
    enabled: sessionQuery.data?.authenticated === true,
    queryFn: () => fetchJson<ClassRecord[]>("/api/classes"),
    queryKey: ["classes"],
  });

  const selectedClass = useMemo(
    () =>
      classesQuery.data?.find((classItem) => classItem.id === editingClassId) ??
      null,
    [classesQuery.data, editingClassId],
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

  const deleteClassMutation = useMutation({
    mutationFn: (id: number) =>
      fetchJson<{ deleted: boolean }>(`/api/classes/${id}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      if (editingClassId) {
        setClassForm(emptyClassForm);
        setEditingClassId(null);
      }
      await queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
  });

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
  }

  function handleEdit(classItem: ClassRecord) {
    setEditingClassId(classItem.id);
    setClassForm({
      name: classItem.name,
      session: classItem.session.slice(0, 10),
    });
  }

  function handleCancelEdit() {
    setEditingClassId(null);
    setClassForm(emptyClassForm);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!classForm.name.trim() || !classForm.session) {
      return;
    }

    saveClassMutation.mutate({
      ...classForm,
      id: editingClassId ?? undefined,
    });
  }

  const classCount = classesQuery.data?.length ?? 0;
  const isSaving = saveClassMutation.isPending;
  const isLoadingDashboard =
    sessionQuery.isLoading ||
    (sessionQuery.data?.authenticated === true && classesQuery.isLoading);

  if (sessionQuery.isError || sessionQuery.data?.authenticated === false) {
    return <UnauthorizedDashboard />;
  }

  return (
    <div className="min-h-screen bg-[#fafaf8] px-5 py-6 text-[#111111] sm:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link
          className="text-lg font-semibold tracking-[-0.04em] lowercase"
          href="/"
        >
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
            "&:hover": {
              backgroundColor: "#ffffff",
              borderColor: "#c5ccd8",
            },
          }}
          variant="outlined"
        >
          Log out
        </Button>
      </div>

      <main className="mx-auto mt-10 max-w-6xl">
        <section className="flex flex-col justify-between gap-5 border-b border-[#e7e5df] pb-8 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-medium text-[#378ADD]">
              {sessionQuery.data?.user?.email ?? "Signed in"}
            </p>
            <h1 className="mt-2 text-[2.25rem] font-semibold leading-tight">
              Classes
            </h1>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm sm:min-w-[260px]">
            <div className="rounded-lg border border-[#e7e5df] bg-white p-4">
              <p className="text-[#6b6b6b]">Active classes</p>
              <p className="mt-1 text-3xl font-semibold">{classCount}</p>
            </div>
            <div className="rounded-lg border border-[#e7e5df] bg-white p-4">
              <p className="text-[#6b6b6b]">Next screen</p>
              <p className="mt-1 text-lg font-semibold">Students</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-h-[420px]">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Class roster</h2>
              {classesQuery.isFetching ? (
                <span className="text-sm text-[#6b6b6b]">Syncing</span>
              ) : null}
            </div>

            {isLoadingDashboard ? (
              <div className="rounded-lg border border-[#e7e5df] bg-white p-6 text-sm text-[#6b6b6b]">
                Loading classes...
              </div>
            ) : classesQuery.isError ? (
              <div className="rounded-lg border border-[#e3b7a6] bg-[#fff7f3] p-5 text-sm text-[#8a3517]">
                {classesQuery.error.message}
              </div>
            ) : classCount === 0 ? (
              <div className="rounded-lg border border-dashed border-[#cfd6df] bg-white p-8">
                <h3 className="text-base font-semibold">No classes yet</h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-[#6b6b6b]">
                  Create your first class so students and notes have a place to
                  attach.
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {classesQuery.data?.map((classItem) => (
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
                          Session {formatSessionDate(classItem.session)}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleEdit(classItem)}
                          size="small"
                          sx={{
                            borderRadius: "8px",
                            color: "#111111",
                            fontWeight: 600,
                            textTransform: "none",
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          color="error"
                          disabled={deleteClassMutation.isPending}
                          onClick={() => deleteClassMutation.mutate(classItem.id)}
                          size="small"
                          sx={{
                            borderRadius: "8px",
                            fontWeight: 600,
                            textTransform: "none",
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <aside className="rounded-lg border border-[#e7e5df] bg-white p-5">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">
                {selectedClass ? "Edit class" : "Create class"}
              </h2>
              <p className="mt-1 text-sm text-[#6b6b6b]">
                Add the class name and school session date.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-[#4d4d4d]">
                  Name
                </span>
                <input
                  className="h-11 w-full rounded-lg border border-[#d7dce5] bg-white px-3 text-sm outline-none transition focus:border-[#378ADD]"
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
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-[#4d4d4d]">
                  Session
                </span>
                <input
                  className="h-11 w-full rounded-lg border border-[#d7dce5] bg-white px-3 text-sm outline-none transition focus:border-[#378ADD]"
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
              </label>

              {saveClassMutation.isError ? (
                <div className="rounded-lg border border-[#e3b7a6] bg-[#fff7f3] p-3 text-sm text-[#8a3517]">
                  {saveClassMutation.error.message}
                </div>
              ) : null}

              {deleteClassMutation.isError ? (
                <div className="rounded-lg border border-[#e3b7a6] bg-[#fff7f3] p-3 text-sm text-[#8a3517]">
                  {deleteClassMutation.error.message}
                </div>
              ) : null}

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
                    "&:hover": {
                      backgroundColor: "#2b2b2b",
                    },
                  }}
                  variant="contained"
                >
                  {isSaving
                    ? "Saving"
                    : selectedClass
                      ? "Save changes"
                      : "Create class"}
                </Button>

                {selectedClass ? (
                  <Button
                    disabled={isSaving}
                    onClick={handleCancelEdit}
                    sx={{
                      borderColor: "#d7dce5",
                      borderRadius: "8px",
                      color: "#111111",
                      fontWeight: 600,
                      minHeight: "44px",
                      textTransform: "none",
                    }}
                    variant="outlined"
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </form>
          </aside>
        </section>
      </main>
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
