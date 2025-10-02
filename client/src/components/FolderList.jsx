import React from 'react'

export default function FolderList({ folders, tasksByFolder, activeFolder, setActiveFolder, addFolder, setMobileOpen }) {
  return (
    <aside className={`md:col-span-1 bg-transparent`}>
      <div className="rounded-lg border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Folders</h2>
          <button onClick={addFolder} className="text-sm text-gray-500 hover:text-gray-700 p-1 rounded-md" title="Add folder">+</button>
        </div>
        <nav className="space-y-2">
          {folders.map((f) => (
            <button key={f.id} onClick={() => { setActiveFolder(f.id); setMobileOpen(false) }} className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between hover:bg-gray-50 ${activeFolder === f.id ? 'bg-gray-50 border-l-2 border-blue-400' : ''}`}>
              <span className="text-sm font-medium text-gray-700">{f.name}</span>
              <span className="text-xs text-gray-400">{(tasksByFolder[f.id] || []).length}</span>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  )
}
