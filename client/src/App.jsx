import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import AppContainer from './app/AppContainer'
import PWAProvider from './context/PWAContext'

export default function App() {
  return (
    <BrowserRouter>
      <PWAProvider>
        <AuthProvider>
          <AppContainer />
        </AuthProvider>
      </PWAProvider>
    </BrowserRouter>
  )
}
