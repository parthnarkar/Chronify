import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Dashboard from '../pages/Dashboard'
import { Routes, Route, useLocation } from 'react-router-dom'
import PrivateRoute from '../components/PrivateRoute'
import Login from '../components/Login'
import { useAuth } from '../context/AuthContext'

export default function AppContainer() {
  const [folders, setFolders] = useState([])
  const [tasksByFolder, setTasksByFolder] = useState({})
  const [activeFolder, setActiveFolder] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)

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
          const fs = raw.map(f => ({ id: f._id, name: f.name }))
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
            map[fidId].push({ id: t._id, title: t.title, description: t.description, status: t.currentStatus || 'pending', due })
          })
          setTasksByFolder(map)
        }
      } catch (e) {
        console.error('Failed to load user data', e)
      }
    }
    loadData()
  }, [user, token])

  async function addFolder() {
    const name = prompt('New folder name')
    if (!name) return
    try {
      const post = await fetch('/api/folders', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Client-Uid': user?.uid }, body: JSON.stringify({ name }) })
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
      const mapped = fs.map(f => ({ id: f._id, name: f.name }))
      setFolders(mapped)
      if (mapped.length) setActiveFolder(mapped[0].id)
    } catch (e) {
      console.error('Failed to create folder', e)
    }
  }

  async function addTask() {
    const title = prompt('Task title')
    if (!title) return
    if (!activeFolder) {
      alert('Please create or select a folder before adding a task.')
      return
    }
    const description = prompt('Task description') || ''
    const due = prompt('Due date (YYYY-MM-DD)') || ''
    try {
      const res = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Client-Uid': user?.uid }, body: JSON.stringify({ title, description, dueDate: due, folder: activeFolder }) })
      if (!res.ok) {
        console.warn('Create task failed', res.status)
        return
      }
      const t = await res.json()
      // normalize server response into client shape
      const formattedDue = t.dueDate ? (typeof t.dueDate === 'string' ? t.dueDate.split('T')[0] : new Date(t.dueDate).toISOString().split('T')[0]) : ''
      setTasksByFolder((prev) => ({ ...prev, [activeFolder]: [...(prev[activeFolder] || []), { id: t._id, title: t.title, description: t.description, status: t.currentStatus || 'pending', due: formattedDue }] }))
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
          <Route path="/" element={<PrivateRoute><Dashboard folders={folders} tasksByFolder={tasksByFolder} activeFolder={activeFolder} setActiveFolder={setActiveFolder} addFolder={addFolder} addTask={addTask} toggleStatus={toggleStatus} deleteTask={deleteTask} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} /></PrivateRoute>} />
        </Routes>
      </div>
    </div>
  )
}
