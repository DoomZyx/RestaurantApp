import React from "react";

export function AppointmentDetails({ 
  appointment, 
  onEdit, 
  onStatusChange, 
  onDelete, 
  onClose 
}) {
  if (!appointment) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

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

  const handleStatusChange = (newStatus) => {
    if (onStatusChange) {
      onStatusChange(appointment._id, newStatus);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(appointment._id);
    }
  };

  return (
    <div className="appointment-details">
      {/* En-tête avec statut */}
      <div className="details-header">
        <div className="appointment-info">
          <h3>{formatDate(appointment.date)}</h3>
          <p className="time-info">
            🕒 {appointment.heure} - Durée: {appointment.duree} minutes
          </p>
        </div>
        <span className={`status-badge ${getStatusColor(appointment.statut)}`}>
          {getStatusLabel(appointment.statut)}
        </span>
      </div>

      {/* Informations client */}
      <div className="details-section">
        <h4>👤 Client</h4>
        <div className="client-details">
          <p className="client-name">
            <strong>{appointment.client?.prenom} {appointment.client?.nom}</strong>
          </p>
          <p className="client-contact">
            📞 {appointment.client?.telephone}
          </p>
          {appointment.client?.email && (
            <p className="client-contact">
              ✉️ {appointment.client.email}
            </p>
          )}
          {appointment.client?.entrepriseName && (
            <p className="client-contact">
              🏢 {appointment.client.entrepriseName}
            </p>
          )}
        </div>
      </div>

      {/* Détails du rendez-vous */}
      <div className="details-section">
        <h4>📋 Détails du rendez-vous</h4>
        <div className="appointment-info-grid">
          <div className="info-item">
            <span className="label">Type:</span>
            <span className="value">{appointment.type}</span>
          </div>
          <div className="info-item">
            <span className="label">Modalité:</span>
            <span className="value">
              {getModalityIcon(appointment.modalite)} {appointment.modalite}
            </span>
          </div>
          {appointment.description && (
            <div className="info-item full-width">
              <span className="label">Description:</span>
              <p className="description">{appointment.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions de changement de statut */}
      <div className="details-section">
        <h4>🔄 Changer le statut</h4>
        <div className="status-actions">
          {appointment.statut === "planifie" && (
            <button
              className="btn-action btn-confirm"
              onClick={() => handleStatusChange("confirme")}
            >
              ✅ Confirmer
            </button>
          )}
          
          {appointment.statut === "confirme" && (
            <button
              className="btn-action btn-start"
              onClick={() => handleStatusChange("en_cours")}
            >
              🔄 Commencer
            </button>
          )}
          
          {appointment.statut === "en_cours" && (
            <button
              className="btn-action btn-complete"
              onClick={() => handleStatusChange("termine")}
            >
              ✅ Terminer
            </button>
          )}
          
          {(appointment.statut === "planifie" || appointment.statut === "confirme") && (
            <button
              className="btn-action btn-cancel"
              onClick={() => handleStatusChange("annule")}
            >
              ❌ Annuler
            </button>
          )}
        </div>
      </div>

      {/* Actions principales */}
      <div className="details-actions">
        <button
          className="btn-secondary"
          onClick={onClose}
        >
          👈 Retour
        </button>
        
        <div className="action-group">
          <button
            className="btn-warning"
            onClick={() => onEdit && onEdit(appointment._id, appointment)}
          >
            ✏️ Modifier
          </button>
          
          <button
            className="btn-danger"
            onClick={handleDelete}
          >
            🗑️ Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}
