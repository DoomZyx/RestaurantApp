import { useTranslation } from "react-i18next";
import { getClientFullName, getClientPhone } from "../../utils/clientUtils";

export function AppointmentsList({
  appointments,
  loading,
  error,
  pagination,
  onViewDetails,
  onStatusChange,
  onDelete,
  formatDateTime,
  getStatusBadge,
}) {
  const { t } = useTranslation();
  
  if (loading) {
    return (
      <div className="loading-state">
        <i className="bi bi-arrow-repeat spinning"></i>
        {t('common.loading')}
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state">
        <i className="bi bi-exclamation-triangle"></i>
        {error}
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="empty-state">
        <i className="bi bi-calendar-x"></i>
        <p>{t('appointmentsList.noOrdersFound')}</p>
      </div>
    );
  }

  // Fonctions utilitaires pour le style
  const getStatusColor = (statut) => {
    const colors = {
      planifie: "status-planned",
      confirme: "status-confirmed", 
      en_cours: "status-in-progress",
      termine: "status-completed",
      annule: "status-cancelled",
    };
    return colors[statut] || "status-default";
  };

  const getStatusLabel = (statut) => {
    const labels = {
      planifie: t('appointments.statuses.planifie').toUpperCase(),
      confirme: t('appointments.statuses.confirme').toUpperCase(),
      en_cours: t('appointments.statuses.en_cours').toUpperCase(), 
      termine: t('appointments.statuses.termine').toUpperCase(),
      annule: t('appointments.statuses.annule').toUpperCase(),
    };
    return labels[statut] || statut;
  };

  const getModalityIcon = (modalite) => {
    return "";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="appointments-grid">
      {appointments.map((appointment) => (
        <div
          key={appointment._id}
          className={`appointment-card-compact ${getStatusColor(appointment.statut)}`}
        >
          <div 
            className="card-compact-content"
            onClick={() => onViewDetails(appointment._id)}
          >
            <div className="client-name-compact">
              {getClientFullName(appointment.client, appointment)}
            </div>
            <div className="order-time-compact">
              <span className="time-label">{t('appointmentsList.expectedPickup')} :</span>
              <span className="time-value">{appointment.heure}</span>
            </div>
            <div className="order-info">
              <span>{appointment.description}</span>
            </div>
          </div>
          <span className={`status-badge-compact ${getStatusColor(appointment.statut)}`}>
            {getStatusLabel(appointment.statut)}
          </span>

          {/* Boutons d'action rapide */}
          <div className="card-quick-actions" onClick={(e) => e.stopPropagation()}>
            {(appointment.statut === 'planifie' || appointment.statut === 'confirme') && (
              <button
                className="btn-quick-action btn-start"
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(appointment._id, 'en_cours');
                }}
                title={t('appointmentsList.startPreparation')}
              >
                {t('appointmentsList.startBtn')}
              </button>
            )}
            
            {appointment.statut === 'en_cours' && (
              <button
                className="btn-quick-action btn-complete"
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(appointment._id, 'termine');
                }}
                title={t('appointmentsList.markAsComplete')}
              >
                {t('appointmentsList.completeBtn')}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
