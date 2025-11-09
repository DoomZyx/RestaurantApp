import { useTranslation } from "react-i18next";
import { useAppointments } from "../../Hooks/Appointments/useAppointments";
import { useNavigate } from "react-router-dom";
import "./AppointmentsWidget.scss";

function AppointmentsWidget() {
  const { t } = useTranslation();
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
        return t('appointments.statuses.confirme');
      case "en_cours":
        return t('appointments.statuses.en_cours');
      case "termine":
        return t('appointments.statuses.termine');
      case "annule":
        return t('appointments.statuses.annule');
      case "reporte":
        return t('appointmentsWidget.postponed');
      default:
        return t('appointments.statuses.planifie');
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
          <h3>📅 {t('appointmentsWidget.todayOrders')}</h3>
          <span className="current-time">{currentTime}</span>
        </div>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>{t('appointmentsWidget.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="appointments-widget">
        <div className="widget-header">
          <h3>📅 {t('appointmentsWidget.todayOrders')}</h3>
          <span className="current-time">{currentTime}</span>
        </div>
        <div className="error-state">
          <p>❌ {t('common.error')}: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="appointments-widget">
      <div className="widget-header">
        <h3>📅 {t('appointmentsWidget.todayOrders')}</h3>
        <div className="header-info">
          <span className="current-time">{currentTime}</span>
          <span className="appointments-count">
            {todayAppointments.length} {t('appointmentsWidget.orders')}
          </span>
        </div>
      </div>

      <div className="widget-content">
        {todayAppointments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <p>{t('appointmentsWidget.noOrdersToday')}</p>
            <small>{t('appointmentsWidget.calmDay')}</small>
          </div>
        ) : (
          <>
            {/* Prochaines commandes */}
            {upcomingAppointments.length > 0 && (
              <div className="upcoming-section">
                <h4 className="section-title">
                  🔜 {t('appointmentsWidget.nextOrder')} ({upcomingAppointments.length})
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
                        title={t('appointmentsWidget.startOrder')}
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
                📋 {t('appointmentsWidget.allOrders')} ({todayAppointments.length})
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
                          title={t('appointmentsWidget.start')}
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
                          title={t('appointmentsWidget.complete')}
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
          {t('appointmentsWidget.viewAll')}
        </button>
        <button
          className="btn-add-appointment"
          onClick={() => navigate("/appointments")}
        >
          {t('appointmentsWidget.newOrder')}
        </button>
      </div>
    </div>
  );
}

export default AppointmentsWidget;
