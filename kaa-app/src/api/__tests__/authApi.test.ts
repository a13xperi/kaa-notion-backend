/**
 * Auth API Client Tests
 */

import {
  getStoredToken,
  getStoredUser,
  storeAuth,
  clearAuth,
  getAuthHeaders,
  isAuthenticated,
  isAdmin,
  hasTierAccess,
} from '../authApi';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Auth API Client', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('Token Management', () => {
    it('should store and retrieve token', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        userType: 'SAGE_CLIENT' as const,
        tier: 2,
      };

      storeAuth('test-token', mockUser);

      expect(getStoredToken()).toBe('test-token');
    });

    it('should return null when no token stored', () => {
      expect(getStoredToken()).toBeNull();
    });

    it('should clear token on clearAuth', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        userType: 'SAGE_CLIENT' as const,
        tier: 2,
      };

      storeAuth('test-token', mockUser);
      clearAuth();

      expect(getStoredToken()).toBeNull();
    });
  });

  describe('User Management', () => {
    it('should store and retrieve user', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        userType: 'SAGE_CLIENT' as const,
        tier: 2,
      };

      storeAuth('test-token', mockUser);

      const storedUser = getStoredUser();
      expect(storedUser).toEqual(mockUser);
    });

    it('should return null when no user stored', () => {
      expect(getStoredUser()).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      localStorageMock.setItem('sage_user', 'invalid-json');
      expect(getStoredUser()).toBeNull();
    });

    it('should clear user on clearAuth', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        userType: 'SAGE_CLIENT' as const,
        tier: 2,
      };

      storeAuth('test-token', mockUser);
      clearAuth();

      expect(getStoredUser()).toBeNull();
    });
  });

  describe('Auth Headers', () => {
    it('should return headers with token when authenticated', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        userType: 'SAGE_CLIENT' as const,
        tier: 2,
      };

      storeAuth('test-token', mockUser);

      const headers = getAuthHeaders();
      expect(headers).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      });
    });

    it('should return headers without token when not authenticated', () => {
      const headers = getAuthHeaders();
      expect(headers).toEqual({
        'Content-Type': 'application/json',
      });
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when token exists', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        userType: 'SAGE_CLIENT' as const,
        tier: 2,
      };

      storeAuth('test-token', mockUser);

      expect(isAuthenticated()).toBe(true);
    });

    it('should return false when no token', () => {
      expect(isAuthenticated()).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('should return true for ADMIN user type', () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@example.com',
        userType: 'ADMIN' as const,
        tier: null,
      };

      storeAuth('test-token', mockUser);

      expect(isAdmin()).toBe(true);
    });

    it('should return true for TEAM user type', () => {
      const mockUser = {
        id: 'user-123',
        email: 'team@example.com',
        userType: 'TEAM' as const,
        tier: null,
      };

      storeAuth('test-token', mockUser);

      expect(isAdmin()).toBe(true);
    });

    it('should return false for SAGE_CLIENT user type', () => {
      const mockUser = {
        id: 'user-123',
        email: 'client@example.com',
        userType: 'SAGE_CLIENT' as const,
        tier: 2,
      };

      storeAuth('test-token', mockUser);

      expect(isAdmin()).toBe(false);
    });

    it('should return false when no user', () => {
      expect(isAdmin()).toBe(false);
    });
  });

  describe('hasTierAccess', () => {
    it('should return true when user tier >= required tier', () => {
      const mockUser = {
        id: 'user-123',
        email: 'client@example.com',
        userType: 'SAGE_CLIENT' as const,
        tier: 3,
      };

      storeAuth('test-token', mockUser);

      expect(hasTierAccess(1)).toBe(true);
      expect(hasTierAccess(2)).toBe(true);
      expect(hasTierAccess(3)).toBe(true);
    });

    it('should return false when user tier < required tier', () => {
      const mockUser = {
        id: 'user-123',
        email: 'client@example.com',
        userType: 'SAGE_CLIENT' as const,
        tier: 2,
      };

      storeAuth('test-token', mockUser);

      expect(hasTierAccess(3)).toBe(false);
      expect(hasTierAccess(4)).toBe(false);
    });

    it('should return false when user has no tier', () => {
      const mockUser = {
        id: 'user-123',
        email: 'client@example.com',
        userType: 'SAGE_CLIENT' as const,
        tier: null,
      };

      storeAuth('test-token', mockUser);

      expect(hasTierAccess(1)).toBe(false);
    });

    it('should return false when no user', () => {
      expect(hasTierAccess(1)).toBe(false);
    });
  });
});
