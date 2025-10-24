import React from 'react'
import FolderList from '../components/FolderList'
import TaskList from '../components/TaskList'
import IconPlus from '../components/IconPlus'

export default function Dashboard({ folders, tasksByFolder, activeFolder, setActiveFolder, addFolder, addTask, editTask, editFolder, toggleStatus, deleteTask, changePriority, mobileOpen, setMobileOpen, animatingTask, deleteFolder, syncData, onGoogleSync }) {
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
          {/* Google Sync Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-blue-900">Google Integration</h3>
                <p className="text-xs text-blue-700">
                  {syncData.connected ? (
                    syncData.lastSynced ? 
                      `Last synced: ${new Date(syncData.lastSynced).toLocaleString()}` : 
                      'Connected but not synced yet'
                  ) : 'Sign in with Google to enable Calendar and Gmail sync'}
                </p>
                {syncData.error && (
                  <p className="text-xs text-red-600 mt-1">{syncData.error}</p>
                )}
              </div>
              <button 
                onClick={onGoogleSync}
                disabled={syncData.syncing || !syncData.connected}
                className={`px-3 py-1.5 text-xs rounded-md font-medium ${
                  syncData.connected 
                    ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {syncData.syncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
            
            {syncData.connected && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Calendar Events */}
                <div className="bg-white rounded border p-3">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">
                    📅 Upcoming Events ({syncData.events.length})
                  </h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {syncData.events.length > 0 ? (
                      syncData.events.slice(0, 3).map(event => (
                        <div key={event.id} className="text-xs">
                          <div className="font-medium text-gray-800 truncate">{event.summary}</div>
                          <div className="text-gray-500">
                            {new Date(event.start).toLocaleDateString()} {new Date(event.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500">No upcoming events</div>
                    )}
                    {syncData.events.length > 3 && (
                      <div className="text-xs text-blue-600">+ {syncData.events.length - 3} more events</div>
                    )}
                  </div>
                </div>

                {/* Gmail Emails */}
                <div className="bg-white rounded border p-3">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">
                    📧 Recent Meeting Emails ({syncData.mails.length})
                  </h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {syncData.mails.length > 0 ? (
                      syncData.mails.slice(0, 3).map(mail => (
                        <div key={mail.id} className="text-xs">
                          <div className="font-medium text-gray-800 truncate">{mail.subject}</div>
                          <div className="text-gray-500 truncate">{mail.from}</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500">No meeting emails found</div>
                    )}
                    {syncData.mails.length > 3 && (
                      <div className="text-xs text-blue-600">+ {syncData.mails.length - 3} more emails</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

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
