import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, firebaseReady } from "./firebase";
import type { StudentProfile } from "./types";

interface RegistrationData {
  name: string;
  email: string;
  mobile: string;
  password: string;
  aadhaarLast4: string;
  address: string;
}

interface AuthContextValue {
  user: User | null;
  profile: StudentProfile | null;
  isAdmin: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegistrationData) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!auth || !db || !auth.currentUser) {
      setProfile(null);
      setIsAdmin(false);
      return;
    }

    const currentUser = auth.currentUser;
    const token = await currentUser.getIdTokenResult();
    const admin = token.claims.admin === true;
    setIsAdmin(admin);
    if (admin) {
      setProfile(null);
      return;
    }

    const snapshot = await getDoc(doc(db, "students", currentUser.uid));
    setProfile(snapshot.exists() ? (snapshot.data() as StudentProfile) : null);
  };

  useEffect(() => {
    const firestore = db;
    if (!auth || !firestore) {
      setLoading(false);
      return;
    }
    let revision = 0;
    let unsubscribeProfile: (() => void) | undefined;
    const unsubscribeAuth = onIdTokenChanged(auth, async (nextUser) => {
      const currentRevision = ++revision;
      unsubscribeProfile?.();
      unsubscribeProfile = undefined;
      setUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const token = await nextUser.getIdTokenResult();
        if (revision !== currentRevision) return;
        const admin = token.claims.admin === true;
        setIsAdmin(admin);
        if (admin) {
          setProfile(null);
          setLoading(false);
          return;
        }

        unsubscribeProfile = onSnapshot(
          doc(firestore, "students", nextUser.uid),
          (snapshot) => {
            if (revision !== currentRevision) return;
            setProfile(snapshot.exists() ? (snapshot.data() as StudentProfile) : null);
            setLoading(false);
          },
          (error) => {
            if (revision !== currentRevision) return;
            console.error("Unable to subscribe to account details", error);
            setProfile(null);
            setLoading(false);
          },
        );
      } catch (error) {
        if (revision !== currentRevision) return;
        console.error("Unable to load account details", error);
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });
    return () => {
      revision++;
      unsubscribeProfile?.();
      unsubscribeAuth();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      isAdmin,
      loading,
      refreshProfile,
      login: async (email, password) => {
        if (!auth) throw new Error("Firebase is not configured.");
        await signInWithEmailAndPassword(auth, email, password);
      },
      register: async (data) => {
        const firebaseAuth = auth;
        const firestore = db;
        if (!firebaseAuth || !firestore) throw new Error("Firebase is not configured.");
        const credential = await createUserWithEmailAndPassword(firebaseAuth, data.email, data.password);
        try {
          await setDoc(doc(firestore, "students", credential.user.uid), {
            uid: credential.user.uid,
            name: data.name.trim(),
            email: credential.user.email ?? data.email.trim(),
            mobile: data.mobile.trim(),
            aadhaarLast4: data.aadhaarLast4,
            address: data.address.trim(),
            role: "student",
            status: "pending",
            createdAt: serverTimestamp(),
          });
        } catch (profileError) {
          try {
            await deleteUser(credential.user);
          } catch (cleanupError) {
            console.error("Unable to remove account after profile creation failed", cleanupError);
            throw new Error("Registration could not be completed and the new account could not be removed. Contact an administrator.");
          }
          throw profileError;
        }
      },
      logout: async () => {
        if (!auth) return;
        await signOut(auth);
      },
    }),
    [user, profile, isAdmin, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}

export function useFirebaseReady() {
  return firebaseReady;
}
