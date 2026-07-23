import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  message: Message;
}

function formatTime(): string {
  const d = new Date();
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function ChatBubble({ message }: Props) {
  const colors = useColors();
  const isUser = message.role === 'user';

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <Pressable onLongPress={handleLongPress} style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: `${colors.primary}22`, borderColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>A</Text>
        </View>
      )}
      <View style={{ maxWidth: '75%' }}>
        <View
          style={[
            styles.bubble,
            isUser
              ? { backgroundColor: colors.primary, borderRadius: 18, borderBottomRightRadius: 4 }
              : { backgroundColor: colors.card, borderRadius: 18, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
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
        <Text style={{ color: colors.mutedForeground, fontSize: 9, fontFamily: 'Inter_400Regular', marginTop: 2, marginHorizontal: 4, alignSelf: isUser ? 'flex-end' : 'flex-start' }}>
          {formatTime()}
        </Text>
      </View>
    </Pressable>
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
