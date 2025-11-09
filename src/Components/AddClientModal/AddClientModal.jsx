import { useState } from "react";
import { useTranslation } from "react-i18next";
import "./AddClientModal.scss";

function AddClientModal({ isOpen, onClose, onSubmit }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    telephone: "",
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
    
    if (!formData.entrepriseName.trim()) {
      newErrors.entrepriseName = "Le nom de l'entreprise est requis";
    }
    
    if (!formData.telephone.trim()) {
      newErrors.telephone = t('addClientModal.errors.phoneRequired');
    } else if (!/^[\d\s\-\+\(\)]+$/.test(formData.telephone)) {
      newErrors.telephone = t('addClientModal.errors.invalidPhone');
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
      telephone: "",
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

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-section">
            <h3>
              <i className="bi bi-building"></i>
              Informations du fournisseur
            </h3>
            
            <div className="form-group">
              <label htmlFor="entrepriseName">{t('addClientModal.companyName')} *</label>
              <input
                type="text"
                id="entrepriseName"
                name="entrepriseName"
                value={formData.entrepriseName}
                onChange={handleChange}
                className={errors.entrepriseName ? "error" : ""}
                placeholder="Ex: Boucherie Martin, Fromagerie Dupont..."
              />
              {errors.entrepriseName && <span className="error-message">{errors.entrepriseName}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="telephone">{t('addClientModal.phone')} *</label>
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
              <label htmlFor="adresse">{t('addClientModal.address')}</label>
              <textarea
                id="adresse"
                name="adresse"
                value={formData.adresse}
                onChange={handleChange}
                placeholder="Ex: 123 Rue de la Paix, 75001 Paris"
                rows="3"
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
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="bi bi-arrow-clockwise spin"></i>
                  {t('addClientModal.creating')}
                </>
              ) : (
                <>
                  <i className="bi bi-check"></i>
                  {t('addClientModal.createContact')}
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