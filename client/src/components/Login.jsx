import React, { useState } from 'react'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
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
        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded">{isSubmitting ? 'Please wait...' : (mode === 'login' ? 'Sign in' : 'Register')}</button>
      </div>
    </form>
  )
}
