import { useState } from 'react'
import { sampleFolders, sampleTasks } from './data/sampleData'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import Login from './components/Login'

export default function App() {
  const [folders, setFolders] = useState(sampleFolders)
  const [tasksByFolder, setTasksByFolder] = useState(sampleTasks)
  const [activeFolder, setActiveFolder] = useState(folders[0].id)
  const [mobileOpen, setMobileOpen] = useState(false)

  function addFolder() {
    const name = prompt('New folder name')
    if (!name) return
    const id = name.toLowerCase().replace(/\s+/g, '-')
    setFolders((f) => [...f, { id, name }])
    setTasksByFolder((t) => ({ ...t, [id]: [] }))
    setActiveFolder(id)
  }

  function addTask() {
    const title = prompt('Task title')
    if (!title) return
    const description = prompt('Task description') || ''
    const due = prompt('Due date (YYYY-MM-DD)') || ''
    const task = { id: Date.now(), title, description, status: 'pending', due }
    setTasksByFolder((t) => ({ ...t, [activeFolder]: [...(t[activeFolder] || []), task] }))
  }

  function deleteTask(id) {
    if (!confirm('Delete this task?')) return
    setTasksByFolder((t) => ({ ...t, [activeFolder]: (t[activeFolder] || []).filter((x) => x.id !== id) }))
  }

  function toggleStatus(id) {
    setTasksByFolder((t) => ({
      ...t,
      [activeFolder]: (t[activeFolder] || []).map((task) => task.id === id ? { ...task, status: task.status === 'completed' ? 'pending' : task.status === 'pending' ? 'in-progress' : 'completed' } : task)
    }))
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppInner mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} folders={folders} tasksByFolder={tasksByFolder} activeFolder={activeFolder} setActiveFolder={setActiveFolder} addFolder={addFolder} addTask={addTask} toggleStatus={toggleStatus} deleteTask={deleteTask} />
      </AuthProvider>
    </BrowserRouter>
  )
}

function AppInner({ mobileOpen, setMobileOpen, folders, tasksByFolder, activeFolder, setActiveFolder, addFolder, addTask, toggleStatus, deleteTask }) {
  const location = useLocation()

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
