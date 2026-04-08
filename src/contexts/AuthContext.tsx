import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
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

// Detect if running inside an iframe (e.g. AI Studio preview)
function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    // Handle redirect result from Google Sign-In (for redirect flow)
    getRedirectResult(auth).then((result) => {
      if (result) {
        toast.success('Login realizado com sucesso!');
      }
    }).catch((error) => {
      console.error("Error from redirect sign-in", error);
      if (error.code === 'auth/unauthorized-domain') {
        toast.error('Dominio nao autorizado no Firebase. Verifique as configuracoes.');
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserData);
        } else {
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

    // If inside an iframe (AI Studio preview), auth won't work - guide the user
    if (isInIframe()) {
      toast.error(
        'Login com Google nao funciona no preview embutido. Clique no botao "Abrir em nova aba" no canto superior do preview, ou faca deploy do app.',
        { duration: 8000 }
      );
      setIsAuthenticating(false);
      return;
    }

    try {
      // Try popup first (better UX, works in most environments)
      await signInWithPopup(auth, googleProvider);
      toast.success('Login realizado com sucesso!');
    } catch (popupError: any) {
      console.warn("Popup sign-in failed, trying redirect...", popupError.code);

      if (popupError.code === 'auth/popup-closed-by-user' ||
          popupError.code === 'auth/popup-blocked' ||
          popupError.code === 'auth/cancelled-popup-request') {
        // Popup didn't work, fall back to redirect
        try {
          await signInWithRedirect(auth, googleProvider);
          return; // Page will redirect, no need to reset state
        } catch (redirectError: any) {
          console.error("Redirect sign-in also failed", redirectError);
          toast.error('Erro ao fazer login. Tente abrir o app em uma nova aba do navegador.');
        }
      } else if (popupError.code === 'auth/unauthorized-domain') {
        toast.error('Dominio nao autorizado. Adicione este dominio nas configuracoes do Firebase Auth.');
      } else if (popupError.code === 'auth/network-request-failed') {
        toast.error('Erro de rede. Verifique sua conexao, desative bloqueadores de anuncios ou abra o app em nova aba.');
      } else {
        toast.error(`Erro ao fazer login: ${popupError.message}`);
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    toast.success('Voce saiu da conta.');
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
