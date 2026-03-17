import "bootstrap-icons/font/bootstrap-icons.css";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import Twemoji from "react-twemoji";
import "./Base/base.scss";
import "./Styles/notifications.scss";
import "./Components/Common/EmojiText.scss";
import { isAuthenticated, isAdmin } from "./API/auth";
import { fetchTenantKeyFromWebsite, fetchWebsiteUser } from "./API/apiKey";
import Login from "./Pages/Login/Login";
import Homepage from "./Pages/Homepage/homepage";
import Profile from "./Pages/Profile/Profile";
import Admin from "./Pages/Admin/Admin";
import AppointmentsPage from "./Pages/AppointmentsPage/AppointmentsPage";
import ReservationsPage from "./Pages/ReservationsPage/ReservationsPage";
import Configuration from "./Pages/Configuration/Configuration";
import ErrorBoundary from "./Components/Common/ErrorBoundary";

const FLASH_ERROR_KEY = "app_flash_error";

function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [flashError, setFlashError] = useState(null);
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const key = await fetchTenantKeyFromWebsite();
      if (key) await fetchWebsiteUser();
      if (!cancelled) setAuthChecked(true);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const msg = sessionStorage.getItem(FLASH_ERROR_KEY);
    if (msg) {
      sessionStorage.removeItem(FLASH_ERROR_KEY);
      setFlashError(msg);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!flashError) return;
    const t = setTimeout(() => setFlashError(null), 5000);
    return () => clearTimeout(t);
  }, [flashError]);

  // Composant pour protéger les routes
  const ProtectedRoute = ({ children, requireAdmin = false }) => {
    if (!authChecked) return null;

    if (!isAuthenticated()) {
      return <Navigate to="/login" replace />;
    }

    if (requireAdmin && !isAdmin()) {
      sessionStorage.setItem(FLASH_ERROR_KEY, "Vous n'avez pas les privilèges pour accéder à cette page.");
      return <Navigate to="/" replace />;
    }

    return children;
  };

  return (
    <ErrorBoundary>
      <Twemoji 
        options={{ 
          className: 'emoji-icon',
          folder: 'svg',
          ext: '.svg'
        }}
      >
        {flashError && (
        <div className="notification-toast error-message" style={{ position: "fixed", top: "1rem", left: "50%", transform: "translateX(-50%)", zIndex: 9999 }}>
          <i className="bi bi-exclamation-triangle-fill"></i>
          <span className="message-content">{flashError}</span>
        </div>
      )}
      <Routes>
        {/* Route publique */}
        <Route path="/login" element={isAuthenticated() ? <Navigate to="/" replace /> : <Login />} />

        {/* Routes protégées */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Homepage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <AppointmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reservations"
          element={
            <ProtectedRoute>
              <ReservationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/configuration"
          element={
            <ProtectedRoute>
              <Configuration />
            </ProtectedRoute>
          }
        />

        {/* Route admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin={true}>
              <Admin />
            </ProtectedRoute>
          }
        />

        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Twemoji>
    </ErrorBoundary>
  );
}

export default App;
