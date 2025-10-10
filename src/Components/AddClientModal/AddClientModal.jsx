import { useState } from "react";
import "./AddClientModal.scss";

function AddClientModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    prenom: "",
    nom: "",
    telephone: "",
    email: "",
    adresse: "",
    entrepriseName: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Supprimer l'erreur du champ modifié
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.prenom.trim()) {
      newErrors.prenom = "Le prénom est requis";
    }
    
    if (!formData.nom.trim()) {
      newErrors.nom = "Le nom est requis";
    }
    
    if (!formData.telephone.trim()) {
      newErrors.telephone = "Le téléphone est requis";
    } else if (!/^[\d\s\-\+\(\)]+$/.test(formData.telephone)) {
      newErrors.telephone = "Format de téléphone invalide";
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Format d'email invalide";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      await onSubmit(formData);
      handleClose();
    } catch (error) {
      console.error("Erreur lors de la soumission:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      prenom: "",
      nom: "",
      telephone: "",
      email: "",
      adresse: "",
      entrepriseName: "",
    });
    setErrors({});
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="add-client-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <i className="bi bi-person-plus"></i>
            Ajouter un nouveau contact
          </h2>
          <button className="close-btn" onClick={handleClose} type="button">
            <i className="bi bi-x"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-section">
            <h3>
              <i className="bi bi-person"></i>
              Informations personnelles
            </h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="prenom">Prénom *</label>
                <input
                  type="text"
                  id="prenom"
                  name="prenom"
                  value={formData.prenom}
                  onChange={handleChange}
                  className={errors.prenom ? "error" : ""}
                  placeholder="Ex: Jean"
                />
                {errors.prenom && <span className="error-message">{errors.prenom}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="nom">Nom *</label>
                <input
                  type="text"
                  id="nom"
                  name="nom"
                  value={formData.nom}
                  onChange={handleChange}
                  className={errors.nom ? "error" : ""}
                  placeholder="Ex: Dupont"
                />
                {errors.nom && <span className="error-message">{errors.nom}</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="telephone">Téléphone *</label>
              <input
                type="tel"
                id="telephone"
                name="telephone"
                value={formData.telephone}
                onChange={handleChange}
                className={errors.telephone ? "error" : ""}
                placeholder="Ex: 01 23 45 67 89"
              />
              {errors.telephone && <span className="error-message">{errors.telephone}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? "error" : ""}
                placeholder="Ex: jean.dupont@email.com"
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>
          </div>

          <div className="form-section">
            <h3>
              <i className="bi bi-geo-alt"></i>
              Informations complémentaires
            </h3>
            
            <div className="form-group">
              <label htmlFor="adresse">Adresse</label>
              <textarea
                id="adresse"
                name="adresse"
                value={formData.adresse}
                onChange={handleChange}
                placeholder="Ex: 123 Rue de la Paix, 75001 Paris"
                rows="3"
              />
            </div>

            <div className="form-group">
              <label htmlFor="entrepriseName">Nom de l'entreprise</label>
              <input
                type="text"
                id="entrepriseName"
                name="entrepriseName"
                value={formData.entrepriseName}
                onChange={handleChange}
                placeholder="Ex: SARL Dupont & Associés"
              />
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="bi bi-arrow-clockwise spin"></i>
                  Création...
                </>
              ) : (
                <>
                  <i className="bi bi-check"></i>
                  Créer le contact
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddClientModal; 