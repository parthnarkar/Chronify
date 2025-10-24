import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import StatusPill from '../components/StatusPill'

function priorityColor(priority) {
  if (priority === 'high') return 'bg-red-600'
  if (priority === 'medium') return 'bg-yellow-500 text-black'
  return 'bg-green-600'
}

export default function TaskDetails() {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const headers = user ? { 'X-Client-Uid': user.uid } : {}
        // server doesn't expose single-task GET; fetch all and find id
        const res = await fetch('/api/tasks', { headers })
        if (!res.ok) throw new Error('Failed to load tasks')
        const ts = await res.json()
        const found = ts.find(t => String(t._id) === String(taskId) || String(t.id) === String(taskId))
        if (!found) {
          setError('Task not found')
          setTask(null)
        } else {
          setTask(found)
        }
      } catch (e) {
        console.error(e)
        setError('Failed to load task')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [taskId, user])

  const toggleStatus = async () => {
    if (!task) return
    setSaving(true)
    try {
      const next = (task.currentStatus || task.status) === 'completed' ? 'pending' : 'completed'
      const headers = { 'Content-Type': 'application/json' }
      if (user) headers['X-Client-Uid'] = user.uid
      const res = await fetch(`/api/tasks/${task._id || task.id}`, { method: 'PUT', headers, body: JSON.stringify({ currentStatus: next }) })
      if (!res.ok) throw new Error('Failed to update')
      const updated = await res.json()
      setTask(updated)
    } catch (e) {
      console.error(e)
      setError('Failed to update status')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="py-12 text-center">Loading task…</div>
  if (error) return (<div className="py-12 text-center text-red-500">{error} <div className="mt-4"><button onClick={() => navigate('/')} className="px-3 py-1 bg-gray-100 rounded">Go back</button></div></div>)

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{task.title}</h1>
          <div className="mt-2 flex items-center gap-3">
            <StatusPill status={task.currentStatus || task.status} />
            <span className={`px-2 py-1 rounded text-xs ${priorityColor(task.priority)}`}>{(task.priority || 'low').toUpperCase()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="px-3 py-2 bg-gray-100 rounded">Back</button>
          <button onClick={toggleStatus} disabled={saving} className="px-3 py-2 bg-blue-600 text-white rounded">{saving ? 'Saving…' : 'Toggle Status'}</button>
        </div>
      </div>

      <section className="bg-white border rounded p-6 shadow-sm">
        <h2 className="text-sm text-gray-500 mb-2">Description</h2>
        <p className="text-gray-800 mb-4">{task.description || 'No description'}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-xs text-gray-500">Due</h3>
            <p className="text-sm text-gray-800">{task.dueDate || task.due || '—'}</p>
          </div>

          <div>
            <h3 className="text-xs text-gray-500">Folder</h3>
            <p className="text-sm text-gray-800">{(task.folder && (task.folder.name || task.folder)) || '—'}</p>
          </div>

          <div>
            <h3 className="text-xs text-gray-500">Created by AI</h3>
            <p className="text-sm text-gray-800">{task.metadata?.aiGenerated ? 'Yes' : 'No'}</p>
          </div>

          <div>
            <h3 className="text-xs text-gray-500">Type</h3>
            <p className="text-sm text-gray-800">{task.metadata?.type || '—'}</p>
          </div>
        </div>

        {task.metadata && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold mb-2">Metadata</h3>
            <pre className="bg-gray-50 p-3 rounded text-xs text-gray-700 overflow-auto">{JSON.stringify(task.metadata, null, 2)}</pre>
          </div>
        )}
      </section>
    </div>
  )
}
