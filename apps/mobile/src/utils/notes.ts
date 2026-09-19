import type { NoteRecord } from '../types/models';

export function includesQuery(value: string | null | undefined, query: string) {
  return (value || '').toLowerCase().includes(query.toLowerCase());
}

export function noteMatchesQuery(note: NoteRecord, query: string) {
  if (!query.trim()) {
    return true;
  }

  return (
    includesQuery(note.title, query) ||
    includesQuery(note.content, query) ||
    includesQuery(note.student?.name, query) ||
    Boolean(
      note.attachments?.some(
        (attachment) =>
          includesQuery(attachment.caption, query) ||
          includesQuery(attachment.fileType, query) ||
          includesQuery(attachment.fileUrl, query),
      ),
    )
  );
}

export function sortNewest(a: NoteRecord, b: NoteRecord) {
  return (
    new Date(b.createdAt || b.updatedAt || 0).getTime() -
    new Date(a.createdAt || a.updatedAt || 0).getTime()
  );
}
