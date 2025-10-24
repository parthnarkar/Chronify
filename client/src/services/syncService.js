/**
 * Sync Service
 * Handles online/offline detection and synchronization between localStorage and MongoDB
 */

import OfflineStorage from './offlineStorage.js';

class SyncService {
  constructor() {
    this.offlineStorage = new OfflineStorage();
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.syncCallbacks = new Set();
    this.statusCallbacks = new Set();
    
    this.setupEventListeners();
    this.setupServiceWorkerListeners();
    
    // Start periodic sync check
    this.startPeriodicSync();
  }

  // Setup online/offline event listeners
  setupEventListeners() {
    window.addEventListener('online', () => {
      console.log('🟢 Connection restored');
      this.isOnline = true;
      this.notifyStatusChange(true);
      this.syncWhenOnline();
    });

    window.addEventListener('offline', () => {
      console.log('🔴 Connection lost');
      this.isOnline = false;
      this.notifyStatusChange(false);
    });
  }

  // Setup service worker message listeners
  setupServiceWorkerListeners() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'ONLINE_STATUS') {
          this.isOnline = event.data.online;
          this.notifyStatusChange(this.isOnline);
          
          if (this.isOnline) {
            this.syncWhenOnline();
          }
        } else if (event.data && event.data.type === 'BACKGROUND_SYNC') {
          if (event.data.action === 'sync-offline-data') {
            this.syncWhenOnline();
          }
        } else if (event.data && event.data.type === 'QUEUE_OFFLINE_REQUEST') {
          // Handle offline request from service worker
          this.handleOfflineRequest(event.data.requestData);
        }
      });
    }
  }

  // Handle offline requests from service worker
  handleOfflineRequest(requestData) {
    const { url, method, body } = requestData;
    
    try {
      const parsedBody = body ? JSON.parse(body) : null;
      const urlParts = url.split('/api/');
      if (urlParts.length < 2) return;
      
      const apiPath = urlParts[1];
      
      // Route to appropriate offline handler
      if (apiPath.startsWith('tasks')) {
        this.handleOfflineTaskRequest(method, apiPath, parsedBody, requestData);
      } else if (apiPath.startsWith('folders')) {
        this.handleOfflineFolderRequest(method, apiPath, parsedBody, requestData);
      }
    } catch (error) {
      console.error('Error handling offline request:', error);
    }
  }

  // Handle offline task requests
  handleOfflineTaskRequest(method, apiPath, body, requestData) {
    try {
      switch (method) {
        case 'POST':
          if (apiPath === 'tasks') {
            this.offlineStorage.createTask(body);
          }
          break;
          
        case 'PUT':
          const taskIdMatch = apiPath.match(/tasks\/(.+)/);
          if (taskIdMatch) {
            this.offlineStorage.updateTask(taskIdMatch[1], body);
          }
          break;
          
        case 'DELETE':
          const deleteTaskIdMatch = apiPath.match(/tasks\/(.+)/);
          if (deleteTaskIdMatch) {
            this.offlineStorage.deleteTask(deleteTaskIdMatch[1]);
          }
          break;
      }
    } catch (error) {
      console.error('Error handling offline task request:', error);
    }
  }

  // Handle offline folder requests
  handleOfflineFolderRequest(method, apiPath, body, requestData) {
    try {
      switch (method) {
        case 'POST':
          if (apiPath === 'folders') {
            this.offlineStorage.createFolder(body);
          }
          break;
          
        case 'PUT':
          const folderIdMatch = apiPath.match(/folders\/(.+)/);
          if (folderIdMatch) {
            this.offlineStorage.updateFolder(folderIdMatch[1], body);
          }
          break;
          
        case 'DELETE':
          const deleteFolderMatch = apiPath.match(/folders\/folder-with-tasks\/(.+)/);
          const deleteFolderOnlyMatch = apiPath.match(/folders\/only-folder\/(.+)/);
          
          if (deleteFolderMatch) {
            this.offlineStorage.deleteFolder(deleteFolderMatch[1], true);
          } else if (deleteFolderOnlyMatch) {
            this.offlineStorage.deleteFolder(deleteFolderOnlyMatch[1], false);
          }
          break;
      }
    } catch (error) {
      console.error('Error handling offline folder request:', error);
    }
  }

  // Start periodic sync (every 30 seconds when online)
  startPeriodicSync() {
    setInterval(() => {
      if (this.isOnline && this.offlineStorage.hasUnsyncedChanges()) {
        this.syncWhenOnline();
      }
    }, 30000); // 30 seconds
  }

  // Add callback for sync completion
  onSyncComplete(callback) {
    this.syncCallbacks.add(callback);
    return () => this.syncCallbacks.delete(callback);
  }

  // Add callback for online status changes
  onStatusChange(callback) {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  // Notify status change
  notifyStatusChange(isOnline) {
    this.statusCallbacks.forEach(callback => {
      try {
        callback(isOnline);
      } catch (error) {
        console.error('Error in status callback:', error);
      }
    });
  }

  // Notify sync completion
  notifySyncComplete(result) {
    this.syncCallbacks.forEach(callback => {
      try {
        callback(result);
      } catch (error) {
        console.error('Error in sync callback:', error);
      }
    });
  }

  // Main sync function
  async syncWhenOnline() {
    if (!this.isOnline || this.syncInProgress) {
      return;
    }

    console.log('🔄 Starting sync process...');
    this.syncInProgress = true;

    try {
      // First, fetch latest data from server
      const serverData = await this.fetchServerData();
      
      if (serverData) {
        // Merge server data with local data
        this.offlineStorage.mergeServerData(serverData.tasks || [], serverData.folders || []);
      }

      // Then sync local changes to server
      await this.syncLocalChangesToServer();

      console.log('✅ Sync completed successfully');
      this.notifySyncComplete({ success: true, timestamp: new Date() });
      
    } catch (error) {
      console.error('❌ Sync failed:', error);
      this.notifySyncComplete({ success: false, error: error.message, timestamp: new Date() });
    } finally {
      this.syncInProgress = false;
    }
  }

  // Fetch latest data from server
  async fetchServerData() {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'X-Client-Uid': this.offlineStorage.getUserId()
      };

      const [tasksResponse, foldersResponse] = await Promise.all([
        fetch('/api/tasks', { headers }),
        fetch('/api/folders', { headers })
      ]);

      if (!tasksResponse.ok || !foldersResponse.ok) {
        throw new Error('Failed to fetch server data');
      }

      const [tasks, foldersData] = await Promise.all([
        tasksResponse.json(),
        foldersResponse.json()
      ]);

      return {
        tasks: tasks || [],
        folders: foldersData?.folders || foldersData || []
      };
    } catch (error) {
      console.error('Error fetching server data:', error);
      return null;
    }
  }

  // Sync local changes to server
  async syncLocalChangesToServer() {
    const syncQueue = this.offlineStorage.getSyncQueue();
    
    if (syncQueue.length === 0) {
      console.log('No local changes to sync');
      return;
    }

    console.log(`Syncing ${syncQueue.length} local changes...`);

    const results = await Promise.allSettled(
      syncQueue.map(item => this.processSyncQueueItem(item))
    );

    // Process results
    results.forEach((result, index) => {
      const queueItem = syncQueue[index];
      
      if (result.status === 'fulfilled') {
        // Success - remove from queue and mark as synced
        this.offlineStorage.removeFromSyncQueue(queueItem.id);
        
        if (result.value && result.value.itemType && result.value.itemId) {
          this.offlineStorage.markAsSynced(
            result.value.itemType, 
            result.value.itemId, 
            result.value.serverData
          );
        }
      } else {
        // Failed - increment retry count
        console.error('Sync item failed:', queueItem, result.reason);
        
        // TODO: Implement retry logic with exponential backoff
        // For now, we'll keep it in the queue for next sync attempt
      }
    });
  }

  // Process individual sync queue item
  async processSyncQueueItem(queueItem) {
    const { operation, data } = queueItem;
    
    try {
      switch (operation) {
        case 'CREATE_TASK':
          return await this.syncCreateTask(data);
          
        case 'UPDATE_TASK':
          return await this.syncUpdateTask(data);
          
        case 'DELETE_TASK':
          return await this.syncDeleteTask(data);
          
        case 'CREATE_FOLDER':
          return await this.syncCreateFolder(data);
          
        case 'UPDATE_FOLDER':
          return await this.syncUpdateFolder(data);
          
        case 'DELETE_FOLDER_ONLY':
          return await this.syncDeleteFolder(data, false);
          
        case 'DELETE_FOLDER_WITH_TASKS':
          return await this.syncDeleteFolder(data, true);
          
        default:
          throw new Error(`Unknown sync operation: ${operation}`);
      }
    } catch (error) {
      console.error(`Error processing sync item ${operation}:`, error);
      throw error;
    }
  }

  // Sync individual operations
  async syncCreateTask(taskData) {
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Uid': this.offlineStorage.getUserId()
      },
      body: JSON.stringify(this.cleanDataForServer(taskData))
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const serverTask = await response.json();
    return {
      itemType: 'task',
      itemId: taskData._id,
      serverData: serverTask
    };
  }

  async syncUpdateTask(data) {
    const taskId = data._id;
    const updates = { ...data };
    delete updates._id;

    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Uid': this.offlineStorage.getUserId()
      },
      body: JSON.stringify(this.cleanDataForServer(updates))
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const serverTask = await response.json();
    return {
      itemType: 'task',
      itemId: taskId,
      serverData: serverTask
    };
  }

  async syncDeleteTask(data) {
    const response = await fetch(`/api/tasks/${data._id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Uid': this.offlineStorage.getUserId()
      }
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    return {
      itemType: 'task',
      itemId: data._id,
      serverData: null
    };
  }

  async syncCreateFolder(folderData) {
    const response = await fetch('/api/folders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Uid': this.offlineStorage.getUserId()
      },
      body: JSON.stringify(this.cleanDataForServer(folderData))
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const serverFolder = await response.json();
    return {
      itemType: 'folder',
      itemId: folderData._id,
      serverData: serverFolder
    };
  }

  async syncUpdateFolder(data) {
    const folderId = data._id;
    const updates = { ...data };
    delete updates._id;

    const response = await fetch(`/api/folders/${folderId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Uid': this.offlineStorage.getUserId()
      },
      body: JSON.stringify(this.cleanDataForServer(updates))
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const serverFolder = await response.json();
    return {
      itemType: 'folder',
      itemId: folderId,
      serverData: serverFolder
    };
  }

  async syncDeleteFolder(data, withTasks) {
    const endpoint = withTasks 
      ? `/api/folders/folder-with-tasks/${data._id}`
      : `/api/folders/only-folder/${data._id}`;

    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Uid': this.offlineStorage.getUserId()
      }
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    return {
      itemType: 'folder',
      itemId: data._id,
      serverData: null
    };
  }

  // Clean data for server (remove local-only fields)
  cleanDataForServer(data) {
    const cleaned = { ...data };
    delete cleaned._localSync;
    return cleaned;
  }

  // Public API methods
  getOnlineStatus() {
    return this.isOnline;
  }

  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      isSyncing: this.syncInProgress,
      hasUnsyncedChanges: this.offlineStorage.hasUnsyncedChanges(),
      unsyncedCount: this.offlineStorage.getUnsyncedCount(),
      lastSync: this.offlineStorage.getLastSync()
    };
  }

  // Force sync (manual trigger)
  async forcSync() {
    if (this.isOnline && !this.syncInProgress) {
      await this.syncWhenOnline();
    }
  }

  // Initialize sync service with user ID
  setUserId(userId) {
    this.offlineStorage.setUserId(userId);
  }

  // Clear all data (for logout)
  clearAllData() {
    this.offlineStorage.clearAllData();
  }
}

// Singleton instance
let syncServiceInstance = null;

export const getSyncService = () => {
  if (!syncServiceInstance) {
    syncServiceInstance = new SyncService();
  }
  return syncServiceInstance;
};

export default SyncService;