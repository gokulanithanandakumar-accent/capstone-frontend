import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { login as loginRequest } from '../api/authApi';
import { clearSession, readSession, writeSession } from './session';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readSession());

  const login = useCallback(async (email, password) => {
    const response = await loginRequest(email, password);
    const newSession = {
      accessToken: response.accessToken,
      expiresAt: response.expiresAt,
      customer: {
        customerId: response.customerId,
        fullName: response.fullName,
        email: response.email,
      },
    };
    writeSession(newSession);
    setSession(newSession);
    return newSession;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(session?.accessToken),
      customer: session?.customer ?? null,
      login,
      logout,
    }),
    [session, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
