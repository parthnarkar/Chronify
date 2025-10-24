import React, { useEffect, useState } from 'react'

export default function CreateTaskModal({ open, onClose, onCreate, folders, activeFolder }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [folder, setFolder] = useState(activeFolder || '')
  const [priority, setPriority] = useState('low')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setFolder(activeFolder || '')
  }, [activeFolder, open])

  async function handleCreate(e) {
    e.preventDefault()
    if (!title) return
    setSubmitting(true)
    try {
      await onCreate({ title, description, dueDate: dueDate || null, folder: folder || activeFolder, priority })
      // reset
      setTitle('')
      setDescription('')
      setDueDate('')
      setPriority('low')
      onClose()
    } catch (err) {
      console.error('Create task failed', err)
    }
    setSubmitting(false)
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-30">
      <form onSubmit={handleCreate} className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-3">Create Task</h3>
        <label className="block mb-2 text-sm">Name</label>
        <input required value={title} onChange={e=>setTitle(e.target.value)} className="w-full border rounded p-2 mb-3" />

        <label className="block mb-2 text-sm">Description (optional)</label>
        <textarea value={description} onChange={e=>setDescription(e.target.value)} className="w-full border rounded p-2 mb-3" />

        <label className="block mb-2 text-sm">Due date</label>
        <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} className="w-full border rounded p-2 mb-3" />

        <label className="block mb-2 text-sm">Folder (optional)</label>
        <select value={folder} onChange={e=>setFolder(e.target.value)} className="w-full border rounded p-2 mb-3">
          <option value="">(current) {folders.find(f=>f.id===activeFolder)?.name || 'Inbox'}</option>
          {folders.map(f=> <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>

        <label className="block mb-2 text-sm">Priority</label>
        <select value={priority} onChange={e=>setPriority(e.target.value)} className="w-full border rounded p-2 mb-4">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1 border rounded">Cancel</button>
          <button type="submit" disabled={submitting} className="px-3 py-1 bg-blue-600 text-white rounded">{submitting ? 'Creating...' : 'Create Task'}</button>
        </div>
      </form>
    </div>
  )
}
