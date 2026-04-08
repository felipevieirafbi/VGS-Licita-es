import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { toast } from 'sonner';

export const isInIframe = () => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
};

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
    // Captura o resultado do redirecionamento para tratar erros
    getRedirectResult(auth).then((result) => {
      if (result) {
        toast.success('Login realizado com sucesso!');
      }
    }).catch((error) => {
      console.error("Error getting redirect result", error);
      if (error.code === 'auth/unauthorized-domain') {
        toast.error('Domínio não autorizado no Firebase. Verifique as configurações.');
      } else {
        toast.error(`Erro ao fazer login: ${error.message}`);
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
    
    if (isInIframe()) {
      toast.error('O login do Google é bloqueado nesta visualização. Clique no botão amarelo para abrir em uma nova aba.');
      return;
    }

    setIsAuthenticating(true);
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Login realizado com sucesso!');
      setIsAuthenticating(false);
    } catch (error: any) {
      console.error("Popup failed, trying redirect...", error);
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (redirectError: any) {
        console.error("Redirect failed", redirectError);
        toast.error(`Erro ao iniciar login: ${redirectError.message}`);
        setIsAuthenticating(false);
      }
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
