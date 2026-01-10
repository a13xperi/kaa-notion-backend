/**
 * useAuth Hook
 * Authentication hook using React Query for state management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  api, 
  ENDPOINTS, 
  ApiError,
  getAuthToken,
  setAuthToken,
  removeAuthToken,
} from '../config/api';

// Types
export interface User {
  id: string;
  email: string;
  userType: 'CLIENT' | 'ADMIN' | 'TEAM';
  tier?: number;
  client?: {
    id: string;
    tier: number;
    status: string;
  };
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Query keys
export const authKeys = {
  user: ['auth', 'user'] as const,
};

/**
 * Fetch current user profile
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.user,
    queryFn: async (): Promise<User> => {
      return api.get<User>(ENDPOINTS.AUTH.ME);
    },
    enabled: !!getAuthToken(),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Login mutation
 */
export function useLogin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (credentials: LoginCredentials): Promise<AuthResponse> => {
      const response = await api.post<AuthResponse>(
        ENDPOINTS.AUTH.LOGIN, 
        credentials,
        false // Don't include auth header for login
      );
      return response;
    },
    onSuccess: (data) => {
      setAuthToken(data.token);
      queryClient.setQueryData(authKeys.user, data.user);
    },
  });
}

/**
 * Register mutation
 */
export function useRegister() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: RegisterData): Promise<AuthResponse> => {
      const response = await api.post<AuthResponse>(
        ENDPOINTS.AUTH.REGISTER,
        data,
        false // Don't include auth header for registration
      );
      return response;
    },
    onSuccess: (data) => {
      setAuthToken(data.token);
      queryClient.setQueryData(authKeys.user, data.user);
    },
  });
}

/**
 * Logout mutation
 */
export function useLogout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      try {
        await api.post(ENDPOINTS.AUTH.LOGOUT, {});
      } catch {
        // Ignore logout API errors - still clear local state
      }
    },
    onSettled: () => {
      removeAuthToken();
      queryClient.setQueryData(authKeys.user, null);
      queryClient.clear();
    },
  });
}

/**
 * Refresh token mutation
 */
export function useRefreshToken() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (): Promise<AuthResponse> => {
      return api.post<AuthResponse>(ENDPOINTS.AUTH.REFRESH, {});
    },
    onSuccess: (data) => {
      setAuthToken(data.token);
      queryClient.setQueryData(authKeys.user, data.user);
    },
    onError: () => {
      removeAuthToken();
      queryClient.setQueryData(authKeys.user, null);
    },
  });
}

/**
 * Check if user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const { data: user, isLoading } = useCurrentUser();
  return !isLoading && !!user;
}

/**
 * Check if user is admin
 */
export function useIsAdmin(): boolean {
  const { data: user } = useCurrentUser();
  return user?.userType === 'ADMIN' || user?.userType === 'TEAM';
}

/**
 * Get user tier
 */
export function useUserTier(): number | null {
  const { data: user } = useCurrentUser();
  return user?.tier || user?.client?.tier || null;
}

/**
 * Combined auth state hook
 */
export function useAuthState() {
  const { data: user, isLoading, error, refetch } = useCurrentUser();
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutMutation = useLogout();
  
  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.userType === 'ADMIN' || user?.userType === 'TEAM',
    tier: user?.tier || user?.client?.tier || null,
    error: error as ApiError | null,
    
    // Actions
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    refresh: refetch,
    
    // Mutation states
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    loginError: loginMutation.error as ApiError | null,
    registerError: registerMutation.error as ApiError | null,
  };
}

export default useAuthState;
