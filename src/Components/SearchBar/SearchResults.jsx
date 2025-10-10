import "./SearchResults.scss";
import { useNavigate } from "react-router-dom";

function SearchResults({ results, loading, error, hasSearched, onClose }) {
  const navigate = useNavigate();

  if (!hasSearched) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusEmoji = (statut) => {
    switch (statut) {
      case "nouveau":
        return "🆕";
      case "en_cours":
        return "⌛";
      case "termine":
        return "☑️";
      case "annule":
        return "❌";
      default:
        return "📞";
    }
  };

  const getStatusText = (statut) => {
    switch (statut) {
      case "nouveau":
        return "Nouveau";
      case "en_cours":
        return "En cours";
      case "termine":
        return "Terminé";
      case "annule":
        return "Annulé";
      default:
        return statut;
    }
  };

  const handleCallClick = (callId) => {
    // Fermer la modal de recherche
    onClose();
    // Naviguer vers la liste des appels avec l'ID de l'appel à afficher
    navigate(`/calls-list?viewCall=${callId}`);
  };

  return (
    <div className="search-results-overlay">
      <div className="search-results-container">
        <div className="search-results-header">
          <h3>Résultats de recherche</h3>
          <button className="close-btn" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="search-results-content">
          {loading && (
            <div className="loading">
              <i className="bi bi-arrow-repeat"></i>
              Recherche en cours...
            </div>
          )}

          {error && (
            <div className="error">
              <i className="bi bi-exclamation-triangle"></i>
              {error}
            </div>
          )}

          {!loading && !error && results.length === 0 && (
            <div className="no-results">
              <i className="bi bi-search"></i>
              Aucun résultat trouvé
            </div>
          )}

          {!loading && !error && results.length > 0 && (
            <>
              <div className="results-count">
                {results.length} résultat{results.length > 1 ? "s" : ""} trouvé
                {results.length > 1 ? "s" : ""}
              </div>
              <div className="results-list">
                {results.map((call) => (
                  <div
                    key={call._id}
                    className="result-item clickable"
                    onClick={() => handleCallClick(call._id)}
                    title="Cliquer pour voir les détails"
                  >
                    <div className="result-header">
                      <div className="client-info">
                        <h4>
                          {call.client?.prenom}{" "}
                          {call.client?.nom || "Client inconnu"}
                        </h4>
                        <span className="phone">{call.client?.telephone}</span>
                      </div>
                      <div className="status">
                        <span className="status-badge">
                          {getStatusEmoji(call.statut)}{" "}
                          {getStatusText(call.statut)}
                        </span>
                      </div>
                    </div>
                    <div className="result-body">
                      <div className="call-type">
                        <strong>Type:</strong> {call.type_demande}
                      </div>
                      {call.description && (
                        <div className="description">
                          <strong>Description:</strong> {call.description}
                        </div>
                      )}
                      <div className="date">
                        <strong>Date:</strong> {formatDate(call.date)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SearchResults; 