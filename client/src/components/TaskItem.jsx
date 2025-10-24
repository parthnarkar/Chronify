import React from 'react'
import StatusPill from './StatusPill'

function priorityColor(priority) {
  if (priority === 'high') return 'bg-red-600'
  if (priority === 'medium') return 'bg-yellow-500'
  return 'bg-green-600'
}

export default function TaskItem({ task, toggleStatus, deleteTask, editTask, folderId }) {
  const isCompleted = task.status === 'completed'
  const accent = priorityColor(task.priority)
  const priorityTextColor = task.priority === 'medium' ? 'text-black' : 'text-white'

  return (
    <article className="relative bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow transition-shadow">
      {/* left accent */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-md ${accent}`} />

      <div className="pl-4 pr-4 py-3 md:pl-6 md:pr-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-start gap-3 md:gap-4 md:flex-1 min-w-0">
          <label className="flex items-start gap-3 md:gap-4 w-full">
            <input aria-label={`Mark ${task.title} as ${isCompleted ? 'incomplete' : 'completed'}`} type="checkbox" checked={isCompleted} onChange={() => toggleStatus(task.id)} className="mt-1 w-5 h-5 text-blue-600 rounded" />
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

          <div className="flex flex-col items-end md:items-center text-right md:text-left">
            <span className="text-xs text-gray-400">Priority</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${accent} ${priorityTextColor}`}>{(task.priority || 'low').toUpperCase()}</span>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => editTask ? editTask(task, folderId) : alert('Edit Task')} title="Edit" className="p-1 rounded hover:bg-gray-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M20,16v4a2,2,0,0,1-2,2H4a2,2,0,0,1-2-2V6A2,2,0,0,1,4,4H8" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                <polygon fill="none" points="12.5 15.8 22 6.2 17.8 2 8.3 11.5 8 16 12.5 15.8" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} stroke="currentColor" />
              </svg>
            </button>

            <button onClick={() => deleteTask(task.id)} title="Delete" className="p-1 rounded hover:bg-red-50">
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
