export function AppointmentsFilters({
  filters,
  handleFilterChange,
  resetFilters,
  hasActiveFilters,
}) {
  return (
    <div className="filters-section">
      <div className="filters-group">
        <div className="filter-item">
          <label>📅 Date</label>
          <input
            type="date"
            value={filters.date}
            onChange={(e) => handleFilterChange("date", e.target.value)}
          />
        </div>

        <div className="filter-item">
          <label>📊 Statut</label>
          <select
            value={filters.statut}
            onChange={(e) => handleFilterChange("statut", e.target.value)}
          >
            <option value="">Tous les statuts</option>
            <option value="planifie">Planifié</option>
            <option value="confirme">Confirmé</option>
            <option value="en_cours">En cours</option>
            <option value="termine">Terminé</option>
            <option value="annule">Annulé</option>
          </select>
        </div>

        <div className="filter-item">
          <label>🏷️ Type</label>
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange("type", e.target.value)}
          >
            <option value="">Tous les types</option>
            <option value="Commande à emporter">Commande à emporter</option>
            <option value="Livraison à domicile">Livraison à domicile</option>
            <option value="Réservation de table">Réservation de table</option>
            <option value="Dégustation">Dégustation</option>
            <option value="Événement privé">Événement privé</option>
          </select>
        </div>

        <div className="filter-item">
          <label>📍 Modalité</label>
          <select
            value={filters.modalite}
            onChange={(e) => handleFilterChange("modalite", e.target.value)}
          >
            <option value="">Toutes les modalités</option>
            <option value="Sur place">Sur place</option>
            <option value="À emporter">À emporter</option>
            <option value="Livraison">Livraison</option>
          </select>
        </div>

        {hasActiveFilters() && (
          <button
            type="button"
            onClick={resetFilters}
            className="btn-clear-filters"
          >
            🗑️ Effacer
          </button>
        )}
      </div>
    </div>
  );
}
