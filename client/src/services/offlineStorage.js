/**
 * Offline Storage Service
 * Mirrors MongoDB schema in localStorage and handles offline-first operations
 */

class OfflineStorage {
  constructor() {
    this.storageKeys = {
      tasks: 'chronify_tasks',
      folders: 'chronify_folders',
      userSync: 'chronify_user_sync',
      syncQueue: 'chronify_sync_queue',
      lastSync: 'chronify_last_sync',
      userId: 'chronify_user_id'
    };
    
    this.initializeStorage();
  }

  // Initialize localStorage with proper structure
  initializeStorage() {
    Object.values(this.storageKeys).forEach(key => {
      if (!localStorage.getItem(key)) {
        if (key === this.storageKeys.syncQueue) {
          localStorage.setItem(key, JSON.stringify([]));
        } else if (key === this.storageKeys.lastSync) {
          localStorage.setItem(key, JSON.stringify({ timestamp: null }));
        } else {
          localStorage.setItem(key, JSON.stringify({}));
        }
      }
    });
  }

  // Generate unique IDs for offline-created items
  generateId() {
    return 'offline_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Get current user ID
  getUserId() {
    return localStorage.getItem(this.storageKeys.userId);
  }

  // Set current user ID
  setUserId(userId) {
    localStorage.setItem(this.storageKeys.userId, userId);
  }

  // ==================== TASKS OPERATIONS ====================

  // Get all tasks for current user
  getAllTasks() {
    try {
      const tasks = JSON.parse(localStorage.getItem(this.storageKeys.tasks) || '{}');
      const userId = this.getUserId();
      
      return Object.values(tasks).filter(task => 
        task.owner === userId && !task.deletedAt
      );
    } catch (error) {
      console.error('Error getting tasks from localStorage:', error);
      return [];
    }
  }

  // Get tasks by folder
  getTasksByFolder(folderId) {
    const allTasks = this.getAllTasks();
    return allTasks.filter(task => task.folder === folderId);
  }

  // Get single task by ID
  getTaskById(taskId) {
    try {
      const tasks = JSON.parse(localStorage.getItem(this.storageKeys.tasks) || '{}');
      return tasks[taskId] || null;
    } catch (error) {
      console.error('Error getting task by ID:', error);
      return null;
    }
  }

  // Create new task
  createTask(taskData) {
    try {
      const tasks = JSON.parse(localStorage.getItem(this.storageKeys.tasks) || '{}');
      const userId = this.getUserId();
      
      const newTask = {
        _id: taskData._id || this.generateId(),
        title: taskData.title,
        description: taskData.description || '',
        currentStatus: taskData.currentStatus || 'Pending',
        priority: taskData.priority || 'low',
        dueDate: taskData.dueDate || null,
        folder: taskData.folder,
        owner: userId,
        deletedAt: null,
        pendingTimestamps: taskData.pendingTimestamps || [new Date().toISOString()],
        completedTimestamps: taskData.completedTimestamps || [],
        priorityHistory: taskData.priorityHistory || [taskData.priority || 'low'],
        metadata: taskData.metadata || {},
        createdAt: taskData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _localSync: {
          created: !taskData._id, // true if created offline
          modified: false,
          synced: false
        }
      };

      tasks[newTask._id] = newTask;
      localStorage.setItem(this.storageKeys.tasks, JSON.stringify(tasks));
      
      // Add to sync queue if created offline
      if (newTask._localSync.created) {
        this.addToSyncQueue('CREATE_TASK', newTask);
      }
      
      return newTask;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  // Update task
  updateTask(taskId, updates) {
    try {
      const tasks = JSON.parse(localStorage.getItem(this.storageKeys.tasks) || '{}');
      const task = tasks[taskId];
      
      if (!task) {
        throw new Error('Task not found');
      }

      // Handle status changes
      if (updates.currentStatus && updates.currentStatus !== task.currentStatus) {
        if (updates.currentStatus === 'Completed') {
          task.completedTimestamps = [...(task.completedTimestamps || []), new Date().toISOString()];
        } else if (updates.currentStatus === 'Pending') {
          task.pendingTimestamps = [...(task.pendingTimestamps || []), new Date().toISOString()];
        }
      }

      // Handle priority changes
      if (updates.priority && updates.priority !== task.priority) {
        task.priorityHistory = [...(task.priorityHistory || []), updates.priority];
      }

      // Update task fields
      Object.keys(updates).forEach(key => {
        if (key !== '_localSync') {
          task[key] = updates[key];
        }
      });

      task.updatedAt = new Date().toISOString();
      task._localSync = task._localSync || {};
      task._localSync.modified = true;
      task._localSync.synced = false;

      tasks[taskId] = task;
      localStorage.setItem(this.storageKeys.tasks, JSON.stringify(tasks));
      
      // Add to sync queue
      this.addToSyncQueue('UPDATE_TASK', { _id: taskId, ...updates });
      
      return task;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  // Delete task (soft delete)
  deleteTask(taskId) {
    try {
      const tasks = JSON.parse(localStorage.getItem(this.storageKeys.tasks) || '{}');
      const task = tasks[taskId];
      
      if (!task) {
        throw new Error('Task not found');
      }

      task.deletedAt = new Date().toISOString();
      task.updatedAt = new Date().toISOString();
      task._localSync = task._localSync || {};
      task._localSync.modified = true;
      task._localSync.synced = false;

      tasks[taskId] = task;
      localStorage.setItem(this.storageKeys.tasks, JSON.stringify(tasks));
      
      // Add to sync queue
      this.addToSyncQueue('DELETE_TASK', { _id: taskId });
      
      return task;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  // ==================== FOLDERS OPERATIONS ====================

  // Get all folders for current user
  getAllFolders() {
    try {
      const folders = JSON.parse(localStorage.getItem(this.storageKeys.folders) || '{}');
      const userId = this.getUserId();
      
      return Object.values(folders).filter(folder => 
        folder.owner === userId && !folder.deletedAt
      );
    } catch (error) {
      console.error('Error getting folders from localStorage:', error);
      return [];
    }
  }

  // Get folders with their tasks
  getFoldersWithTasks() {
    const folders = this.getAllFolders();
    const allTasks = this.getAllTasks();
    
    return folders.map(folder => ({
      ...folder,
      tasks: allTasks.filter(task => task.folder === folder._id)
    }));
  }

  // Create new folder
  createFolder(folderData) {
    try {
      const folders = JSON.parse(localStorage.getItem(this.storageKeys.folders) || '{}');
      const userId = this.getUserId();
      
      const newFolder = {
        _id: folderData._id || this.generateId(),
        name: folderData.name,
        owner: userId,
        deletedAt: null,
        icon: folderData.icon || '📁',
        createdAt: folderData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _localSync: {
          created: !folderData._id, // true if created offline
          modified: false,
          synced: false
        }
      };

      folders[newFolder._id] = newFolder;
      localStorage.setItem(this.storageKeys.folders, JSON.stringify(folders));
      
      // Add to sync queue if created offline
      if (newFolder._localSync.created) {
        this.addToSyncQueue('CREATE_FOLDER', newFolder);
      }
      
      return newFolder;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  // Update folder
  updateFolder(folderId, updates) {
    try {
      const folders = JSON.parse(localStorage.getItem(this.storageKeys.folders) || '{}');
      const folder = folders[folderId];
      
      if (!folder) {
        throw new Error('Folder not found');
      }

      Object.keys(updates).forEach(key => {
        if (key !== '_localSync') {
          folder[key] = updates[key];
        }
      });

      folder.updatedAt = new Date().toISOString();
      folder._localSync = folder._localSync || {};
      folder._localSync.modified = true;
      folder._localSync.synced = false;

      folders[folderId] = folder;
      localStorage.setItem(this.storageKeys.folders, JSON.stringify(folders));
      
      // Add to sync queue
      this.addToSyncQueue('UPDATE_FOLDER', { _id: folderId, ...updates });
      
      return folder;
    } catch (error) {
      console.error('Error updating folder:', error);
      throw error;
    }
  }

  // Delete folder (soft delete)
  deleteFolder(folderId, deleteTasksToo = false) {
    try {
      const folders = JSON.parse(localStorage.getItem(this.storageKeys.folders) || '{}');
      const folder = folders[folderId];
      
      if (!folder) {
        throw new Error('Folder not found');
      }

      // If deleteTasksToo is true, also delete all tasks in the folder
      if (deleteTasksToo) {
        const folderTasks = this.getTasksByFolder(folderId);
        folderTasks.forEach(task => {
          this.deleteTask(task._id);
        });
      }

      folder.deletedAt = new Date().toISOString();
      folder.updatedAt = new Date().toISOString();
      folder._localSync = folder._localSync || {};
      folder._localSync.modified = true;
      folder._localSync.synced = false;

      folders[folderId] = folder;
      localStorage.setItem(this.storageKeys.folders, JSON.stringify(folders));
      
      // Add to sync queue
      const syncAction = deleteTasksToo ? 'DELETE_FOLDER_WITH_TASKS' : 'DELETE_FOLDER_ONLY';
      this.addToSyncQueue(syncAction, { _id: folderId });
      
      return folder;
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  }

  // ==================== SYNC QUEUE OPERATIONS ====================

  // Add operation to sync queue
  addToSyncQueue(operation, data) {
    try {
      const syncQueue = JSON.parse(localStorage.getItem(this.storageKeys.syncQueue) || '[]');
      
      const queueItem = {
        id: this.generateId(),
        operation,
        data,
        timestamp: new Date().toISOString(),
        retries: 0,
        maxRetries: 3
      };

      syncQueue.push(queueItem);
      localStorage.setItem(this.storageKeys.syncQueue, JSON.stringify(syncQueue));
      
      return queueItem;
    } catch (error) {
      console.error('Error adding to sync queue:', error);
      throw error;
    }
  }

  // Get sync queue
  getSyncQueue() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKeys.syncQueue) || '[]');
    } catch (error) {
      console.error('Error getting sync queue:', error);
      return [];
    }
  }

  // Remove item from sync queue
  removeFromSyncQueue(queueItemId) {
    try {
      const syncQueue = JSON.parse(localStorage.getItem(this.storageKeys.syncQueue) || '[]');
      const filteredQueue = syncQueue.filter(item => item.id !== queueItemId);
      localStorage.setItem(this.storageKeys.syncQueue, JSON.stringify(filteredQueue));
    } catch (error) {
      console.error('Error removing from sync queue:', error);
    }
  }

  // Clear sync queue
  clearSyncQueue() {
    localStorage.setItem(this.storageKeys.syncQueue, JSON.stringify([]));
  }

  // Update sync queue item (for retry counts, etc.)
  updateSyncQueueItem(updatedItem) {
    try {
      const syncQueue = JSON.parse(localStorage.getItem(this.storageKeys.syncQueue) || '[]');
      const itemIndex = syncQueue.findIndex(item => item.id === updatedItem.id);
      
      if (itemIndex !== -1) {
        syncQueue[itemIndex] = updatedItem;
        localStorage.setItem(this.storageKeys.syncQueue, JSON.stringify(syncQueue));
      }
    } catch (error) {
      console.error('Error updating sync queue item:', error);
    }
  }

  // Mark item as synced
  markAsSynced(itemType, itemId, serverData = null) {
    try {
      const storageKey = itemType === 'task' ? this.storageKeys.tasks : this.storageKeys.folders;
      const items = JSON.parse(localStorage.getItem(storageKey) || '{}');
      
      if (items[itemId]) {
        items[itemId]._localSync = items[itemId]._localSync || {};
        items[itemId]._localSync.synced = true;
        items[itemId]._localSync.lastSyncAt = new Date().toISOString();
        
        // Update with server data if provided (resolve ID conflicts)
        if (serverData && serverData._id !== itemId) {
          // Server gave us a different ID, update our records
          const newId = serverData._id;
          items[itemId]._id = newId;
          items[newId] = { ...items[itemId], ...serverData };
          delete items[itemId];
          
          // Update references in tasks if this was a folder
          if (itemType === 'folder') {
            this.updateFolderReferences(itemId, newId);
          }
        } else if (serverData) {
          // Update with server data
          items[itemId] = { ...items[itemId], ...serverData };
        }
        
        localStorage.setItem(storageKey, JSON.stringify(items));
      }
    } catch (error) {
      console.error('Error marking as synced:', error);
    }
  }

  // Update folder references when folder ID changes
  updateFolderReferences(oldFolderId, newFolderId) {
    try {
      const tasks = JSON.parse(localStorage.getItem(this.storageKeys.tasks) || '{}');
      let updated = false;
      
      Object.keys(tasks).forEach(taskId => {
        if (tasks[taskId].folder === oldFolderId) {
          tasks[taskId].folder = newFolderId;
          updated = true;
        }
      });
      
      if (updated) {
        localStorage.setItem(this.storageKeys.tasks, JSON.stringify(tasks));
      }
    } catch (error) {
      console.error('Error updating folder references:', error);
    }
  }

  // ==================== SYNC METADATA ====================

  // Update last sync timestamp
  updateLastSync(timestamp = null) {
    const syncData = {
      timestamp: timestamp || new Date().toISOString()
    };
    localStorage.setItem(this.storageKeys.lastSync, JSON.stringify(syncData));
  }

  // Get last sync timestamp
  getLastSync() {
    try {
      const syncData = JSON.parse(localStorage.getItem(this.storageKeys.lastSync) || '{}');
      return syncData.timestamp;
    } catch (error) {
      console.error('Error getting last sync:', error);
      return null;
    }
  }

  // ==================== UTILITY METHODS ====================

  // Check if data needs sync (has unsaved changes)
  hasUnsyncedChanges() {
    const syncQueue = this.getSyncQueue();
    return syncQueue.length > 0;
  }

  // Get count of unsynced items
  getUnsyncedCount() {
    return this.getSyncQueue().length;
  }

  // Merge server data with local data
  mergeServerData(serverTasks, serverFolders) {
    try {
      // Merge folders first (tasks depend on folders)
      const localFolders = JSON.parse(localStorage.getItem(this.storageKeys.folders) || '{}');
      const mergedFolders = {};
      
      // Add server folders
      serverFolders.forEach(folder => {
        mergedFolders[folder._id] = {
          ...folder,
          _localSync: {
            created: false,
            modified: false,
            synced: true,
            lastSyncAt: new Date().toISOString()
          }
        };
      });
      
      // Keep local-only folders (not yet synced)
      Object.values(localFolders).forEach(folder => {
        if (folder._localSync && !folder._localSync.synced) {
          mergedFolders[folder._id] = folder;
        }
      });
      
      localStorage.setItem(this.storageKeys.folders, JSON.stringify(mergedFolders));
      
      // Merge tasks
      const localTasks = JSON.parse(localStorage.getItem(this.storageKeys.tasks) || '{}');
      const mergedTasks = {};
      
      // Add server tasks
      serverTasks.forEach(task => {
        mergedTasks[task._id] = {
          ...task,
          _localSync: {
            created: false,
            modified: false,
            synced: true,
            lastSyncAt: new Date().toISOString()
          }
        };
      });
      
      // Keep local-only tasks (not yet synced)
      Object.values(localTasks).forEach(task => {
        if (task._localSync && !task._localSync.synced) {
          mergedTasks[task._id] = task;
        }
      });
      
      localStorage.setItem(this.storageKeys.tasks, JSON.stringify(mergedTasks));
      
      this.updateLastSync();
      
      return {
        folders: Object.values(mergedFolders),
        tasks: Object.values(mergedTasks)
      };
    } catch (error) {
      console.error('Error merging server data:', error);
      throw error;
    }
  }

  // Clear all offline data (for logout)
  clearAllData() {
    Object.values(this.storageKeys).forEach(key => {
      localStorage.removeItem(key);
    });
    this.initializeStorage();
  }

  // Export all data (for backup/debugging)
  exportData() {
    const data = {};
    Object.entries(this.storageKeys).forEach(([key, storageKey]) => {
      try {
        data[key] = JSON.parse(localStorage.getItem(storageKey) || '{}');
      } catch (error) {
        data[key] = localStorage.getItem(storageKey);
      }
    });
    return data;
  }
}

export default OfflineStorage;