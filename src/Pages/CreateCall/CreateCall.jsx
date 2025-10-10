import { useState } from "react";
import AppLayout from "../../Components/Layout/AppLayout";
import { createCall } from "../../API/Calls/api";
import "./CreateCall.scss";

function CreateCall() {
  const [formData, setFormData] = useState({
    nom: "",
    telephone: "",
    email: "",
    adresse: "",
    entrepriseName: "",
    type_demande: "",
    services: "",
    description: "",
    statut: "nouveau",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const typesDemande = [
    "Commande à emporter",
    "Livraison à domicile",
    "Réservation de table",
    "Information menu",
    "Réclamation",
    "Facturation",
    "Autre",
  ];

  const servicesOptions = [
    "Pizzas",
    "Burgers",
    "Salades",
    "Boissons",
    "Desserts",
    "Menus",
    "Promotions",
    "Autre",
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation basique
    if (
      !formData.prenom ||
      !formData.nom ||
      !formData.telephone ||
      !formData.type_demande
    ) {
      setError("Veuillez remplir tous les champs obligatoires");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const callData = {
        ...formData,
        date: new Date().toISOString(),
      };

      // Utiliser la nouvelle méthode API
      await createCall(callData);

      setSuccess(true);
      setFormData({
        nom: "",
        telephone: "",
        email: "",
        adresse: "",
        entrepriseName: "",
        type_demande: "",
        services: "",
        description: "",
        statut: "nouveau",
      });

      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      nom: "",
      telephone: "",
      email: "",
      adresse: "",
      entrepriseName: "",
      type_demande: "",
      services: "",
      description: "",
      statut: "nouveau",
    });
    setError(null);
    setSuccess(false);
  };

  return (
    <AppLayout>
      <div className="create-call-container">
        {success && (
          <div className="success-message">
            <i className="bi bi-check-circle"></i>
            Appel créé avec succès !
          </div>
        )}

        {error && (
          <div className="error-message">
            <i className="bi bi-exclamation-triangle"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="call-form">
          <div className="form-section">
            <h3>
              <i className="bi bi-person"></i>
              Informations Client
            </h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="prenom">
                  Prénom <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="prenom"
                  name="prenom"
                  value={formData.prenom}
                  onChange={handleInputChange}
                  placeholder="Prénom du client"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="nom">
                  Nom <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="nom"
                  name="nom"
                  value={formData.nom}
                  onChange={handleInputChange}
                  placeholder="Nom de famille"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="telephone">
                  Téléphone <span className="required">*</span>
                </label>
                <input
                  type="tel"
                  id="telephone"
                  name="telephone"
                  value={formData.telephone}
                  onChange={handleInputChange}
                  placeholder="+33 1 23 45 67 89"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="client@email.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="entrepriseName">Entreprise</label>
                <input
                  type="text"
                  id="entrepriseName"
                  name="entrepriseName"
                  value={formData.entrepriseName}
                  onChange={handleInputChange}
                  placeholder="Nom de l'entreprise"
                />
              </div>
            </div>

            <div className="form-group full-width">
              <label htmlFor="adresse">Adresse</label>
              <textarea
                id="adresse"
                name="adresse"
                value={formData.adresse}
                onChange={handleInputChange}
                placeholder="Adresse complète du client..."
                rows={3}
              />
            </div>
          </div>

          <div className="form-section">
            <h3>
              <i className="bi bi-telephone"></i>
              Détails de l'Appel
            </h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="type_demande">
                  Type de demande <span className="required">*</span>
                </label>
                <select
                  id="type_demande"
                  name="type_demande"
                  value={formData.type_demande}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Sélectionner un type</option>
                  {typesDemande.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="services">Service</label>
                <select
                  id="services"
                  name="services"
                  value={formData.services}
                  onChange={handleInputChange}
                >
                  <option value="">Sélectionner un service</option>
                  {servicesOptions.map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="statut">Statut initial</label>
                <select
                  id="statut"
                  name="statut"
                  value={formData.statut}
                  onChange={handleInputChange}
                >
                  <option value="nouveau">🆕 Nouveau</option>
                  <option value="en_cours">⌛ En cours</option>
                  <option value="termine">☑️ Terminé</option>
                  <option value="annule">❌ Annulé</option>
                </select>
              </div>
            </div>

            <div className="form-group full-width">
              <label htmlFor="description">Description de la demande</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Décrivez en détail la demande du client..."
                rows={5}
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={handleReset}
              className="reset-btn"
              disabled={loading}
            >
              <i className="bi bi-arrow-clockwise"></i>
              Réinitialiser
            </button>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <i className="bi bi-arrow-repeat spinning"></i>
                  Création...
                </>
              ) : (
                <>
                  <i className="bi bi-plus-circle"></i>
                  Créer l'appel
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

export default CreateCall;
