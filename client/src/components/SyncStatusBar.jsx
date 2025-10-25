/**
 * Sync Status Component
 * Shows current sync status and allows manual sync
 */

import React from 'react';
import { motion } from 'framer-motion';
import { getSyncService } from '../services/syncService';

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

  // Debug function to check and clear sync queue
  const debugSyncQueue = () => {
    const syncService = getSyncService();
    const queue = syncService.debugSyncQueue();
    console.log('🔍 Current sync queue:', queue);
    
    if (queue.length > 0) {
      const offlineItems = queue.filter(item => item.data._id && item.data._id.startsWith('offline_'));
      const regularItems = queue.filter(item => !item.data._id || !item.data._id.startsWith('offline_'));
      
      console.log(`📊 Queue breakdown: ${offlineItems.length} offline items, ${regularItems.length} regular items`);
      
      const problematicItems = queue.filter(item => 
        (item.operation === 'UPDATE_TASK' && item.data._id.startsWith('offline_')) ||
        (item.operation === 'UPDATE_TASK' && !item.data._id.startsWith('offline_') && item.retries && item.retries >= 3)
      );
      
      const message = `Found ${queue.length} items in sync queue:\n` +
        `• ${offlineItems.length} offline items (need CREATE)\n` +
        `• ${regularItems.length} regular items (need UPDATE)\n` +
        `• ${problematicItems.length} problematic items (stuck)\n\n` +
        `Options:\n` +
        `• OK: Force sync now\n` +
        `• Cancel: Clear queue (mark as synced)`;
        
      const shouldSync = window.confirm(message);
      
      if (shouldSync) {
        // Force sync
        console.log('🔄 Starting force sync for', queue.length, 'items...');
        console.log('📋 Queue items to sync:', queue.map(item => ({
          operation: item.operation,
          taskId: item.data._id,
          title: item.data.title
        })));
        handleForceSync();
      } else {
        // Clear queue
        const clearMessage = 'This will clear all sync queue items and mark them as synced. Are you sure?';
        if (window.confirm(clearMessage)) {
          syncService.clearSyncQueue();
          console.log('🗑️ Sync queue cleared manually');
          window.location.reload(); // Refresh to update UI
        }
      }
    } else {
      console.log('✅ Sync queue is empty');
      alert('Sync queue is empty - no pending operations');
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

        {/* Sync Buttons */}
        <div className="flex gap-2">
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
            {isSyncing ? 'Syncing...' : 'Force Sync'}
          </button>
          
          {/* Debug Button */}
          <button
            onClick={debugSyncQueue}
            className="px-3 py-1.5 text-xs rounded-md font-medium bg-gray-600 text-white hover:bg-gray-700 transition-colors"
            title="Debug sync queue (check console for details)"
          >
            Debug Queue
          </button>
        </div>
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