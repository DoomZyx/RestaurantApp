import { useState } from "react";

export function useContactsSearch() {
  const [searchTerm, setSearchTerm] = useState("");

  // Fonction pour filtrer les clients selon le terme de recherche
  const filterClients = (clients) => {
    if (!searchTerm) return clients;
    
    const term = searchTerm.toLowerCase();
    return clients.filter((client) => {
      return (
        client.prenom?.toLowerCase().includes(term) ||
        client.nom?.toLowerCase().includes(term) ||
        client.telephone?.toLowerCase().includes(term) ||
        client.email?.toLowerCase().includes(term) ||
        client.entrepriseName?.toLowerCase().includes(term)
      );
    });
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  return {
    searchTerm,
    setSearchTerm,
    filterClients,
    clearSearch,
  };
}
