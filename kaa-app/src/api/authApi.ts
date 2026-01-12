/**
 * Auth API Client
 * Handles authentication-related API calls: register, login, profile, token refresh.
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Debug: Log API base URL in development
if (process.env.NODE_ENV === 'development') {
  console.log('[AuthAPI] API_BASE_URL:', API_BASE_URL);
  console.log('[AuthAPI] REACT_APP_API_URL env:', process.env.REACT_APP_API_URL);
}

// ============================================================================
// TYPES
// ============================================================================

export interface User {
  id: string;
  email: string;
  userType: 'SAGE_CLIENT' | 'KAA_CLIENT' | 'TEAM' | 'ADMIN';
  tier: number | null;
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresIn: string;
}

export interface UserProfile extends User {
  client?: {
    id: string;
    status: string;
    projectAddress: string | null;
  } | null;
  projects?: Array<{
    id: string;
    name: string;
    status: string;
    tier: number;
  }>;
  createdAt: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  tier?: number;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

const TOKEN_KEY = 'sage_auth_token';
const USER_KEY = 'sage_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  const userJson = localStorage.getItem(USER_KEY);
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}

export function storeAuth(token: string, user: User): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Register a new user account.
 */
export async function register(input: RegisterInput): Promise<AuthResponse> {
  // Ensure we're using the full API URL
  const apiUrl = API_BASE_URL.endsWith('/') 
    ? `${API_BASE_URL}auth/register` 
    : `${API_BASE_URL}/auth/register`;
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[AuthAPI] Register URL:', apiUrl);
  }
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    let errorMessage = 'Registration failed';
    try {
      const data = await response.json();
      errorMessage = data.error?.message || data.message || errorMessage;
    } catch {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();

  // Store auth data
  if (data.data?.token && data.data?.user) {
    storeAuth(data.data.token, data.data.user);
    return data.data;
  }
  
  throw new Error('Invalid response format from server');
}

/**
 * Login with email and password.
 */
export async function login(input: LoginInput): Promise<AuthResponse> {
  // Ensure we're using the full API URL
  const apiUrl = API_BASE_URL.endsWith('/') 
    ? `${API_BASE_URL}auth/login` 
    : `${API_BASE_URL}/auth/login`;
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    let errorMessage = 'Login failed';
    try {
      const data = await response.json();
      errorMessage = data.error?.message || data.message || errorMessage;
    } catch {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();

  // Store auth data
  if (data.data?.token && data.data?.user) {
    storeAuth(data.data.token, data.data.user);
    return data.data;
  }
  
  throw new Error('Invalid response format from server');
}

/**
 * Get current user profile.
 */
export async function getProfile(): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      clearAuth();
    }
    throw new Error(data.error?.message || 'Failed to get profile');
  }

  return data.data;
}

/**
 * Refresh authentication token.
 */
export async function refreshToken(): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    clearAuth();
    throw new Error(data.error?.message || 'Token refresh failed');
  }

  // Store new auth data
  storeAuth(data.data.token, data.data.user);

  return data.data;
}

/**
 * Logout the current user.
 */
export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  } catch {
    // Ignore errors - we'll clear local state anyway
  }

  clearAuth();
}

/**
 * Request password reset.
 */
export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/password/reset-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Password reset request failed');
  }

  return data;
}

/**
 * Change password for logged-in user.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/password/change`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Current password is incorrect');
    }
    throw new Error(data.error?.message || 'Password change failed');
  }

  return data;
}

/**
 * Check if user is authenticated.
 */
export function isAuthenticated(): boolean {
  return !!getStoredToken();
}

/**
 * Check if user has admin role.
 */
export function isAdmin(): boolean {
  const user = getStoredUser();
  return user?.userType === 'ADMIN' || user?.userType === 'TEAM';
}

/**
 * Check if user has specific tier access.
 */
export function hasTierAccess(requiredTier: number): boolean {
  const user = getStoredUser();
  if (!user?.tier) return false;
  return user.tier >= requiredTier;
}
