import { useState, useEffect } from "react";
import { fetchClients, createClient, deleteClient } from "../../API/Clients/api";
import { useContactsSearch } from "./useContactsSearch";
import { useContactsModal } from "./useContactsModal";
import { useContactsSelection } from "./useContactsSelection";

export function useContacts() {
  // Hooks spécialisés
  const searchHook = useContactsSearch();
  const modalHook = useContactsModal();
  const selectionHook = useContactsSelection();

  // État principal
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Récupérer la liste des clients au montage
  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetchClients();
      setClients(response.data || []);
    } catch (error) {
      console.error("Erreur lors du chargement des clients:", error);
      setError("Erreur lors du chargement des clients");
    } finally {
      setIsLoading(false);
    }
  };

  // Wrapper pour l'ajout de client avec rechargement
  const handleAddClient = async (clientData) => {
    try {
      setError(null);
      const response = await createClient(clientData);

      // Ajouter le nouveau client à la liste locale
      setClients((prev) => [response.data, ...prev]);

      return response.data;
    } catch (error) {
      console.error("Erreur lors de la création du client:", error);
      setError(error.message);
      throw error;
    }
  };

  // Wrapper pour la suppression de client avec rechargement
  const handleDeleteClient = async (clientId) => {
    try {
      setError(null);
      await deleteClient(clientId);

      // Retirer le client de la liste locale
      setClients((prev) => prev.filter((c) => c._id !== clientId));

      // Fermer les détails si c'est le client sélectionné
      if (selectionHook.selectedClient?._id === clientId) {
        selectionHook.clearSelection();
      }

      return true;
    } catch (error) {
      console.error("Erreur lors de la suppression du client:", error);
      setError(error.message);
      throw error;
    }
  };

  // Appliquer les filtres de recherche
  const filteredClients = searchHook.filterClients(clients);

  /**
   * Formater une date en format français
   */
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /**
   * Obtenir le badge de statut avec style
   */
  const getStatusBadge = (status, t) => {
    const statusConfig = {
      nouveau: { label: t('contactsPage.statuses.new'), class: "status-nouveau" },
      en_cours: { label: t('contactsPage.statuses.inProgress'), class: "status-en-cours" },
      termine: { label: t('contactsPage.statuses.completed'), class: "status-termine" },
      annule: { label: t('contactsPage.statuses.cancelled'), class: "status-annule" },
    };

    const config = statusConfig[status] || {
      label: status,
      class: "status-default",
    };
    
    return {
      label: config.label,
      className: config.class
    };
  };

  return {
    // États principaux
    clients: filteredClients,
    isLoading,
    error,
    
    // Recherche
    searchTerm: searchHook.searchTerm,
    setSearchTerm: searchHook.setSearchTerm,
    
    // Sélection
    selectedClient: selectionHook.selectedClient,
    clientHistory: selectionHook.clientHistory,
    isLoadingHistory: selectionHook.isLoadingHistory,
    selectClient: selectionHook.selectClient,
    clearSelection: selectionHook.clearSelection,
    
    // Modal
    isModalOpen: modalHook.isModalOpen,
    successMessage: modalHook.successMessage,
    openModal: modalHook.openModal,
    closeModal: modalHook.closeModal,
    
    // Actions
    addClient: handleAddClient,
    handleAddClient: (clientData) => modalHook.handleAddClient(handleAddClient, clientData),
    handleDeleteClient,
    refreshClients: loadClients,
    
    // Utilitaires
    formatDate,
    getStatusBadge,
  };
}
