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
  if (loading) {
    return (
      <div className="loading-state">
        <i className="bi bi-arrow-repeat spinning"></i>
        Chargement des rendez-vous...
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
        <p>Aucun rendez-vous trouvé</p>
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
      planifie: "PLANIFIÉ",
      confirme: "CONFIRMÉ",
      en_cours: "EN COURS", 
      termine: "TERMINÉ",
      annule: "ANNULÉ",
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
          onClick={() => onViewDetails(appointment._id)}
        >
          <div className="card-compact-content">
            <div className="client-name-compact">
              {getClientFullName(appointment.client, appointment)}
            </div>
            <div className="order-time-compact">
              Appel passée à {appointment.heure}
            </div>
            <div className="order-info">
              <span>{appointment.description}</span>
            </div>
          </div>
          <span className={`status-badge-compact ${getStatusColor(appointment.statut)}`}>
            {getStatusLabel(appointment.statut)}
          </span>
        </div>
      ))}
    </div>
  );
}
