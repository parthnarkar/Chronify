import React from 'react'
import TaskItem from './TaskItem'

export default function TaskList({ tasks, toggleStatus, deleteTask, editTask, changePriority, folderId, animatingTask, emptyMessage = 'No tasks yet — add your first task.' }) {
  return (
    <div className="space-y-4">
      {tasks.length === 0 && (
        <div className="p-6 border border-dashed border-gray-100 rounded-lg text-center text-gray-500">{emptyMessage}</div>
      )}

      {tasks.map((task, idx) => (
        <TaskItem key={task.id || idx} task={task} toggleStatus={toggleStatus} deleteTask={deleteTask} editTask={editTask} changePriority={changePriority} folderId={folderId} animatingTask={animatingTask} />
      ))}
    </div>
  )
}
