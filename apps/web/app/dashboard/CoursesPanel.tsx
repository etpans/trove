"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

type CourseRecord = {
  id: number;
  name: string;
  color: string;
};

type CourseDraft = Pick<CourseRecord, "name" | "color">;

const emptyDraft: CourseDraft = { name: "", color: "#D97757" };
const courseColors = ["#D97757", "#658B70", "#6685B1", "#9474AD", "#B38946"];
const inputClass =
  "w-full rounded-xl border border-[#e4e0d9] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#bd6143] focus:ring-2 focus:ring-[#bd6143]/15 disabled:opacity-60";
const secondaryButtonClass =
  "rounded-xl border border-[#e4e0d9] bg-white px-4 py-2.5 text-sm font-medium text-[#5e5b55] transition hover:bg-[#f5f3ee] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bd6143] disabled:cursor-not-allowed disabled:opacity-50";
const primaryButtonClass =
  "rounded-xl bg-[#b85e42] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#9c4c34] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bd6143] disabled:cursor-not-allowed disabled:opacity-50";

async function requestCourses<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    signal: AbortSignal.timeout(20_000),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Your session has expired. Sign in again to continue.");
    }
    const message = data?.message;
    throw new Error(
      Array.isArray(message)
        ? message.join(" ")
        : typeof message === "string"
          ? message
          : "Unable to load or save courses. Please try again.",
    );
  }

  return data as T;
}

function errorMessage(error: Error | null) {
  if (error?.name === "TimeoutError") {
    return "The request took too long. Please try again.";
  }
  return error?.message ?? "Something went wrong. Please try again.";
}

