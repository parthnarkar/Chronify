import React from 'react'

export default function StatusPill({ status }) {
  const map = {
    pending: 'bg-gray-100 text-gray-800',
    'in-progress': 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
  }
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${map[status] || map.pending}`}>{status.replace('-', ' ')}</span>
}
