import React, { useState, useRef, useEffect } from 'react'
import StatusPill from './StatusPill'

function priorityColor(priority) {
  if (priority === 'high') return 'bg-red-600'
  if (priority === 'medium') return 'bg-yellow-500'
  return 'bg-green-600'
}

export default function TaskItem({ task, toggleStatus, deleteTask, editTask, changePriority, folderId, animatingTask }) {
  const isCompleted = task.status === 'completed'
  const accent = priorityColor(task.priority)
  const priorityTextColor = task.priority === 'medium' ? 'text-black' : 'text-white'
  const isAnimatingOut = animatingTask && animatingTask.id === task.id
  const animDirection = isAnimatingOut && animatingTask.to === 'completed' ? 'translate-x-6' : isAnimatingOut && animatingTask.to === 'pending' ? '-translate-x-6' : 'translate-x-0'
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    function onDoc(e) {
      if (!ref.current) return
      if (!ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  return (
    <article className={`relative bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow transition-all ${isAnimatingOut ? `${animDirection} opacity-0` : 'translate-x-0 opacity-100'}`}>
      {/* left accent */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-md ${accent}`} />

      <div className="pl-4 pr-4 py-3 md:pl-6 md:pr-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-start gap-3 md:gap-4 md:flex-1 min-w-0">
          <label className="flex items-start gap-3 md:gap-4 w-full cursor-pointer">
            <input aria-label={`Mark ${task.title} as ${isCompleted ? 'incomplete' : 'completed'}`} type="checkbox" checked={isCompleted} onChange={() => toggleStatus(task.id)} className="mt-1 w-5 h-5 text-blue-600 rounded cursor-pointer" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className={`text-sm font-semibold truncate ${isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.title}</h4>
                <div className="hidden sm:inline-flex"><StatusPill status={task.status} /></div>
              </div>
              <p className="text-sm text-gray-500 mt-1 truncate">{task.description || 'No description'}</p>
            </div>
          </label>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          <div className="flex flex-col items-end md:items-center text-right md:text-left">
            <span className="text-xs text-gray-400">Due</span>
            <span className="text-sm text-gray-700">{task.due || '—'}</span>
          </div>

          <div className="relative flex flex-col items-end md:items-center text-right md:text-left" ref={ref}>
            <span className="text-xs text-gray-400">Priority</span>
            <button type="button" onClick={() => setOpen(o => !o)} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${accent} ${priorityTextColor}`}>
              <span className="mr-2">{(task.priority || 'low').toUpperCase()}</span>
              {/* down chevron */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" /></svg>
            </button>

            {open && (
              <div className="mt-2 bg-white border rounded shadow-md w-28 text-sm text-left right-0 absolute z-30">
                {['low', 'medium', 'high'].map(p => (
                  <button key={p} onClick={() => { setOpen(false); if (changePriority) changePriority(task.id, p) }} className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${task.priority === p ? 'font-semibold' : ''}`}>{p.charAt(0).toUpperCase() + p.slice(1)}</button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => editTask ? editTask(task, folderId) : alert('Edit Task')} title="Edit" className="p-1 rounded hover:bg-gray-100 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M20,16v4a2,2,0,0,1-2,2H4a2,2,0,0,1-2-2V6A2,2,0,0,1,4,4H8" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                <polygon fill="none" points="12.5 15.8 22 6.2 17.8 2 8.3 11.5 8 16 12.5 15.8" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} stroke="currentColor" />
              </svg>
            </button>

            <button onClick={() => deleteTask(task.id)} title="Delete" className="p-1 rounded hover:bg-red-50 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7m5-4h4m-7 4h10" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
