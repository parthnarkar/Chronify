// No-op auth middleware: authentication is handled entirely in the frontend.
// This middleware intentionally allows all requests to proceed.
export default function verifyFirebaseToken(req, res, next) {
  // Optionally, you can read a client-provided uid here (e.g., req.body.uid)
  // and attach it to req.user for controllers that expect a user. For now
  // we do not enforce authentication on the server.
  req.user = null
  return next()
}
