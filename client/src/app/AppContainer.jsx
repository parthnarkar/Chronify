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

  const location = useLocation()
  const { user, token } = useAuth()

  useEffect(() => {
    async function loadData() {
      if (!user) return
      try {
        const uid = user.uid
        const headers = { 'Content-Type': 'application/json', 'X-Client-Uid': uid }
        const [foldersRes, tasksRes] = await Promise.all([
          fetch('/api/folders', { headers }),
          fetch('/api/tasks', { headers }),
        ])
        if (foldersRes.ok) {
          const raw = await foldersRes.json()
          const fs = raw.map(f => ({ id: f._id, name: f.name, icon: f.icon || '📁' }))
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
      } catch (e) {
        console.error('Failed to load user data', e)
      }
    }
    loadData()
  }, [user, token])

  // open folder modal
  function addFolder() {
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
      const mapped = fs.map(f => ({ id: f._id, name: f.name, icon: f.icon }))
      setFolders(mapped)
      if (mapped.length) setActiveFolder(mapped[0].id)
    } catch (e) {
      console.error('Failed to create folder', e)
    }
  }

  function addTask() {
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
      const task = (tasksByFolder[activeFolder] || []).find(x => x.id === id)
      if (!task) return
      const next = task.status === 'completed' ? 'pending' : task.status === 'pending' ? 'in-progress' : 'completed'
      await fetch(`/api/tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Client-Uid': user?.uid }, body: JSON.stringify({ currentStatus: next }) })
      setTasksByFolder((t) => ({
        ...t,
        [activeFolder]: (t[activeFolder] || []).map((task) => task.id === id ? { ...task, status: next } : task)
      }))
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
          <Route path="/" element={<PrivateRoute><Dashboard folders={folders} tasksByFolder={tasksByFolder} activeFolder={activeFolder} setActiveFolder={setActiveFolder} addFolder={addFolder} addTask={addTask} toggleStatus={toggleStatus} deleteTask={deleteTask} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} /></PrivateRoute>} />
        </Routes>
        {/* Modals */}
        <CreateTaskModal open={showTaskModal} onClose={() => setShowTaskModal(false)} onCreate={handleCreateTask} folders={folders} activeFolder={activeFolder} />
        <CreateFolderModal open={showFolderModal} onClose={() => setShowFolderModal(false)} onCreate={handleCreateFolder} />
      </div>
    </div>
  )
}
