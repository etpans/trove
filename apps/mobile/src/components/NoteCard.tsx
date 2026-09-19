import { Linking, Pressable, Text, View } from 'react-native';

import { styles } from '../styles/styles';
import type { NoteRecord } from '../types/models';
import { formatDate } from '../utils/date';

function attachmentLabel(fileUrl: string, fileType: string, caption?: string | null) {
  if (caption) {
    return caption;
  }

  const filename = fileUrl.split('/').pop();
  return filename || fileType || 'Attachment';
}

export function NoteCard({
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
      {note.attachments?.map((attachment) => (
        <View key={attachment.id} style={styles.attachmentRow}>
          <Text numberOfLines={1} style={styles.attachmentLabel}>
            {attachmentLabel(
              attachment.fileUrl,
              attachment.fileType,
              attachment.caption,
            )}
          </Text>
          <Pressable
            onPress={() => Linking.openURL(attachment.fileUrl)}
            style={styles.attachmentAction}
          >
            <Text style={styles.attachButtonText}>Open</Text>
          </Pressable>
        </View>
      ))}
      <View style={styles.noteFooter}>
        <Text style={styles.cardMeta}>{formatDate(note.createdAt)}</Text>
        <Pressable onPress={onAttach} style={styles.attachButton}>
          <Text style={styles.attachButtonText}>+ media</Text>
        </Pressable>
      </View>
    </View>
  );
}
