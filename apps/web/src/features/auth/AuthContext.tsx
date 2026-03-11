import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { User } from '@budget-tracker/shared-types';
import { api, setTokens, clearTokens, getAccessToken } from '@/services/api';
import { bootstrapLocalData, clearAllLocalData } from '@/storage';

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

const USER_KEY = 'bt_user';

function getStoredUser(): AuthUser | null {
  try {
    const stored = localStorage.getItem(USER_KEY);
    if (stored) {
      return JSON.parse(stored) as AuthUser;
    }
  } catch {
    // Corrupt stored user data
  }
  return null;
}

function storeUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearStoredUser(): void {
  localStorage.removeItem(USER_KEY);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const token = getAccessToken();
    const storedUser = getStoredUser();

    if (token && storedUser) {
      setUser(storedUser);
      // Validate token by fetching profile
      api
        .get<Pick<User, 'id' | 'email' | 'displayName' | 'isAdmin'>>('/api/users/me')
        .then((profile) => {
          const authUser: AuthUser = {
            id: profile.id,
            email: profile.email,
            displayName: profile.displayName,
            isAdmin: profile.isAdmin ?? false,
          };
          setUser(authUser);
          storeUser(authUser);
        })
        .catch(() => {
          // Token invalid - clear everything
          setUser(null);
          clearTokens();
          clearStoredUser();
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.login({ email, password });
    setTokens(response.accessToken, response.refreshToken);
    const authUser: AuthUser = {
      id: response.user.id,
      email: response.user.email,
      displayName: response.user.displayName,
      isAdmin: response.user.isAdmin ?? false,
    };
    storeUser(authUser);
    setUser(authUser);
    // Bootstrap local data after login
    bootstrapLocalData().catch(console.warn);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Ignore logout errors - clear local state regardless
    }
    clearTokens();
    clearStoredUser();
    await clearAllLocalData();
    setUser(null);
  }, []);

  const value: AuthState = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
