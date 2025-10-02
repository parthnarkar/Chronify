import React from 'react'
import IconPlus from './IconPlus'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase'
import { signOut } from 'firebase/auth'

export default function Navbar({ mobileOpen, setMobileOpen }) {
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await signOut(auth)
      navigate('/login')
    } catch (err) {
      console.error('Logout failed', err)
      // still navigate to login as a fallback
      navigate('/login')
    }
  }
  return (
    <header className="flex items-center justify-between py-6">
      <div className="flex items-center gap-3">
        <button onClick={() => setMobileOpen((s) => !s)} className="md:hidden p-2 rounded-md hover:bg-gray-100">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-2xl font-semibold tracking-tight">Chronify</h1>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => alert('Profile/settings placeholder')} className="px-3 py-1.5 rounded-md text-sm hover:bg-gray-100">Settings</button>
        <button onClick={handleLogout} className="px-3 py-1.5 rounded-md text-sm bg-red-50 hover:bg-red-100">Logout</button>
      </div>
    </header>
  )
}
