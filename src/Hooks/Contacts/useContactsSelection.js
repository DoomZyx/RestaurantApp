import { useState } from "react";
import { fetchClientHistory } from "../../API/Clients/api";

export function useContactsSelection() {
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientHistory, setClientHistory] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState(null);

  const loadClientHistory = async (clientId) => {
    try {
      setIsLoadingHistory(true);
      setError(null);
      const response = await fetchClientHistory(clientId);
      setClientHistory(response.data);
    } catch (error) {
      setError("Erreur lors du chargement de l'historique");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const selectClient = async (client) => {
    setSelectedClient(client);
    setClientHistory(null);
    if (client) {
      await loadClientHistory(client._id);
    }
  };

  const clearSelection = () => {
    setSelectedClient(null);
    setClientHistory(null);
  };

  return {
    // États
    selectedClient,
    clientHistory,
    isLoadingHistory,
    error,
    
    // Actions
    selectClient,
    clearSelection,
    loadClientHistory,
  };
}
