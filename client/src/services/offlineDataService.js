/**
 * Offline Data Service
 * Main interface for components to interact with data (offline-first)
 */

import OfflineStorage from './offlineStorage.js';
import { getSyncService } from './syncService.js';

class OfflineDataService {
  constructor() {
    this.storage = new OfflineStorage();
    this.syncService = getSyncService();
    this.listeners = new Map();
  }

  // ==================== AUTHENTICATION ====================
  
  setUserId(userId) {
    this.storage.setUserId(userId);
    this.syncService.setUserId(userId);
  }

  getUserId() {
    return this.storage.getUserId();
  }

  logout() {
    this.storage.clearAllData();
    this.syncService.clearAllData();
  }

  // ==================== EVENT SYSTEM ====================
  
  // Subscribe to data changes
  subscribe(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);
    
    return () => {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  // Emit data change events
  emit(eventType, data) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${eventType} listener:`, error);
        }
      });
    }
  }

  // ==================== TASKS API ====================
  
  // Get all tasks
  async getTasks() {
    try {
      const tasks = this.storage.getAllTasks();
      return {
        success: true,
        data: tasks,
        fromCache: true
      };
    } catch (error) {
      console.error('Error getting tasks:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  // Get tasks by folder
  async getTasksByFolder(folderId) {
    try {
      const tasks = this.storage.getTasksByFolder(folderId);
      return {
        success: true,
        data: tasks,
        fromCache: true
      };
    } catch (error) {
      console.error('Error getting tasks by folder:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  // Get single task
  async getTask(taskId) {
    try {
      const task = this.storage.getTaskById(taskId);
      return {
        success: true,
        data: task,
        fromCache: true
      };
    } catch (error) {
      console.error('Error getting task:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  // Create new task
  async createTask(taskData) {
    try {
      const task = this.storage.createTask(taskData);
      this.emit('task_created', task);
      this.emit('data_changed', { type: 'task', action: 'create', data: task });
      
      return {
        success: true,
        data: task,
        offline: !this.syncService.getOnlineStatus()
      };
    } catch (error) {
      console.error('Error creating task:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Update task
  async updateTask(taskId, updates) {
    try {
      const task = this.storage.updateTask(taskId, updates);
      this.emit('task_updated', { taskId, task, updates });
      this.emit('data_changed', { type: 'task', action: 'update', data: task });
      
      return {
        success: true,
        data: task,
        offline: !this.syncService.getOnlineStatus()
      };
    } catch (error) {
      console.error('Error updating task:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Delete task
  async deleteTask(taskId) {
    try {
      const task = this.storage.deleteTask(taskId);
      this.emit('task_deleted', { taskId, task });
      this.emit('data_changed', { type: 'task', action: 'delete', data: task });
      
      return {
        success: true,
        data: task,
        offline: !this.syncService.getOnlineStatus()
      };
    } catch (error) {
      console.error('Error deleting task:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Toggle task status
  async toggleTaskStatus(taskId) {
    try {
      const task = this.storage.getTaskById(taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      const newStatus = task.currentStatus === 'Completed' ? 'Pending' : 'Completed';
      return await this.updateTask(taskId, { currentStatus: newStatus });
    } catch (error) {
      console.error('Error toggling task status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Change task priority
  async changeTaskPriority(taskId, priority) {
    try {
      return await this.updateTask(taskId, { priority });
    } catch (error) {
      console.error('Error changing task priority:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ==================== FOLDERS API ====================
  
  // Get all folders
  async getFolders() {
    try {
      const folders = this.storage.getAllFolders();
      return {
        success: true,
        data: folders,
        fromCache: true
      };
    } catch (error) {
      console.error('Error getting folders:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  // Get folders with tasks
  async getFoldersWithTasks() {
    try {
      const foldersWithTasks = this.storage.getFoldersWithTasks();
      return {
        success: true,
        data: foldersWithTasks,
        fromCache: true
      };
    } catch (error) {
      console.error('Error getting folders with tasks:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  // Create new folder
  async createFolder(folderData) {
    try {
      const folder = this.storage.createFolder(folderData);
      this.emit('folder_created', folder);
      this.emit('data_changed', { type: 'folder', action: 'create', data: folder });
      
      return {
        success: true,
        data: folder,
        offline: !this.syncService.getOnlineStatus()
      };
    } catch (error) {
      console.error('Error creating folder:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Update folder
  async updateFolder(folderId, updates) {
    try {
      const folder = this.storage.updateFolder(folderId, updates);
      this.emit('folder_updated', { folderId, folder, updates });
      this.emit('data_changed', { type: 'folder', action: 'update', data: folder });
      
      return {
        success: true,
        data: folder,
        offline: !this.syncService.getOnlineStatus()
      };
    } catch (error) {
      console.error('Error updating folder:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Delete folder
  async deleteFolder(folderId, deleteTasksToo = false) {
    try {
      const folder = this.storage.deleteFolder(folderId, deleteTasksToo);
      this.emit('folder_deleted', { folderId, folder, deleteTasksToo });
      this.emit('data_changed', { type: 'folder', action: 'delete', data: folder });
      
      return {
        success: true,
        data: folder,
        offline: !this.syncService.getOnlineStatus()
      };
    } catch (error) {
      console.error('Error deleting folder:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ==================== SYNC STATUS ====================
  
  // Get sync status
  getSyncStatus() {
    return this.syncService.getSyncStatus();
  }

  // Force sync
  async forceSync() {
    return await this.syncService.forcSync();
  }

  // Subscribe to sync events
  onSyncComplete(callback) {
    return this.syncService.onSyncComplete(callback);
  }

  // Subscribe to online status changes
  onStatusChange(callback) {
    return this.syncService.onStatusChange(callback);
  }

  // ==================== UTILITY METHODS ====================
  
  // Get statistics
  async getStatistics() {
    try {
      const tasks = this.storage.getAllTasks();
      const folders = this.storage.getAllFolders();
      
      const stats = {
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.currentStatus === 'Completed').length,
        pendingTasks: tasks.filter(t => t.currentStatus === 'Pending').length,
        totalFolders: folders.length,
        tasksByPriority: {
          high: tasks.filter(t => t.priority === 'high').length,
          medium: tasks.filter(t => t.priority === 'medium').length,
          low: tasks.filter(t => t.priority === 'low').length
        },
        tasksByFolder: folders.reduce((acc, folder) => {
          acc[folder.name] = tasks.filter(t => t.folder === folder._id).length;
          return acc;
        }, {}),
        recentActivity: tasks
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
          .slice(0, 10)
      };
      
      return {
        success: true,
        data: stats,
        fromCache: true
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      return {
        success: false,
        error: error.message,
        data: {}
      };
    }
  }

  // Search tasks
  async searchTasks(query) {
    try {
      const tasks = this.storage.getAllTasks();
      const searchResults = tasks.filter(task => 
        task.title.toLowerCase().includes(query.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(query.toLowerCase()))
      );
      
      return {
        success: true,
        data: searchResults,
        fromCache: true
      };
    } catch (error) {
      console.error('Error searching tasks:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  // Export data
  exportData() {
    return this.storage.exportData();
  }

  // Initialize with server data (called after login)
  async initializeWithServerData() {
    if (this.syncService.getOnlineStatus()) {
      try {
        await this.syncService.syncWhenOnline();
        return { success: true };
      } catch (error) {
        console.error('Error initializing with server data:', error);
        return { success: false, error: error.message };
      }
    }
    return { success: true, offline: true };
  }
}

// Singleton instance
let dataServiceInstance = null;

export const getOfflineDataService = () => {
  if (!dataServiceInstance) {
    dataServiceInstance = new OfflineDataService();
  }
  return dataServiceInstance;
};

export default OfflineDataService;