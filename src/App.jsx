import "bootstrap-icons/font/bootstrap-icons.css";
import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Twemoji from "react-twemoji";
import "./Base/base.scss";
import "./Styles/notifications.scss";
import "./Components/Common/EmojiText.scss";
import { isAuthenticated, isAdmin } from "./API/auth";
import Login from "./Pages/Login/Login";
import Homepage from "./Pages/Homepage/homepage";
import Profile from "./Pages/Profile/Profile";
import Admin from "./Pages/Admin/Admin";
import AppointmentsPage from "./Pages/AppointmentsPage/AppointmentsPage";
import ReservationsPage from "./Pages/ReservationsPage/ReservationsPage";
import ContactsPage from "./Pages/ContactsPage/ContactsPage";
import Configuration from "./Pages/Configuration/Configuration";

function App() {
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    setAuthChecked(true);
  }, []);

  // Composant pour protéger les routes
  const ProtectedRoute = ({ children, requireAdmin = false }) => {
    if (!authChecked) return null;

    if (!isAuthenticated()) {
      return <Navigate to="/login" replace />;
    }

    if (requireAdmin && !isAdmin()) {
      return <Navigate to="/" replace />;
    }

    return children;
  };

  return (
    <Twemoji 
      options={{ 
        className: 'emoji-icon',
        folder: 'svg',
        ext: '.svg'
      }}
    >
      <Routes>
        {/* Route publique */}
        <Route path="/login" element={<Login />} />

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
          path="/appointments"
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
          path="/contacts"
          element={
            <ProtectedRoute>
              <ContactsPage />
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
  );
}

export default App;
