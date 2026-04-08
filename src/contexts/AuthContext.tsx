import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { toast } from 'sonner';

interface UserData {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  avatar_url: string;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  isAuthenticating: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    // Handle redirect result from Google Sign-In
    getRedirectResult(auth).catch((error) => {
      console.error("Error from redirect sign-in", error);
      if (error.code === 'auth/unauthorized-domain') {
        toast.error('Domínio não autorizado para login. Verifique as configurações do Firebase.');
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch or create user document
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserData);
        } else {
          // Determine if first user (admin) or regular user
          const role = currentUser.email === 'felipe.vieira.consultoria@gmail.com' ? 'admin' : 'user';
          const newUserData: UserData = {
            uid: currentUser.uid,
            name: currentUser.displayName || 'User',
            email: currentUser.email || '',
            role,
            avatar_url: currentUser.photoURL || '',
          };
          await setDoc(userDocRef, newUserData);
          setUserData(newUserData);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (error: any) {
      console.error("Error signing in with Google", error);
      if (error.code === 'auth/unauthorized-domain') {
        toast.error('Domínio não autorizado. Verifique as configurações do Firebase.');
      } else {
        toast.error(`Erro ao iniciar login: ${error.message}`);
      }
      setIsAuthenticating(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    toast.success('Você saiu da conta.');
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, isAuthenticating, signInWithGoogle, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
