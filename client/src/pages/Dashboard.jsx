import React from 'react'
import FolderList from '../components/FolderList'
import TaskList from '../components/TaskList'
import IconPlus from '../components/IconPlus'

export default function Dashboard({ folders, tasksByFolder, activeFolder, setActiveFolder, addFolder, addTask, toggleStatus, deleteTask, mobileOpen, setMobileOpen }) {
  const tasks = tasksByFolder[activeFolder] || []

  return (
    <div className="md:grid md:grid-cols-4 gap-8">
      <aside className={`${mobileOpen ? 'block' : 'hidden'} md:block`}>
        <FolderList folders={folders} tasksByFolder={tasksByFolder} activeFolder={activeFolder} setActiveFolder={setActiveFolder} addFolder={addFolder} setMobileOpen={setMobileOpen} />
      </aside>

      <main className="md:col-span-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">{folders.find((x) => x.id === activeFolder)?.name}</h3>
            <p className="text-sm text-gray-500">{tasks.length} tasks</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={addTask} className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-md text-sm hover:bg-gray-50">
              <IconPlus /> Add Task
            </button>
          </div>
        </div>

        <TaskList tasks={tasks} toggleStatus={toggleStatus} deleteTask={deleteTask} />
      </main>
    </div>
  )
}
