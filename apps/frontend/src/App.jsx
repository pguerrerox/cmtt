import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import AdminTabsPage from './pages/AdminTabsPage.jsx'
import CreateProjectPage from './pages/CreateProjectPage.jsx'
import CreateOrderPage from './pages/CreateOrderPage.jsx'
import ProjectDetailsPage from './pages/ProjectDetailsPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ManagerProjectsPage from './pages/ManagerProjectsPage.jsx'
import AdminCustomerDetailsPage from './pages/AdminCustomerDetailsPage.jsx'
import { useSelectedManager } from './state/selectedManager.context.jsx'

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const { selectedManager, setSelectedManager } = useSelectedManager()
  const isLoggedIn = Boolean(selectedManager)
  const isAdmin = Number(selectedManager?.isAdmin) === 1
  const [accessMessage, setAccessMessage] = useState('')

  function getAdminRedirectPath() {
    if (!isLoggedIn) return '/'
    return '/manager'
  }

  useEffect(() => {
    if (location.state?.accessDenied) {
      setAccessMessage(location.state.accessDenied)
      const timeoutId = setTimeout(() => setAccessMessage(''), 2600)
      return () => clearTimeout(timeoutId)
    }
    return undefined
  }, [location.key, location.state])

  return (
    <div className="app-shell">
      <header className="topbar">
        <h1>CMTT</h1>
        <nav>
          <Link to="/">Home</Link>
          {selectedManager && <Link to="/manager">Manager</Link>}
          {isAdmin && <Link to="/admin">Admin</Link>}
          {!selectedManager && <Link to="/login">Login</Link>}
          {selectedManager && (
            <div className="auth-chip">
              <span>{selectedManager.fullname}</span>
              <button
                type="button"
                className="topbar-btn"
                onClick={() => {
                  setSelectedManager(null)
                  navigate('/')
                }}
              >
                Logout
              </button>
            </div>
          )}
        </nav>
      </header>

      {accessMessage && (
        <div className="access-toast" role="status" aria-live="polite">
          {accessMessage}
        </div>
      )}

      <main className="page-container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/manager" element={<ManagerProjectsPage />} />
          <Route
            path="/admin"
            element={
              <Navigate
                to={isAdmin ? '/admin/managers' : getAdminRedirectPath()}
                state={
                  isAdmin
                    ? undefined
                    : { accessDenied: 'Access denied: admin permissions required.' }
                }
                replace
              />
            }
          />
          <Route
            path="/admin/:tab"
            element={
              isAdmin
                ? <AdminTabsPage />
                : (
                  <Navigate
                    to={getAdminRedirectPath()}
                    state={{ accessDenied: 'Access denied: admin permissions required.' }}
                    replace
                  />
                )
            }
          />
          <Route
            path="/admin/customers/:customerId"
            element={
              isAdmin
                ? <AdminCustomerDetailsPage />
                : (
                  <Navigate
                    to={getAdminRedirectPath()}
                    state={{ accessDenied: 'Access denied: admin permissions required.' }}
                    replace
                  />
                )
            }
          />
          <Route path="/projects/new" element={<CreateProjectPage />} />
          <Route path="/orders/new" element={<CreateOrderPage />} />
          <Route path="/projects/:projectNumber" element={<ProjectDetailsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
