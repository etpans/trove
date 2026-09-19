import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ApiClient } from './src/api/client';
import {
  clearStoredTokens,
  readStoredTokens,
  writeStoredTokens,
} from './src/api/session';
import { BoardHeader } from './src/components/BoardHeader';
import { FormShell } from './src/components/FormShell';
import { KeepGrid } from './src/components/KeepGrid';
import { NoteCard } from './src/components/NoteCard';
import { StudentDrawer } from './src/components/StudentDrawer';
import { styles } from './src/styles/styles';
import type {
  AuthForm,
  AuthMode,
  AuthTokens,
  ClassForm,
  ClassRecord,
  CreateTarget,
  NoteForm,
  NoteRecord,
  Screen,
  StudentForm,
  StudentRecord,
} from './src/types/models';
import { getCardColor } from './src/utils/colors';
import { formatDate, todayInputValue } from './src/utils/date';
import { includesQuery, noteMatchesQuery, sortNewest } from './src/utils/notes';

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

export default function App() {
  const tokenRef = useRef<AuthTokens | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authForm, setAuthForm] = useState<AuthForm>(initialAuthForm);
  const [tokens, setTokensState] = useState<AuthTokens | null>(null);
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
  const [restoringSession, setRestoringSession] = useState(true);
  const [pinnedNoteIds, setPinnedNoteIds] = useState<number[]>([]);

  function setTokens(nextTokens: AuthTokens | null) {
    tokenRef.current = nextTokens;
    setTokensState(nextTokens);
    if (nextTokens) {
      void writeStoredTokens(nextTokens);
    } else {
      void clearStoredTokens();
    }
  }

  const api = useMemo(
    () =>
      new ApiClient({
        getTokens: () => tokenRef.current,
        onSessionExpired: () => {
          setTokens(null);
          Alert.alert('Session expired', 'Please log in again.');
        },
        onTokens: setTokens,
      }),
    [],
  );

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

  useEffect(() => {
    async function restoreSession() {
      try {
        const stored = await readStoredTokens();
        if (stored) {
          tokenRef.current = stored;
          setTokensState(stored);
          await refreshData();
        }
      } catch (error) {
        showError(error);
        setTokens(null);
      } finally {
        setRestoringSession(false);
      }
    }

    void restoreSession();
  }, []);

  async function refreshData() {
    if (!tokenRef.current) {
      return;
    }

    setLoadingData(true);
    try {
      const [nextClasses, nextStudents, nextNotes] = await Promise.all([
        api.listClasses(),
        api.listStudents(),
        api.listNotes(),
      ]);

      setClasses(nextClasses);
      setStudents(nextStudents);
      setNotes(nextNotes);
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
        await api.register(
          authForm.displayName,
          authForm.email,
          authForm.password,
        );
        Alert.alert('Verify email', 'Check your email, then log in.');
        setAuthMode('login');
        return;
      }

      const nextTokens = await api.login(authForm.email, authForm.password);
      setTokens(nextTokens);
      setScreen('home');
      setQuery('');
      await refreshData();
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setTokens(null);
    setClasses([]);
    setStudents([]);
    setNotes([]);
    setSelectedClassId(null);
    setSelectedStudentId(null);
    setScreen('home');
    setQuery('');
  }

  async function createClass() {
    setBusy(true);
    try {
      const created = await api.createClass({
        color: getCardColor(classes.length),
        name: classForm.name,
        session: classForm.session,
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
      const created = await api.createStudent({
        classId: selectedClassId,
        name: studentForm.name,
        rollNumber: studentForm.rollNumber || undefined,
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
      const created = await api.createNote({
        content: noteForm.content,
        studentId,
        title: noteForm.title,
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
    Alert.alert('Add attachment', 'Choose a source.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Camera',
        onPress: () => {
          void pickAndUploadAttachment(noteId, 'camera');
        },
      },
      {
        text: 'Library',
        onPress: () => {
          void pickAndUploadAttachment(noteId, 'library');
        },
      },
    ]);
  }

  async function pickAndUploadAttachment(
    noteId: number,
    source: 'camera' | 'library',
  ) {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow access to attach media.');
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({
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
      await api.uploadAttachment(noteId, formData);
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

  if (restoringSession) {
    return (
      <SafeAreaView style={styles.authScreen}>
        <StatusBar style="dark" />
        <ActivityIndicator color="#202124" />
      </SafeAreaView>
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
          onPress={() => (screen === 'home' ? undefined : setDrawerOpen(true))}
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
        <Pressable onPress={() => void refreshData()} style={styles.iconButton}>
          <Text style={styles.iconText}>↻</Text>
        </Pressable>
        <Pressable onPress={() => void logout()} style={styles.iconButton}>
          <Text style={styles.iconText}>×</Text>
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
              onAttach={() => void attachMedia(item.id)}
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
              onAttach={() => void attachMedia(item.id)}
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

function showError(error: unknown) {
  Alert.alert(
    'Something went wrong',
    error instanceof Error ? error.message : 'Try again.',
  );
}
