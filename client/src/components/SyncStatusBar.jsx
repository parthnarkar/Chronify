/**
 * Sync Status Component
 * Shows current sync status and allows manual sync
 */

import React from 'react';
import { motion } from 'framer-motion';

export default function SyncStatusBar({ isOnline, syncStatus, onForceSync }) {
  const { isSyncing, hasUnsyncedChanges, unsyncedCount, lastSync } = syncStatus;

  const formatLastSync = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const handleForceSync = () => {
    if (isOnline && !isSyncing && onForceSync) {
      onForceSync();
    }
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              isSyncing ? 'bg-blue-500 animate-pulse' :
              !isOnline ? 'bg-orange-500' :
              hasUnsyncedChanges ? 'bg-yellow-500' : 'bg-green-500'
            }`} />
            
            <div>
              <div className="text-sm font-medium text-gray-900">
                {isSyncing ? 'Syncing...' :
                 !isOnline ? 'Offline Mode' :
                 hasUnsyncedChanges ? `${unsyncedCount} changes pending` :
                 'All synced'}
              </div>
              <div className="text-xs text-gray-500">
                Last sync: {formatLastSync(lastSync)}
              </div>
            </div>
          </div>

          {/* Unsynced Changes Indicator */}
          {hasUnsyncedChanges && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium"
            >
              {unsyncedCount} pending
            </motion.div>
          )}
        </div>

        {/* Sync Button */}
        <button
          onClick={handleForceSync}
          disabled={!isOnline || isSyncing}
          className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
            isOnline && !isSyncing
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          title={
            !isOnline ? 'Cannot sync while offline' :
            isSyncing ? 'Sync in progress...' :
            'Force sync now'
          }
        >
          {isSyncing ? (
            <>
              <svg className="w-3 h-3 animate-spin inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm0 2h12v11H4V4z" clipRule="evenodd" />
              </svg>
              Syncing
            </>
          ) : (
            <>
              <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sync
            </>
          )}
        </button>
      </div>

      {/* Offline Mode Info */}
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700"
        >
          <div className="font-medium">Working offline</div>
          <div>Your changes are saved locally and will sync when you're back online.</div>
        </motion.div>
      )}
    </div>
  );
}