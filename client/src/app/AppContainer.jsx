import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Dashboard from '../pages/Dashboard'
import Profile from '../pages/Profile'
import TaskDetails from '../pages/TaskDetails'
import CreateTaskModal from '../components/CreateTaskModal'
import CreateFolderModal from '../components/CreateFolderModal'
import LoadingScreen from '../components/LoadingScreen'
import { Routes, Route, useLocation } from 'react-router-dom'
import PrivateRoute from '../components/PrivateRoute'
import Login from '../components/Login'
import { useAuth } from '../context/AuthContext'
import { usePWA } from '../context/PWAContext'

export default function AppContainer() {
  const [folders, setFolders] = useState([])
  const [tasksByFolder, setTasksByFolder] = useState({})
  const [activeFolder, setActiveFolder] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [editingFolder, setEditingFolder] = useState(null)
  const [animatingTask, setAnimatingTask] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Google sync state
  const [syncData, setSyncData] = useState({ 
    connected: false, 
    events: [], 
    mails: [], 
    lastSynced: null,
    syncing: false 
  })

  // AI analysis state
  const [aiAnalysisData, setAiAnalysisData] = useState({
    analyzing: false,
    lastAnalysis: null,
    analyzed: 0,
    meetingsDetected: 0,
    tasksCreated: 0,
    error: null
  })

  const location = useLocation()
  const { user, token, offlineDataService } = useAuth()
  const { isOnline, syncStatus } = usePWA()

  // Fallback star SVG (same art used server-side). If a folder has an SVG icon string
  // it will be rendered as markup in FolderList; otherwise we display emoji.
  const STAR_SVG = `<svg width="20" height="20" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M923.2 429.6H608l-97.6-304-97.6 304H97.6l256 185.6L256 917.6l256-187.2 256 187.2-100.8-302.4z" fill="#FAD97F" /><path d="M1024 396H633.6L512 21.6 390.4 396H0l315.2 230.4-121.6 374.4L512 770.4l316.8 232L707.2 628 1024 396zM512 730.4l-256 187.2 97.6-302.4-256-185.6h315.2l97.6-304 97.6 304h315.2l-256 185.6L768 917.6l-256-187.2z" fill="" /></svg>`

  function mapAndSortFolders(raw) {
    const mapped = raw.map(f => ({ id: f._id, name: f.name, icon: f.icon || (f.name === 'All Tasks' ? STAR_SVG : '📁') }))
    // Put 'All Tasks' at the top, keep others alphabetical
    mapped.sort((a, b) => {
      if (a.name === 'All Tasks' && b.name !== 'All Tasks') return -1
      if (b.name === 'All Tasks' && a.name !== 'All Tasks') return 1
      return a.name.localeCompare(b.name)
    })
    return mapped
  }
  // Simple confetti overlay: a centered emoji that pulses when a task is completed
  function ConfettiOverlay() {
    return (
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
        <div className="text-6xl animate-pulse">🎉</div>
      </div>
    )
  }

  useEffect(() => {
    async function loadData() {
      if (!user || !offlineDataService) return
      
      try {
        // Load folders from offline storage (will sync in background if online)
        const foldersResult = await offlineDataService.getFolders()
        if (foldersResult.success) {
          const fs = mapAndSortFolders(foldersResult.data)
          setFolders(fs)
          if (fs.length && !activeFolder) setActiveFolder(fs[0].id)
        }

        // Load tasks from offline storage
        const tasksResult = await offlineDataService.getTasks()
        if (tasksResult.success) {
          const tasks = tasksResult.data
          const map = {}
          tasks.forEach(t => {
            const fid = t.folder && t.folder._id ? t.folder._id : t.folder
            const fidId = fid ? String(fid) : 'unknown'
            if (!map[fidId]) map[fidId] = []
            
            // Map offline storage fields -> client-friendly fields
            const due = t.dueDate ? (typeof t.dueDate === 'string' ? t.dueDate.split('T')[0] : new Date(t.dueDate).toISOString().split('T')[0]) : ''
            map[fidId].push({ 
              id: t._id, 
              title: t.title, 
              description: t.description, 
              status: t.currentStatus || 'Pending', 
              due, 
              priority: t.priority || 'low',
              metadata: t.metadata || {} 
            })
          })
          setTasksByFolder(map)
        }

        // Try to load Google sync status if online
        if (isOnline) {
          try {
            const headers = { 'Content-Type': 'application/json', 'X-Client-Uid': user.uid }
            const syncRes = await fetch('/api/google/status', { headers })
            if (syncRes.ok) {
              const syncData = await syncRes.json()
              setSyncData(prev => ({ ...prev, ...syncData }))
            }
          } catch (e) {
            console.log('Could not fetch Google sync status:', e.message)
          }
        }
      } catch (e) {
        console.error('Failed to load user data', e)
      }
    }
    loadData()
  }, [user, offlineDataService, isOnline, activeFolder])

  // Listen for data changes from offline service
  useEffect(() => {
    if (!offlineDataService) return

    const unsubscribeDataChange = offlineDataService.subscribe('data_changed', async (changeInfo) => {
      console.log('📊 Data changed:', changeInfo)
      
      // Refresh folders and tasks when data changes
      if (changeInfo.type === 'folder') {
        const foldersResult = await offlineDataService.getFolders()
        if (foldersResult.success) {
          const fs = mapAndSortFolders(foldersResult.data)
          setFolders(fs)
          if (fs.length && !activeFolder) setActiveFolder(fs[0].id)
        }
      }
      
      if (changeInfo.type === 'task' || changeInfo.type === 'folder') {
        const tasksResult = await offlineDataService.getTasks()
        if (tasksResult.success) {
          const tasks = tasksResult.data
          const map = {}
          tasks.forEach(t => {
            const fid = t.folder && t.folder._id ? t.folder._id : t.folder
            const fidId = fid ? String(fid) : 'unknown'
            if (!map[fidId]) map[fidId] = []
            
            const due = t.dueDate ? (typeof t.dueDate === 'string' ? t.dueDate.split('T')[0] : new Date(t.dueDate).toISOString().split('T')[0]) : ''
            map[fidId].push({ 
              id: t._id, 
              title: t.title, 
              description: t.description, 
              status: t.currentStatus || 'Pending', 
              due, 
              priority: t.priority || 'low',
              metadata: t.metadata || {} 
            })
          })
          setTasksByFolder(map)
        }
      }
    })

    return unsubscribeDataChange
  }, [offlineDataService, activeFolder])

  // open folder modal
  function addFolder() {
    // ensure we're not in edit mode when creating a new folder
    setEditingFolder(null)
    setShowFolderModal(true)
  }

  async function handleCreateFolder({ name, icon }) {
    try {
      const result = await offlineDataService.createFolder({ name, icon })
      if (result.success) {
        console.log(result.offline ? '📱 Folder created offline' : '☁️ Folder created online')
        // Data change event will trigger UI refresh
      } else {
        console.warn('Create folder failed:', result.error)
        alert('Failed to create folder: ' + result.error)
      }
    } catch (e) {
      console.error('Failed to create folder', e)
      alert('Failed to create folder: ' + e.message)
    }
  }

  function openEditFolder(folder) {
    setEditingFolder({ id: folder.id, name: folder.name, icon: folder.icon })
    setShowFolderModal(true)
  }

  async function handleUpdateFolder({ id, name, icon }) {
    try {
      const result = await offlineDataService.updateFolder(id, { name, icon })
      if (result.success) {
        console.log(result.offline ? '📱 Folder updated offline' : '☁️ Folder updated online')
        setActiveFolder(id)
        setEditingFolder(null)
        setShowFolderModal(false)
        // Data change event will trigger UI refresh
      } else {
        console.warn('Update folder failed:', result.error)
        alert('Failed to update folder: ' + result.error)
      }
    } catch (e) {
      console.error('Failed to update folder', e)
      alert('Failed to update folder: ' + e.message)
    }
  }

  async function handleDeleteFolder(folderId, folderName) {
    if (folderName === 'All Tasks') {
      alert('The default "All Tasks" folder cannot be deleted.')
      return
    }
    
    // Note: Using native confirm for now, but this should ideally use the modal system
    if (!confirm('Delete folder and its tasks?')) return
    
    try {
      const result = await offlineDataService.deleteFolder(folderId, true) // true = delete tasks too
      if (result.success) {
        console.log(result.offline ? '📱 Folder deleted offline' : '☁️ Folder deleted online')
        
        // Update active folder if current one was deleted
        const remainingFolders = await offlineDataService.getFolders()
        if (remainingFolders.success && remainingFolders.data.length) {
          const fs = mapAndSortFolders(remainingFolders.data)
          if (!fs.find(f => f.id === activeFolder)) {
            setActiveFolder(fs[0].id)
          }
        }
        // Data change event will trigger UI refresh
      } else {
        console.warn('Delete folder failed:', result.error)
        alert('Failed to delete folder: ' + result.error)
      }
    } catch (e) {
      console.error('Failed to delete folder', e)
      alert('Failed to delete folder: ' + e.message)
    }
  }

  function addTask() {
    setShowTaskModal(true)
  }

  function openEditTask(task, folderId) {
    // ensure task includes folder id for editing
    setEditingTask({ ...task, folder: task.folder || folderId })
    setShowTaskModal(true)
  }

  async function handleCreateTask({ title, description, dueDate, folder: folderId, priority }) {
    try {
      const result = await offlineDataService.createTask({
        title,
        description,
        dueDate,
        folder: folderId || activeFolder,
        priority
      })
      
      if (result.success) {
        console.log(result.offline ? '📱 Task created offline' : '☁️ Task created online')
        // Data change event will trigger UI refresh
      } else {
        console.warn('Create task failed:', result.error)
        alert('Failed to create task: ' + result.error)
      }
    } catch (e) {
      console.error('Failed to create task', e)
      alert('Failed to create task: ' + e.message)
    }
  }

  async function handleUpdateTask({ id, title, description, dueDate, folder: folderId, priority }) {
    try {
      const result = await offlineDataService.updateTask(id, {
        title,
        description,
        dueDate,
        folder: folderId,
        priority
      })
      
      if (result.success) {
        console.log(result.offline ? '📱 Task updated offline' : '☁️ Task updated online')
        setEditingTask(null)
        // Data change event will trigger UI refresh
      } else {
        console.warn('Update task failed:', result.error)
        alert('Failed to update task: ' + result.error)
      }
    } catch (e) {
      console.error('Failed to update task', e)
      alert('Failed to update task: ' + e.message)
    }
  }

  // change priority inline (used by TaskItem dropdown)
  async function handleChangePriority(id, newPriority) {
    try {
      const result = await offlineDataService.changeTaskPriority(id, newPriority)
      if (result.success) {
        console.log(result.offline ? '📱 Priority changed offline' : '☁️ Priority changed online')
        // Data change event will trigger UI refresh
      } else {
        console.warn('Change priority failed:', result.error)
      }
    } catch (e) {
      console.error('Failed to change priority', e)
    }
  }

  // Google sync functionality
  async function handleGoogleSync() {
    if (!user) return
    
    setSyncData(prev => ({ ...prev, syncing: true }))
    
    try {
      const headers = { 'Content-Type': 'application/json', 'X-Client-Uid': user.uid }
      const res = await fetch('/api/google/sync', { 
        method: 'POST', 
        headers 
      })
      
      if (res.ok) {
        const data = await res.json()
        setSyncData(prev => ({
          ...prev,
          events: data.events || [],
          mails: data.mails || [],
          lastSynced: data.lastSynced,
          connected: true,
          syncing: false,
          error: null
        }))
        return true // Success indicator
      } else {
        const errorData = await res.json().catch(() => ({}))
        const errorMessage = errorData.message || `Sync failed with status ${res.status}`
        
        console.warn('Sync failed:', res.status, errorMessage)
        
        // Handle token expiry specifically
        if (res.status === 401 && errorMessage.includes('expired')) {
          setSyncData(prev => ({ 
            ...prev, 
            syncing: false, 
            connected: false,
            error: 'Access token expired. Please sign in with Google again to reconnect.' 
          }))
        } else {
          setSyncData(prev => ({ 
            ...prev, 
            syncing: false,
            error: errorMessage
          }))
        }
        return false
      }
    } catch (e) {
      console.error('Failed to sync Google data', e)
      setSyncData(prev => ({ 
        ...prev, 
        syncing: false,
        error: 'Network error. Please try again.'
      }))
      return false
    }
  }

  // AI analysis functionality  
  async function handleAIAnalysis() {
    if (!user) return
    
    setAiAnalysisData(prev => ({ ...prev, analyzing: true, error: null }))
    
    try {
      const headers = { 'Content-Type': 'application/json', 'X-Client-Uid': user.uid }
      const res = await fetch('/api/google/analyze-meetings', { 
        method: 'POST', 
        headers 
      })
      
      if (res.ok) {
        const data = await res.json()
        setAiAnalysisData(prev => ({
          ...prev,
          analyzing: false,
          lastAnalysis: new Date().toISOString(),
          analyzed: data.analyzed,
          meetingsDetected: data.meetingsDetected,
          tasksCreated: data.tasksCreated,
          error: null
        }))
        
        return data.tasksCreated > 0 // Return true if tasks were created
      } else {
        const errorData = await res.json().catch(() => ({}))
        const errorMessage = errorData.message || `AI analysis failed with status ${res.status}`
        
        setAiAnalysisData(prev => ({ 
          ...prev, 
          analyzing: false,
          error: errorMessage
        }))
        return false
      }
    } catch (e) {
      console.error('Failed to analyze meetings with AI', e)
      setAiAnalysisData(prev => ({ 
        ...prev, 
        analyzing: false,
        error: 'Network error. Please try again.'
      }))
      return false
    }
  }

  // Combined function for Google sync + AI analysis + data refresh
  async function handleSyncAndAnalyze() {
    if (!user) return
    
    try {
      // First perform Google sync
      console.log('🔄 Starting Google sync...')
      const syncSuccess = await handleGoogleSync()
      
      if (syncSuccess) {
        console.log('✅ Google sync completed, starting AI analysis...')
        
        // Then perform AI analysis
        const tasksCreated = await handleAIAnalysis()
        
        if (tasksCreated) {
          console.log('✅ AI analysis completed, refreshing data...')
          
          // Show loading screen briefly for user feedback
          setIsRefreshing(true)
          
          // Force refresh all data from backend to get properly formatted tasks
          setTimeout(async () => {
            try {
              // Refresh all folders and tasks data from backend
              const [foldersResult, tasksResult] = await Promise.all([
                offlineDataService.getFolders(),
                offlineDataService.getTasks()
              ])
              
              if (foldersResult.success && tasksResult.success) {
                // Data will be automatically updated via the data change listener
                console.log('📊 Data refreshed successfully - meeting tasks should now display properly')
                
                // Switch to MEETINGS folder if tasks were created there
                const meetingsFolder = foldersResult.data.find(f => f.name === 'MEETINGS')
                if (meetingsFolder && tasksCreated > 0) {
                  console.log('📁 Switching to MEETINGS folder to show new tasks')
                  setActiveFolder(meetingsFolder.id || meetingsFolder._id)
                }
              }
              
              // Hide loading screen
              setIsRefreshing(false)
              setSyncData(prev => ({ ...prev, syncing: false }))
              setAiAnalysisData(prev => ({ ...prev, analyzing: false }))
              
            } catch (refreshError) {
              console.error('Failed to refresh data:', refreshError)
              setIsRefreshing(false)
              setSyncData(prev => ({ ...prev, syncing: false }))
              setAiAnalysisData(prev => ({ ...prev, analyzing: false }))
            }
          }, 800) // Brief delay for user feedback
        } else {
          console.log('ℹ️ No new tasks created from AI analysis')
          // Just update status without refresh
          setSyncData(prev => ({ ...prev, syncing: false }))
          setAiAnalysisData(prev => ({ ...prev, analyzing: false }))
        }
      } else {
        console.log('❌ Google sync failed')
      }
    } catch (e) {
      console.error('Failed to sync and analyze:', e)
      setIsRefreshing(false)
      setSyncData(prev => ({ ...prev, syncing: false }))
      setAiAnalysisData(prev => ({ ...prev, analyzing: false }))
    }
  }

  async function deleteTask(id) {
    // Deletion confirmation is handled by the UI modal in TaskItem; proceed to delete
    try {
      const result = await offlineDataService.deleteTask(id)
      if (result.success) {
        console.log(result.offline ? '📱 Task deleted offline' : '☁️ Task deleted online')
        // Data change event will trigger UI refresh
      } else {
        console.warn('Delete task failed:', result.error)
      }
    } catch (e) {
      console.error('Failed to delete task', e)
    }
  }

  async function toggleStatus(id) {
    try {
      // find task in active folder or any folder (to support All Tasks view)
      let task = (tasksByFolder[activeFolder] || []).find(x => x.id === id)
      if (!task) {
        // search all folders
        for (const k of Object.keys(tasksByFolder)) {
          const found = (tasksByFolder[k] || []).find(x => x.id === id)
          if (found) {
            task = found
            break
          }
        }
      }
      if (!task) return
      
      const next = task.status === 'Completed' ? 'Pending' : 'Completed'

      // Start animation immediately
      setAnimatingTask({ id, to: next })

      // Update via offline service
      const result = await offlineDataService.toggleTaskStatus(id)
      
      // Complete animation after delay
      setTimeout(() => {
        setAnimatingTask(null)
        if (next === 'Completed') {
          setShowConfetti(true)
          setTimeout(() => setShowConfetti(false), 1200)
        }
      }, 260)

      if (result.success) {
        console.log(result.offline ? '📱 Status toggled offline' : '☁️ Status toggled online')
        // Data change event will trigger UI refresh
      } else {
        console.warn('Toggle status failed:', result.error)
        // Animation will still complete but data won't update
      }
    } catch (e) {
      console.error('Failed to toggle status', e)
      setAnimatingTask(null) // Stop animation on error
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-800 antialiased">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* only show Navbar when NOT on the /login route */}
        {location.pathname !== '/login' && <Navbar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />}

        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/" element={<PrivateRoute><Dashboard folders={folders} tasksByFolder={tasksByFolder} activeFolder={activeFolder} setActiveFolder={setActiveFolder} addFolder={addFolder} addTask={addTask} editTask={openEditTask} editFolder={openEditFolder} toggleStatus={toggleStatus} deleteTask={deleteTask} changePriority={handleChangePriority} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} animatingTask={animatingTask} deleteFolder={handleDeleteFolder} syncData={syncData} onGoogleSync={handleSyncAndAnalyze} onAIAnalysis={handleAIAnalysis} aiAnalysisData={aiAnalysisData} /></PrivateRoute>} />
          <Route path="/:taskId" element={<PrivateRoute><TaskDetails /></PrivateRoute>} />
        </Routes>
        {/* Modals */}
        <CreateTaskModal open={showTaskModal} onClose={() => { setShowTaskModal(false); setEditingTask(null) }} onCreate={handleCreateTask} onUpdate={handleUpdateTask} initial={editingTask} folders={folders} activeFolder={activeFolder} />
        <CreateFolderModal open={showFolderModal} onClose={() => { setShowFolderModal(false); setEditingFolder(null) }} onCreate={handleCreateFolder} onUpdate={handleUpdateFolder} initial={editingFolder} />
        
        {/* Loading Screen during refresh */}
        {isRefreshing && (
          <LoadingScreen 
            title="Syncing Complete!" 
            subtitle="Refreshing to display meeting tasks..." 
          />
        )}
        
        {showConfetti && <ConfettiOverlay />}
      </div>
    </div>
  )
}
