// PWA (Progressive Web App) utilities
// Handles service worker registration, offline functionality, and PWA features

import logger from './logger';

interface PWAConfig {
  enableNotifications: boolean;
  enableOfflineMode: boolean;
  enableBackgroundSync: boolean;
}

class PWAManager {
  private config: PWAConfig;
  private registration: ServiceWorkerRegistration | null = null;
  private isOnline: boolean = navigator.onLine;

  constructor(config: PWAConfig = {
    enableNotifications: true,
    enableOfflineMode: true,
    enableBackgroundSync: true
  }) {
    this.config = config;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.handleOnline();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.handleOffline();
    });

    // Before install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.handleInstallPrompt(e);
    });

    // App installed
    window.addEventListener('appinstalled', () => {
      this.handleAppInstalled();
    });
  }

  // Register service worker
  async registerServiceWorker(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      logger.info('[PWA] Service workers not supported');
      return false;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js');
      logger.info('[PWA] Service worker registered successfully');

      // Handle updates
      this.registration.addEventListener('updatefound', () => {
        this.handleServiceWorkerUpdate();
      });

      return true;
    } catch (error) {
      logger.error('[PWA] Service worker registration failed:', error);
      return false;
    }
  }

  // Request notification permission
  async requestNotificationPermission(): Promise<boolean> {
    if (!this.config.enableNotifications) return false;
    if (!('Notification' in window)) return false;

    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  // Show notification
  showNotification(title: string, options: NotificationOptions = {}) {
    if (!this.config.enableNotifications) return;
    if (Notification.permission !== 'granted') return;

    const defaultOptions: NotificationOptions = {
      icon: '/logo192.png',
      badge: '/logo192.png',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      ...options
    };

    new Notification(title, defaultOptions);
  }

  // Check if app is installable
  isInstallable(): boolean {
    return this.registration !== null && this.registration.waiting === null;
  }

  // Install app
  async installApp(): Promise<boolean> {
    if (!this.registration) return false;

    try {
      // Check if beforeinstallprompt is available
      const deferredPrompt = (window as any).deferredPrompt;
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        return outcome === 'accepted';
      }
      return false;
    } catch (error) {
      logger.error('[PWA] App installation failed:', error);
      return false;
    }
  }

  // Check if app is running in standalone mode
  isStandalone(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }

  // Get app version
  getAppVersion(): string {
    return process.env.REACT_APP_VERSION || '1.0.0';
  }

  // Check online status
  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  // Store data for offline use
  async storeOfflineData(key: string, data: any): Promise<void> {
    if (!this.config.enableOfflineMode) return;

    try {
      const offlineData = await this.getOfflineData();
      offlineData[key] = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem('kaa-offline-data', JSON.stringify(offlineData));
    } catch (error) {
      logger.error('[PWA] Failed to store offline data:', error);
    }
  }

  // Retrieve offline data
  async getOfflineData(key?: string): Promise<any> {
    if (!this.config.enableOfflineMode) return null;

    try {
      const stored = localStorage.getItem('kaa-offline-data');
      const offlineData = stored ? JSON.parse(stored) : {};

      if (key) {
        return offlineData[key]?.data || null;
      }

      return offlineData;
    } catch (error) {
      logger.error('[PWA] Failed to retrieve offline data:', error);
      return null;
    }
  }

  // Queue action for background sync
  async queueBackgroundSync(tag: string, data: any): Promise<void> {
    if (!this.config.enableBackgroundSync) return;
    if (!this.registration) return;

    try {
      // Store the action data
      await this.storeOfflineData(`sync-${tag}`, data);

      // Register background sync
      if ('sync' in this.registration) {
        await (this.registration as any).sync.register(tag);
      }
      logger.info('[PWA] Background sync queued:', tag);
    } catch (error) {
      logger.error('[PWA] Failed to queue background sync:', error);
    }
  }

  // Handle online event
  private handleOnline() {
    logger.info('[PWA] App is back online');
    
    // Show notification
    this.showNotification('Back Online', {
      body: 'You are now connected to the internet',
      icon: '/logo192.png'
    });

    // Trigger background sync
    if (this.registration && 'sync' in this.registration) {
      (this.registration as any).sync.register('online-sync');
    }
  }

  // Handle offline event
  private handleOffline() {
    logger.info('[PWA] App is offline');
    
    // Show notification
    this.showNotification('Offline Mode', {
      body: 'You are currently offline. Some features may not be available.',
      icon: '/logo192.png',
      requireInteraction: true
    });
  }

  // Handle install prompt
  private handleInstallPrompt(e: any) {
    logger.info('[PWA] Install prompt available');
    
    // Store the event for later use
    (window as any).deferredPrompt = e;
    
    // Show install button or notification
    this.showNotification('Install KAA App', {
      body: 'Install this app for a better experience',
      icon: '/logo192.png',
      requireInteraction: true
    });
  }

  // Handle app installed
  private handleAppInstalled() {
    logger.info('[PWA] App installed successfully');
    
    // Track installation
    this.showNotification('Welcome to KAA!', {
      body: 'The app has been installed successfully',
      icon: '/logo192.png'
    });
  }

  // Handle service worker update
  private handleServiceWorkerUpdate() {
    if (!this.registration) return;

    const newWorker = this.registration.installing;
    if (!newWorker) return;

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        // New version available
        this.showNotification('Update Available', {
          body: 'A new version of the app is available. Refresh to update.',
          icon: '/logo192.png',
          requireInteraction: true
        });
      }
    });
  }

  // Get device info
  getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      online: this.isOnline,
      standalone: this.isStandalone(),
      installable: this.isInstallable(),
      serviceWorker: 'serviceWorker' in navigator,
      notifications: 'Notification' in window,
      pushManager: 'PushManager' in window
    };
  }
}

// Create singleton instance
const pwaManager = new PWAManager();

// Export for use in components
export default pwaManager;

// Export types
export type { PWAConfig };
