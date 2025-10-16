import React from "react";
import { getClientFullName, getClientPhone } from "../../utils/clientUtils";

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
    <>
      <div className="appointment-info">
        <div className="info-section">
          <h3>Informations client</h3>
          <div className="client-details">
            <p><strong>Nom:</strong> {getClientFullName(appointment.client, appointment)}</p>
            <p><strong>Téléphone:</strong> {getClientPhone(appointment.client)}</p>
          </div>
        </div>

        <div className="info-section">
          <h3>Commande</h3>
          {appointment.description ? (
            <p className="description">{appointment.description}</p>
          ) : (
            <p className="description">Aucune description disponible</p>
          )}
        </div>

        <div className="info-section">
          <h3>Horaires</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Date:</label>
              <span>{formatDate(appointment.date)}</span>
            </div>
            <div className="info-item">
              <label>Heure:</label>
              <span>{appointment.heure}</span>
            </div>
            {appointment.modalite && (
              <div className="info-item">
                <label>Modalité:</label>
                <span>{appointment.modalite}</span>
              </div>
            )}
            {appointment.nombrePersonnes && (
              <div className="info-item">
                <label>Nombre de personnes:</label>
                <span>{appointment.nombrePersonnes} {appointment.nombrePersonnes > 1 ? 'personnes' : 'personne'}</span>
              </div>
            )}
          </div>
        </div>

        {appointment.notes && (
          <div className="info-section">
            <h3>Notes</h3>
            <p className="notes">{appointment.notes}</p>
          </div>
        )}
      </div>

      <div className="modal-footer">
        <div className="status-actions">
          {appointment.statut === "planifie" && (
            <button
              className="btn-start"
              onClick={() => {
                handleStatusChange("confirme");
              }}
            >
              Confirmer
            </button>
          )}
          
          {appointment.statut === "confirme" && (
            <button
              className="btn-complete"
              onClick={() => {
                handleStatusChange("termine");
              }}
            >
              Marquer comme terminé
            </button>
          )}
        </div>

        <div className="main-actions">
          {(appointment.statut === "planifie" || appointment.statut === "confirme") && (
            <button
              className="btn-cancel"
              onClick={() => {
                handleStatusChange("annule");
              }}
            >
              Annuler
            </button>
          )}
          
          <button
            className="btn-delete"
            onClick={handleDelete}
          >
            Supprimer
          </button>
        </div>
      </div>
    </>
  );
}
