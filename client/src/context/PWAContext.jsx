/**
 * PWA Context
 * Manages PWA features, offline status, and sync functionality
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { initPWA } from '../services/pwaService.js';
import { getOfflineDataService } from '../services/offlineDataService.js';

const PWAContext = createContext();

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};

export default function PWAProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState({
    isSyncing: false,
    hasUnsyncedChanges: false,
    unsyncedCount: 0,
    lastSync: null
  });
  const [offlineDataService] = useState(() => getOfflineDataService());

  useEffect(() => {
    // Initialize PWA features
    initPWA();

    // Set up online/offline listeners
    const handleOnline = () => {
      console.log('🟢 App came online');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('🔴 App went offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Subscribe to sync service events
    const unsubscribeStatus = offlineDataService.onStatusChange((online) => {
      setIsOnline(online);
    });

    const unsubscribeSync = offlineDataService.onSyncComplete((result) => {
      console.log('🔄 Sync completed:', result);
      updateSyncStatus();
    });

    // Update sync status periodically
    const updateSyncStatus = () => {
      const status = offlineDataService.getSyncStatus();
      setSyncStatus(status);
    };

    // Initial sync status
    updateSyncStatus();

    // Update sync status every 10 seconds
    const syncStatusInterval = setInterval(updateSyncStatus, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeStatus();
      unsubscribeSync();
      clearInterval(syncStatusInterval);
    };
  }, [offlineDataService]);

  const value = {
    isOnline,
    syncStatus,
    offlineDataService,
    
    // Sync actions
    forceSync: async () => {
      try {
        await offlineDataService.forceSync();
        return { success: true };
      } catch (error) {
        console.error('Force sync failed:', error);
        return { success: false, error: error.message };
      }
    },
    
    // PWA install prompt
    showInstallPrompt: () => {
      // This will be handled by pwaService.js
      console.log('Install prompt requested');
    }
  };

  return (
    <PWAContext.Provider value={value}>
      {children}
      <OfflineIndicator isOnline={isOnline} syncStatus={syncStatus} />
    </PWAContext.Provider>
  );
}

// Offline indicator component
function OfflineIndicator({ isOnline, syncStatus }) {
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowIndicator(true);
    } else {
      // Hide after a short delay when coming back online
      const timer = setTimeout(() => setShowIndicator(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!showIndicator) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isOnline ? 'bg-green-600' : 'bg-orange-600'
    }`}>
      <div className="px-4 py-2">
        <div className="flex items-center justify-center gap-2 text-white text-sm">
          {isOnline ? (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Back online</span>
              {syncStatus.hasUnsyncedChanges && (
                <span className="text-green-200">
                  • Syncing {syncStatus.unsyncedCount} changes...
                </span>
              )}
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
              </svg>
              <span>Working offline</span>
              {syncStatus.hasUnsyncedChanges && (
                <span className="text-orange-200">
                  • {syncStatus.unsyncedCount} changes will sync when online
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}