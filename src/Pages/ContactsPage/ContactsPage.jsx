import { useTranslation } from "react-i18next";
import { useContacts } from "../../Hooks/Contacts/useContacts";
import AppLayout from "../../Components/Layout/AppLayout";
import AddClientModal from "../../Components/AddClientModal/AddClientModal";
import { ContactsList } from "../../Components/Contacts/ContactsList";
import ContactDetailsModal from "../../Components/Contacts/ContactDetailsModal";
import "./ContactsPage.scss";

function ContactsPage() {
  const { t } = useTranslation();
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
    handleDeleteClient,
    formatDate,
    getStatusBadge,
  } = useContacts();

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
              {t('contactsPage.newSupplier')}
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
        </div>
        <ContactDetailsModal
          selectedClient={selectedClient}
          onClose={clearSelection}
          onDelete={handleDeleteClient}
        />
        
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
