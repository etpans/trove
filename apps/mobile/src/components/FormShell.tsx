import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { styles } from '../styles/styles';

export function FormShell({
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
