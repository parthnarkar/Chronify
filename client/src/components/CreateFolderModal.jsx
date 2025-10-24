import React, { useState } from 'react'

export default function CreateFolderModal({ open, onClose, onCreate }) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📁')
  const [submitting, setSubmitting] = useState(false)

  async function handleCreate(e) {
    e.preventDefault()
    if (!name) return
    setSubmitting(true)
    try {
      await onCreate({ name, icon })
      setName('')
      setIcon('📁')
      onClose()
    } catch (err) {
      console.error('Create folder failed', err)
    }
    setSubmitting(false)
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-30">
      <form onSubmit={handleCreate} className="bg-white rounded-lg p-6 w-full max-w-sm">
        <h3 className="text-lg font-semibold mb-3">Create Folder</h3>
        <div className="flex items-center gap-3 mb-3">
          <input value={icon} onChange={e=>setIcon(e.target.value)} className="w-12 text-center border rounded p-2" />
          <input required value={name} onChange={e=>setName(e.target.value)} placeholder="Folder name" className="flex-1 border rounded p-2" />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1 border rounded">Cancel</button>
          <button type="submit" disabled={submitting} className="px-3 py-1 bg-blue-600 text-white rounded">{submitting ? 'Creating...' : 'Create Folder'}</button>
        </div>
      </form>
    </div>
  )
}
