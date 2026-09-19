import { Pressable, Text, View } from 'react-native';

import { styles } from '../styles/styles';

export function BoardHeader({
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
