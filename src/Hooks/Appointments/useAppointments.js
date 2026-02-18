import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  fetchAppointments,
  fetchTodayAppointments,
  fetchAppointment,
  createAppointment,
  updateAppointment,
  updateAppointmentStatus,
  deleteAppointment,
  checkAvailability,
} from "../../API/Appointment/api";
import { useAppointmentsFilters } from "./useAppointmentsFilters";
import { useAppointmentsModal } from "./useAppointmentsModal";
import { useWebSocket } from "../../Context/WebSocketContext";

export function useAppointments() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Hooks spécialisés
  const filtersHook = useAppointmentsFilters();
  const modalHook = useAppointmentsModal();

  // État principal
  const [appointments, setAppointments] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [currentAppointment, setCurrentAppointment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 50,
    pages: 0,
  });

  // Refs pour stocker les valeurs actuelles sans causer de re-renders
  const paginationRef = useRef(pagination);
  const filtersRef = useRef(filtersHook.filters);
  const loadAppointmentsRef = useRef(null);
  const loadTodayAppointmentsRef = useRef(null);

  // Récupérer tous les rendez-vous avec filtres
  const loadAppointments = useCallback(
    async (page = 1, limit = 50, filters = {}) => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetchAppointments(page, limit, filters);

        if (response.success) {
          // Trier les rendez-vous par statut : actifs d'abord, terminés après
          const sortedAppointments = response.data.sort((a, b) => {
            const statusOrder = {
              "planifie": 1,
              "confirme": 2,
              "en_cours": 3,
              "termine": 4,
              "annule": 5
            };
            
            const orderA = statusOrder[a.statut] || 999;
            const orderB = statusOrder[b.statut] || 999;
            
            return orderA - orderB;
          });

          setAppointments(sortedAppointments);
          setPagination(response.pagination);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Récupérer les rendez-vous du jour
  const loadTodayAppointments = useCallback(async () => {
    try {
      setError(null);
      const response = await fetchTodayAppointments();

      if (response.success) {
        setTodayAppointments(response.data);
      }
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // Récupérer un rendez-vous par ID
  const loadAppointment = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchAppointment(id);

      if (response.success) {
        setCurrentAppointment(response.data);
        return response.data;
      }
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Créer un nouveau rendez-vous
  const addAppointment = useCallback(
    async (appointmentData) => {
      try {
        setLoading(true);
        setError(null);

        const response = await createAppointment(appointmentData);

        if (response.success) {
          // Rafraîchir la liste des rendez-vous
          await loadAppointments(pagination.page, pagination.limit);
          await loadTodayAppointments();
          return response.data;
        }
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [loadAppointments, loadTodayAppointments, pagination.page, pagination.limit]
  );

  // Mettre à jour un rendez-vous
  const editAppointment = useCallback(
    async (id, appointmentData) => {
      try {
        setLoading(true);
        setError(null);

        const response = await updateAppointment(id, appointmentData);

        if (response.success) {
          // Mettre à jour le rendez-vous dans la liste
          setAppointments((prev) =>
            prev.map((apt) => (apt._id === id ? response.data : apt))
          );

          // Mettre à jour les rendez-vous du jour si nécessaire
          setTodayAppointments((prev) =>
            prev.map((apt) => (apt._id === id ? response.data : apt))
          );

          // Mettre à jour le rendez-vous courant si c'est celui-ci
          if (currentAppointment && currentAppointment._id === id) {
            setCurrentAppointment(response.data);
          }

          return response.data;
        }
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [currentAppointment]
  );

  // Mettre à jour le statut d'un rendez-vous
  const changeAppointmentStatus = useCallback(
    async (id, statut) => {
      try {
        setError(null);

        const response = await updateAppointmentStatus(id, statut);

        if (response.success) {
          // Mettre à jour le statut dans la liste
          setAppointments((prev) =>
            prev.map((apt) => (apt._id === id ? { ...apt, statut } : apt))
          );

          // Mettre à jour les rendez-vous du jour
          setTodayAppointments((prev) =>
            prev.map((apt) => (apt._id === id ? { ...apt, statut } : apt))
          );

          // Mettre à jour le rendez-vous courant si c'est celui-ci
          if (currentAppointment && currentAppointment._id === id) {
            setCurrentAppointment((prev) => ({ ...prev, statut }));
          }

          return response.data;
        }
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [currentAppointment]
  );

  // Supprimer un rendez-vous
  const removeAppointment = useCallback(
    async (id) => {
      try {
        setLoading(true);
        setError(null);

        const response = await deleteAppointment(id);

        if (response.success) {
          // Retirer le rendez-vous de la liste
          setAppointments((prev) => prev.filter((apt) => apt._id !== id));
          setTodayAppointments((prev) => prev.filter((apt) => apt._id !== id));

          // Réinitialiser le rendez-vous courant si c'était celui-ci
          if (currentAppointment && currentAppointment._id === id) {
            setCurrentAppointment(null);
          }

          return true;
        }
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [currentAppointment]
  );

  // Vérifier la disponibilité d'un créneau
  const verifyAvailability = useCallback(async (date, heure, duree) => {
    try {
      setError(null);

      const response = await checkAvailability(date, heure, duree);

      if (response.success) {
        return {
          available: response.available,
          conflicts: response.conflicts,
        };
      }
      return { available: false, conflicts: 0 };
    } catch (err) {
      setError(err.message);
      return { available: false, conflicts: 0 };
    }
  }, []);

  // Charger les rendez-vous du jour au montage du composant
  useEffect(() => {
    loadTodayAppointments();
  }, [loadTodayAppointments]);

  // Mettre à jour les refs
  useEffect(() => {
    paginationRef.current = pagination;
    filtersRef.current = filtersHook.filters;
    loadAppointmentsRef.current = loadAppointments;
    loadTodayAppointmentsRef.current = loadTodayAppointments;
  }, [pagination, filtersHook.filters, loadAppointments, loadTodayAppointments]);

  // Callback pour rafraîchir quand une nouvelle commande arrive via WebSocket
  const handleNewOrder = useCallback((notificationData) => {
    if (loadAppointmentsRef.current) {
      loadAppointmentsRef.current(paginationRef.current.page, paginationRef.current.limit, filtersRef.current);
    }
    if (loadTodayAppointmentsRef.current) {
      loadTodayAppointmentsRef.current();
    }
  }, []);

  // Connecter au WebSocket centralisé
  const { isConnected, subscribe } = useWebSocket();
  
  useEffect(() => {
    const unsubscribe = subscribe("order", handleNewOrder);
    return () => unsubscribe();
  }, [subscribe, handleNewOrder]);

  // Fonctions utilitaires
  const getAppointmentsByStatus = useCallback(
    (statut) => {
      return appointments.filter((apt) => apt.statut === statut);
    },
    [appointments]
  );

  const getTodayAppointmentsByStatus = useCallback(
    (statut) => {
      return todayAppointments.filter((apt) => apt.statut === statut);
    },
    [todayAppointments]
  );

  const getUpcomingAppointments = useCallback(() => {
    const now = new Date();
    return todayAppointments.filter((apt) => {
      const [hours, minutes] = apt.heure.split(":").map(Number);
      const appointmentTime = new Date();
      appointmentTime.setHours(hours, minutes, 0, 0);
      return appointmentTime > now && apt.statut !== "annule";
    });
  }, [todayAppointments]);

  // Charger les rendez-vous au montage et quand les filtres changent
  useEffect(() => {
    const filterParams = {};
    if (filtersHook.filters.date) filterParams.date = filtersHook.filters.date;
    if (filtersHook.filters.type) filterParams.type = filtersHook.filters.type;
    if (filtersHook.filters.modalite) filterParams.modalite = filtersHook.filters.modalite;
    
    loadAppointments(1, 50, filterParams);
  }, [loadAppointments, filtersHook.filters]);

  // Détecter l'orderId dans l'URL et ouvrir automatiquement le détail
  useEffect(() => {
    const orderId = searchParams.get('orderid');
    if (orderId && appointments.length > 0 && !modalHook.showModal) {
      const appointment = appointments.find(a => a._id === orderId);
      if (appointment) {
        modalHook.openDetailsModal(appointment);
        setSearchParams({});
      } else {
      }
    }
  }, [searchParams, appointments, modalHook, setSearchParams]);

  // Wrappers pour les actions avec confirmation
  const handleStatusChange = useCallback(async (appointmentId, newStatus) => {
    try {
      await changeAppointmentStatus(appointmentId, newStatus);
    } catch (error) {
    }
  }, [changeAppointmentStatus]);

  const handleDeleteAppointment = useCallback(async (appointmentId, t) => {
    if (window.confirm(t ? t('appointments.confirmDelete') : 'Confirmer la suppression ?')) {
      try {
        await removeAppointment(appointmentId);
        modalHook.closeDetailsModal();
      } catch (error) {
      }
    }
  }, [removeAppointment, modalHook]);

  const handleCreateAppointment = useCallback(async (appointmentData) => {
    try {
      await addAppointment(appointmentData);
      modalHook.closeCreateModal();
      // Recharger les rendez-vous
      const filterParams = {};
      if (filtersHook.filters.date) filterParams.date = filtersHook.filters.date;
      if (filtersHook.filters.type) filterParams.type = filtersHook.filters.type;
      if (filtersHook.filters.modalite) filterParams.modalite = filtersHook.filters.modalite;
      loadAppointments(1, 50, filterParams);
    } catch (error) {
    }
  }, [addAppointment, modalHook, filtersHook.filters, loadAppointments]);

  const handleEditAppointment = useCallback(async (appointmentId, appointmentData) => {
    try {
      await editAppointment(appointmentId, appointmentData);
      modalHook.closeDetailsModal();
      // Recharger les rendez-vous
      const filterParams = {};
      if (filtersHook.filters.date) filterParams.date = filtersHook.filters.date;
      if (filtersHook.filters.type) filterParams.type = filtersHook.filters.type;
      if (filtersHook.filters.modalite) filterParams.modalite = filtersHook.filters.modalite;
      loadAppointments(1, 50, filterParams);
    } catch (error) {
    }
  }, [editAppointment, modalHook, filtersHook.filters, loadAppointments]);

  // Utilitaires de formatage
  const formatDateTime = useCallback((dateString, type = "full") => {
    const date = new Date(dateString);
    if (type === "date") {
      return date.toLocaleDateString("fr-FR");
    }
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const getStatusBadge = useCallback((statut, t) => {
    const statusConfig = {
      planifie: { label: t ? t('appointments.statuses.planifie') : 'Planifié', class: "status-planifie" },
      confirme: { label: t ? t('appointments.statuses.confirme') : 'Confirmé', class: "status-confirme" },
      en_cours: { label: t ? t('appointments.statuses.en_cours') : 'En cours', class: "status-en-cours" },
      termine: { label: t ? t('appointments.statuses.termine') : 'Terminé', class: "status-termine" },
      annule: { label: t ? t('appointments.statuses.annule') : 'Annulé', class: "status-annule" },
    };

    const config = statusConfig[statut] || {
      label: statut,
      class: "status-default",
    };

    return {
      label: config.label,
      className: config.class
    };
  }, []);

  return {
    // États principaux
    appointments,
    todayAppointments,
    currentAppointment,
    loading,
    error,
    pagination,
    isConnected,

    // Filtres
    filters: filtersHook.filters,
    handleFilterChange: filtersHook.handleFilterChange,
    resetFilters: filtersHook.resetFilters,
    hasActiveFilters: filtersHook.hasActiveFilters,

    // Modals
    showModal: modalHook.showModal,
    showCreateModal: modalHook.showCreateModal,
    selectedAppointment: modalHook.selectedAppointment,
    openDetailsModal: modalHook.openDetailsModal,
    closeDetailsModal: modalHook.closeDetailsModal,
    openCreateModal: modalHook.openCreateModal,
    closeCreateModal: modalHook.closeCreateModal,
    closeAllModals: modalHook.closeAllModals,
    handleViewDetails: (appointmentId) => modalHook.handleViewDetails(loadAppointment, appointmentId),

    // Actions
    loadAppointments,
    loadTodayAppointments,
    loadAppointment,
    addAppointment,
    editAppointment,
    changeAppointmentStatus,
    removeAppointment,
    verifyAvailability,

    // Utilitaires
    getAppointmentsByStatus,
    getTodayAppointmentsByStatus,
    getUpcomingAppointments,
    formatDateTime,
    getStatusBadge,

    // Wrappers d'actions
    handleStatusChange,
    handleDeleteAppointment,
    handleCreateAppointment,
    handleEditAppointment,

    // Reset
    clearError: () => setError(null),
    clearCurrentAppointment: () => setCurrentAppointment(null),
  };
}
