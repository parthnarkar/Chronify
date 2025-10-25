import React from 'react'
import FolderList from '../components/FolderList'
import TaskList from '../components/TaskList'
import IconPlus from '../components/IconPlus'
import SyncStatusBar from '../components/SyncStatusBar'
import { usePWA } from '../context/PWAContext'

export default function Dashboard({ folders, tasksByFolder, activeFolder, setActiveFolder, addFolder, addTask, editTask, editFolder, toggleStatus, deleteTask, changePriority, mobileOpen, setMobileOpen, animatingTask, deleteFolder, syncData, onGoogleSync, onAIAnalysis, aiAnalysisData }) {
  const { isOnline, syncStatus, forceSync } = usePWA()
  const activeFolderObj = folders.find((x) => x.id === activeFolder)
  let tasks = []
  if (activeFolderObj && activeFolderObj.name === 'All Tasks') {
    // flatten all tasks across folders
    tasks = Object.values(tasksByFolder).flat()
  } else {
    tasks = tasksByFolder[activeFolder] || []
  }

  // Sort function for meeting tasks
  const sortMeetingTasks = (tasksToSort) => {
    const meetingTasks = tasksToSort.filter(t => t.metadata?.type === 'meeting')
    const regularTasks = tasksToSort.filter(t => t.metadata?.type !== 'meeting')

    // Sort meeting tasks by date using dueDate field
    meetingTasks.sort((a, b) => {
      const dateA = a.dueDate
      const dateB = b.dueDate
      
      if (!dateA && !dateB) return 0
      if (!dateA) return 1
      if (!dateB) return -1
      
      // Both are dates, compare directly
      return new Date(dateA).getTime() - new Date(dateB).getTime()
    })

    // Sort regular tasks by due date
    regularTasks.sort((a, b) => {
      const dateA = a.dueDate ? new Date(a.dueDate) : null
      const dateB = b.dueDate ? new Date(b.dueDate) : null
      
      if (!dateA && !dateB) return 0
      if (!dateA) return 1
      if (!dateB) return -1
      
      return dateA.getTime() - dateB.getTime()
    })

    // Return meeting tasks first (chronologically), then regular tasks
    return [...meetingTasks, ...regularTasks]
  }

  // Sort tasks appropriately
  const allSorted = activeFolderObj?.name === 'MEETINGS' ? 
    sortMeetingTasks(tasks) : 
    tasks.sort((a, b) => {
      if (a.metadata?.type === 'meeting' && b.metadata?.type === 'meeting') {
        const dateA = a.dueDate
        const dateB = b.dueDate
        
        if (!dateA && !dateB) return 0
        if (!dateA) return 1
        if (!dateB) return -1
        
        // Compare dueDate directly since they're proper Date objects
        return new Date(dateA).getTime() - new Date(dateB).getTime()
      }
      return 0
    })

  const pending = allSorted.filter(t => t.status !== 'Completed')
  const completed = allSorted.filter(t => t.status === 'Completed')

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
          {/* PWA Sync Status Bar */}
          <SyncStatusBar 
            isOnline={isOnline} 
            syncStatus={syncStatus} 
            onForceSync={forceSync}
          />

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
              <div className="flex gap-2">
                <button 
                  onClick={onGoogleSync}
                  disabled={syncData.syncing || aiAnalysisData?.analyzing || !syncData.connected}
                  className={`px-3 py-1.5 text-xs rounded-md font-medium cursor-pointer ${
                    syncData.connected 
                      ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  title="Sync Google data and analyze emails with AI"
                >
                  {syncData.syncing || aiAnalysisData?.analyzing 
                    ? (syncData.syncing ? 'Syncing...' : 'Analyzing...') 
                    : 'Sync Now'}
                </button>
              </div>
            </div>
            
            {syncData.connected && (
              <div className="grid gap-4">
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
            
            {/* AI Analysis Results */}
            {aiAnalysisData?.lastAnalysis && (
              <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-purple-900">🤖 AI Meeting Analysis</h4>
                  <span className="text-xs text-purple-700">
                    {new Date(aiAnalysisData.lastAnalysis).toLocaleString()}
                  </span>
                </div>
                <div className="text-xs text-purple-800">
                  Analyzed {aiAnalysisData.analyzed} emails • 
                  Found {aiAnalysisData.meetingsDetected} meetings • 
                  Created {aiAnalysisData.tasksCreated} tasks
                </div>
                {aiAnalysisData.error && (
                  <div className="text-xs text-red-600 mt-1">{aiAnalysisData.error}</div>
                )}
                {aiAnalysisData.tasksCreated > 0 && (
                  <div className="text-xs text-purple-700 mt-1">
                    ✅ Check your MEETINGS folder for new tasks!
                  </div>
                )}
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
