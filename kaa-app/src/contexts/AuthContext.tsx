/**
 * Auth Context
 * Provides authentication state and actions throughout the app.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import {
  User,
  UserProfile,
  RegisterInput,
  LoginInput,
  register as apiRegister,
  login as apiLogin,
  logout as apiLogout,
  getProfile as apiGetProfile,
  refreshToken as apiRefreshToken,
  getStoredToken,
  getStoredUser,
  isAuthenticated as checkIsAuthenticated,
  isAdmin as checkIsAdmin,
} from '../api/authApi';

// ============================================================================
// TYPES
// ============================================================================

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  error: string | null;
}

interface AuthActions {
  register: (input: RegisterInput) => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

type AuthContextValue = AuthState & AuthActions;

// ============================================================================
// CONTEXT
// ============================================================================

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derived state
  const isAuthenticated = !!user && !!getStoredToken();
  const isAdmin = user?.userType === 'ADMIN' || user?.userType === 'TEAM';

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = getStoredToken();
      const storedUser = getStoredUser();

      if (token && storedUser) {
        setUser(storedUser);
        try {
          // Fetch fresh profile
          const freshProfile = await apiGetProfile();
          setProfile(freshProfile);
        } catch (err) {
          // Token might be expired, try to refresh
          try {
            const refreshed = await apiRefreshToken();
            setUser(refreshed.user);
            const freshProfile = await apiGetProfile();
            setProfile(freshProfile);
          } catch {
            // Refresh failed, clear auth
            setUser(null);
            setProfile(null);
          }
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Register action
  const register = useCallback(async (input: RegisterInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiRegister(input);
      setUser(result.user);
      
      // Fetch full profile
      const fullProfile = await apiGetProfile();
      setProfile(fullProfile);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login action
  const login = useCallback(async (input: LoginInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiLogin(input);
      setUser(result.user);
      
      // Fetch full profile
      const fullProfile = await apiGetProfile();
      setProfile(fullProfile);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout action
  const logout = useCallback(async () => {
    setIsLoading(true);

    try {
      await apiLogout();
    } finally {
      setUser(null);
      setProfile(null);
      setIsLoading(false);
    }
  }, []);

  // Refresh profile action
  const refreshProfile = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const freshProfile = await apiGetProfile();
      setProfile(freshProfile);
      
      // Update user from profile
      setUser({
        id: freshProfile.id,
        email: freshProfile.email || '',
        userType: freshProfile.userType,
        tier: freshProfile.tier,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh profile';
      setError(message);
    }
  }, [isAuthenticated]);

  // Clear error action
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Memoize context value
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      isLoading,
      isAuthenticated,
      isAdmin,
      error,
      register,
      login,
      logout,
      refreshProfile,
      clearError,
    }),
    [
      user,
      profile,
      isLoading,
      isAuthenticated,
      isAdmin,
      error,
      register,
      login,
      logout,
      refreshProfile,
      clearError,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

interface RequireAuthProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component that only renders children if user is authenticated.
 */
export function RequireAuth({ children, fallback = null }: RequireAuthProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="auth-loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface RequireAdminProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component that only renders children if user is admin.
 */
export function RequireAdmin({ children, fallback = null }: RequireAdminProps) {
  const { isAdmin, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <div className="auth-loading">Loading...</div>;
  }

  if (!isAuthenticated || !isAdmin) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface RequireTierProps {
  tier: number;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component that only renders children if user has required tier.
 */
export function RequireTier({ tier, children, fallback = null }: RequireTierProps) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <div className="auth-loading">Loading...</div>;
  }

  if (!isAuthenticated || !user?.tier || user.tier < tier) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
