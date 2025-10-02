import React from 'react'
import StatusPill from './StatusPill'

export default function TaskItem({ task, toggleStatus, deleteTask }) {
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
        <div className="text-sm text-gray-400">{task.due}</div>
        <div className="flex items-center gap-2">
          <button onClick={() => alert('edit placeholder')} className="text-sm text-gray-500 hover:text-gray-700">Edit</button>
          <button onClick={() => deleteTask(task.id)} className="text-sm text-red-500 hover:text-red-600">Delete</button>
        </div>
      </div>
    </article>
  )
}
