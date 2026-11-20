import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import type { UserAccount, UserRole } from '../types';

interface AuthContextValue {
  user: User | null;
  profile: UserAccount | null;
  loading: boolean;
  needsRoleSelection: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  registerSelfRole: (role: 'student' | 'parent', className?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsRoleSelection, setNeedsRoleSelection] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      setUser(firebaseUser);
      setAuthError(null);

      if (!firebaseUser) {
        setProfile(null);
        setNeedsRoleSelection(false);
        setLoading(false);
        return;
      }

      const userRef = doc(db, 'users', firebaseUser.uid);
      unsubProfile = onSnapshot(
        userRef,
        async (snap) => {
          if (snap.exists()) {
            const data = snap.data() as Omit<UserAccount, 'id'>;
            setProfile({ id: snap.id, ...data });
            setNeedsRoleSelection(false);
            setLoading(false);
          } else {
            // Auto-provision bootstrapped admin on first sign-in
            if (
              firebaseUser.email === BOOTSTRAPPED_ADMIN_EMAIL &&
              firebaseUser.emailVerified
            ) {
              try {
                await setDoc(userRef, {
                  uid: firebaseUser.uid,
                  displayName: (firebaseUser.displayName || 'Principal Admin').slice(0, 120),
                  email: firebaseUser.email,
                  role: 'admin' as UserRole,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                });
              } catch (err) {
                handleFirestoreError(err, OperationType.CREATE, `users/${firebaseUser.uid}`);
              }
            } else {
              setProfile(null);
              setNeedsRoleSelection(true);
              setLoading(false);
            }
          }
        },
        (err) => {
          setLoading(false);
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google Sign-In failed.';
      setAuthError(msg);
    }
  };

  const registerSelfRole = async (role: 'student' | 'parent', className = '') => {
    if (!user || !user.email) return;
    const userRef = doc(db, 'users', user.uid);
    try {
      const payload: Record<string, unknown> = {
        uid: user.uid,
        displayName: (user.displayName || user.email.split('@')[0]).slice(0, 120),
        email: user.email.slice(0, 160),
        role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (className.trim()) {
        payload.className = className.trim().slice(0, 40);
      }
      await setDoc(userRef, payload);
      setNeedsRoleSelection(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        needsRoleSelection,
        authError,
        signInWithGoogle,
        registerSelfRole,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
