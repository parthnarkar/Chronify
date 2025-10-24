import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
// IconPlus intentionally not used here
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar({ mobileOpen, setMobileOpen }) {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [photoSrc, setPhotoSrc] = useState('/user-profile.png')
  const [hoverSupported, setHoverSupported] = useState(true)

  async function handleLogout() {
    try {
      await signOut()
      navigate('/login')
    } catch (err) {
      console.error('Logout failed', err)
      // still navigate to login as a fallback
      navigate('/login')
    }
  }

  // Prefer the top-level photoURL (available on the Firebase User),
  // otherwise look through providerData for any photoURL (e.g., google provider).
  // Fallback to a local placeholder image.
  const photoFromUser = user && user.photoURL ? user.photoURL : null
  const providerPhoto = user && Array.isArray(user.providerData) && user.providerData.length
    ? (user.providerData.find(pd => pd && pd.photoURL && pd.photoURL.length)?.photoURL || null)
    : null
  const photoUrl = photoFromUser || providerPhoto || '/user-profile.png'

  // Debug logs to help diagnose why Google avatar may not load in some environments.
  useEffect(() => {
    try {
      console.log('[Navbar] auth user object:', user)
      console.log('[Navbar] photoFromUser:', photoFromUser)
      console.log('[Navbar] providerPhoto:', providerPhoto)
      console.log('[Navbar] computed photoUrl:', photoUrl)
    } catch (e) {
      console.error('[Navbar] error logging user data', e)
    }
    // update the displayed src when user/photoUrl changes
    // If computed photoUrl is a remote https image, use the backend proxy to avoid opaque blocking
    try {
      if (photoUrl && (photoUrl.startsWith('http://') || photoUrl.startsWith('https://'))) {
        const proxied = `/api/avatar?u=${encodeURIComponent(photoUrl)}`
        setPhotoSrc(proxied)
      } else {
        setPhotoSrc(photoUrl)
      }
    } catch (e) {
      setPhotoSrc(photoUrl)
    }
  }, [user, photoFromUser, providerPhoto, photoUrl])
  // detect whether the device supports hover (desktop) — if not, we'll use click to open menu
  useEffect(() => {
    try {
      const mq = window.matchMedia('(hover: hover)')
      setHoverSupported(!!mq.matches)
      const onChange = (ev) => setHoverSupported(!!ev.matches)
      if (mq.addEventListener) mq.addEventListener('change', onChange)
      else if (mq.addListener) mq.addListener(onChange)
      return () => {
        if (mq.removeEventListener) mq.removeEventListener('change', onChange)
        else if (mq.removeListener) mq.removeListener(onChange)
      }
    } catch (e) {
      // default to hover supported
      setHoverSupported(true)
    }
  }, [])
  return (
    <header className="flex items-center justify-between py-6">
      <div className="flex items-center gap-3">
        <button onClick={() => setMobileOpen((s) => !s)} className="md:hidden p-2 rounded-md hover:bg-gray-100">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex items-center gap-2 cursor-pointer">
          {location.pathname && location.pathname.startsWith('/profile') && (
            <button onClick={() => navigate(-1)} aria-label="Go back" className="cursor-pointer text-gray-600 hover:text-gray-800 text-xl font-medium">&lt;</button>
          )}
          <h1 className="text-2xl font-semibold tracking-tight">
            <Link to="/" className="text-inherit no-underline">Chronify</Link>
          </h1>
        </div>
      </div>
      <div
        className="relative"
        onMouseEnter={() => { if (hoverSupported) setMenuOpen(true) }}
        onMouseLeave={() => { if (hoverSupported) setMenuOpen(false) }}
      >
        {/* Profile button */}
        <button
          onClick={() => { if (!hoverSupported) setMenuOpen((s) => !s) }}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="flex items-center gap-2 p-1 rounded-md hover:bg-gray-50 cursor-pointer"
        >
          <img src={photoSrc} alt="profile" className="w-10 h-10 rounded-full object-cover" onError={(e)=>{ console.warn('[Navbar] avatar failed to load, falling back', e?.target?.src); e.target.onerror=null; e.target.src='/user-profile.png'}} />
        </button>

        {/* Dropdown menu (hover on desktop, click on touch) with framer-motion animation */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              key="profile-menu"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 w-44 bg-white border border-gray-100 rounded-md shadow-lg z-20"
            >
              <div className="px-3 py-2">
                <button onClick={() => { setMenuOpen(false); navigate('/profile') }} className="w-full text-left px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">View Profile</button>
                <hr className="my-1" />
                <button onClick={() => { setMenuOpen(false); handleLogout() }} className="w-full text-left px-2 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer">Logout</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}
