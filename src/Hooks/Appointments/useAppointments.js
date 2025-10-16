import { useState, useEffect, useCallback, useRef } from "react";
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
import { useAppointmentsView } from "./useAppointmentsView";
import { useWebSocket } from "../../Context/WebSocketContext";

export function useAppointments() {
  // Hooks spécialisés
  const filtersHook = useAppointmentsFilters();
  const modalHook = useAppointmentsModal();
  const viewHook = useAppointmentsView();

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
        console.error("Erreur lors du chargement des rendez-vous:", err);
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
      console.error("Erreur lors du chargement des rendez-vous du jour:", err);
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
      console.error("Erreur lors du chargement du rendez-vous:", err);
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
        console.error("Erreur lors de la création du rendez-vous:", err);
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
        console.error("Erreur lors de la mise à jour du rendez-vous:", err);
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
        console.error("Erreur lors de la mise à jour du statut:", err);
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
        console.error("Erreur lors de la suppression du rendez-vous:", err);
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
      console.error("Erreur lors de la vérification de disponibilité:", err);
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
    console.log("🔄 Rafraîchissement automatique des rendez-vous...", notificationData);
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

    // Vue
    viewMode: viewHook.viewMode,
    switchToList: viewHook.switchToList,
    switchToCalendar: viewHook.switchToCalendar,
    toggleView: viewHook.toggleView,
    isListView: viewHook.isListView,
    isCalendarView: viewHook.isCalendarView,

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

    // Reset
    clearError: () => setError(null),
    clearCurrentAppointment: () => setCurrentAppointment(null),
  };
}
