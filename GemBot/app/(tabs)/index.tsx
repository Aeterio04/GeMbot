import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, SafeAreaView, KeyboardAvoidingView,
  Platform, Animated,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { sendMessage } from '../../lib/api';
import { Colors, FontFamily } from '../../constants/theme';
import { useAuth } from '../../lib/authContext';

// ─── Types ────────────────────────────────────────────────────────────────────
type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

// ─── Welcome message ──────────────────────────────────────────────────────────
const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content: "Welcome to GemBot. I'm your AI skin-diet coach. Ask me anything about how your food choices affect your skin, and I'll help connect the dots. What's on your mind today?",
  timestamp: new Date(),
};

// ─── Typing Indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bounce = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -7, duration: 280, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 280, useNativeDriver: true }),
          Animated.delay(300),
        ])
      );

    const a1 = bounce(dot1, 0);
    const a2 = bounce(dot2, 140);
    const a3 = bounce(dot3, 280);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={styles.typingRow}>
      <View style={styles.botAvatar}><Text style={styles.botAvatarText}>GB</Text></View>
      <View style={styles.typingDots}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View key={i} style={[styles.dot, { transform: [{ translateY: dot }] }]} />
        ))}
      </View>
    </View>
  );
}

// ─── Message Item ─────────────────────────────────────────────────────────────
function MessageItem({ item }: { item: Message }) {
  const isUser = item.role === 'user';
  const time = item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  // Run entrance animation on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (isUser) {
    return (
      <Animated.View style={[styles.userRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.userBlockquote}>
          <Text style={styles.userText}>{item.content}</Text>
        </View>
        <Text style={styles.timestampRight}>{time}</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.botRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.botAvatar}><Text style={styles.botAvatarText}>GB</Text></View>
      <View style={styles.botContent}>
        <Text style={styles.botText}>{item.content}</Text>
        <Text style={styles.timestampLeft}>{time}</Text>
      </View>
    </Animated.View>
  );
}

// ─── User Avatar Popout ───────────────────────────────────────────────────────
function UserPopout({ name, email }: { name: string; email: string }) {
  return (
    <View style={styles.popout}>
      <Text style={styles.popoutName}>{name}</Text>
      {email ? <Text style={styles.popoutEmail}>{email}</Text> : null}
    </View>
  );
}

