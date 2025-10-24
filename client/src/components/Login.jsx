import React, { useState } from 'react'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth } from '../firebase'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    // Firebase requires a minimum password length of 6
    if (mode === 'register' && password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }
    setIsSubmitting(true)
    try {
      let userCredential
      if (mode === 'login') {
        userCredential = await signInWithEmailAndPassword(auth, email, password)
      } else {
        // register
        userCredential = await createUserWithEmailAndPassword(auth, email, password)
        // We intentionally do not write a user document to Firestore here to avoid
        // potential security/rules or network errors blocking navigation. The
        // user's auth record is created in Firebase Auth successfully.
      }
  // Successful authentication with Firebase — navigate to dashboard.
      // All authentication/account management is handled in the frontend.
      navigate('/')
    } catch (err) {
      // Firebase auth errors include a code property (e.g., 'auth/invalid-email')
      // Log the full error (including non-enumerable properties) for debugging
      try {
        console.error('Full auth error:', err, JSON.stringify(err, Object.getOwnPropertyNames(err)))
      } catch (e) {
        console.error('Sign-in error', err)
      }

      // Map common Firebase Auth error codes to friendly messages
      const code = err.code || ''
      const codeMap = {
        'auth/email-already-in-use': 'This email is already registered. Try signing in or use another email.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/weak-password': 'Password is too weak. It should be at least 6 characters.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/user-not-found': 'No account found for this email. Please register first.'
      }

      const display = codeMap[code] || (err.message || 'Authentication failed')
      setError(display)
    }
    setIsSubmitting(false)
  }

  async function handleGoogleSignIn() {
    setError(null)
    setIsSubmitting(true)
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      // Successful sign-in via Google — navigate to dashboard
      navigate('/')
    } catch (err) {
      console.error('Google sign-in error', err)
      const code = err.code || ''
      const codeMap = {
        'auth/popup-closed-by-user': 'Popup closed before completing sign-in. Please try again.',
        'auth/cancelled-popup-request': 'Popup was cancelled. Try again.',
        'auth/popup-blocked': 'Popup was blocked by the browser. Allow popups for this site and try again.'
      }
      setError(codeMap[code] || (err.message || 'Google sign-in failed'))
    }
    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode('login')} className={`px-3 py-1 ${mode==='login' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Login</button>
        <button type="button" onClick={() => setMode('register')} className={`px-3 py-1 ${mode==='register' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Register</button>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full border rounded p-2" required />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full border rounded p-2" required />
      </div>

      {mode === 'register' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 block w-full border rounded p-2" required />
        </div>
      )}

      {mode === 'register' && (
        <div className="text-sm text-gray-500">By registering you agree to our terms. Passwords are stored by Firebase Auth (we do not save passwords in Firestore).</div>
      )}

      {error && <div className="text-red-500 text-sm">{error}</div>}

      <div>
          <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded">
            {isSubmitting ? 'Please wait...' : (mode === 'login' ? 'Sign in' : 'Register')}
          </button>
      </div>

        <div>
          <button type="button" onClick={handleGoogleSignIn} disabled={isSubmitting} className="mt-2 w-full inline-flex items-center justify-center gap-2 px-4 py-2 border rounded bg-white text-gray-700 hover:bg-gray-50">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18" height="18">
              <path fill="#fbbc05" d="M43.6 20.5H42V20H24v8h11.3C34.8 32.7 30.2 36 24 36c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.2 0 6.1 1.2 8.3 3.3l6-6C34.6 3 29.6 1 24 1 11.9 1 2 10.9 2 23s9.9 22 22 22c12 0 21.6-8.6 21.6-22 0-1.5-.2-2.9-.6-4.5z"/>
              <path fill="#518ef8" d="M6.3 14.6l6.6 4.8C14 16.3 18.6 13 24 13c3.2 0 6.1 1.2 8.3 3.3l6-6C34.6 3 29.6 1 24 1 16.5 1 9.8 5.4 6.3 14.6z"/>
              <path fill="#28b446" d="M24 47c5.5 0 10.5-1.8 14.3-5l-6.6-5.3C28.9 37.9 26.6 38.5 24 38.5c-6.2 0-11.8-3.3-14.6-8.3l-6.8 5.2C7.8 41.8 15.5 47 24 47z"/>
              <path fill="#f14336" d="M43.6 20.5H42V20H24v8h11.3c-1-2.8-1.6-5.8-1.6-8.9 0-3.1.6-6.1 1.6-8.9L43.6 20.5z"/>
            </svg>
            Sign in with Google
          </button>
        </div>
    </form>
  )
}