export default function CoursesPanel({ search = "" }: { search?: string }) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<CourseDraft>(emptyDraft);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState("");
  const nameInput = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);

  const coursesQuery = useQuery({
    queryKey: ["subjects"],
    queryFn: () => requestCourses<CourseRecord[]>("/api/subjects"),
    retry: false,
  });

  const saveCourse = useMutation({
    retry: false,
    mutationFn: ({ id, values }: { id: number | null; values: CourseDraft }) =>
      requestCourses<CourseRecord>(id === null ? "/api/subjects" : `/api/subjects/${id}`, {
        method: id === null ? "POST" : "PATCH",
        body: JSON.stringify(values),
      }),
    onSuccess: (course, { id }) => {
      queryClient.setQueryData<CourseRecord[]>(["subjects"], (current = []) =>
        id === null
          ? [...current, course]
          : current.map((item) => (item.id === id ? course : item)),
      );
      setFormOpen(false);
      setEditingId(null);
      setDraft(emptyDraft);
      setSavedMessage(id === null ? "Course added." : "Course updated.");
      void queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
  });

  useEffect(() => {
    if (formOpen) nameInput.current?.focus();
  }, [formOpen, editingId]);

  const courses = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return [...(coursesQuery.data ?? [])]
      .filter((course) => course.name.toLocaleLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [coursesQuery.data, search]);

  function openForm(course?: CourseRecord) {
    setEditingId(course?.id ?? null);
    setDraft(course ? { name: course.name, color: course.color } : emptyDraft);
    setValidationError(null);
    setSavedMessage("");
    saveCourse.reset();
    setFormOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const values = { name: draft.name.trim(), color: draft.color };
    if (values.name.length < 2 || values.name.length > 30) {
      setValidationError("Enter a course name between 2 and 30 characters.");
      nameInput.current?.focus();
      return;
    }
    setValidationError(null);
    submitting.current = true;
    try {
      await saveCourse.mutateAsync({ id: editingId, values });
    } catch {
      // Keep the draft available for a retry; the mutation renders its error.
    } finally {
      submitting.current = false;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8d8578]">Your workspace</p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#2e2b26]">Courses</h1>
          <p className="mt-2 text-sm text-[#777168]">Keep the subjects you teach together in one place.</p>
        </div>
        <button
          className={primaryButtonClass}
          disabled={saveCourse.isPending}
          onClick={() => openForm()}
          type="button"
          aria-expanded={formOpen}
          aria-controls="course-form"
        >
          + Add course
        </button>
      </div>

      <p aria-live="polite" className="text-sm text-[#527258]">{savedMessage}</p>

      {formOpen ? (
        <form
          aria-labelledby="course-form-title"
          className="rounded-2xl border border-[#e4e0d9] bg-white p-5 sm:p-6"
          id="course-form"
          onSubmit={handleSubmit}
        >
          <h2 className="text-lg font-semibold text-[#2e2b26]" id="course-form-title">
            {editingId === null ? "Add a course" : "Edit course"}
          </h2>
          <p className="mt-1 text-sm text-[#777168]">Choose a name and color for this course.</p>
          <fieldset className="mt-5 space-y-4" disabled={saveCourse.isPending}>
            <div className="max-w-lg">
              <label className="mb-1.5 block text-sm font-medium text-[#514b43]" htmlFor="course-name">Course name</label>
              <input
                aria-describedby="course-name-help course-form-error"
                aria-invalid={Boolean(validationError || saveCourse.error)}
                autoComplete="off"
                className={inputClass}
                id="course-name"
                maxLength={30}
                minLength={2}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="e.g. Mathematics"
                ref={nameInput}
                required
                value={draft.name}
              />
              <p className="mt-1 text-xs text-[#8d8578]" id="course-name-help">2–30 characters</p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#514b43]" htmlFor="course-color">Course color</label>
              <div className="flex flex-wrap items-center gap-2">
                {courseColors.map((color) => (
                  <button
                    aria-label={`Choose ${color} color`}
                    aria-pressed={draft.color.toLowerCase() === color.toLowerCase()}
                    className="h-8 w-8 rounded-full border-2 border-white outline-1 outline-offset-2 outline-transparent aria-pressed:outline-[#514b43] focus-visible:outline-2 focus-visible:outline-[#bd6143]"
                    key={color}
                    onClick={() => setDraft((current) => ({ ...current, color }))}
                    style={{ backgroundColor: color }}
                    type="button"
                  />
                ))}
                <input
                  className="ml-2 h-9 w-12 cursor-pointer rounded border border-[#e4e0d9] bg-white p-1 focus-visible:outline-2 focus-visible:outline-[#bd6143]"
                  id="course-color"
                  onChange={(event) => setDraft((current) => ({ ...current, color: event.target.value }))}
                  type="color"
                  value={draft.color}
                />
              </div>
            </div>
            <p className="text-sm text-[#a4402f]" id="course-form-error" role="alert">
              {validationError ?? (saveCourse.error ? errorMessage(saveCourse.error) : "")}
            </p>
            <div className="flex flex-wrap gap-2">
              <button className={primaryButtonClass} type="submit">
                {saveCourse.isPending ? "Saving…" : editingId === null ? "Create course" : "Save changes"}
              </button>
              <button className={secondaryButtonClass} onClick={() => setFormOpen(false)} type="button">Cancel</button>
            </div>
          </fieldset>
        </form>
      ) : null}

      {coursesQuery.isPending ? (
        <div aria-live="polite" className="rounded-2xl border border-[#e4e0d9] bg-white p-8 text-sm text-[#777168]" role="status">Loading courses…</div>
      ) : coursesQuery.isError ? (
        <div className="rounded-2xl border border-[#e4e0d9] bg-white p-6">
          <p className="text-sm text-[#a4402f]" role="alert">{errorMessage(coursesQuery.error)}</p>
          <button className={`${secondaryButtonClass} mt-4`} disabled={coursesQuery.isFetching} onClick={() => void coursesQuery.refetch()} type="button">
            {coursesQuery.isFetching ? "Retrying…" : "Retry"}
          </button>
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#dcd6cb] bg-white/60 p-10 text-center">
          <h2 className="text-lg font-semibold text-[#514b43]">{search.trim() ? "No courses found" : "Your courses start here"}</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[#777168]">
            {search.trim() ? "Try a different course name." : "Add the subjects you teach, such as Mathematics, Science, or English."}
          </p>
          {!search.trim() ? <button className={`${primaryButtonClass} mt-5`} disabled={saveCourse.isPending} onClick={() => openForm()} type="button">Add your first course</button> : null}
        </div>
      ) : (
        <ul aria-label="Courses" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <li className="flex min-w-0 items-center gap-4 rounded-2xl border border-[#e4e0d9] bg-white p-5" key={course.id}>
              <span aria-hidden="true" className="h-11 w-11 shrink-0 rounded-xl border border-black/5" style={{ backgroundColor: course.color }} />
              <div className="min-w-0 flex-1">
                <h2 className="break-words text-base font-semibold text-[#38332c]">{course.name}</h2>
                <p className="mt-1 text-xs text-[#8d8578]">Course</p>
              </div>
              <button
                aria-label={`Edit ${course.name}`}
                className="rounded-lg px-2 py-1 text-sm font-medium text-[#8b4a35] hover:bg-[#faf0e9] focus-visible:outline-2 focus-visible:outline-[#bd6143] disabled:opacity-50"
                disabled={saveCourse.isPending}
                onClick={() => openForm(course)}
                type="button"
              >Edit</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