// ─── Main Chat Screen ─────────────────────────────────────────────────────────
export default function ChatScreen() {
  const { session } = useAuth();
  
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showPopout, setShowPopout] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Derived user details from Auth session
  const userEmail = session?.email || '';
  const userInitials = userEmail ? userEmail.substring(0, 2).toUpperCase() : 'HU';
  const userName = userEmail ? userEmail.split('@')[0] : 'Healthy User';

  // Close popout on outside press
  const dismissPopout = () => { if (showPopout) setShowPopout(false); };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [userMsg, ...prev]);
    const messageToSend = input.trim();
    setInput('');
    setIsTyping(true);

    try {
      const data = await sendMessage(messageToSend, session?.access_token ?? '');

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply ?? "Sorry, I couldn't respond to that.",
        timestamp: new Date(),
      };
      setMessages((prev) => [botMsg, ...prev]);
    } catch (e: any) {
      setMessages((prev) => [{
        id: 'err-' + Date.now(),
        role: 'assistant',
        content: 'Error: ' + (e?.message || 'Something went wrong. Please check your connection and try again.'),
        timestamp: new Date(),
      }, ...prev]);
    } finally {
      setIsTyping(false);
    }
  };

  const listData = isTyping
    ? [{ id: '__typing__', role: 'typing', content: '', timestamp: new Date() } as any, ...messages]
    : messages;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.botAvatarSmall}><Text style={styles.botAvatarText}>GB</Text></View>
        <Text style={styles.topBarTitle}>GemBot</Text>
        <TouchableOpacity
          style={styles.userAvatarSmall}
          onPress={() => setShowPopout((v) => !v)}
          activeOpacity={0.8}
        >
          <Text style={styles.userAvatarText}>{userInitials}</Text>
        </TouchableOpacity>
      </View>

      {/* User Popout */}
      {showPopout && <UserPopout name={userName} email={userEmail} />}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={listData}
          inverted
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={dismissPopout}
          renderItem={({ item }) =>
            item.role === 'typing'
              ? <TypingIndicator />
              : <MessageItem item={item} />
          }
        />

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.micBtn} activeOpacity={0.7}>
            <View style={styles.micBody} />
            <View style={styles.micStand} />
          </TouchableOpacity>

          <TextInput
            style={styles.inputField}
            placeholder="Ask about your skin & diet..."
            placeholderTextColor={Colors.muted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            onFocus={dismissPopout}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            autoFocus
          />

          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || isTyping) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || isTyping}
            activeOpacity={0.8}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Top Bar
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  botAvatarSmall: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  botAvatarText: { color: '#fff', fontFamily: FontFamily.dmSansSemiBold, fontSize: 12 },
  topBarTitle: { fontFamily: FontFamily.dmSansSemiBold, fontSize: 16, color: Colors.text },
  userAvatarSmall: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.text,
    alignItems: 'center', justifyContent: 'center',
  },
  userAvatarText: { color: '#fff', fontFamily: FontFamily.dmSansSemiBold, fontSize: 12 },

  // Popout
  popout: {
    position: 'absolute', top: 60, right: 16, zIndex: 999,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, padding: 14,
    minWidth: 160,
  },
  popoutName: { fontFamily: FontFamily.dmSansSemiBold, fontSize: 14, color: Colors.text },
  popoutEmail: { fontFamily: FontFamily.dmSans, fontSize: 12, color: Colors.muted, marginTop: 2 },

  // Messages
  listContent: { paddingHorizontal: 16, paddingVertical: 12 },

  // Bot message
  botRow: { flexDirection: 'row', marginBottom: 20, alignItems: 'flex-start' },
  botAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10, marginTop: 2,
  },
  botContent: { flex: 1 },
  botText: {
    fontFamily: FontFamily.dmMono,
    fontSize: 14, color: Colors.text, lineHeight: 22,
  },
  timestampLeft: {
    fontFamily: FontFamily.dmSans,
    fontSize: 11, color: Colors.muted, marginTop: 5,
  },

  // User message — blockquote style, NO bubble
  userRow: { alignItems: 'flex-end', marginBottom: 20 },
  userBlockquote: {
    borderLeftWidth: 2,
    borderLeftColor: Colors.accent,
    paddingLeft: 12,
    alignSelf: 'flex-end',
    maxWidth: '80%',
  },
  userText: {
    fontFamily: FontFamily.dmSans,
    fontSize: 15, color: Colors.text, lineHeight: 23,
  },
  timestampRight: {
    fontFamily: FontFamily.dmSans,
    fontSize: 11, color: Colors.muted, marginTop: 5,
  },

  // Typing indicator
  typingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  typingDots: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 10, height: 32 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
    gap: 8,
  },
  micBtn: { padding: 4, alignItems: 'center', justifyContent: 'center', width: 28, height: 28 },
  micBody:  { width: 10, height: 16, borderRadius: 5, borderWidth: 1.5, borderColor: Colors.muted, position: 'absolute', top: 0 },
  micStand: { width: 16, height: 8, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, borderWidth: 1.5, borderColor: Colors.muted, borderTopWidth: 0, position: 'absolute', bottom: 0 },
  inputField: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 999,
    paddingHorizontal: 18, paddingVertical: 10,
    fontFamily: FontFamily.dmSans,
    fontSize: 14, color: Colors.text,
    maxHeight: 100,
    borderWidth: 1, borderColor: Colors.border,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.border },
  sendIcon: { color: '#fff', fontSize: 20, fontWeight: '600' },
});
