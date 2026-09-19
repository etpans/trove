import type { ReactElement } from 'react';
import { FlatList, Text, View } from 'react-native';

import { styles } from '../styles/styles';

export function KeepGrid<T extends { id: number }>({
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
