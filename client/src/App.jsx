import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import AppContainer from './app/AppContainer'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContainer />
      </AuthProvider>
    </BrowserRouter>
  )
}
