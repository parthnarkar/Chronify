export const sampleFolders = [
  { id: 'inbox', name: 'Inbox' },
  { id: 'work', name: 'Work' },
  { id: 'personal', name: 'Personal' },
  { id: 'shopping', name: 'Shopping' },
]

export const sampleTasks = {
  inbox: [
    { id: 1, title: 'Welcome to Chronify', description: 'This is your inbox. Add folders and tasks to get started.', status: 'pending', due: '2025-10-10' },
  ],
  work: [
    { id: 2, title: 'Design review', description: 'Review the new dashboard layout.', status: 'in-progress', due: '2025-10-05' },
    { id: 3, title: 'Client email', description: 'Send the project proposal.', status: 'pending', due: '2025-10-02' },
  ],
  personal: [
    { id: 4, title: 'Gym', description: 'Leg day', status: 'completed', due: '2025-09-30' },
  ],
  shopping: [],
}
