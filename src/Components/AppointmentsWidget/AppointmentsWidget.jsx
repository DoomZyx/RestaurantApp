import { useAppointments } from "../../Hooks/Appointments/useAppointments";
import { useNavigate } from "react-router-dom";
import "./AppointmentsWidget.scss";

function AppointmentsWidget() {
  const {
    todayAppointments,
    loading,
    error,
    changeAppointmentStatus,
    getUpcomingAppointments,
  } = useAppointments();

  const navigate = useNavigate();
  const upcomingAppointments = getUpcomingAppointments();
  const currentTime = new Date().toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      await changeAppointmentStatus(appointmentId, newStatus);
    } catch (error) {
      console.error("Erreur lors du changement de statut:", error);
    }
  };

  const getStatusColor = (statut) => {
    switch (statut) {
      case "confirme":
        return "status-confirmed";
      case "en_cours":
        return "status-in-progress";
      case "termine":
        return "status-completed";
      case "annule":
        return "status-cancelled";
      case "reporte":
        return "status-postponed";
      default:
        return "status-planned";
    }
  };

  const getStatusLabel = (statut) => {
    switch (statut) {
      case "confirme":
        return "Confirmé";
      case "en_cours":
        return "En cours";
      case "termine":
        return "Terminé";
      case "annule":
        return "Annulé";
      case "reporte":
        return "Reporté";
      default:
        return "Planifié";
    }
  };

  const getModalityIcon = (modalite) => {
    switch (modalite) {
      case "Bureau":
        return "🏢";
      case "Visioconférence":
        return "💻";
      case "Téléphonique":
        return "📞";
      default:
        return "📅";
    }
  };

  if (loading) {
    return (
      <div className="appointments-widget">
        <div className="widget-header">
          <h3>📅 Commandes du jour</h3>
          <span className="current-time">{currentTime}</span>
        </div>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Chargement des commandes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="appointments-widget">
        <div className="widget-header">
          <h3>📅 Commandes du jour</h3>
          <span className="current-time">{currentTime}</span>
        </div>
        <div className="error-state">
          <p>❌ Erreur: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="appointments-widget">
      <div className="widget-header">
        <h3>📅 Commandes du jour</h3>
        <div className="header-info">
          <span className="current-time">{currentTime}</span>
          <span className="appointments-count">
            {todayAppointments.length} RDV
          </span>
        </div>
      </div>

      <div className="widget-content">
        {todayAppointments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <p>Aucune commandes aujourd'hui</p>
            <small>Profitez de cette journée plus calme !</small>
          </div>
        ) : (
          <>
            {/* Prochains rendez-vous */}
            {upcomingAppointments.length > 0 && (
              <div className="upcoming-section">
                <h4 className="section-title">
                  🔜 Prochains ({upcomingAppointments.length})
                </h4>
                {upcomingAppointments.slice(0, 3).map((appointment) => (
                  <div
                    key={appointment._id}
                    className="appointment-card upcoming"
                  >
                    <div className="appointment-time">
                      <span className="time">{appointment.heure}</span>
                      <span className="duration">({appointment.duree}min)</span>
                    </div>
                    <div className="appointment-details">
                      <div className="client-info">
                        <strong>
                          {appointment.client?.prenom} {appointment.client?.nom}
                        </strong>
                        <span className="phone">
                          {appointment.client?.telephone}
                        </span>
                      </div>
                      <div className="appointment-type">
                        <span className="modality">
                          {getModalityIcon(appointment.modalite)}{" "}
                          {appointment.modalite}
                        </span>
                        <span className="type">{appointment.type}</span>
                      </div>
                    </div>
                    <div className="appointment-actions">
                      <button
                        className="btn-start"
                        onClick={() =>
                          handleStatusChange(appointment._id, "en_cours")
                        }
                        title="Démarrer le rendez-vous"
                      >
                        ▶️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tous les rendez-vous du jour */}
            <div className="all-appointments-section">
              <h4 className="section-title">
                📋 Toutes les commandes ({todayAppointments.length})
              </h4>
              <div className="appointments-list">
                {todayAppointments.map((appointment) => (
                  <div
                    key={appointment._id}
                    className={`appointment-item ${getStatusColor(
                      appointment.statut
                    )}`}
                  >
                    <div className="appointment-time">
                      <span className="time">{appointment.heure}</span>
                    </div>
                    <div className="appointment-info">
                      <div className="client-name">
                        {appointment.client?.prenom} {appointment.client?.nom}
                      </div>
                      <div className="appointment-meta">
                        <span className="modality">
                          {getModalityIcon(appointment.modalite)}
                        </span>
                        <span className="type">{appointment.type}</span>
                      </div>
                    </div>
                    <div className="appointment-status">
                      <span
                        className={`status-badge ${getStatusColor(
                          appointment.statut
                        )}`}
                      >
                        {getStatusLabel(appointment.statut)}
                      </span>
                    </div>
                    <div className="appointment-actions">
                      {appointment.statut === "confirme" && (
                        <button
                          className="btn-start"
                          onClick={() =>
                            handleStatusChange(appointment._id, "en_cours")
                          }
                          title="Démarrer"
                        >
                          ▶️
                        </button>
                      )}
                      {appointment.statut === "en_cours" && (
                        <button
                          className="btn-complete"
                          onClick={() =>
                            handleStatusChange(appointment._id, "termine")
                          }
                          title="Terminer"
                        >
                          ✅
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="widget-footer">
        <button
          className="btn-view-all"
          onClick={() => navigate("/appointments")}
        >
          Voir tous les rendez-vous
        </button>
        <button
          className="btn-add-appointment"
          onClick={() => navigate("/appointments")}
        >
          ➕ Nouveau RDV
        </button>
      </div>
    </div>
  );
}

export default AppointmentsWidget;
