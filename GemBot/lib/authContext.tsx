import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'dietguru_session';

export type Session = {
  access_token: string;
  user_id: string;
  email?: string;
};

type AuthContextType = {
  session: Session | null;
  isGuest: boolean;
  loading: boolean;
  setSession: (session: Session | null) => Promise<void>;
  continueAsGuest: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  isGuest: false,
  loading: true,
  setSession: async () => {},
  continueAsGuest: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  // Restore persisted session on app start
  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(SESSION_KEY);
        if (raw) {
          setSessionState(JSON.parse(raw));
        }
      } catch {
        // corrupt / missing — treat as logged out
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setSession = async (newSession: Session | null) => {
    setSessionState(newSession);
    setIsGuest(false);
    if (newSession) {
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(newSession));
    } else {
      await SecureStore.deleteItemAsync(SESSION_KEY);
    }
  };

  const continueAsGuest = () => {
    setIsGuest(true);
  };

  const signOut = async () => {
    await setSession(null);
    setIsGuest(false);
  };

  return (
    <AuthContext.Provider value={{ session, isGuest, loading, setSession, continueAsGuest, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
