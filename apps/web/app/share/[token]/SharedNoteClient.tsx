"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

type SharedNote = {
  note: {
    attachments?: Array<{
      caption?: string | null;
      fileType: string;
      fileUrl: string;
      id: string;
    }>;
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

type SharedAttachment = NonNullable<SharedNote["note"]["attachments"]>[number];

function isImageAttachment(attachment: SharedAttachment) {
  return attachment.fileType.startsWith("image/");
}

function isTextAttachment(attachment: SharedAttachment) {
  return (
    attachment.fileType === "text/plain" ||
    attachment.fileType === "text/markdown" ||
    attachment.fileType === "text/csv" ||
    attachment.fileType === "application/json"
  );
}

function isEmbeddableAttachment(attachment: SharedAttachment) {
  return attachment.fileType === "application/pdf" || isTextAttachment(attachment);
}

function getAttachmentKind(attachment: SharedAttachment) {
  if (attachment.fileType.startsWith("image/")) {
    return "Image";
  }

  if (attachment.fileType === "application/pdf") {
    return "PDF";
  }

  if (isTextAttachment(attachment)) {
    return "Text";
  }

  if (attachment.fileType.startsWith("video/")) {
    return "Video";
  }

  if (attachment.fileType.startsWith("audio/")) {
    return "Audio";
  }

  return "File";
}

function getAttachmentLabel(attachment: SharedAttachment, index: number) {
  return (
    attachment.caption?.trim() || `${getAttachmentKind(attachment)} ${index + 1}`
  );
}

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

export default function SharedNoteClient({ token }: { token: string }) {
  const sharedNoteQuery = useQuery({
    queryFn: () => fetchSharedNote(token),
    queryKey: ["shared-note", token],
    retry: false,
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
            {sharedNote.note.attachments?.length ? (
              <div className="mt-7 grid gap-4">
                {sharedNote.note.attachments.map((attachment, index) => {
                  const label = getAttachmentLabel(attachment, index);

                  return (
                    <div
                      className="overflow-hidden rounded-lg border border-[#d7dce5] bg-[#fafaf8] text-sm text-[#111111]"
                      key={attachment.id}
                    >
                      <SharedAttachmentPreview attachment={attachment} label={label} />
                      <div className="flex flex-col gap-2 border-t border-[#d7dce5] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="block truncate font-medium text-[#245f99]">
                          {label}
                        </span>
                        <a
                          className="shrink-0 text-xs font-semibold text-[#378ADD] underline-offset-4 hover:underline"
                          href={attachment.fileUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Open original
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
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

function SharedAttachmentPreview({
  attachment,
  label,
}: {
  attachment: SharedAttachment;
  label: string;
}) {
  if (isImageAttachment(attachment)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={label}
        className="max-h-[520px] w-full bg-white object-contain"
        src={attachment.fileUrl}
      />
    );
  }

  if (attachment.fileType.startsWith("video/")) {
    return (
      <video
        className="max-h-[520px] w-full bg-black"
        controls
        src={attachment.fileUrl}
      />
    );
  }

  if (attachment.fileType.startsWith("audio/")) {
    return (
      <div className="bg-white p-5">
        <audio className="w-full" controls src={attachment.fileUrl} />
      </div>
    );
  }

  if (isEmbeddableAttachment(attachment)) {
    return (
      <iframe
        className="h-[520px] w-full bg-white"
        src={attachment.fileUrl}
        title={label}
      />
    );
  }

  return (
    <div className="flex h-40 items-center justify-center bg-white text-xs font-semibold uppercase tracking-[0.12em] text-[#6b6b6b]">
      {getAttachmentKind(attachment)}
    </div>
  );
}
