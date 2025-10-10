import { useState, useEffect } from "react";
import { fetchClients } from "../../API/Clients/api";

export function CreateSupplierOrderForm({ onSubmit, onCancel, loading }) {
  const [formData, setFormData] = useState({
    client: "",
    date: "",
    heure: "",
    type: "",
    modalite: "Sur place",
    articles: [{ id: Date.now(), nom: "", quantite: 1, prix: "" }],
    sousTotal: 0,
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
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  // Gestion des articles
  const addArticle = () => {
    setFormData(prev => ({
      ...prev,
      articles: [
        ...prev.articles,
        { id: Date.now(), nom: "", quantite: 1, prix: "" }
      ]
    }));
  };

  const removeArticle = (id) => {
    if (formData.articles.length > 1) {
      setFormData(prev => ({
        ...prev,
        articles: prev.articles.filter(art => art.id !== id)
      }));
    }
  };

  const updateArticle = (id, field, value) => {
    setFormData(prev => {
      const updatedArticles = prev.articles.map(art =>
        art.id === id ? { ...art, [field]: value } : art
      );
      
      // Calculer le sous-total
      const sousTotal = updatedArticles.reduce((acc, art) => {
        const prix = parseFloat(art.prix) || 0;
        const quantite = parseInt(art.quantite) || 0;
        return acc + (prix * quantite);
      }, 0);
      
      return {
        ...prev,
        articles: updatedArticles,
        sousTotal: sousTotal
      };
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.client) {
      newErrors.client = "Veuillez sélectionner un client";
    }
    if (!formData.date) {
      newErrors.date = "Veuillez sélectionner une date";
    }
    if (!formData.heure) {
      newErrors.heure = "Veuillez sélectionner une heure";
    }
    if (!formData.type) {
      newErrors.type = "Veuillez sélectionner un type de commande";
    }

    const hasInvalidArticle = formData.articles.some(
      art => !art.nom.trim() || !art.quantite || !art.prix
    );
    if (hasInvalidArticle) {
      newErrors.articles = "Tous les articles doivent avoir un nom, une quantité et un prix";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      const appointmentData = {
        client: formData.client,
        date: formData.date,
        heure: formData.heure,
        type: formData.type,
        modalite: formData.modalite,
        duree: 60, // Durée par défaut
        description: formData.description,
        articles: formData.articles.map(art => ({
          nom: art.nom,
          quantite: parseInt(art.quantite),
          prix: parseFloat(art.prix),
        })),
        montant: formData.sousTotal,
        statut: "confirmée",
      };

      onSubmit(appointmentData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="order-form">
      {/* Informations de base */}
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
          >
            <option value="Sur place">🏢 Sur place</option>
            <option value="À emporter">📦 À emporter</option>
            <option value="Livraison">🚚 Livraison</option>
          </select>
        </div>
      </div>

      {/* Liste des articles */}
      <div className="form-section">
        <div className="section-header">
          <h3>🍽️ Articles de la commande</h3>
        </div>
        
        {errors.articles && (
          <div className="error-message-block">{errors.articles}</div>
        )}

        <div className="articles-list">
          {formData.articles.map((article, index) => (
            <div key={article.id} className="article-row">
              <span className="article-number">{index + 1}</span>
              
              <input
                type="text"
                placeholder="Nom du plat / produit"
                value={article.nom}
                onChange={(e) => updateArticle(article.id, "nom", e.target.value)}
                required
              />

              <input
                type="number"
                min="1"
                placeholder="Qté"
                value={article.quantite}
                onChange={(e) => updateArticle(article.id, "quantite", e.target.value)}
                required
                style={{ width: "80px" }}
              />

              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Prix unitaire (€)"
                value={article.prix}
                onChange={(e) => updateArticle(article.id, "prix", e.target.value)}
                required
                style={{ width: "120px" }}
              />

              <span className="article-total">
                {((parseFloat(article.prix) || 0) * (parseInt(article.quantite) || 0)).toFixed(2)}€
              </span>

              {formData.articles.length > 1 && (
                <button
                  type="button"
                  className="btn-remove"
                  onClick={() => removeArticle(article.id)}
                  title="Supprimer"
                >
                  <i className="bi bi-trash"></i>
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          className="btn-add-article"
          onClick={addArticle}
        >
          <i className="bi bi-plus-circle"></i>
          Ajouter un article
        </button>

        <div className="order-total">
          <strong>Total de la commande :</strong>
          <span className="total-amount">{formData.sousTotal.toFixed(2)}€</span>
        </div>
      </div>

      {/* Description */}
      <div className="form-group full-width">
        <label htmlFor="description">💬 Notes / Instructions</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Détails de la commande, allergies, instructions spéciales..."
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
          Annuler
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
        >
          {loading ? "Création..." : "Créer la commande"}
        </button>
      </div>
    </form>
  );
}

