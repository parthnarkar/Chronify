import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Dashboard from '../pages/Dashboard'
import Profile from '../pages/Profile'
import CreateTaskModal from '../components/CreateTaskModal'
import CreateFolderModal from '../components/CreateFolderModal'
import { Routes, Route, useLocation } from 'react-router-dom'
import PrivateRoute from '../components/PrivateRoute'
import Login from '../components/Login'
import { useAuth } from '../context/AuthContext'

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
  
  // Google sync state
  const [syncData, setSyncData] = useState({ 
    connected: false, 
    events: [], 
    mails: [], 
    lastSynced: null,
    syncing: false 
  })

  const location = useLocation()
  const { user, token } = useAuth()

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
      if (!user) return
      try {
        const uid = user.uid
        const headers = { 'Content-Type': 'application/json', 'X-Client-Uid': uid }
        const [foldersRes, tasksRes, syncRes] = await Promise.all([
          fetch('/api/folders', { headers }),
          fetch('/api/tasks', { headers }),
          fetch('/api/google/status', { headers }),
        ])
        if (foldersRes.ok) {
          const raw = await foldersRes.json()
          const fs = mapAndSortFolders(raw)
          setFolders(fs)
          if (fs.length) setActiveFolder(fs[0].id)
        }
        if (tasksRes.ok) {
          const ts = await tasksRes.json()
          const map = {}
          ts.forEach(t => {
            // folder may be populated (object) or an id string
            const fid = t.folder && t.folder._id ? t.folder._id : t.folder
            const fidId = fid ? String(fid) : 'unknown'
            if (!map[fidId]) map[fidId] = []
            // map server fields -> client-friendly fields
            const due = t.dueDate ? (typeof t.dueDate === 'string' ? t.dueDate.split('T')[0] : new Date(t.dueDate).toISOString().split('T')[0]) : ''
            map[fidId].push({ id: t._id, title: t.title, description: t.description, status: t.currentStatus || 'pending', due, priority: t.priority || 'low' })
          })
          setTasksByFolder(map)
        }
        if (syncRes.ok) {
          const syncData = await syncRes.json()
          setSyncData(prev => ({ ...prev, ...syncData }))
        }
      } catch (e) {
        console.error('Failed to load user data', e)
      }
    }
    loadData()
  }, [user, token])

  // open folder modal
  function addFolder() {
    // ensure we're not in edit mode when creating a new folder
    setEditingFolder(null)
    setShowFolderModal(true)
  }

  async function handleCreateFolder({ name, icon }) {
    try {
      const post = await fetch('/api/folders', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Client-Uid': user?.uid }, body: JSON.stringify({ name, icon }) })
      if (!post.ok) {
        console.warn('Create folder failed', post.status)
        return
      }
      const res = await fetch('/api/folders', { headers: { 'X-Client-Uid': user?.uid } })
      if (!res.ok) {
        console.warn('Reload folders failed', res.status)
        return
      }
  const fs = await res.json()
  const mapped = mapAndSortFolders(fs)
  setFolders(mapped)
  if (mapped.length) setActiveFolder(mapped[0].id)
    } catch (e) {
      console.error('Failed to create folder', e)
    }
  }

  function openEditFolder(folder) {
    setEditingFolder({ id: folder.id, name: folder.name, icon: folder.icon })
    setShowFolderModal(true)
  }

  async function handleUpdateFolder({ id, name, icon }) {
    try {
      const res = await fetch(`/api/folders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Client-Uid': user?.uid }, body: JSON.stringify({ name, icon }) })
      if (!res.ok) {
        console.warn('Update folder failed', res.status)
        return
      }
      const updated = await res.json()
      // refresh folders
      const foldersRes = await fetch('/api/folders', { headers: { 'X-Client-Uid': user?.uid } })
      if (foldersRes.ok) {
        const raw = await foldersRes.json()
        const fs = mapAndSortFolders(raw)
        setFolders(fs)
        setActiveFolder(updated._id)
      }
      setEditingFolder(null)
      setShowFolderModal(false)
    } catch (e) {
      console.error('Failed to update folder', e)
    }
  }

  async function handleDeleteFolder(folderId, folderName) {
    if (folderName === 'All Tasks') {
      alert('The default "All Tasks" folder cannot be deleted.')
      return
    }
    if (!confirm('Delete folder and its tasks?')) return
    try {
      // server exposes two delete endpoints; we want to delete folder and its tasks
      const res = await fetch(`/api/folders/folder-with-tasks/${folderId}`, { method: 'DELETE', headers: { 'X-Client-Uid': user?.uid } })
      if (!res.ok) {
        console.warn('Delete folder failed', res.status)
        return
      }
      // reload folders and tasks
      const [foldersRes, tasksRes] = await Promise.all([
        fetch('/api/folders', { headers: { 'X-Client-Uid': user?.uid } }),
        fetch('/api/tasks', { headers: { 'X-Client-Uid': user?.uid } })
      ])
      if (foldersRes.ok) {
        const raw = await foldersRes.json()
        const fs = mapAndSortFolders(raw)
        setFolders(fs)
        if (fs.length && !fs.find(f => f.id === activeFolder)) setActiveFolder(fs[0].id)
      }
      if (tasksRes.ok) {
        const ts = await tasksRes.json()
        const map = {}
        ts.forEach(t => {
          const fid = t.folder && t.folder._id ? t.folder._id : t.folder
          const fidId = fid ? String(fid) : 'unknown'
          if (!map[fidId]) map[fidId] = []
          const due = t.dueDate ? (typeof t.dueDate === 'string' ? t.dueDate.split('T')[0] : new Date(t.dueDate).toISOString().split('T')[0]) : ''
          map[fidId].push({ id: t._id, title: t.title, description: t.description, status: t.currentStatus || 'pending', due, priority: t.priority || 'low' })
        })
        setTasksByFolder(map)
      }
    } catch (e) {
      console.error('Failed to delete folder', e)
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
      const res = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Client-Uid': user?.uid }, body: JSON.stringify({ title, description, dueDate, folder: folderId || activeFolder, priority }) })
      if (!res.ok) {
        console.warn('Create task failed', res.status)
        return
      }
      const t = await res.json()
      // normalize server response into client shape
      const formattedDue = t.dueDate ? (typeof t.dueDate === 'string' ? t.dueDate.split('T')[0] : new Date(t.dueDate).toISOString().split('T')[0]) : ''
      const folderKey = folderId || activeFolder
      setTasksByFolder((prev) => ({ ...prev, [folderKey]: [...(prev[folderKey] || []), { id: t._id, title: t.title, description: t.description, status: t.currentStatus || 'pending', due: formattedDue, priority: t.priority || 'low' }] }))
    } catch (e) {
      console.error('Failed to create task', e)
    }
  }

  async function handleUpdateTask({ id, title, description, dueDate, folder: folderId, priority }) {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Client-Uid': user?.uid }, body: JSON.stringify({ title, description, dueDate, folder: folderId, priority }) })
      if (!res.ok) {
        console.warn('Update task failed', res.status)
        return
      }
      const updated = await res.json()
      const newFolderKey = folderId || activeFolder
      // remove from any folder lists if folder changed
      setTasksByFolder((prev) => {
        const next = { ...prev }
        // remove from previous folder if it exists
        for (const k of Object.keys(next)) {
          next[k] = next[k].filter(t => t.id !== id)
        }
        const formattedDue = updated.dueDate ? (typeof updated.dueDate === 'string' ? updated.dueDate.split('T')[0] : new Date(updated.dueDate).toISOString().split('T')[0]) : ''
        const newTask = { id: updated._id, title: updated.title, description: updated.description, status: updated.currentStatus || 'pending', due: formattedDue, priority: updated.priority || 'low' }
        next[newFolderKey] = [...(next[newFolderKey] || []), newTask]
        return next
      })
      // clear editing
      setEditingTask(null)
    } catch (e) {
      console.error('Failed to update task', e)
    }
  }

  // change priority inline (used by TaskItem dropdown)
  async function handleChangePriority(id, newPriority) {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Client-Uid': user?.uid }, body: JSON.stringify({ priority: newPriority }) })
      if (!res.ok) {
        console.warn('Change priority failed', res.status)
        return
      }
      const updated = await res.json()
      // update local tasksByFolder keeping task in the same folder
      setTasksByFolder((prev) => {
        const next = { ...prev }
        for (const k of Object.keys(next)) {
          next[k] = next[k].map(t => t.id === id ? { ...t, priority: updated.priority || t.priority } : t)
        }
        return next
      })
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
      }
    } catch (e) {
      console.error('Failed to sync Google data', e)
      setSyncData(prev => ({ 
        ...prev, 
        syncing: false,
        error: 'Network error. Please try again.'
      }))
    }
  }

  async function deleteTask(id) {
    if (!confirm('Delete this task?')) return
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE', headers: { 'X-Client-Uid': user?.uid } })
      setTasksByFolder((t) => ({ ...t, [activeFolder]: (t[activeFolder] || []).filter((x) => x.id !== id) }))
    } catch (e) {
      console.error('Failed to delete task', e)
    }
  }

  async function toggleStatus(id) {
    try {
      // find task in active folder or any folder (to support All Tasks view)
      let sourceFolder = activeFolder
      let task = (tasksByFolder[activeFolder] || []).find(x => x.id === id)
      if (!task) {
        // search all folders
        for (const k of Object.keys(tasksByFolder)) {
          const found = (tasksByFolder[k] || []).find(x => x.id === id)
          if (found) {
            task = found
            sourceFolder = k
            break
          }
        }
      }
      if (!task) return
      const next = task.status === 'completed' ? 'pending' : 'completed'

      // request server update
      const res = await fetch(`/api/tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Client-Uid': user?.uid }, body: JSON.stringify({ currentStatus: next }) })
      if (!res.ok) {
        console.warn('Toggle status failed', res.status)
        return
      }
      const updated = await res.json()

      // play animation: mark animating then update UI after short delay
      setAnimatingTask({ id, to: next })
      setTimeout(() => {
        setTasksByFolder((t) => {
          const nextMap = { ...t }
          // remove/replace in sourceFolder
          nextMap[sourceFolder] = (nextMap[sourceFolder] || []).map((task) => task.id === id ? { ...task, status: updated.currentStatus || next } : task)
          return nextMap
        })
        setAnimatingTask(null)
        if (next === 'completed') {
          setShowConfetti(true)
          setTimeout(() => setShowConfetti(false), 1200)
        }
      }, 260)
    } catch (e) {
      console.error('Failed to toggle status', e)
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
          <Route path="/" element={<PrivateRoute><Dashboard folders={folders} tasksByFolder={tasksByFolder} activeFolder={activeFolder} setActiveFolder={setActiveFolder} addFolder={addFolder} addTask={addTask} editTask={openEditTask} editFolder={openEditFolder} toggleStatus={toggleStatus} deleteTask={deleteTask} changePriority={handleChangePriority} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} animatingTask={animatingTask} deleteFolder={handleDeleteFolder} syncData={syncData} onGoogleSync={handleGoogleSync} /></PrivateRoute>} />
        </Routes>
        {/* Modals */}
        <CreateTaskModal open={showTaskModal} onClose={() => { setShowTaskModal(false); setEditingTask(null) }} onCreate={handleCreateTask} onUpdate={handleUpdateTask} initial={editingTask} folders={folders} activeFolder={activeFolder} />
  <CreateFolderModal open={showFolderModal} onClose={() => { setShowFolderModal(false); setEditingFolder(null) }} onCreate={handleCreateFolder} onUpdate={handleUpdateFolder} initial={editingFolder} />
        {showConfetti && <ConfettiOverlay />}
      </div>
    </div>
  )
}
