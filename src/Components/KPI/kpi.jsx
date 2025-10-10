import "./kpi.scss";
import { useKpi } from "../../Hooks/KPI/useKpi.js";
import { useNavigate } from "react-router-dom";

// Fonctions utilitaires
const getStatusIcon = (statut) => {
  switch (statut) {
    case "confirmee": return "✅";
    case "refusee": return "❌";
    case "appel_en_cours": return "📞";
    case "en_attente": return "⏳";
    default: return "📦";
  }
};

const getStatusLabel = (statut) => {
  switch (statut) {
    case "confirmee": return "Confirmée";
    case "refusee": return "Refusée";
    case "appel_en_cours": return "En cours";
    case "en_attente": return "En attente";
    default: return statut;
  }
};

function KPI() {
  const { kpiData, todayOrders, loading, error, refreshKpiData } = useKpi();
  const navigate = useNavigate();

  const handleOrderClick = (order) => {
    // Rediriger vers la page contacts avec l'ID du fournisseur
    navigate(`/contacts?fournisseur=${order.fournisseur.id}`);
  };

  if (loading) {
    return (
      <div className="KPI-container">
        <div className="loading">Chargement des statistiques...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="KPI-container">
        <div className="error">
          Erreur: {error}
          <button onClick={refreshKpiData}>Réessayer</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="KPI-container">
        <div className="requests-displayed">
          <h3>🆕<span>{kpiData.totalNouveau}</span></h3>
          <h3>⌛<span>{kpiData.totalEnCours}</span></h3>
          <h3>☑️<span>{kpiData.totalTermine}</span></h3>
        </div>
        <div className="KPI-layout">
          <h3>
            <span>{kpiData.newToday}</span> NOUVELLES DEMANDES AUJOURD'HUI
          </h3>
          <h3>
            <span>{kpiData.pendingOld}</span> EN ATTENTE DEPUIS 24H
          </h3>
        </div>
      </div>

      {/* Dernières commandes */}
      {todayOrders.length > 0 && (
        <div className="orders-today-container">
          <div className="orders-header">
            <h3>📦 Dernières commandes fournisseurs ({todayOrders.length})</h3>
          </div>
          <div className="orders-list">
            {todayOrders.map((order) => (
              <div
                key={order._id}
                className="order-card"
                onClick={() => handleOrderClick(order)}
              >
                <div className="order-supplier">
                  <i className="bi bi-building"></i>
                  <span>{order.fournisseur.nom}</span>
                  <span className="order-date-small">
                    {new Date(order.createdAt || order.dateCommande).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <div className="order-info">
                  <span className="order-items">
                    {order.ingredients.length} article(s)
                  </span>
                  <span className={`order-status status-${order.statut}`}>
                    {getStatusIcon(order.statut)} {getStatusLabel(order.statut)}
                  </span>
                </div>
                {order.statut === "confirmee" && order.livraison?.date && (
                  <div className="order-delivery">
                    <i className="bi bi-truck"></i>
                    <span>
                      Livraison: {new Date(order.livraison.date).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default KPI;
