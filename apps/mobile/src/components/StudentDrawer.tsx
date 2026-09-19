import { Modal, Pressable, Text } from 'react-native';

import { styles } from '../styles/styles';
import type { StudentRecord } from '../types/models';

export function StudentDrawer({
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
