import { useTranslation } from "react-i18next";

export function AppointmentsFilters({
  filters,
  handleFilterChange,
  resetFilters,
  hasActiveFilters,
}) {
  const { t } = useTranslation();
  
  return (
    <div className="filters-section">
      <div className="filters-group">
        <div className="filter-item">
          <input
            type="date"
            value={filters.date}
            onChange={(e) => handleFilterChange("date", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
