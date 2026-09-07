import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import type { ReactElement, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

declare const process: {
  env?: {
    EXPO_PUBLIC_API_BASE_URL?: string;
  };
};

const API_BASE_URL =
  process.env?.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ||
  'http://localhost:3000';

type AuthMode = 'login' | 'register';
type Screen = 'home' | 'class' | 'student';
type CreateTarget = 'class' | 'classActions' | 'student' | 'note' | null;

type AuthTokens = {
  access_token: string;
  refresh_token: string;
};

type ClassRecord = {
  color?: string;
  createdAt?: string;
  id: number;
  name: string;
  session: string;
};

type StudentRecord = {
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

type AuthForm = {
  displayName: string;
  email: string;
  password: string;
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

const cardColors = [
  '#F8E36D',
  '#B7D1F6',
  '#F5AAA6',
  '#A7F3D0',
  '#FFD166',
  '#C7D2FE',
  '#F9C6D3',
  '#BDE0FE',
];

const todayInputValue = () => new Date().toISOString().slice(0, 10);

const initialAuthForm: AuthForm = {
  displayName: '',
  email: '',
  password: '',
};

const initialClassForm: ClassForm = {
  name: '',
  session: todayInputValue(),
};

const initialStudentForm: StudentForm = {
  name: '',
  rollNumber: '',
};

const initialNoteForm: NoteForm = {
  content: '',
  studentId: '',
  title: '',
};

function getCardColor(index: number, color?: string) {
  return color || cardColors[index % cardColors.length];
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'No date';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function includesQuery(value: string | null | undefined, query: string) {
  return (value || '').toLowerCase().includes(query.toLowerCase());
}

export default function App() {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authForm, setAuthForm] = useState<AuthForm>(initialAuthForm);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    null,
  );
  const [query, setQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createTarget, setCreateTarget] = useState<CreateTarget>(null);
  const [classForm, setClassForm] = useState<ClassForm>(initialClassForm);
  const [studentForm, setStudentForm] =
    useState<StudentForm>(initialStudentForm);
  const [noteForm, setNoteForm] = useState<NoteForm>(initialNoteForm);
  const [busy, setBusy] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [pinnedNoteIds, setPinnedNoteIds] = useState<number[]>([]);

  const selectedClass = classes.find((item) => item.id === selectedClassId);
  const selectedStudent = students.find((item) => item.id === selectedStudentId);

  const classStudents = useMemo(
    () => students.filter((student) => student.classId === selectedClassId),
    [selectedClassId, students],
  );

  const classNotes = useMemo(() => {
    const classStudentIds = new Set(classStudents.map((student) => student.id));
    return notes
      .filter((note) => classStudentIds.has(note.studentId))
      .filter((note) => noteMatchesQuery(note, query))
      .sort(sortNewest);
  }, [classStudents, notes, query]);

  const studentNotes = useMemo(() => {
    return notes
      .filter((note) => note.studentId === selectedStudentId)
      .filter((note) => noteMatchesQuery(note, query))
      .sort((a, b) => {
        const aPinned = pinnedNoteIds.includes(a.id);
        const bPinned = pinnedNoteIds.includes(b.id);
        if (aPinned !== bPinned) {
          return aPinned ? -1 : 1;
        }

        return sortNewest(a, b);
      });
  }, [notes, pinnedNoteIds, query, selectedStudentId]);

  const visibleClasses = useMemo(
    () =>
      classes.filter((item) =>
        [item.name, item.session].some((value) => includesQuery(value, query)),
      ),
    [classes, query],
  );

  async function requestJson<T>(path: string, init?: RequestInit) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(tokens?.access_token
          ? { Authorization: `Bearer ${tokens.access_token}` }
          : {}),
        ...init?.headers,
      },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        typeof data.message === 'string' ? data.message : 'Request failed.';
      throw new Error(message);
    }

    return data as T;
  }

  async function refreshData(nextTokens = tokens) {
    if (!nextTokens) {
      return;
    }

    setLoadingData(true);
    try {
      const headers = {
        Authorization: `Bearer ${nextTokens.access_token}`,
        'Content-Type': 'application/json',
      };
      const [nextClasses, nextStudents, nextNotes] = await Promise.all([
        fetch(`${API_BASE_URL}/classes`, { headers }).then(assertJson),
        fetch(`${API_BASE_URL}/students`, { headers }).then(assertJson),
        fetch(`${API_BASE_URL}/notes`, { headers }).then(assertJson),
      ]);

      setClasses(nextClasses as ClassRecord[]);
      setStudents(nextStudents as StudentRecord[]);
      setNotes(nextNotes as NoteRecord[]);
    } catch (error) {
      showError(error);
    } finally {
      setLoadingData(false);
    }
  }

  async function submitAuth() {
    setBusy(true);
    try {
      if (authMode === 'register') {
        await requestJson('/auth/register', {
          body: JSON.stringify({
            displayName: authForm.displayName,
            email: authForm.email,
            password: authForm.password,
          }),
          method: 'POST',
        });
        Alert.alert('Verify email', 'Check your email, then log in.');
        setAuthMode('login');
        return;
      }

      const nextTokens = await requestJson<AuthTokens>('/auth/login', {
        body: JSON.stringify({
          email: authForm.email,
          password: authForm.password,
        }),
        method: 'POST',
      });
      setTokens(nextTokens);
      setScreen('home');
      setQuery('');
      await refreshData(nextTokens);
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  async function createClass() {
    setBusy(true);
    try {
      const created = await requestJson<ClassRecord>('/classes', {
        body: JSON.stringify({
          color: getCardColor(classes.length),
          name: classForm.name,
          session: classForm.session,
        }),
        method: 'POST',
      });
      setClasses((current) => [created, ...current]);
      setClassForm(initialClassForm);
      setCreateTarget(null);
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  async function createStudent() {
    if (!selectedClassId) {
      return;
    }

    setBusy(true);
    try {
      const created = await requestJson<StudentRecord>('/students', {
        body: JSON.stringify({
          classId: selectedClassId,
          name: studentForm.name,
          rollNumber: studentForm.rollNumber || undefined,
        }),
        method: 'POST',
      });
      setStudents((current) => [created, ...current]);
      setStudentForm(initialStudentForm);
      setCreateTarget(null);
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  async function createNote() {
    const studentId = Number(noteForm.studentId || selectedStudentId);
    if (!studentId) {
      Alert.alert('Student required', 'Choose a student for this note.');
      return;
    }

    setBusy(true);
    try {
      const created = await requestJson<NoteRecord>('/notes', {
        body: JSON.stringify({
          content: noteForm.content,
          studentId,
          title: noteForm.title,
        }),
        method: 'POST',
      });
      setNotes((current) => [created, ...current]);
      setNoteForm(initialNoteForm);
      setCreateTarget(null);
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  async function attachMedia(noteId: number) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    const formData = new FormData();
    formData.append('file', {
      name: asset.fileName || `note-${noteId}`,
      type: asset.mimeType || 'application/octet-stream',
      uri: asset.uri,
    } as unknown as Blob);

    setBusy(true);
    try {
      const response = await fetch(`${API_BASE_URL}/notes/${noteId}/attachments`, {
        body: formData,
        headers: {
          Authorization: `Bearer ${tokens?.access_token}`,
        },
        method: 'POST',
      });
      await assertJson(response);
      await refreshData();
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  function openClass(classId: number) {
    setSelectedClassId(classId);
    setSelectedStudentId(null);
    setScreen('class');
    setQuery('');
  }

  function openStudent(studentId: number) {
    setSelectedStudentId(studentId);
    setScreen('student');
    setDrawerOpen(false);
    setQuery('');
  }

  function openCreateNote(studentId?: number) {
    setNoteForm({
      ...initialNoteForm,
      studentId: studentId ? String(studentId) : '',
    });
    setCreateTarget('note');
  }

  function togglePinned(noteId: number) {
    setPinnedNoteIds((current) =>
      current.includes(noteId)
        ? current.filter((id) => id !== noteId)
        : [noteId, ...current],
    );
  }

  if (!tokens) {
    return (
      <SafeAreaView style={styles.authScreen}>
        <StatusBar style="dark" />
        <View style={styles.authPanel}>
          <Text style={styles.brand}>Trove</Text>
          <Text style={styles.authTitle}>
            {authMode === 'login' ? 'Welcome back' : 'Create account'}
          </Text>

          {authMode === 'register' ? (
            <TextInput
              autoCapitalize="words"
              onChangeText={(displayName) =>
                setAuthForm((current) => ({ ...current, displayName }))
              }
              placeholder="Display name"
              style={styles.input}
              value={authForm.displayName}
            />
          ) : null}
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={(email) =>
              setAuthForm((current) => ({ ...current, email }))
            }
            placeholder="Email"
            style={styles.input}
            value={authForm.email}
          />
          <TextInput
            onChangeText={(password) =>
              setAuthForm((current) => ({ ...current, password }))
            }
            placeholder="Password"
            secureTextEntry
            style={styles.input}
            value={authForm.password}
          />

          <Pressable
            disabled={busy}
            onPress={submitAuth}
            style={[styles.primaryButton, busy && styles.disabled]}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {authMode === 'login' ? 'Log in' : 'Register'}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() =>
              setAuthMode((current) =>
                current === 'login' ? 'register' : 'login',
              )
            }
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>
              {authMode === 'login'
                ? 'Need an account? Register'
                : 'Already have an account? Log in'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.appHeader}>
        <Pressable
          onPress={() => (screen === 'home' ? null : setDrawerOpen(true))}
          style={styles.iconButton}
        >
          <Text style={styles.iconText}>☰</Text>
        </Pressable>
        <TextInput
          onChangeText={setQuery}
          placeholder={
            screen === 'home'
              ? 'Search classes'
              : 'Search students, notes, files'
          }
          style={styles.searchInput}
          value={query}
        />
        <Pressable onPress={() => refreshData()} style={styles.iconButton}>
          <Text style={styles.iconText}>↻</Text>
        </Pressable>
      </View>

      {loadingData ? (
        <View style={styles.loadingStrip}>
          <ActivityIndicator color="#202124" />
        </View>
      ) : null}

      {screen === 'home' ? (
        <BoardHeader title="Classes" subtitle="Your classroom boards" />
      ) : null}
      {screen === 'class' ? (
        <BoardHeader
          onBack={() => setScreen('home')}
          subtitle="Latest notes"
          title={selectedClass?.name || 'Class'}
        />
      ) : null}
      {screen === 'student' ? (
        <BoardHeader
          onBack={() => setScreen('class')}
          subtitle="Pinned notes stay first"
          title={selectedStudent?.name || 'Student'}
        />
      ) : null}

      {screen === 'home' ? (
        <KeepGrid
          data={visibleClasses}
          emptyText="Create your first class."
          renderItem={(item, index) => (
            <Pressable
              onPress={() => openClass(item.id)}
              style={[
                styles.keepCard,
                { backgroundColor: getCardColor(index, item.color) },
              ]}
            >
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardMeta}>{formatDate(item.session)}</Text>
            </Pressable>
          )}
        />
      ) : null}

      {screen === 'class' ? (
        <KeepGrid
          data={classNotes}
          emptyText="Create students, then add notes."
          renderItem={(item, index) => (
            <NoteCard
              color={getCardColor(index)}
              isPinned={false}
              note={item}
              onAttach={() => attachMedia(item.id)}
              studentName={
                students.find((student) => student.id === item.studentId)?.name
              }
            />
          )}
        />
      ) : null}

      {screen === 'student' ? (
        <KeepGrid
          data={studentNotes}
          emptyText="Add the first note for this student."
          renderItem={(item, index) => (
            <NoteCard
              color={getCardColor(index)}
              isPinned={pinnedNoteIds.includes(item.id)}
              note={item}
              onAttach={() => attachMedia(item.id)}
              onPin={() => togglePinned(item.id)}
            />
          )}
        />
      ) : null}

      <Pressable
        onPress={() => {
          if (screen === 'home') {
            setCreateTarget('class');
          } else if (screen === 'class') {
            setCreateTarget('classActions');
          } else {
            openCreateNote(selectedStudentId || undefined);
          }
        }}
        style={styles.fab}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <StudentDrawer
        onClose={() => setDrawerOpen(false)}
        onOpenStudent={openStudent}
        open={drawerOpen}
        students={classStudents}
      />

      <Modal
        animationType="slide"
        onRequestClose={() => setCreateTarget(null)}
        transparent
        visible={createTarget !== null}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalPanel}>
            {createTarget === 'classActions' ? (
              <>
                <Text style={styles.modalTitle}>Create</Text>
                <Pressable
                  onPress={() => setCreateTarget('student')}
                  style={styles.actionRow}
                >
                  <Text style={styles.actionText}>Student</Text>
                </Pressable>
                <Pressable
                  onPress={() => openCreateNote()}
                  style={styles.actionRow}
                >
                  <Text style={styles.actionText}>Note</Text>
                </Pressable>
              </>
            ) : null}

            {createTarget === 'class' ? (
              <FormShell
                busy={busy}
                onCancel={() => setCreateTarget(null)}
                onSubmit={createClass}
                submitLabel="Create class"
                title="New class"
              >
                <TextInput
                  onChangeText={(name) =>
                    setClassForm((current) => ({ ...current, name }))
                  }
                  placeholder="Class name"
                  style={styles.input}
                  value={classForm.name}
                />
                <TextInput
                  onChangeText={(session) =>
                    setClassForm((current) => ({ ...current, session }))
                  }
                  placeholder="YYYY-MM-DD"
                  style={styles.input}
                  value={classForm.session}
                />
              </FormShell>
            ) : null}

            {createTarget === 'student' ? (
              <FormShell
                busy={busy}
                onCancel={() => setCreateTarget(null)}
                onSubmit={createStudent}
                submitLabel="Create student"
                title="New student"
              >
                <TextInput
                  onChangeText={(name) =>
                    setStudentForm((current) => ({ ...current, name }))
                  }
                  placeholder="Student name"
                  style={styles.input}
                  value={studentForm.name}
                />
                <TextInput
                  onChangeText={(rollNumber) =>
                    setStudentForm((current) => ({ ...current, rollNumber }))
                  }
                  placeholder="Roll number"
                  style={styles.input}
                  value={studentForm.rollNumber}
                />
              </FormShell>
            ) : null}

            {createTarget === 'note' ? (
              <FormShell
                busy={busy}
                onCancel={() => setCreateTarget(null)}
                onSubmit={createNote}
                submitLabel="Create note"
                title="New note"
              >
                {screen === 'class' ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.studentChips}>
                      {classStudents.map((student) => {
                        const selected = noteForm.studentId === String(student.id);
                        return (
                          <Pressable
                            key={student.id}
                            onPress={() =>
                              setNoteForm((current) => ({
                                ...current,
                                studentId: String(student.id),
                              }))
                            }
                            style={[
                              styles.chip,
                              selected && styles.selectedChip,
                            ]}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                selected && styles.selectedChipText,
                              ]}
                            >
                              {student.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>
                ) : null}
                <TextInput
                  onChangeText={(title) =>
                    setNoteForm((current) => ({ ...current, title }))
                  }
                  placeholder="Title"
                  style={styles.input}
                  value={noteForm.title}
                />
                <TextInput
                  multiline
                  onChangeText={(content) =>
                    setNoteForm((current) => ({ ...current, content }))
                  }
                  placeholder="Note"
                  style={[styles.input, styles.textArea]}
                  value={noteForm.content}
                />
              </FormShell>
            ) : null}

            {createTarget === 'classActions' ? (
              <Pressable
                onPress={() => setCreateTarget(null)}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function BoardHeader({
  onBack,
  subtitle,
  title,
}: {
  onBack?: () => void;
  subtitle: string;
  title: string;
}) {
  return (
    <View style={styles.boardHeader}>
      {onBack ? (
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹</Text>
        </Pressable>
      ) : null}
      <View>
        <Text style={styles.boardTitle}>{title}</Text>
        <Text style={styles.boardSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function KeepGrid<T extends { id: number }>({
  data,
  emptyText,
  renderItem,
}: {
  data: T[];
  emptyText: string;
  renderItem: (item: T, index: number) => ReactElement;
}) {
  if (data.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    );
  }

  return (
    <FlatList
      columnWrapperStyle={styles.gridRow}
      contentContainerStyle={styles.gridContent}
      data={data}
      keyExtractor={(item) => String(item.id)}
      numColumns={2}
      renderItem={({ item, index }) => renderItem(item, index)}
      showsVerticalScrollIndicator={false}
    />
  );
}

function NoteCard({
  color,
  isPinned,
  note,
  onAttach,
  onPin,
  studentName,
}: {
  color: string;
  isPinned: boolean;
  note: NoteRecord;
  onAttach: () => void;
  onPin?: () => void;
  studentName?: string;
}) {
  return (
    <View style={[styles.keepCard, { backgroundColor: color }]}>
      <View style={styles.cardTitleRow}>
        <Text style={styles.cardTitle}>{note.title}</Text>
        {onPin ? (
          <Pressable onPress={onPin} style={styles.pinButton}>
            <Text style={styles.pinText}>{isPinned ? '★' : '☆'}</Text>
          </Pressable>
        ) : null}
      </View>
      <Text numberOfLines={6} style={styles.cardBody}>
        {note.content}
      </Text>
      {studentName ? <Text style={styles.cardMeta}>{studentName}</Text> : null}
      {note.attachments?.length ? (
        <Text style={styles.cardMeta}>{note.attachments.length} attachment(s)</Text>
      ) : null}
      <View style={styles.noteFooter}>
        <Text style={styles.cardMeta}>{formatDate(note.createdAt)}</Text>
        <Pressable onPress={onAttach} style={styles.attachButton}>
          <Text style={styles.attachButtonText}>＋ media</Text>
        </Pressable>
      </View>
    </View>
  );
}

function FormShell({
  busy,
  children,
  onCancel,
  onSubmit,
  submitLabel,
  title,
}: {
  busy: boolean;
  children: ReactNode;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
  title: string;
}) {
  return (
    <>
      <Text style={styles.modalTitle}>{title}</Text>
      {children}
      <View style={styles.formActions}>
        <Pressable onPress={onCancel} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={onSubmit}
          style={[styles.primaryButton, styles.formSubmit, busy && styles.disabled]}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>{submitLabel}</Text>
          )}
        </Pressable>
      </View>
    </>
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
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={open}>
      <Pressable onPress={onClose} style={styles.drawerBackdrop}>
        <Pressable style={styles.drawerPanel}>
          <Text style={styles.drawerTitle}>Students</Text>
          {students.length === 0 ? (
            <Text style={styles.drawerEmpty}>No students yet.</Text>
          ) : (
            students.map((student) => (
              <Pressable
                key={student.id}
                onPress={() => onOpenStudent(student.id)}
                style={styles.studentRow}
              >
                <Text style={styles.studentName}>{student.name}</Text>
                {student.rollNumber ? (
                  <Text style={styles.studentMeta}>{student.rollNumber}</Text>
                ) : null}
              </Pressable>
            ))
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function noteMatchesQuery(note: NoteRecord, query: string) {
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

function sortNewest(a: NoteRecord, b: NoteRecord) {
  return (
    new Date(b.createdAt || b.updatedAt || 0).getTime() -
    new Date(a.createdAt || a.updatedAt || 0).getTime()
  );
}

async function assertJson(response: Response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data.message === 'string' ? data.message : 'Request failed.';
    throw new Error(message);
  }

  return data;
}

function showError(error: unknown) {
  Alert.alert('Something went wrong', error instanceof Error ? error.message : 'Try again.');
}

const styles = StyleSheet.create({
  actionRow: {
    borderBottomColor: '#eceff1',
    borderBottomWidth: 1,
    paddingVertical: 18,
  },
  actionText: {
    color: '#202124',
    fontSize: 18,
    fontWeight: '600',
  },
  appHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  attachButton: {
    backgroundColor: 'rgba(255,255,255,0.48)',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  attachButtonText: {
    color: '#303134',
    fontSize: 12,
    fontWeight: '600',
  },
  authPanel: {
    gap: 12,
    padding: 24,
    width: '100%',
  },
  authScreen: {
    backgroundColor: '#fff',
    flex: 1,
    justifyContent: 'center',
  },
  authTitle: {
    color: '#202124',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  backButton: {
    alignItems: 'center',
    height: 34,
    justifyContent: 'center',
    width: 28,
  },
  backButtonText: {
    color: '#3c4043',
    fontSize: 34,
  },
  boardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  boardSubtitle: {
    color: '#6f7478',
    fontSize: 13,
    marginTop: 2,
  },
  boardTitle: {
    color: '#202124',
    fontSize: 28,
    fontWeight: '700',
  },
  brand: {
    color: '#202124',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0,
  },
  cardBody: {
    color: '#3c4043',
    fontSize: 15,
    lineHeight: 21,
    marginTop: 10,
  },
  cardMeta: {
    color: '#5f6368',
    fontSize: 12,
    marginTop: 10,
  },
  cardTitle: {
    color: '#202124',
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
  },
  cardTitleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    borderColor: '#dfe3e7',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    color: '#3c4043',
    fontSize: 14,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.6,
  },
  drawerBackdrop: {
    backgroundColor: 'rgba(32,33,36,0.28)',
    flex: 1,
  },
  drawerEmpty: {
    color: '#6f7478',
    fontSize: 15,
    marginTop: 18,
  },
  drawerPanel: {
    backgroundColor: '#fff',
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 52,
    width: '78%',
  },
  drawerTitle: {
    color: '#202124',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 14,
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    color: '#6f7478',
    fontSize: 16,
    textAlign: 'center',
  },
  fab: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 32,
    bottom: 24,
    elevation: 5,
    height: 64,
    justifyContent: 'center',
    position: 'absolute',
    right: 24,
    shadowColor: '#000',
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    width: 64,
  },
  fabText: {
    color: '#4285F4',
    fontSize: 38,
    lineHeight: 42,
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  formSubmit: {
    flex: 1,
  },
  gridContent: {
    paddingBottom: 112,
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  gridRow: {
    alignItems: 'flex-start',
  },
  iconButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 38,
  },
  iconText: {
    color: '#5f6368',
    fontSize: 26,
  },
  input: {
    backgroundColor: '#fff',
    borderColor: '#dfe3e7',
    borderRadius: 8,
    borderWidth: 1,
    color: '#202124',
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  keepCard: {
    borderRadius: 8,
    flex: 1,
    margin: 6,
    minHeight: 132,
    padding: 16,
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  linkText: {
    color: '#2f6f55',
    fontSize: 15,
    fontWeight: '600',
  },
  loadingStrip: {
    alignItems: 'center',
    paddingTop: 8,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(32,33,36,0.28)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalPanel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: 12,
    padding: 20,
  },
  modalTitle: {
    color: '#202124',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  noteFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  pinButton: {
    alignItems: 'center',
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  pinText: {
    color: '#3c4043',
    fontSize: 20,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#202124',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  screen: {
    backgroundColor: '#fff',
    flex: 1,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderColor: '#eceff1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#202124',
    elevation: 2,
    flex: 1,
    fontSize: 18,
    height: 52,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#dfe3e7',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  secondaryButtonText: {
    color: '#3c4043',
    fontSize: 16,
    fontWeight: '700',
  },
  selectedChip: {
    backgroundColor: '#202124',
    borderColor: '#202124',
  },
  selectedChipText: {
    color: '#fff',
  },
  studentChips: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  studentMeta: {
    color: '#80868b',
    fontSize: 12,
    marginTop: 3,
  },
  studentName: {
    color: '#202124',
    fontSize: 17,
    fontWeight: '600',
  },
  studentRow: {
    borderBottomColor: '#eceff1',
    borderBottomWidth: 1,
    paddingVertical: 15,
  },
  textArea: {
    minHeight: 112,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
});
