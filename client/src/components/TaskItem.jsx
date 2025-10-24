import React from 'react'
import StatusPill from './StatusPill'

export default function TaskItem({ task, toggleStatus, deleteTask, editTask, folderId }) {
  const pClass = task.priority === 'high' ? 'bg-red-100 text-red-700' : task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
  return (
    <article className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm hover:shadow md:flex md:justify-between">
      <div>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <input type="checkbox" checked={task.status === 'completed'} onChange={() => toggleStatus(task.id)} className="w-5 h-5 text-blue-600 rounded" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-800">{task.title}</h4>
            <p className="text-sm text-gray-500 mt-1">{task.description}</p>
          </div>
        </div>
      </div>

      <div className="mt-3 md:mt-0 md:text-right flex items-center gap-4">
        <div><StatusPill status={task.status} /></div>
        <div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${pClass}`}>{task.priority || 'low'}</span>
        </div>
        <div className="text-sm text-gray-400">{task.due}</div>
        <div className="flex items-center gap-2">
          <button onClick={() => editTask ? editTask(task, folderId) : alert('Edit Task Details')} className="text-sm text-gray-500 hover:text-gray-700">Edit</button>
          <button onClick={() => deleteTask(task.id)} className="text-sm text-red-500 hover:text-red-600">Delete</button>
        </div>
      </div>
    </article>
  )
}
