import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Colors, FontFamily } from '../../constants/theme';

// Chat icon — two stacked lines inside a rounded rect (speech bubble shape)
function ChatIcon({ focused }: { focused: boolean }) {
  const c = focused ? Colors.primary : Colors.muted;
  return (
    <View style={styles.iconWrap}>
      <View style={[styles.bubble, { borderColor: c }]}>
        <View style={[styles.bubbleLine, { backgroundColor: c }]} />
        <View style={[styles.bubbleLineShort, { backgroundColor: c }]} />
      </View>
      <View style={[styles.bubbleTail, { borderTopColor: c }]} />
    </View>
  );
}

// Profile icon — circle head + rounded shoulders
function ProfileIcon({ focused }: { focused: boolean }) {
  const c = focused ? Colors.primary : Colors.muted;
  return (
    <View style={styles.iconWrap}>
      <View style={[styles.profileHead, { borderColor: c }]} />
      <View style={[styles.profileBody, { borderColor: c }]} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.muted,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chat',
          tabBarIcon: ({ focused }) => <ChatIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <ProfileIcon focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabLabel: {
    fontFamily: FontFamily.dmSansMedium,
    fontSize: 11,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
  },
  // Chat bubble
  bubble:         { width: 22, height: 16, borderRadius: 5, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 3 },
  bubbleLine:     { width: 12, height: 1.5, borderRadius: 1 },
  bubbleLineShort:{ width: 8, height: 1.5, borderRadius: 1 },
  bubbleTail:     { width: 0, height: 0, borderLeftWidth: 4, borderRightWidth: 0, borderTopWidth: 4, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -1, marginLeft: -8 },
  // Profile
  profileHead:    { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5 },
  profileBody:    { width: 18, height: 9, borderTopLeftRadius: 9, borderTopRightRadius: 9, borderWidth: 1.5, borderBottomWidth: 0, marginTop: 2 },
});
