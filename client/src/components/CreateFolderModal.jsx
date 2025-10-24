import React, { useState } from 'react'

export default function CreateFolderModal({ open, onClose, onCreate, onUpdate, initial }) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📁')
  const [submitting, setSubmitting] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  const emojis = ['📁','📂','🧾','⭐️','✨','📌','🔖','📅','💡','🛠️','🎯','📚','🏷️','✅','🔥']

  // prefill when editing
  React.useEffect(() => {
    if (initial) {
      setName(initial.name || '')
      setIcon(initial.icon || '📁')
    } else {
      setName('')
      setIcon('📁')
    }
  }, [initial, open])

  async function handleCreate(e) {
    e.preventDefault()
    if (!name) return
    setSubmitting(true)
    try {
      if (initial && onUpdate) {
        await onUpdate({ id: initial.id, name, icon })
      } else {
        await onCreate({ name, icon })
      }
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
          <button type="button" onClick={() => setShowPicker(s => !s)} className="w-12 h-12 text-2xl flex items-center justify-center border rounded">{icon}</button>
          <input required value={name} onChange={e=>setName(e.target.value)} placeholder="Folder name" className="flex-1 border rounded p-2" />
        </div>
        {showPicker && (
          <div className="grid grid-cols-8 gap-2 mb-3 max-h-40 overflow-auto">
            {emojis.map(e => (
              <button key={e} type="button" onClick={() => { setIcon(e); setShowPicker(false) }} className="text-2xl p-2 hover:bg-gray-100 rounded">{e}</button>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1 border rounded">Cancel</button>
          <button type="submit" disabled={submitting} className="px-3 py-1 bg-blue-600 text-white rounded">{submitting ? (initial ? 'Updating...' : 'Creating...') : (initial ? 'Update' : 'Create Folder')}</button>
        </div>
      </form>
    </div>
  )
}
