import { useState } from "react";

export function useAppointmentsFilters() {
  const [filters, setFilters] = useState({
    date: "",
    statut: "",
    type: "",
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      date: "",
      statut: "",
      type: "",
    });
  };

  const hasActiveFilters = () => {
    return Object.values(filters).some(value => value !== "");
  };

  const getFilterParams = () => {
    // Retourner seulement les filtres non vides
    const activeFilters = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "") {
        activeFilters[key] = value;
      }
    });
    return activeFilters;
  };

  return {
    filters,
    setFilters,
    handleFilterChange,
    resetFilters,
    hasActiveFilters,
    getFilterParams,
  };
}
