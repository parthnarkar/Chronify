import React, { useState, useEffect } from 'react'
import TaskItem from './TaskItem'

export default function TaskList({ tasks, toggleStatus, deleteTask, editTask, changePriority, folderId, animatingTask, emptyMessage = 'No tasks yet — add your first task.' }) {
  const [deletingTasks, setDeletingTasks] = useState(new Set())
  
  // Enhanced delete function with immediate UI feedback
  const handleDeleteTask = async (taskId) => {
    // Add to deleting set for immediate UI update
    setDeletingTasks(prev => new Set(prev).add(taskId))
    
    try {
      // Call the actual delete function
      await deleteTask(taskId)
    } catch (error) {
      // If delete fails, remove from deleting set
      console.error('Failed to delete task:', error)
      setDeletingTasks(prev => {
        const newSet = new Set(prev)
        newSet.delete(taskId)
        return newSet
      })
    }
  }
  
  // Remove from deleting set when task is actually removed from tasks prop
  useEffect(() => {
    const currentTaskIds = new Set(tasks.map(task => task.id))
    setDeletingTasks(prev => {
      const newSet = new Set()
      for (const taskId of prev) {
        if (currentTaskIds.has(taskId)) {
          newSet.add(taskId)
        }
      }
      return newSet
    })
  }, [tasks])
  
  // Filter out tasks that are being deleted
  const visibleTasks = tasks.filter(task => !deletingTasks.has(task.id))

  return (
    <div className="space-y-4">
      {visibleTasks.length === 0 && (
        <div className="p-6 border border-dashed border-gray-100 rounded-lg text-center text-gray-500">{emptyMessage}</div>
      )}

      {visibleTasks.map((task, idx) => (
        <TaskItem 
          key={task.id || idx} 
          task={task} 
          toggleStatus={toggleStatus} 
          deleteTask={handleDeleteTask} 
          editTask={editTask} 
          changePriority={changePriority} 
          folderId={folderId} 
          animatingTask={animatingTask} 
        />
      ))}
    </div>
  )
}
