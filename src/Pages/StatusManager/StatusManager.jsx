import { useState, useEffect } from "react";
import AppLayout from "../../Components/Layout/AppLayout";
import { fetchCalls, updateCallStatus } from "../../API/Calls/api";
import { useNotifications } from "../../Hooks/Notification/useNotifications";
import "./StatusManager.scss";

function StatusManager() {
  const { notifyStatusChange, notifyError, notifySuccess } = useNotifications();

  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("en_cours"); // Par défaut, afficher les appels en cours
  const [updatingStatus, setUpdatingStatus] = useState(null);

  const statusOptions = [
    { value: "nouveau", label: "🆕 Nouveau", color: "#007bff" },
    { value: "en_cours", label: "⌛ En cours", color: "#ffc107" },
    { value: "termine", label: "☑️ Terminé", color: "#28a745" },
    { value: "annule", label: "❌ Annulé", color: "#dc3545" },
  ];

  const filterOptions = [
    { value: "all", label: "Tous les statuts" },
    { value: "nouveau", label: "🆕 Nouveau" },
    { value: "en_cours", label: "⌛ En cours" },
    { value: "termine", label: "☑️ Terminé" },
    { value: "annule", label: "❌ Annulé" },
  ];

  const loadCalls = async (statusFilter = filter) => {
    try {
      setLoading(true);
      setError(null);

      // Charger plus d'appels pour avoir une vue d'ensemble
      const response = await fetchCalls(1, 50, {});

      if (response.success) {
        let filteredCalls = response.data || [];

        // Filtrer par statut si nécessaire
        if (statusFilter !== "all") {
          filteredCalls = filteredCalls.filter(
            (call) => call.statut === statusFilter
          );
        }

        setCalls(filteredCalls);
      } else {
        throw new Error("Erreur lors du chargement des appels");
      }
    } catch (err) {
      setError(err.message);
      console.error("Erreur:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalls();
  }, [filter]);

  const handleStatusChange = async (callId, newStatus) => {
    try {
      setUpdatingStatus(callId);

      // Récupérer l'ancien statut pour la notification
      const call = calls.find((c) => c._id === callId);
      const oldStatus = call?.statut;

      // Utiliser la nouvelle méthode API
      await updateCallStatus(callId, newStatus);

      // Mettre à jour localement
      setCalls((prevCalls) =>
        prevCalls.map((call) =>
          call._id === callId ? { ...call, statut: newStatus } : call
        )
      );

      // Notifier le changement de statut
      if (call && oldStatus !== newStatus) {
        await notifyStatusChange(call, oldStatus, newStatus);
      }

      // Notifier le succès
      await notifySuccess(
        `Statut mis à jour vers ${newStatus}`,
        "Mise à jour statut"
      );

      // Recharger pour être sûr
      setTimeout(() => loadCalls(), 500);
    } catch (err) {
      setError(err.message);
      console.error("Erreur mise à jour statut:", err);
      await notifyError(err, "Mise à jour statut");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusBadge = (statut) => {
    const option = statusOptions.find((opt) => opt.value === statut);
    return option || { label: statut, color: "#6c757d" };
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getUrgencyLevel = (date) => {
    const callDate = new Date(date);
    const now = new Date();
    const diffHours = (now - callDate) / (1000 * 60 * 60);

    if (diffHours > 48) return "urgent";
    if (diffHours > 24) return "warning";
    return "normal";
  };

  return (
    <AppLayout>
      <div className="status-manager-container">
        {/* Filtres et statistiques */}
        <div className="header-section">
          <div className="filter-section">
            <label>Filtrer par statut:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="status-filter"
            >
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="stats-summary">
            <div className="stat-card">
              <span className="stat-number">{calls.length}</span>
              <span className="stat-label">Appels affichés</span>
            </div>
            <div className="stat-card urgent">
              <span className="stat-number">
                {
                  calls.filter(
                    (call) => getUrgencyLevel(call.date) === "urgent"
                  ).length
                }
              </span>
              <span className="stat-label">Urgents (+48h)</span>
            </div>
          </div>
        </div>

        {/* Liste des appels */}
        <div className="calls-container">
          {loading && (
            <div className="loading-state">
              <i className="bi bi-arrow-repeat spinning"></i>
              Chargement des appels...
            </div>
          )}

          {error && (
            <div className="error-state">
              <i className="bi bi-exclamation-triangle"></i>
              {error}
              <button onClick={() => loadCalls()} className="retry-btn">
                Réessayer
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
              {calls.length === 0 ? (
                <div className="empty-state">
                  <i className="bi bi-inbox"></i>
                  <p>Aucun appel trouvé pour ce filtre</p>
                </div>
              ) : (
                <div className="calls-grid">
                  {calls.map((call) => (
                    <div
                      key={call._id}
                      className={`call-card ${getUrgencyLevel(call.date)}`}
                    >
                      <div className="call-header">
                        <div className="client-info">
                          <h4>
                            {call.client?.prenom}{" "}
                            {call.client?.nom || "Client inconnu"}
                          </h4>
                          <span className="phone">
                            {call.client?.telephone}
                          </span>
                        </div>
                        <div className="urgency-indicator">
                          {getUrgencyLevel(call.date) === "urgent" && (
                            <span className="urgent-badge">🚨 URGENT</span>
                          )}
                          {getUrgencyLevel(call.date) === "warning" && (
                            <span className="warning-badge">⚠️ ATTENTION</span>
                          )}
                        </div>
                      </div>

                      <div className="call-body">
                        <div className="call-type">
                          <strong>Type:</strong> {call.type_demande}
                        </div>
                        <div className="call-date">
                          <strong>Date:</strong> {formatDate(call.date)}
                        </div>
                        {call.description && (
                          <div className="call-description">
                            <strong>Description:</strong>
                            <p>{call.description}</p>
                          </div>
                        )}
                      </div>

                      <div className="call-footer">
                        <div className="current-status">
                          <span
                            className="status-badge"
                            style={{
                              color: getStatusBadge(call.statut).color,
                              borderColor: getStatusBadge(call.statut).color,
                            }}
                          >
                            {getStatusBadge(call.statut).label}
                          </span>
                        </div>

                        <div className="status-actions">
                          <label>Changer vers:</label>
                          <div className="status-buttons">
                            {statusOptions
                              .filter((option) => option.value !== call.statut)
                              .map((option) => (
                                <button
                                  key={option.value}
                                  onClick={() =>
                                    handleStatusChange(call._id, option.value)
                                  }
                                  disabled={updatingStatus === call._id}
                                  className="status-btn"
                                  style={{
                                    borderColor: option.color,
                                    color: option.color,
                                  }}
                                  title={`Changer vers ${option.label}`}
                                >
                                  {updatingStatus === call._id ? (
                                    <i className="bi bi-arrow-repeat spinning"></i>
                                  ) : (
                                    option.label.split(" ")[0] // Juste l'emoji
                                  )}
                                </button>
                              ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default StatusManager;
