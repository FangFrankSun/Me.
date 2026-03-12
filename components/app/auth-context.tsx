import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type AuthUser = {
  id: string;
  name: string;
  email: string;
  password: string;
};

type AuthContextValue = {
  user: Omit<AuthUser, 'password'> | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  signIn: (email: string, password: string) => { ok: true } | { ok: false; error: string };
  signUp: (
    name: string,
    email: string,
    password: string
  ) => { ok: true } | { ok: false; error: string };
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Auth is intentionally memory-only until cloud auth is connected.
    setIsHydrated(true);
  }, []);

  const currentUser = useMemo(() => {
    const matched = users.find((entry) => entry.id === currentUserId);
    if (!matched) {
      return null;
    }
    const { password: _password, ...safeUser } = matched;
    return safeUser;
  }, [currentUserId, users]);

  const signIn: AuthContextValue['signIn'] = (email, password) => {
    const normalizedEmail = normalizeEmail(email);
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      return { ok: false, error: 'Email and password are required.' };
    }

    const matched = users.find(
      (entry) => entry.email.toLowerCase() === normalizedEmail && entry.password === normalizedPassword
    );

    if (!matched) {
      return { ok: false, error: 'Invalid email or password.' };
    }

    setCurrentUserId(matched.id);
    return { ok: true };
  };

  const signUp: AuthContextValue['signUp'] = (name, email, password) => {
    const normalizedName = name.trim();
    const normalizedEmail = normalizeEmail(email);
    const normalizedPassword = password.trim();

    if (!normalizedName || !normalizedEmail || !normalizedPassword) {
      return { ok: false, error: 'Name, email, and password are required.' };
    }

    const exists = users.some((entry) => entry.email.toLowerCase() === normalizedEmail);
    if (exists) {
      return { ok: false, error: 'This email already has an account.' };
    }

    const newUser: AuthUser = {
      id: `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: normalizedName,
      email: normalizedEmail,
      password: normalizedPassword,
    };

    setUsers((prev) => [...prev, newUser]);
    setCurrentUserId(newUser.id);
    return { ok: true };
  };

  const signOut = () => {
    setCurrentUserId(null);
  };

  const value: AuthContextValue = {
    user: currentUser,
    isAuthenticated: Boolean(currentUser),
    isHydrated,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }

  return context;
}
