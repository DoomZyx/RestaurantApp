import { useTranslation } from "react-i18next";
import { useState, useMemo } from "react";
import { useAppointments } from "../../Hooks/Appointments/useAppointments";
import AppLayout from "../../Components/Layout/AppLayout";
import { AppointmentsFilters } from "../../Components/Appointments/AppointmentsFilters";
import { AppointmentsList } from "../../Components/Appointments/AppointmentsList";
import { CreateAppointmentForm } from "../../Components/Appointments/CreateAppointmentForm";
import { AppointmentDetails } from "../../Components/Appointments/AppointmentDetails";
import "../AppointmentsPage/AppointmentsPage.scss";

function ReservationsPage() {
  const { t } = useTranslation();
  const [activeService, setActiveService] = useState("midi"); // "midi" ou "soir"
  
  // Utiliser le hook qui contient toute la logique
  const {
    appointments,
    loading,
    error,
    pagination,
    filters,
    handleFilterChange,
    resetFilters,
    hasActiveFilters,
    showModal,
    showCreateModal,
    selectedAppointment,
    openCreateModal,
    closeDetailsModal,
    closeCreateModal,
    handleViewDetails,
    clearError,
    formatDateTime,
    getStatusBadge,
    handleStatusChange,
    handleDeleteAppointment,
    handleCreateAppointment,
    handleEditAppointment,
    handleCalendarSelectAppointment,
    handleCalendarSelectSlot,
  } = useAppointments();

  // Fonction pour déterminer si une heure appartient au service midi ou soir
  const getServiceFromTime = (time) => {
    if (!time) return null;
    const hour = parseInt(time.split(':')[0]);
    // Midi: 11h00 - 15h00, Soir: 18h00 - 23h00
    if (hour >= 11 && hour < 15) return "midi";
    if (hour >= 18 && hour < 24) return "soir";
    return null;
  };

  // Filtrer les appointments pour n'afficher que les réservations (Sur place) du service sélectionné
  const filteredReservations = useMemo(() => {
    return appointments.filter(apt => {
      // Filtrer uniquement les réservations (Sur place)
      if (apt.modalite !== "Sur place") return false;
      
      // Filtrer par service (midi ou soir)
      const service = getServiceFromTime(apt.heure);
      return service === activeService;
    });
  }, [appointments, activeService]);

  return (
    <AppLayout>
      <div className="appointments-page">

        <div className="page-header">
          <div className="header-actions">
            <button
              className="btn-primary"
              onClick={openCreateModal}
            >
              {t('reservations.newButton')}
            </button>
          </div>
        </div>
        
        <AppointmentsFilters
          filters={filters}
          handleFilterChange={handleFilterChange}
          resetFilters={resetFilters}
          hasActiveFilters={hasActiveFilters}
          activeService={activeService}
          setActiveService={setActiveService}
        />


        {/* Messages d'erreur */} 
        {error && (
          <div className="notification-toast error-message">
            <i className="bi bi-exclamation-triangle-fill"></i>
            <span className="message-content">{error}</span>
            <button className="close-btn" onClick={clearError}>✕</button>
          </div>
        )}

        <div className="appointments-section">
          {/* Zone des réservations en attente */}
          <div className="appointments-zone waiting-zone">
                <h3 className="zone-title">
                  <span className="zone-icon"></span>
                  {t('reservations.waitingReservations')}
                  <span className="zone-count">
                    {filteredReservations.filter(apt => 
                      ['planifie', 'confirme'].includes(apt.statut)
                    ).length}
                  </span>
                </h3>
                <AppointmentsList
                  appointments={filteredReservations.filter(apt => 
                    ['planifie', 'confirme'].includes(apt.statut)
                  )}
                  loading={loading}
                  error={error}
                  pagination={pagination}
                  onViewDetails={handleViewDetails}
                  onStatusChange={handleStatusChange}
                  onDelete={(id) => handleDeleteAppointment(id, t)}
                  formatDateTime={formatDateTime}
                  getStatusBadge={(statut) => {
                    const badge = getStatusBadge(statut, t);
                    return <span className={`status-badge ${badge.className}`}>{badge.label}</span>;
                  }}
                />
              </div>

              {/* Zone des clients présents */}
              <div className="appointments-zone in-progress-zone">
                <h3 className="zone-title">
                  <span className="zone-icon"></span>
                  {t('reservations.inProgressReservations')}
                  <span className="zone-count">
                    {filteredReservations.filter(apt => apt.statut === 'en_cours').length}
                  </span>
                </h3>
                <AppointmentsList
                  appointments={filteredReservations.filter(apt => apt.statut === 'en_cours')}
                  loading={loading}
                  error={error}
                  pagination={pagination}
                  onViewDetails={handleViewDetails}
                  onStatusChange={handleStatusChange}
                  onDelete={(id) => handleDeleteAppointment(id, t)}
                  formatDateTime={formatDateTime}
                  getStatusBadge={(statut) => {
                    const badge = getStatusBadge(statut, t);
                    return <span className={`status-badge ${badge.className}`}>{badge.label}</span>;
                  }}
                />
              </div>

              {/* Zone des réservations terminées */}
              <div className="appointments-zone completed-zone">
                <h3 className="zone-title">
                  <span className="zone-icon"></span>
                  {t('reservations.completedReservations')}
                  <span className="zone-count">
                    {filteredReservations.filter(apt => 
                      ['termine', 'annule'].includes(apt.statut)
                    ).length}
                  </span>
                </h3>
                <AppointmentsList
                  appointments={filteredReservations.filter(apt => 
                    ['termine', 'annule'].includes(apt.statut)
                  )}
                  loading={loading}
                  error={error}
                  pagination={pagination}
                  onViewDetails={handleViewDetails}
                  onStatusChange={handleStatusChange}
                  onDelete={(id) => handleDeleteAppointment(id, t)}
                  formatDateTime={formatDateTime}
                  getStatusBadge={(statut) => {
                    const badge = getStatusBadge(statut, t);
                    return <span className={`status-badge ${badge.className}`}>{badge.label}</span>;
                  }}
                />
              </div>
        </div>

        {/* Modal de création de réservation */}
        {showCreateModal && (
          <div className="modal-overlay" onClick={closeCreateModal}>
            <div className="modal-content create-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-body">
                <CreateAppointmentForm
                  onSubmit={handleCreateAppointment}
                  onCancel={closeCreateModal}
                  loading={loading}
                  appointmentType="Réservation de table"
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal de détails de réservation */}
        {showModal && selectedAppointment && (
          <div className="modal-overlay" onClick={closeDetailsModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-body">
                <AppointmentDetails
                  appointment={selectedAppointment}
                  onEdit={handleEditAppointment}
                  onStatusChange={handleStatusChange}
                  onDelete={(id) => handleDeleteAppointment(id, t)}
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

export default ReservationsPage;

