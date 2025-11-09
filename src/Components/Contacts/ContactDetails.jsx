import { useTranslation } from "react-i18next";
import { useOrderForm } from "../../Hooks/Contacts/useOrderForm";

export function ContactDetails({
  selectedClient,
  clearSelection,
  onDelete,
}) {
  const { t } = useTranslation();

  const handleDelete = async () => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ce fournisseur : ${selectedClient.entrepriseName} ?`)) {
      try {
        await onDelete(selectedClient._id);
      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
        alert("Erreur lors de la suppression du contact");
      }
    }
  };
  const {
    ingredients,
    isSubmitting,
    submitSuccess,
    orderHistory,
    callStatus,
    currentOrder,
    unites,
    addIngredient,
    removeIngredient,
    updateIngredient,
    handleSubmit,
  } = useOrderForm(selectedClient);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!selectedClient) {
    return (
      <div className="client-details-panel">
        <div className="no-selection">
          <i className="bi bi-person-circle"></i>
          <h3>{t('contactDetails.selectSupplier')}</h3>
          <p>
            {t('contactDetails.selectSupplierDescription')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="client-details-panel">
      <div className="panel-header">
        <div className="client-header">
          <h2>
            <i className="bi bi-building"></i>
            {selectedClient.entrepriseName}
          </h2>
          {onDelete && (
            <button 
              className="delete-contact-btn" 
              onClick={handleDelete}
              title="Supprimer ce fournisseur"
            >
              <i className="bi bi-trash"></i>
              Supprimer
            </button>
          )}
        </div>
      </div>

      <div className="order-form-content">
        <div className="form-header">
          <h3>
            <i className="bi bi-cart-plus"></i>
            Commander des ingrédients
          </h3>
          <p>Ajoutez les ingrédients que vous souhaitez commander auprès de ce fournisseur</p>
        </div>

        {callStatus && (
          <div className="call-status-message">
            <i className="bi bi-telephone-fill spin"></i>
            <span>{callStatus}</span>
          </div>
        )}

        {submitSuccess && currentOrder && (
          <div className="success-message">
            <i className="bi bi-check-circle"></i>
            <div className="success-content">
              <span className="success-title">Commande confirmée par le fournisseur !</span>
              {currentOrder.livraison && currentOrder.livraison.date && (
                <div className="delivery-info">
                  <div className="delivery-item">
                    <i className="bi bi-calendar-check"></i>
                    <span>Livraison prévue le {formatDate(currentOrder.livraison.date)}</span>
                  </div>
                  {currentOrder.livraison.heure && (
                    <div className="delivery-item">
                      <i className="bi bi-clock"></i>
                      <span>Heure: {currentOrder.livraison.heure}</span>
                    </div>
                  )}
                  {currentOrder.reponse_fournisseur?.prix_total && (
                    <div className="delivery-item">
                      <i className="bi bi-cash"></i>
                      <span>Prix total: {currentOrder.reponse_fournisseur.prix_total}€</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {submitSuccess && currentOrder && currentOrder.statut === "refusee" && (
          <div className="error-message">
            <i className="bi bi-x-circle"></i>
            <div className="error-content">
              <span className="error-title">Commande refusée</span>
              {currentOrder.reponse_fournisseur?.raison_refus && (
                <span className="error-reason">{currentOrder.reponse_fournisseur.raison_refus}</span>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="order-form">
          <div className="ingredients-list">
            {ingredients.map((ingredient, index) => (
              <div key={ingredient.id} className="ingredient-row">
                <div className="row-number">{index + 1}</div>
                
                <div className="form-group">
                  <label>Nom de l'ingrédient *</label>
                  <input
                    type="text"
                    placeholder="Ex: Tomates"
                    value={ingredient.nom}
                    onChange={(e) =>
                      updateIngredient(ingredient.id, "nom", e.target.value)
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Quantité *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Ex: 10"
                    value={ingredient.quantite}
                    onChange={(e) =>
                      updateIngredient(ingredient.id, "quantite", e.target.value)
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Unité *</label>
                  <select
                    value={ingredient.unite}
                    onChange={(e) =>
                      updateIngredient(ingredient.id, "unite", e.target.value)
                    }
                  >
                    {unites.map((unite) => (
                      <option key={unite} value={unite}>
                        {unite}
                      </option>
                    ))}
                  </select>
                </div>

                {ingredients.length > 1 && (
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => removeIngredient(ingredient.id)}
                    title="Supprimer cet ingrédient"
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            className="add-ingredient-btn"
            onClick={addIngredient}
          >
            <i className="bi bi-plus-circle"></i>
            Ajouter un ingrédient
          </button>

          <div className="form-actions">
            <button
              type="submit"
              className="submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="bi bi-arrow-clockwise spin"></i>
                  Envoi en cours...
                </>
              ) : (
                <>
                  <i className="bi bi-send"></i>
                  Envoyer la commande
                </>
              )}
            </button>
          </div>
        </form>

        {/* Historique des commandes */}
        {orderHistory.length > 0 && (
          <div className="order-history">
            <div className="history-header">
              <h3>
                <i className="bi bi-clock-history"></i>
                Historique des commandes
              </h3>
              <span className="history-count">{orderHistory.length} commande(s)</span>
            </div>

            <div className="history-list">
              {orderHistory.map((order) => (
                <div key={order._id || order.id} className="history-item">
                  <div className="history-item-header">
                    <span className="order-date">
                      <i className="bi bi-calendar3"></i>
                      {formatDate(order.dateCommande || order.createdAt)}
                    </span>
                    <span className={`order-status status-${order.statut}`}>
                      {order.statut === "confirmee" && <i className="bi bi-check-circle"></i>}
                      {order.statut === "refusee" && <i className="bi bi-x-circle"></i>}
                      {order.statut === "en_attente" && <i className="bi bi-hourglass-split"></i>}
                      {order.statut === "appel_en_cours" && <i className="bi bi-telephone"></i>}
                      {order.statut === "erreur" && <i className="bi bi-exclamation-triangle"></i>}
                      {order.statut === "confirmee" ? "Confirmée" : 
                       order.statut === "refusee" ? "Refusée" :
                       order.statut === "en_attente" ? "En attente" :
                       order.statut === "appel_en_cours" ? "Appel en cours" :
                       order.statut === "erreur" ? "Erreur" : order.statut}
                    </span>
                  </div>
                  
                  <div className="history-item-content">
                    <h4>Ingrédients commandés :</h4>
                    <ul className="ingredients-summary">
                      {order.ingredients.map((ing, index) => (
                        <li key={index}>
                          <span className="ingredient-name">{ing.nom}</span>
                          <span className="ingredient-qty">
                            {ing.quantite} {ing.unite}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* Afficher les infos de livraison si la commande est confirmée */}
                    {order.statut === "confirmee" && order.livraison && order.livraison.date && (
                      <div className="delivery-info-history">
                        <h4>Informations de livraison :</h4>
                        <div className="delivery-details">
                          <span>
                            <i className="bi bi-truck"></i>
                            {formatDate(order.livraison.date)}
                            {order.livraison.heure && ` à ${order.livraison.heure}`}
                          </span>
                          {order.reponse_fournisseur?.prix_total && (
                            <span className="price-badge">
                              {order.reponse_fournisseur.prix_total}€
                            </span>
                          )}
                        </div>
                        {order.livraison.commentaire && (
                          <p className="delivery-comment">{order.livraison.commentaire}</p>
                        )}
                      </div>
                    )}

                    {/* Afficher la raison du refus si applicable */}
                    {order.statut === "refusee" && order.reponse_fournisseur?.raison_refus && (
                      <div className="refusal-reason">
                        <i className="bi bi-info-circle"></i>
                        <span>{order.reponse_fournisseur.raison_refus}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
