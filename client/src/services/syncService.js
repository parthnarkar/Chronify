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
    console.log('📋 Current sync queue:', this.offlineStorage.getSyncQueue());
    this.syncInProgress = true;

    try {
      // First, fetch latest data from server
      console.log('🔄 Fetching server data...');
      const serverData = await this.fetchServerData();
      console.log('🔄 Server data fetched:', { success: !!serverData });
      
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

      console.log('🔄 Making API calls with headers:', headers);

      const [tasksResponse, foldersResponse] = await Promise.all([
        fetch('/api/tasks', { headers }),
        fetch('/api/folders', { headers })
      ]);

      console.log('🔄 API responses:', { 
        tasksStatus: tasksResponse.status, 
        foldersStatus: foldersResponse.status 
      });

      if (!tasksResponse.ok || !foldersResponse.ok) {
        throw new Error('Failed to fetch server data');
      }

      const [tasks, foldersData] = await Promise.all([
        tasksResponse.json(),
        foldersResponse.json()
      ]);

      // 🔍 DEBUG: Log fetched server data
      console.log('🔍 FETCHED SERVER DATA:', {
        tasks: tasks?.length || 0,
        firstTask: tasks?.[0],
        meetingTasks: tasks?.filter(t => t.metadata?.type === 'meeting') || [],
        folders: foldersData?.folders?.length || foldersData?.length || 0
      });

      // Check if any meeting tasks exist and log their structure
      const meetingTasks = tasks?.filter(t => t.metadata?.type === 'meeting') || [];
      if (meetingTasks.length > 0) {
        console.log('🔍 MEETING TASKS FROM SERVER:', meetingTasks.map(t => ({
          id: t._id || t.id,
          title: t.title,
          dueDate: t.dueDate,
          dueDateType: typeof t.dueDate,
          metadata: t.metadata,
          fullTask: t
        })));
      }

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
    let syncQueue = this.offlineStorage.getSyncQueue();
    
    if (syncQueue.length === 0) {
      console.log('No local changes to sync');
      return;
    }

    console.log(`Syncing ${syncQueue.length} local changes...`);

    // Sort queue to process CREATE operations before UPDATE operations for the same item
    syncQueue = this.sortSyncQueue(syncQueue);

    // Remove duplicates - keep only the latest operation for each item
    syncQueue = this.deduplicateSyncQueue(syncQueue);

    console.log(`Processing ${syncQueue.length} unique operations after deduplication`);

    const results = await Promise.allSettled(
      syncQueue.map(item => this.processSyncQueueItem(item))
    );

    // Process results
    results.forEach((result, index) => {
      const queueItem = syncQueue[index];
      
      if (result.status === 'fulfilled') {
        // Success - remove from queue and mark as synced
        console.log(`✅ Sync success for ${queueItem.operation}:`, queueItem.id);
        this.offlineStorage.removeFromSyncQueue(queueItem.id);
        
        if (result.value && result.value.itemType && result.value.itemId) {
          this.offlineStorage.markAsSynced(
            result.value.itemType, 
            result.value.itemId, 
            result.value.serverData
          );
          
          // If this was an offline item that got a new server ID, update any remaining queue items
          if (result.value.itemId.startsWith('offline_') && result.value.serverData && result.value.serverData._id !== result.value.itemId) {
            this.updateQueueItemIds(result.value.itemId, result.value.serverData._id);
          }
        }
      } else {
        // Failed - increment retry count
        console.error('❌ Sync item failed:', queueItem.operation, queueItem.id, result.reason);
        
        // Increment retry count
        queueItem.retries = (queueItem.retries || 0) + 1;
        
        // If max retries exceeded, remove from queue
        if (queueItem.retries >= (queueItem.maxRetries || 3)) {
          console.warn(`⚠️ Removing sync item after ${queueItem.retries} failed attempts:`, queueItem.id);
          this.offlineStorage.removeFromSyncQueue(queueItem.id);
        } else {
          console.log(`🔄 Retry ${queueItem.retries}/${queueItem.maxRetries} for sync item:`, queueItem.id);
          // Update the queue item with new retry count
          this.offlineStorage.updateSyncQueueItem(queueItem);
        }
      }
    });
  }

  // Sort sync queue to ensure proper operation order
  sortSyncQueue(syncQueue) {
    return syncQueue.sort((a, b) => {
      // Sort by timestamp first
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      
      // If same item, prioritize CREATE over UPDATE over DELETE
      if (a.data._id === b.data._id) {
        const operationPriority = {
          'CREATE_TASK': 1,
          'CREATE_FOLDER': 1,
          'UPDATE_TASK': 2,
          'UPDATE_FOLDER': 2,
          'DELETE_TASK': 3,
          'DELETE_FOLDER_ONLY': 3,
          'DELETE_FOLDER_WITH_TASKS': 3
        };
        
        return (operationPriority[a.operation] || 999) - (operationPriority[b.operation] || 999);
      }
      
      return timeA - timeB;
    });
  }

  // Remove duplicate operations for the same item, keeping only the necessary operations
  deduplicateSyncQueue(syncQueue) {
    const itemOperations = new Map();
    
    // Group operations by item ID and type
    syncQueue.forEach(item => {
      const itemId = item.data._id;
      const itemType = item.operation.includes('TASK') ? 'task' : 'folder';
      const key = `${itemType}:${itemId}`;
      
      if (!itemOperations.has(key)) {
        itemOperations.set(key, []);
      }
      itemOperations.get(key).push(item);
    });
    
    // For each item, keep only the necessary operations
    const deduplicated = [];
    
    itemOperations.forEach((operations, key) => {
      if (operations.length === 1) {
        const singleOp = operations[0];
        
        // Skip DELETE operations for offline items that haven't been synced
        if (singleOp.operation.startsWith('DELETE') && singleOp.data._id.startsWith('offline_')) {
          console.log(`⚠️ Skipping DELETE for offline item that was never synced:`, singleOp.data._id);
          return;
        }
        
        deduplicated.push(singleOp);
        return;
      }
      
      // Sort operations by timestamp
      operations.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeA - timeB;
      });
      
      const hasCreate = operations.some(op => op.operation.startsWith('CREATE'));
      const hasDelete = operations.some(op => op.operation.startsWith('DELETE'));
      const isOfflineItem = operations[0].data._id.startsWith('offline_');
      
      // Special handling for offline items
      if (isOfflineItem) {
        if (hasDelete) {
          // If offline item was created then deleted, skip entirely (never existed on server)
          console.log(`⚠️ Skipping offline item that was created and deleted locally:`, operations[0].data._id);
          return;
        }
        
        if (hasCreate) {
          // For offline items, always use CREATE with latest data from any updates
          const createOp = operations.find(op => op.operation.startsWith('CREATE'));
          const latestOp = operations[operations.length - 1];
          
          // Merge create operation data with latest updates
          const mergedData = { ...createOp.data };
          
          // Apply any updates that happened after creation
          operations.forEach(op => {
            if (op.operation === 'UPDATE_TASK' || op.operation === 'UPDATE_FOLDER') {
              Object.assign(mergedData, op.data);
            }
          });
          
          deduplicated.push({
            ...createOp,
            data: mergedData
          });
          return;
        } else {
          // Only UPDATE operations for offline item - this means the item was created 
          // but CREATE operation was already processed. Convert to CREATE.
          const latestOp = operations[operations.length - 1];
          const localTask = this.offlineStorage.getTaskById(latestOp.data._id);
          
          if (localTask && (!localTask._localSync || !localTask._localSync.synced)) {
            console.log(`🔄 Converting UPDATE to CREATE for unsynced offline item:`, latestOp.data._id);
            deduplicated.push({
              id: latestOp.id,
              operation: latestOp.operation.replace('UPDATE', 'CREATE'),
              data: localTask,
              timestamp: latestOp.timestamp,
              retries: latestOp.retries,
              maxRetries: latestOp.maxRetries
            });
            return;
          }
        }
      }
      
      // For non-offline items (synced items)
      if (hasDelete) {
        // If item was deleted, only keep the DELETE operation
        const deleteOp = operations.find(op => op.operation.startsWith('DELETE'));
        deduplicated.push(deleteOp);
      } else if (hasCreate) {
        // If there's CREATE, use it with latest data
        const createOp = operations.find(op => op.operation.startsWith('CREATE'));
        const latestOp = operations[operations.length - 1];
        
        deduplicated.push({
          ...createOp,
          data: latestOp.data
        });
      } else {
        // Only UPDATE operations, keep the latest
        deduplicated.push(operations[operations.length - 1]);
      }
    });
    
    return deduplicated;
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
    console.log(`🔄 Creating task on server: ${taskData.title} (ID: ${taskData._id})`);
    
    const cleanData = this.cleanDataForServer(taskData);
    console.log('📤 Sending task data:', cleanData);
    
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Uid': this.offlineStorage.getUserId()
      },
      body: JSON.stringify(cleanData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Server error ${response.status}:`, errorText);
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    const serverTask = await response.json();
    console.log(`✅ Task created successfully on server:`, serverTask);
    
    return {
      itemType: 'task',
      itemId: taskData._id,
      serverData: serverTask
    };
  }

  async syncUpdateTask(data) {
    const taskId = data._id;
    
    // Check if this is an offline-created task that hasn't been synced yet
    if (taskId.startsWith('offline_')) {
      const localTask = this.offlineStorage.getTaskById(taskId);
      if (localTask && (!localTask._localSync || !localTask._localSync.synced)) {
        // This is an offline task that needs to be created first, not updated
        console.log('🔄 Converting UPDATE to CREATE for offline task:', taskId);
        return await this.syncCreateTask(localTask);
      }
    }

    // For tasks that were created offline but now have server IDs, check if they exist
    const localTask = this.offlineStorage.getTaskById(taskId);
    if (localTask && localTask._localSync && localTask._localSync.created && !taskId.startsWith('offline_')) {
      // This task was created offline, got a server ID, but might not exist on server
      // Try to update, if 404 then create
      console.log('🔄 Trying to update task that was created offline:', taskId);
    }

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
      // If 404, the task doesn't exist on server - try to create it
      if (response.status === 404 && localTask) {
        console.log('🔄 Task not found on server, converting UPDATE to CREATE:', taskId);
        return await this.syncCreateTask(localTask);
      }
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
    // Don't try to delete offline items that were never synced to server
    if (data._id.startsWith('offline_')) {
      console.log(`⚠️ Skipping DELETE for offline task that was never synced:`, data._id);
      return {
        itemType: 'task',
        itemId: data._id,
        serverData: null
      };
    }

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
    // Don't try to delete offline items that were never synced to server
    if (data._id.startsWith('offline_')) {
      console.log(`⚠️ Skipping DELETE for offline folder that was never synced:`, data._id);
      return {
        itemType: 'folder',
        itemId: data._id,
        serverData: null
      };
    }

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
  async forceSync() {
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

  // Debug: Clear sync queue (for testing)
  clearSyncQueue() {
    this.offlineStorage.clearSyncQueue();
    console.log('🗑️ Sync queue cleared');
  }

  // Debug: Get sync queue contents
  debugSyncQueue() {
    const queue = this.offlineStorage.getSyncQueue();
    console.log('📋 Current sync queue:', queue);
    return queue;
  }

  // Update queue item IDs when offline items get server IDs
  updateQueueItemIds(oldId, newId) {
    try {
      const queue = this.offlineStorage.getSyncQueue();
      let updated = false;
      
      queue.forEach(item => {
        if (item.data._id === oldId) {
          console.log(`🔄 Updating queue item ID: ${oldId} → ${newId}`);
          item.data._id = newId;
          updated = true;
        }
      });
      
      if (updated) {
        localStorage.setItem('chronify_sync_queue', JSON.stringify(queue));
      }
    } catch (error) {
      console.error('Error updating queue item IDs:', error);
    }
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