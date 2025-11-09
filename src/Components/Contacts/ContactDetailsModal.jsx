import "../AddClientModal/AddClientModal.scss";
import "./ContactDetailsModal.scss";
import { ContactDetails } from "./ContactDetails";

export default function ContactDetailsModal({ selectedClient, onClose, onDelete }) {
  if (!selectedClient) return null;

  const handleOverlayClick = () => {
    onClose && onClose();
  };

  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="contact-details-modal" onClick={stopPropagation}>
        <ContactDetails 
          selectedClient={selectedClient} 
          clearSelection={onClose}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}


