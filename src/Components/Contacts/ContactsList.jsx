import { useTranslation } from "react-i18next";

export function ContactsList({
  clients,
  isLoading,
  selectedClient,
  searchTerm,
  setSearchTerm,
  selectClient,
  openModal,
}) {
  const { t } = useTranslation();
  
  if (isLoading) {
    return (
      <div className="clients-panel">
        <div className="loading">
          <i className="bi bi-arrow-clockwise spin"></i>
          <span>{t('contacts.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="clients-panel">
      <div className="panel-header">
        <h2>{t('contactsList.supplierList')} ({clients.length})</h2>
        <div className="search-container">
          <i className="bi bi-search"></i>
          <input
            type="text"
            placeholder={t('contacts.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="clients-list">
        {clients.length === 0 ? (
          <div className="empty-state">
            <i className="bi bi-person-x"></i>
            <p>{t('contacts.noContacts')}</p>
          </div>
        ) : (
          clients.map((client) => (
            <div
              key={client._id}
              className={`client-card ${
                selectedClient?._id === client._id ? "selected" : ""
              }`}
              onClick={() => selectClient(client)}
            >
              <div className="client-info">
                <h3>
                  <i className="bi bi-building"></i>
                  {client.entrepriseName}
                </h3>
                <div className="client-details">
                  <span className="phone">
                    <i className="bi bi-telephone"></i>
                    {client.telephone}
                  </span>
                </div>
              </div>
              <i className="bi bi-chevron-right"></i>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
