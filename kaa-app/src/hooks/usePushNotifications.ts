/**
 * Push Notifications Hook
 * Manages Web Push notification subscription and status
 */

import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

interface PushStatus {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  subscribed: boolean;
  loading: boolean;
  error: string | null;
}

interface UsePushNotificationsResult {
  status: PushStatus;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  sendTestNotification: () => Promise<boolean>;
  requestPermission: () => Promise<NotificationPermission>;
}

/**
 * Convert a base64 string to Uint8Array for VAPID key
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(): UsePushNotificationsResult {
  const [status, setStatus] = useState<PushStatus>({
    supported: false,
    permission: 'unsupported',
    subscribed: false,
    loading: true,
    error: null,
  });

  // Check initial status
  useEffect(() => {
    async function checkStatus() {
      // Check browser support
      const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

      if (!supported) {
        setStatus({
          supported: false,
          permission: 'unsupported',
          subscribed: false,
          loading: false,
          error: null,
        });
        return;
      }

      const permission = Notification.permission;

      // Check if already subscribed
      let subscribed = false;
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        subscribed = !!subscription;
      } catch (err) {
        console.error('Failed to check subscription:', err);
      }

      setStatus({
        supported: true,
        permission,
        subscribed,
        loading: false,
        error: null,
      });
    }

    checkStatus();
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!status.supported) {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      setStatus((prev) => ({ ...prev, permission }));
      return permission;
    } catch (err) {
      console.error('Failed to request permission:', err);
      return 'denied';
    }
  }, [status.supported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    setStatus((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Ensure permission is granted
      let permission = status.permission;
      if (permission !== 'granted') {
        permission = await requestPermission();
        if (permission !== 'granted') {
          setStatus((prev) => ({
            ...prev,
            loading: false,
            error: 'Notification permission denied',
          }));
          return false;
        }
      }

      // Get VAPID public key from server
      const vapidResponse = await fetch(`${API_BASE}/push/vapid-key`);
      if (!vapidResponse.ok) {
        throw new Error('Failed to get VAPID key');
      }
      const { data: { publicKey } } = await vapidResponse.json();

      // Subscribe through service worker
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Send subscription to server
      const subscriptionJson = subscription.toJSON();
      const response = await fetch(`${API_BASE}/push/subscribe`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          endpoint: subscriptionJson.endpoint,
          keys: subscriptionJson.keys,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      setStatus((prev) => ({
        ...prev,
        subscribed: true,
        loading: false,
        error: null,
      }));

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to subscribe';
      console.error('Subscribe failed:', err);
      setStatus((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return false;
    }
  }, [status.permission, requestPermission]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setStatus((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from browser
        await subscription.unsubscribe();

        // Remove from server
        await fetch(`${API_BASE}/push/unsubscribe`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            endpoint: subscription.endpoint,
          }),
        });
      }

      setStatus((prev) => ({
        ...prev,
        subscribed: false,
        loading: false,
        error: null,
      }));

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unsubscribe';
      console.error('Unsubscribe failed:', err);
      setStatus((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return false;
    }
  }, []);

  // Send a test notification
  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/push/test`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to send test notification');
      }

      return true;
    } catch (err) {
      console.error('Test notification failed:', err);
      return false;
    }
  }, []);

  return {
    status,
    subscribe,
    unsubscribe,
    sendTestNotification,
    requestPermission,
  };
}

export default usePushNotifications;
