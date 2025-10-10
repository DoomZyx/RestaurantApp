import { useState } from "react";

export function useContactsModal() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(""), 5000);
  };

  const clearSuccess = () => {
    setSuccessMessage("");
  };

  const handleAddClient = async (addClientFn, clientData) => {
    try {
      await addClientFn(clientData);
      showSuccess("Contact créé avec succès !");
      closeModal();
    } catch (error) {
      // L'erreur est déjà gérée dans le hook principal
      console.error("Erreur lors de l'ajout du client:", error);
    }
  };

  return {
    // États
    isModalOpen,
    successMessage,
    
    // Actions
    openModal,
    closeModal,
    showSuccess,
    clearSuccess,
    handleAddClient,
  };
}
