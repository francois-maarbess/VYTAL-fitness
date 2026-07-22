import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  message: Message;
}

export function ChatBubble({ message }: Props) {
  const colors = useColors();
  const isUser = message.role === 'user';

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: `${colors.primary}22`, borderColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>A</Text>
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser
            ? { backgroundColor: colors.primary, borderRadius: 18, borderBottomRightRadius: 4 }
            : { backgroundColor: colors.card, borderRadius: 18, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
          { maxWidth: '75%' },
        ]}
      >
        <Text
          style={[
            styles.text,
            { color: isUser ? colors.primaryForeground : colors.foreground },
          ]}
        >
          {message.content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
    paddingHorizontal: 16,
    gap: 8,
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAssistant: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  text: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
});
