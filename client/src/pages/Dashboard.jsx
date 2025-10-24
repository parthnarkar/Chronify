import React from 'react'
import FolderList from '../components/FolderList'
import TaskList from '../components/TaskList'
import IconPlus from '../components/IconPlus'

export default function Dashboard({ folders, tasksByFolder, activeFolder, setActiveFolder, addFolder, addTask, editTask, editFolder, toggleStatus, deleteTask, changePriority, mobileOpen, setMobileOpen, animatingTask, deleteFolder }) {
  const activeFolderObj = folders.find((x) => x.id === activeFolder)
  let tasks = []
  if (activeFolderObj && activeFolderObj.name === 'All Tasks') {
    // flatten all tasks across folders
    tasks = Object.values(tasksByFolder).flat()
  } else {
    tasks = tasksByFolder[activeFolder] || []
  }
  const pending = tasks.filter(t => t.status !== 'completed')
  const completed = tasks.filter(t => t.status === 'completed')

  return (
    <div className="md:grid md:grid-cols-4 gap-8">
      <aside className={`${mobileOpen ? 'block' : 'hidden'} md:block`}>
        <FolderList folders={folders} tasksByFolder={tasksByFolder} activeFolder={activeFolder} setActiveFolder={setActiveFolder} addFolder={addFolder} setMobileOpen={setMobileOpen} deleteFolder={deleteFolder} editFolder={editFolder} />
      </aside>

      <main className="md:col-span-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">{folders.find((x) => x.id === activeFolder)?.name}</h3>
            <p className="text-sm text-gray-500">{tasks.length} tasks</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={addTask} className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-md text-sm hover:bg-gray-50 cursor-pointer">
              <IconPlus /> Add Task
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold mb-3">Pending</h3>
            <TaskList tasks={pending} toggleStatus={toggleStatus} deleteTask={deleteTask} editTask={editTask} changePriority={changePriority} folderId={activeFolder} animatingTask={animatingTask} />
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Completed</h3>
            <TaskList tasks={completed} toggleStatus={toggleStatus} deleteTask={deleteTask} editTask={editTask} changePriority={changePriority} folderId={activeFolder} animatingTask={animatingTask} emptyMessage={"No completed tasks yet — finish some tasks to see them here."} />
          </div>
        </div>
      </main>
    </div>
  )
}
