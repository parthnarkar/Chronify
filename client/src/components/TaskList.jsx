import React from 'react'
import TaskItem from './TaskItem'

export default function TaskList({ tasks, toggleStatus, deleteTask }) {
  return (
    <div className="space-y-4">
      {tasks.length === 0 && (
        <div className="p-6 border border-dashed border-gray-100 rounded-lg text-center text-gray-500">No tasks yet — add your first task.</div>
      )}

      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} toggleStatus={toggleStatus} deleteTask={deleteTask} />
      ))}
    </div>
  )
}
