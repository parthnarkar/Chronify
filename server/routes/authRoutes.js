import express from 'express'

const router = express.Router()

// Lightweight login endpoint for frontend-only authentication
// The frontend handles all authentication (signup/login) with Firebase Auth.
// This endpoint exists only to acknowledge the client and can be extended
// to create server-side sessions if you decide to add them later.
router.post('/login', (req, res) => {
  // We intentionally do NOT verify tokens here — auth is handled by the frontend.
  // Optionally the client may send identifying info in the body if needed.
  const info = req.body || {}
  return res.json({ message: 'Authenticated (frontend)', info })
})

export default router
