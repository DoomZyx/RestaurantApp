import { useState, useEffect } from "react";
import { useAppointments } from "../../Hooks/Appointments/useAppointments";
import { fetchClients } from "../../API/Clients/api";
import AppLayout from "../../Components/Layout/AppLayout";
import AppointmentsCalendar from "../../Components/Calendar/AppointmentsCalendar";
import { AppointmentsFilters } from "../../Components/Appointments/AppointmentsFilters";
import { AppointmentsList } from "../../Components/Appointments/AppointmentsList";
import { CreateAppointmentForm } from "../../Components/Appointments/CreateAppointmentForm";
import { AppointmentDetails } from "../../Components/Appointments/AppointmentDetails";
import "./AppointmentsPage.scss";

function AppointmentsPage() {
  const {
    appointments,
    loading,
    error,
    pagination,
    currentAppointment,
    filters,
    handleFilterChange,
    resetFilters,
    hasActiveFilters,
    showModal,
    showCreateModal,
    selectedAppointment,
    openDetailsModal,
    closeDetailsModal,
    openCreateModal,
    closeCreateModal,
    handleViewDetails,
    viewMode,
    switchToList,
    switchToCalendar,
    isListView,
    isCalendarView,
    loadAppointments,
    loadAppointment,
    addAppointment,
    editAppointment,
    changeAppointmentStatus,
    removeAppointment,
    clearCurrentAppointment,
    clearError,
  } = useAppointments();

  // Charger les rendez-vous au montage et quand les filtres changent
  useEffect(() => {
    const filterParams = {};
    if (filters.date) filterParams.date = filters.date;
    if (filters.statut) filterParams.statut = filters.statut;
    if (filters.type) filterParams.type = filters.type;
    if (filters.modalite) filterParams.modalite = filters.modalite;
    
    loadAppointments(1, 50, filterParams);
  }, [loadAppointments, filters]);

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      await changeAppointmentStatus(appointmentId, newStatus);
    } catch (error) {
      console.error("Erreur lors du changement de statut:", error);
    }
  };

  const handleDeleteAppointment = async (appointmentId) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce rendez-vous ?")) {
      try {
        await removeAppointment(appointmentId);
        closeDetailsModal(); // Fermer la modal après suppression
      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
      }
    }
  };

  const handleCreateAppointment = async (appointmentData) => {
    try {
      await addAppointment(appointmentData);
      closeCreateModal();
      // Recharger les rendez-vous
      const filterParams = {};
      if (filters.date) filterParams.date = filters.date;
      if (filters.statut) filterParams.statut = filters.statut;
      if (filters.type) filterParams.type = filters.type;
      loadAppointments(1, 50, filterParams);
    } catch (error) {
      console.error("Erreur lors de la création:", error);
    }
  };

  const handleEditAppointment = async (appointmentId, appointmentData) => {
    try {
      await editAppointment(appointmentId, appointmentData);
      closeDetailsModal();
      // Recharger les rendez-vous
      const filterParams = {};
      if (filters.date) filterParams.date = filters.date;
      if (filters.statut) filterParams.statut = filters.statut;
      if (filters.type) filterParams.type = filters.type;
      loadAppointments(1, 50, filterParams);
    } catch (error) {
      console.error("Erreur lors de la modification:", error);
    }
  };

  // Fonctions utilitaires
  const formatDateTime = (dateString, type = "full") => {
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
  };

  const getStatusBadge = (statut) => {
    const statusConfig = {
      planifie: { label: "Planifié", class: "status-planifie" },
      confirme: { label: "Confirmé", class: "status-confirme" },
      en_cours: { label: "En cours", class: "status-en-cours" },
      termine: { label: "Terminé", class: "status-termine" },
      annule: { label: "Annulé", class: "status-annule" },
    };

    const config = statusConfig[statut] || {
      label: statut,
      class: "status-default",
    };

    return (
      <span className={`status-badge ${config.class}`}>
        {config.label}
      </span>
    );
  };

  // Gestion du calendrier
  const handleCalendarSelectAppointment = (appointment) => {
    openDetailsModal(appointment);
  };

  const handleCalendarSelectSlot = (slotInfo) => {
    // Pré-remplir le formulaire de création avec la date/heure sélectionnée
    openCreateModal();
    // TODO: pré-remplir les champs date/heure dans le modal
  };

  return (
    <AppLayout>
      <div className="appointments-page">
        <AppointmentsFilters
          filters={filters}
          handleFilterChange={handleFilterChange}
          resetFilters={resetFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Boutons de filtrage rapide */}
        <div className="quick-filters">
          <h4>Filtres rapides :</h4>
          <div className="quick-filter-buttons">
            <button
              className={`quick-filter-btn ${filters.modalite === "À emporter" ? "active" : ""}`}
              onClick={() => handleFilterChange("modalite", filters.modalite === "À emporter" ? "" : "À emporter")}
            >
              📦 À emporter
            </button>
            <button
              className={`quick-filter-btn ${filters.modalite === "Sur place" ? "active" : ""}`}
              onClick={() => handleFilterChange("modalite", filters.modalite === "Sur place" ? "" : "Sur place")}
            >
              🏢 Sur place
            </button>
            <button
              className={`quick-filter-btn ${filters.modalite === "Livraison" ? "active" : ""}`}
              onClick={() => handleFilterChange("modalite", filters.modalite === "Livraison" ? "" : "Livraison")}
            >
              🚚 Livraison
            </button>
            <button
              className="quick-filter-btn clear"
              onClick={() => handleFilterChange("modalite", "")}
            >
              🔄 Tous
            </button>
          </div>
        </div>

        <div className="page-header">
          <div className="header-actions">
            <div className="view-toggle">
              <button
                className={`btn-toggle ${isListView ? "active" : ""}`}
                onClick={switchToList}
              >
                📋 Liste
              </button>
              <button
                className={`btn-toggle ${isCalendarView ? "active" : ""}`}
                onClick={switchToCalendar}
              >
                📅 Calendrier
              </button>
            </div>
            <button
              className="btn-primary"
              onClick={openCreateModal}
            >
              +   Nouvelle réservation
            </button>
          </div>
        </div>

        {/* Messages d'erreur */}
        {error && (
          <div className="error-message">
            <span>❌ {error}</span>
            <button onClick={clearError}>✕</button>
          </div>
        )}

        {/* Contenu principal - Liste ou Calendrier */}
        <div className="appointments-section">
          {isCalendarView ? (
            <div className="calendar-view">
              <AppointmentsCalendar
                appointments={appointments}
                onSelectAppointment={handleCalendarSelectAppointment}
                onSelectSlot={handleCalendarSelectSlot}
              />
            </div>
          ) : (
            <AppointmentsList
              appointments={appointments}
              loading={loading}
              error={error}
              pagination={pagination}
              onViewDetails={handleViewDetails}
              onStatusChange={handleStatusChange}
              onDelete={handleDeleteAppointment}
              formatDateTime={formatDateTime}
              getStatusBadge={getStatusBadge}
            />
          )}
        </div>

        {/* Modal de création de rendez-vous */}
        {showCreateModal && (
          <div className="modal-overlay" onClick={closeCreateModal}>
            <div className="modal-content create-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>➕ Nouveau Rendez-vous</h2>
                <button className="btn-close" onClick={closeCreateModal}>
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <CreateAppointmentForm
                  onSubmit={handleCreateAppointment}
                  onCancel={closeCreateModal}
                  loading={loading}
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal de détails de rendez-vous */}
        {showModal && selectedAppointment && (
          <div className="modal-overlay" onClick={closeDetailsModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>📅 Détails du Rendez-vous</h2>
                <button className="btn-close" onClick={closeDetailsModal}>
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <AppointmentDetails
                  appointment={selectedAppointment}
                  onEdit={handleEditAppointment}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDeleteAppointment}
                  onClose={closeDetailsModal}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default AppointmentsPage;