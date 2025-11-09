import React from "react";
import { useTranslation } from "react-i18next";
import { getClientFullName, getClientPhone } from "../../utils/clientUtils";
import EmojiText from "../Common/EmojiText";

export function AppointmentDetails({ 
  appointment, 
  onEdit, 
  onStatusChange, 
  onDelete, 
  onClose 
}) {
  const { t } = useTranslation();
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
      planifie: <>Planifié</>,
      confirme: <>Confirmé</>,
      en_cours: <>En cours</>, 
      termine: <>Terminé</>,
      annule: <>Annulé</>,
    };
    return labels[statut] || statut;
  };
  const handleStatusChange = (newStatus) => {
    if (onStatusChange) {
      onStatusChange(appointment._id, newStatus);
      // Fermer la modale après avoir changé le statut en terminé ou annulé
      if ((newStatus === "termine" || newStatus === "annule") && onClose) {
        setTimeout(() => onClose(), 300); // Petit délai pour permettre la mise à jour
      }
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
          <h3>{t('appointmentDetails.clientInfo')}</h3>
          <div className="client-details">
            <p><strong>{t('appointmentDetails.name')}:</strong> {getClientFullName(appointment.client, appointment)}</p>
            <p><strong>{t('appointmentDetails.phone')}:</strong> {getClientPhone(appointment.client)}</p>
          </div>
        </div>

        <div className="info-section">
          <h3>{t('appointmentDetails.orderDetails')}</h3>
          
          {/* Affichage des plats commandés */}
          {appointment.commandes && appointment.commandes.length > 0 ? (
            <div className="commandes-list">
              <h4>🍽️ {t('appointmentDetails.orderedDishes')} :</h4>
              <ul className="items-list">
                {appointment.commandes.map((item, index) => (
                  <li key={index} className="commande-item">
                    <div className="item-header">
                      <span className="item-name">{item.nom}</span>
                      <span className="item-quantity">x{item.quantite}</span>
                      {item.prixUnitaire && (
                        <span className="item-price">{(item.prixUnitaire * item.quantite).toFixed(2)}€</span>
                      )}
                    </div>
                    {item.categorie && (
                      <span className="item-category">{item.categorie}</span>
                    )}
                    {item.supplements && (
                      <span className="item-supplements">{t('appointmentDetails.extras')}: {item.supplements}</span>
                    )}
                  </li>
                ))}
              </ul>
              
              {/* Total de la commande */}
              {appointment.commandes.some(item => item.prixUnitaire) && (
                <div className="commande-total">
                  <strong>{t('appointmentDetails.total')}: </strong>
                  <span>
                    {appointment.commandes
                      .reduce((sum, item) => sum + (item.prixUnitaire || 0) * item.quantite, 0)
                      .toFixed(2)}€
                  </span>
                </div>
              )}
            </div>
          ) : appointment.type === "Commande à emporter" || appointment.type === "Livraison à domicile" ? (
            <p className="no-items">{t('appointmentDetails.noDishSpecified')}</p>
          ) : null}

          {/* Description (notes supplémentaires) */}
          {appointment.description && (
            <div className="commande-description">
              <h4>{t('appointmentDetails.additionalNotes')} :</h4>
              <p>{appointment.description}</p>
            </div>
          )}
        </div>

        <div className="info-section">
          <h3>{t('appointmentDetails.schedule')}</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>{t('appointmentDetails.date')}:</label>
              <span>{formatDate(appointment.date)}</span>
            </div>
            <div className="info-item">
              <label>{t('appointmentDetails.time')}:</label>
              <span>{appointment.heure}</span>
            </div>
            {appointment.modalite && (
              <div className="info-item">
                <label>{t('appointmentDetails.modality')}:</label>
                <span>{appointment.modalite}</span>
              </div>
            )}
            {appointment.nombrePersonnes && (
              <div className="info-item">
                <label>{t('appointmentDetails.numberOfPersons')}:</label>
                <span>{appointment.nombrePersonnes} {appointment.nombrePersonnes > 1 ? t('appointmentDetails.persons') : t('appointmentDetails.person')}</span>
              </div>
            )}
          </div>
        </div>

        {appointment.notes && (
          <div className="info-section">
            <h3>{t('appointmentDetails.notes')}</h3>
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
              {t('appointmentDetails.confirm')}
            </button>
          )}
          
          {appointment.statut === "confirme" && (
            <button
              className="btn-complete"
              onClick={() => {
                handleStatusChange("termine");
              }}
            >
              {t('appointmentDetails.markAsCompleted')}
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
              {t('common.cancel')}
            </button>
          )}
          
          <button
            className="btn-delete"
            onClick={handleDelete}
          >
            {t('common.delete')}
          </button>
        </div>
      </div>
    </>
  );
}
