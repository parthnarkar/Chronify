import React, { useState, useRef, useEffect } from 'react'

export default function FolderList({ folders, tasksByFolder, activeFolder, setActiveFolder, addFolder, setMobileOpen, deleteFolder, editFolder }) {
  const [openMenuFor, setOpenMenuFor] = useState(null)
  const containerRef = useRef()

  useEffect(() => {
    function onDoc(e) {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target)) {
        setOpenMenuFor(null)
      }
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  return (
    <aside ref={containerRef} className={`md:col-span-1 bg-transparent`}>
      <div className="rounded-lg border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Folders</h2>
          <button onClick={addFolder} className="text-2xl text-gray-500 hover:text-gray-700 rounded-md cursor-pointer" title="Add folder">+</button>
        </div>
        <nav className="space-y-2">
          {folders.map((f) => (
            <div key={f.id} className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between hover:bg-gray-50 ${activeFolder === f.id ? 'bg-gray-50 border-l-2 border-blue-400' : ''}`}>
              <button onClick={() => { setActiveFolder(f.id); setMobileOpen(false) }} className="flex-1 text-left flex items-center gap-3 cursor-pointer">
                {f.icon && typeof f.icon === 'string' && f.icon.trim().startsWith('<svg') ? (
                  <span className="w-5 h-5" dangerouslySetInnerHTML={{ __html: f.icon }} />
                ) : (
                  <span className="text-xl">{f.icon || '📁'}</span>
                )}
                <span className="text-sm font-medium text-gray-700">{f.name}</span>
              </button>

              <div className="flex items-center gap-2 relative">
                <span className="text-xs text-gray-400 mr-2">{
                  f.name === 'All Tasks'
                    ? Object.values(tasksByFolder).reduce((sum, arr) => sum + (arr ? arr.length : 0), 0)
                    : (tasksByFolder[f.id] || []).length
                }</span>
                <button onClick={(e) => { e.stopPropagation(); setOpenMenuFor(openMenuFor === f.id ? null : f.id) }} title="Options" aria-label="Options" className="rounded cursor-pointer">
                  <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="bi bi-three-dots-vertical">
                    <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" />
                  </svg>
                </button>

                {openMenuFor === f.id && (
                  <div className="absolute right-0 top-9 bg-white border rounded shadow-md w-36 z-20">
                    <button onClick={() => { setOpenMenuFor(null); editFolder && editFolder(f) }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Edit</button>
                    {f.name !== 'All Tasks' ? (
                      <button onClick={() => { setOpenMenuFor(null); deleteFolder && deleteFolder(f.id, f.name) }} className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50">Delete</button>
                    ) : (
                      <div className="w-full text-left px-3 py-2 text-sm text-gray-400">Cannot delete</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  )
}
