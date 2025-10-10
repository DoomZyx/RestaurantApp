import "bootstrap-icons/font/bootstrap-icons.css";
import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "./Base/base.scss";
import { isAuthenticated, isAdmin } from "./API/auth";
import Login from "./Pages/Login/Login";
import Homepage from "./Pages/Homepage/homepage";
import CallsList from "./Pages/CallsList/CallsList";
import StatusManager from "./Pages/StatusManager/StatusManager";
import Statistics from "./Pages/Statistics/Statistics";
import Profile from "./Pages/Profile/Profile";
import Admin from "./Pages/Admin/Admin";
import AppointmentsPage from "./Pages/AppointmentsPage/AppointmentsPage";
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
        path="/calls-list"
        element={
          <ProtectedRoute>
            <CallsList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/status-manager"
        element={
          <ProtectedRoute>
            <StatusManager />
          </ProtectedRoute>
        }
      />
      <Route
        path="/statistics"
        element={
          <ProtectedRoute>
            <Statistics />
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
  );
}

export default App;
