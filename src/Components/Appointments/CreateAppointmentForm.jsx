import React, { useState, useEffect } from "react";
import { fetchClients } from "../../API/Clients/api";

export function CreateAppointmentForm({ onSubmit, onCancel, loading }) {
  const [formData, setFormData] = useState({
    client: "",
    date: "",
    heure: "",
    duree: 60,
    type: "",
    modalite: "Sur place",
    nombrePersonnes: "",
    description: "",
  });

  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [errors, setErrors] = useState({});

  // Charger les clients
  useEffect(() => {
    const loadClients = async () => {
      try {
        setLoadingClients(true);
        const response = await fetchClients();
        if (response.success) {
          setClients(response.data);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des clients:", error);
      } finally {
        setLoadingClients(false);
      }
    };

    loadClients();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Effacer l'erreur si elle existe
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.client) newErrors.client = "Veuillez sélectionner un client";
    if (!formData.date) newErrors.date = "Veuillez sélectionner une date";
    if (!formData.heure) newErrors.heure = "Veuillez sélectionner une heure";
    if (!formData.type) newErrors.type = "Veuillez sélectionner un type";
    if (!formData.modalite) newErrors.modalite = "Veuillez sélectionner une modalité";
    
    // Validation du nombre de personnes pour les réservations
    if (formData.type === "Réservation de table") {
      if (!formData.nombrePersonnes || formData.nombrePersonnes < 1) {
        newErrors.nombrePersonnes = "Veuillez indiquer le nombre de personnes";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="appointment-form">
      <div className="form-grid">
        {/* Client */}
        <div className="form-group">
          <label htmlFor="client">👤 Client *</label>
          <select
            id="client"
            name="client"
            value={formData.client}
            onChange={handleChange}
            className={errors.client ? "error" : ""}
            disabled={loadingClients}
          >
            <option value="">
              {loadingClients ? "Chargement..." : "Sélectionner un client"}
            </option>
            {clients.map((client) => (
              <option key={client._id} value={client._id}>
                {client.prenom} {client.nom} - {client.telephone}
              </option>
            ))}
          </select>
          {errors.client && <span className="error-message">{errors.client}</span>}
        </div>

        {/* Date */}
        <div className="form-group">
          <label htmlFor="date">📅 Date *</label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className={errors.date ? "error" : ""}
            min={new Date().toISOString().split('T')[0]}
          />
          {errors.date && <span className="error-message">{errors.date}</span>}
        </div>

        {/* Heure */}
        <div className="form-group">
          <label htmlFor="heure">🕒 Heure *</label>
          <input
            type="time"
            id="heure"
            name="heure"
            value={formData.heure}
            onChange={handleChange}
            className={errors.heure ? "error" : ""}
          />
          {errors.heure && <span className="error-message">{errors.heure}</span>}
        </div>

        {/* Durée */}
        <div className="form-group">
          <label htmlFor="duree">⏱️ Durée (minutes)</label>
          <select
            id="duree"
            name="duree"
            value={formData.duree}
            onChange={handleChange}
          >
            <option value={30}>30 minutes</option>
            <option value={60}>1 heure</option>
            <option value={90}>1h30</option>
            <option value={120}>2 heures</option>
            <option value={180}>3 heures</option>
          </select>
        </div>

        {/* Type */}
        <div className="form-group">
          <label htmlFor="type">🏷️ Type *</label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            className={errors.type ? "error" : ""}
          >
            <option value="">Sélectionner un type</option>
            <option value="Commande à emporter">Commande à emporter</option>
            <option value="Livraison à domicile">Livraison à domicile</option>
            <option value="Réservation de table">Réservation de table</option>
            <option value="Dégustation">Dégustation</option>
            <option value="Événement privé">Événement privé</option>
          </select>
          {errors.type && <span className="error-message">{errors.type}</span>}
        </div>

        {/* Modalité */}
        <div className="form-group">
          <label htmlFor="modalite">📍 Modalité *</label>
          <select
            id="modalite"
            name="modalite"
            value={formData.modalite}
            onChange={handleChange}
            className={errors.modalite ? "error" : ""}
          >
            <option value="Sur place">Sur place</option>
            <option value="À emporter">À emporter</option>
            <option value="Livraison">Livraison</option>
          </select>
          {errors.modalite && <span className="error-message">{errors.modalite}</span>}
        </div>

        {/* Nombre de personnes (uniquement pour les réservations) */}
        {formData.type === "Réservation de table" && (
          <div className="form-group">
            <label htmlFor="nombrePersonnes">👥 Nombre de personnes *</label>
            <input
              type="number"
              id="nombrePersonnes"
              name="nombrePersonnes"
              value={formData.nombrePersonnes}
              onChange={handleChange}
              className={errors.nombrePersonnes ? "error" : ""}
              min="1"
              max="100"
              placeholder="Ex: 4"
            />
            {errors.nombrePersonnes && <span className="error-message">{errors.nombrePersonnes}</span>}
          </div>
        )}
      </div>

      {/* Description */}
      <div className="form-group full-width">
        <label htmlFor="description">📝 Description</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Détails du rendez-vous..."
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="form-actions">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
          disabled={loading}
        >
          ❌ Annuler
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
        >
          {loading ? "⏳ Création..." : "✅ Créer le rendez-vous"}
        </button>
      </div>
    </form>
  );
}
