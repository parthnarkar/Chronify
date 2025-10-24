import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { user, loading } = useAuth()
  const [photoSrc, setPhotoSrc] = useState('/user-profile.png')

  useEffect(() => {
    if (!user) return
    const photoFromUser = user.photoURL || null
    const providerPhoto = user && Array.isArray(user.providerData) && user.providerData.length
      ? (user.providerData.find(pd => pd && pd.photoURL && pd.photoURL.length)?.photoURL || null)
      : null
    const photoUrl = photoFromUser || providerPhoto || '/user-profile.png'
    if (photoUrl && (photoUrl.startsWith('http://') || photoUrl.startsWith('https://'))) {
      setPhotoSrc(`/api/avatar?u=${encodeURIComponent(photoUrl)}`)
    } else {
      setPhotoSrc(photoUrl)
    }
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Not signed in.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="bg-white border border-gray-100 rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-6">
          <img src={photoSrc} alt="profile" className="w-24 h-24 rounded-full object-cover border" onError={(e)=>{ e.target.onerror=null; e.target.src='/user-profile.png' }} />
          <div>
            <h2 className="text-2xl font-semibold">{user.displayName || 'Unnamed user'}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
            <p className="mt-2 text-sm text-gray-600">UID: <span className="font-mono text-xs text-gray-700">{user.uid}</span></p>
          </div>
        </div>
          <div className="p-4 bg-gray-50 rounded">
            <h3 className="text-sm font-medium text-gray-700">Account details</h3>
            <div className="mt-2 text-sm text-gray-600 space-y-1">
              <div><strong>Name:</strong> {user.displayName || '—'}</div>
              <div><strong>Email:</strong> {user.email || '—'}</div>
              <div><strong>Email verified:</strong> {user.emailVerified ? 'Yes' : 'No'}</div>
              <div><strong>Phone:</strong> {user.phoneNumber || '—'}</div>
            </div>
          </div>
        </div>
      </div>
  )
}
