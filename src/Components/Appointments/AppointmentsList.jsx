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
      planifie: "📅 Planifié",
      confirme: "✅ Confirmé",
      en_cours: "🔄 En cours", 
      termine: "✅ Terminé",
      annule: "❌ Annulé",
    };
    return labels[statut] || statut;
  };

  const getModalityIcon = (modalite) => {
    const icons = {
      "Bureau": "🏢",
      "Visioconférence": "💻", 
      "Téléphonique": "📞",
    };
    return icons[modalite] || "📅";
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
          className={`appointment-card ${getStatusColor(appointment.statut)}`}
        >
          <div className="card-header">
            <div className="appointment-date">
              <span className="date">
                {formatDate(appointment.date)}
              </span>
              <span className="time">
                {appointment.heure} ({appointment.duree}min)
              </span>
            </div>
            <span className={`status-badge ${getStatusColor(appointment.statut)}`}>
              {getStatusLabel(appointment.statut)}
            </span>
          </div>

          <div className="card-body">
            <div className="client-info">
              <h3>
                {appointment.client?.prenom} {appointment.client?.nom}
              </h3>
              <p>{appointment.client?.telephone}</p>
              {appointment.client?.email && (
                <p>{appointment.client.email}</p>
              )}
            </div>

            <div className="appointment-details">
              <div className="detail-item">
                <span className="label">Type:</span>
                <span>{appointment.type}</span>
              </div>
              <div className="detail-item">
                <span className="label">Modalité:</span>
                <span>
                  {getModalityIcon(appointment.modalite)} {appointment.modalite}
                </span>
              </div>
              {appointment.description && (
                <div className="detail-item description">
                  <span className="label">Description:</span>
                  <span>{appointment.description}</span>
                </div>
              )}
            </div>
          </div>

          <div className="card-footer">
            <div className="action-buttons">
              <button
                className="btn-action btn-view"
                onClick={() => onViewDetails(appointment._id)}
                title="Voir les détails"
              >
                👁️ Détails
              </button>
              
              {appointment.statut === "planifie" && (
                <button
                  className="btn-action btn-confirm"
                  onClick={() => onStatusChange(appointment._id, "confirme")}
                  title="Confirmer"
                >
                  ✅ Confirmer
                </button>
              )}
              
              {(appointment.statut === "planifie" || appointment.statut === "confirme") && (
                <button
                  className="btn-action btn-cancel"
                  onClick={() => onStatusChange(appointment._id, "annule")}
                  title="Annuler"
                >
                  ❌ Annuler
                </button>
              )}
              
              <button
                className="btn-action btn-delete"
                onClick={() => onDelete(appointment._id)}
                title="Supprimer"
              >
                🗑️ Supprimer
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
