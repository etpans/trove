export type AuthMode = 'login' | 'register';
export type Screen = 'home' | 'class' | 'student';
export type CreateTarget = 'class' | 'classActions' | 'student' | 'note' | null;

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
};

export type ClassRecord = {
  color?: string;
  createdAt?: string;
  id: number;
  name: string;
  session: string;
};

export type StudentRecord = {
  classId: number;
  createdAt?: string;
  id: number;
  name: string;
  rollNumber?: string | null;
};

export type NoteAttachmentRecord = {
  caption?: string | null;
  fileType: string;
  fileUrl: string;
  id: string;
};

export type NoteRecord = {
  attachments?: NoteAttachmentRecord[];
  content: string | null;
  createdAt?: string;
  id: number;
  student?: StudentRecord;
  studentId: number;
  title: string;
  updatedAt?: string;
};

export type AuthForm = {
  displayName: string;
  email: string;
  password: string;
};

export type ClassForm = {
  name: string;
  session: string;
};

export type StudentForm = {
  name: string;
  rollNumber: string;
};

export type NoteForm = {
  content: string;
  studentId: string;
  title: string;
};
