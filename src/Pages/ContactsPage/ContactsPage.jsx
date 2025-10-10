import { useContacts } from "../../Hooks/Contacts/useContacts";
import AppLayout from "../../Components/Layout/AppLayout";
import AddClientModal from "../../Components/AddClientModal/AddClientModal";
import { ContactsList } from "../../Components/Contacts/ContactsList";
import { ContactDetails } from "../../Components/Contacts/ContactDetails";
import "./ContactsPage.scss";

function ContactsPage() {
  const {
    clients,
    selectedClient,
    clientHistory,
    isLoading,
    isLoadingHistory,
    error,
    searchTerm,
    setSearchTerm,
    selectClient,
    clearSelection,
    isModalOpen,
    successMessage,
    openModal,
    closeModal,
    handleAddClient,
  } = useContacts();

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };


  const getStatusBadge = (status) => {
    const statusConfig = {
      nouveau: { label: "Nouveau", class: "status-nouveau" },
      en_cours: { label: "En cours", class: "status-en-cours" },
      termine: { label: "Terminé", class: "status-termine" },
      annule: { label: "Annulé", class: "status-annule" },
    };

    const config = statusConfig[status] || {
      label: status,
      class: "status-default",
    };
    return (
      <span className={`status-badge ${config.class}`}>{config.label}</span>
    );
  };

  if (error) {
    return (
      <AppLayout>
        <div className="contacts-page">
          <div className="error-message">
            <i className="bi bi-exclamation-triangle"></i>
            <p>{error}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="contacts-page">
        <header className="page-header">
          <div className="header-content">
            <button
              className="add-client-btn"
              onClick={openModal}
            >
              <i className="bi bi-person-plus"></i>
              Nouveau Fournisseur
            </button>
          </div>

          {successMessage && (
            <div className="success-message">
              <i className="bi bi-check-circle"></i>
              <span>{successMessage}</span>
            </div>
          )}
        </header>

        <div className="contacts-content">
          <ContactsList
            clients={clients}
            isLoading={isLoading}
            selectedClient={selectedClient}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectClient={selectClient}
            openModal={openModal}
          />

          <ContactDetails
            selectedClient={selectedClient}
            clearSelection={clearSelection}
          />
        </div>
        
        <AddClientModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSubmit={handleAddClient}
        />
      </div>
    </AppLayout>
  );
}

export default ContactsPage;
