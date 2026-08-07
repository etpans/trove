"use client";

import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

type SharedNote = {
  likeCount: number;
  note: {
    content: string | null;
    createdAt?: string;
    student?: {
      name: string;
    };
    subject?: {
      color: string;
      name: string;
    } | null;
    tags?: Array<{
      id: number;
      name: string;
    }>;
    title: string;
  };
};

type LikeResponse = {
  likeCount: number;
};

async function fetchSharedNote(token: string) {
  const response = await fetch(`/api/share/${token}`);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Shared note not found.",
    );
  }

  return data as SharedNote;
}

async function likeSharedNote(token: string) {
  const response = await fetch(`/api/share/${token}/like`, {
    method: "POST",
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Unable to like note.",
    );
  }

  return data as LikeResponse;
}

function SharedNoteContent({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const sharedNoteQuery = useQuery({
    queryFn: () => fetchSharedNote(token),
    queryKey: ["shared-note", token],
    retry: false,
  });
  const likeMutation = useMutation({
    mutationFn: () => likeSharedNote(token),
    onSuccess: (data) => {
      queryClient.setQueryData<SharedNote>(["shared-note", token], (current) =>
        current ? { ...current, likeCount: data.likeCount } : current,
      );
    },
  });
  const sharedNote = sharedNoteQuery.data;

  return (
    <main className="min-h-screen bg-[#fafaf8] px-5 py-8 text-[#111111] sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link className="text-lg font-semibold lowercase" href="/">
          trove
        </Link>

        {sharedNoteQuery.isLoading ? (
          <section className="mt-10 rounded-lg border border-[#e7e5df] bg-white p-7">
            <p className="text-sm text-[#6b6b6b]">Loading shared note...</p>
          </section>
        ) : sharedNoteQuery.isError ? (
          <section className="mt-10 rounded-lg border border-[#e3b7a6] bg-[#fff7f3] p-7 text-[#8a3517]">
            {sharedNoteQuery.error.message}
          </section>
        ) : sharedNote ? (
          <article className="mt-10 rounded-lg border border-[#e7e5df] bg-white p-7">
            <p className="text-sm font-medium text-[#378ADD]">
              {sharedNote.note.student?.name ?? "Shared note"}
            </p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight">
              {sharedNote.note.title}
            </h1>
            {sharedNote.note.subject ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-[#4d4d4d]">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundColor: sharedNote.note.subject.color,
                  }}
                />
                {sharedNote.note.subject.name}
              </div>
            ) : null}
            <p className="mt-6 whitespace-pre-line text-base leading-7 text-[#333333]">
              {sharedNote.note.content}
            </p>
            {sharedNote.note.tags?.length ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {sharedNote.note.tags.map((tag) => (
                  <span
                    className="rounded-full border border-[#e7e5df] bg-[#fafaf8] px-2.5 py-1 text-xs font-medium"
                    key={tag.id}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mt-8 flex items-center gap-3 border-t border-[#e7e5df] pt-5">
              <button
                className="rounded-md border border-[#111111] bg-[#111111] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#333333] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={likeMutation.isPending}
                onClick={() => likeMutation.mutate()}
                type="button"
              >
                Like
              </button>
              <p className="text-sm text-[#4d4d4d]">
                {sharedNote.likeCount}{" "}
                {sharedNote.likeCount === 1 ? "like" : "likes"}
              </p>
            </div>
            {likeMutation.isError ? (
              <p className="mt-3 text-sm text-[#8a3517]">
                {likeMutation.error.message}
              </p>
            ) : null}
          </article>
        ) : (
          <section className="mt-10 rounded-lg border border-[#e7e5df] bg-white p-7 text-sm text-[#6b6b6b]">
            Shared note not found.
          </section>
        )}
      </div>
    </main>
  );
}

export default function SharedNoteClient({ token }: { token: string }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SharedNoteContent token={token} />
    </QueryClientProvider>
  );
}
