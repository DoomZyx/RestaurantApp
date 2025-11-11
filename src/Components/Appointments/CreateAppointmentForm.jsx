import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { fetchPricing } from "../../API/Pricing/api";

export function CreateAppointmentForm({ onSubmit, onCancel, loading }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    nom: "",
    date: "",
    heure: "",
    type: "",
    nombrePersonnes: "",
    description: "",
  });

  const [errors, setErrors] = useState({});
  const [menuProducts, setMenuProducts] = useState([]); // produits depuis la config
  const [selectedItems, setSelectedItems] = useState([
    { id: Date.now(), productId: "", qty: 1, supplements: "", options: {} }
  ]);

  // Charger les produits depuis la configuration Pricing
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetchPricing();
        const pricing = res?.data || res; // selon structure
        const menu = pricing?.menuPricing || {};
        // Aplatir {categorie: { produits: [] }} en liste unique
        const flattened = Object.entries(menu).flatMap(([key, cat]) => {
          const produits = Array.isArray(cat?.produits) ? cat.produits : [];
          return produits.map((p) => ({
            _id: p._id || `${key}-${p.nom}`,
            nom: p.nom,
            categorie: cat?.nom || key,
            prixBase: p.prixBase,
            options: p.options || {}, // Inclure les options personnalisables
          }));
        });
        setMenuProducts(flattened);
      } catch (e) {
        setMenuProducts([]);
      }
    };
    loadProducts();
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

    if (!formData.nom.trim()) newErrors.nom = t('createAppointment.errors.enterClientName');
    if (!formData.date) newErrors.date = t('createAppointment.errors.selectDate');
    if (!formData.heure) newErrors.heure = t('createAppointment.errors.selectTime');
    if (!formData.type) newErrors.type = t('createAppointment.errors.selectType');
    
    // Validation du nombre de personnes pour les réservations
    if (formData.type === "Réservation de table") {
      if (!formData.nombrePersonnes || formData.nombrePersonnes < 1) {
        newErrors.nombrePersonnes = t('createAppointment.errors.enterPersons');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Ne pas envoyer le champ client s'il est vide
      const payload = { ...formData };
      delete payload.client; // Supprimer le champ client pour éviter les erreurs de validation
      
      // Nettoyer nombrePersonnes : convertir en integer ou supprimer si vide
      if (payload.nombrePersonnes === "" || payload.nombrePersonnes === null || payload.nombrePersonnes === undefined) {
        delete payload.nombrePersonnes;
      } else {
        payload.nombrePersonnes = parseInt(payload.nombrePersonnes, 10);
      }
      
      // Si commande à emporter: structurer les commandes dans un champ dédié
      if (formData.type === "Commande à emporter") {
        const commandes = selectedItems
          .filter(it => it.productId)
          .map((it) => {
            const prod = menuProducts.find(p => p._id === it.productId);
            return {
              produitId: it.productId,
              nom: prod?.nom || "Plat inconnu",
              categorie: prod?.categorie || "",
              quantite: it.qty && it.qty > 0 ? it.qty : 1,
              prixUnitaire: prod?.prixBase || 0,
              supplements: it.supplements?.trim() || "",
              options: it.options || {} // Inclure les options sélectionnées
            };
          });
        
        if (commandes.length > 0) {
          payload.commandes = commandes;
        }
      }
      
      onSubmit(payload);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="appointment-form">
      <div className="form-grid">
        {/* Nom du client (texte) */}
        <div className="form-group">
          <label htmlFor="nom">👤 {t('createAppointment.clientName')} *</label>
          <input
            type="text"
            id="nom"
            name="nom"
            placeholder="Ex: Axel Cella"
            value={formData.nom}
            onChange={handleChange}
            className={errors.nom ? "error" : ""}
          />
          {errors.nom && <span className="error-message">{errors.nom}</span>}
        </div>

        {/* Date */}
        <div className="form-group">
          <label htmlFor="date">📅 {t('createAppointment.date')} *</label>
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
          <label htmlFor="heure">🕒 {t('createAppointment.time')} *</label>
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
          <label htmlFor="type">🏷️ {t('createAppointment.orderType')} *</label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            className={errors.type ? "error" : ""}
          >
            <option value="">{t('createAppointment.selectType')}</option>
            <option value="Commande à emporter">{t('createAppointment.takeaway')}</option>
            <option value="Réservation de table">{t('createAppointment.reservation')}</option>
          </select>
          {errors.type && <span className="error-message">{errors.type}</span>}
        </div>

        {/* Nombre de personnes (uniquement pour les réservations) */}
        {formData.type === "Réservation de table" && (
          <div className="form-group">
            <label htmlFor="nombrePersonnes">👥 {t('createAppointment.persons')} *</label>
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

      {/* Sélection de plats (multiples) si commande à emporter */}
      {formData.type === "Commande à emporter" && (
        <div className="form-group full-width" style={{ marginTop: '20px' }}>
          <label>🍽️ {t('createAppointment.orderedDishes')}</label>
          <div className="items-list">
            {selectedItems.map((item, idx) => {
              const selectedProduct = menuProducts.find(p => p._id === item.productId);
              const hasOptions = selectedProduct && Object.keys(selectedProduct.options || {}).length > 0;
              
              return (
                <div key={item.id} className="item-row-container">
                  <div className="item-row">
                    <select
                      value={item.productId}
                      onChange={(e) => {
                        const newProductId = e.target.value;
                        const newProduct = menuProducts.find(p => p._id === newProductId);
                        // Réinitialiser les options quand on change de produit
                        setSelectedItems(prev => prev.map(it => 
                          it.id === item.id 
                            ? { ...it, productId: newProductId, options: {} } 
                            : it
                        ));
                      }}
                      className="item-select"
                    >
                      <option value="">{t('createAppointment.selectDish')}</option>
                      {menuProducts.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.categorie} • {p.nom}{p.prixBase ? ` - ${p.prixBase.toFixed?.(2) || p.prixBase}€` : ''}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={item.qty}
                      onChange={(e) => setSelectedItems(prev => prev.map(it => it.id === item.id ? { ...it, qty: Math.max(1, parseInt(e.target.value || '1')) } : it))}
                      className="item-qty"
                      placeholder={t('createAppointment.qty')}
                    />
                    {selectedItems.length > 1 && (
                      <button 
                        type="button" 
                        className="btn-secondary btn-remove" 
                        onClick={() => setSelectedItems(prev => prev.filter(it => it.id !== item.id))}
                      >
                        ❌ {t('common.delete')}
                      </button>
                    )}
                  </div>

                  {/* Options personnalisables */}
                  {hasOptions && (
                    <div className="item-options">
                      {Object.entries(selectedProduct.options).map(([optionKey, optionData]) => (
                        <div key={optionKey} className="option-group">
                          <label className="option-label">
                            {optionData.nom}
                            {optionData.obligatoire && <span className="required">*</span>}
                          </label>
                          <div className="option-choices">
                            {optionData.choix.map((choix) => (
                              <label key={choix} className="choice-label">
                                <input
                                  type={optionData.multiple ? "checkbox" : "radio"}
                                  name={`${item.id}-${optionKey}`}
                                  value={choix}
                                  checked={
                                    optionData.multiple
                                      ? (item.options[optionKey] || []).includes(choix)
                                      : item.options[optionKey] === choix
                                  }
                                  onChange={(e) => {
                                    setSelectedItems(prev => prev.map(it => {
                                      if (it.id !== item.id) return it;
                                      
                                      const newOptions = { ...it.options };
                                      if (optionData.multiple) {
                                        // Checkbox: gérer un tableau
                                        const current = newOptions[optionKey] || [];
                                        if (e.target.checked) {
                                          newOptions[optionKey] = [...current, choix];
                                        } else {
                                          newOptions[optionKey] = current.filter(c => c !== choix);
                                        }
                                      } else {
                                        // Radio: une seule valeur
                                        newOptions[optionKey] = choix;
                                      }
                                      
                                      return { ...it, options: newOptions };
                                    }));
                                  }}
                                />
                                {choix}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Champ suppléments (notes supplémentaires) */}
                  {!hasOptions && (
                    <input
                      type="text"
                      placeholder={t('createAppointment.supplementsPlaceholder')}
                      value={item.supplements}
                      onChange={(e) => setSelectedItems(prev => prev.map(it => it.id === item.id ? { ...it, supplements: e.target.value } : it))}
                      className="item-supplements"
                    />
                  )}
                </div>
              );
            })}
            <div className="add-item-container">
              <button 
                type="button" 
                className="btn-secondary btn-add-item" 
                onClick={() => setSelectedItems(prev => [...prev, { id: Date.now() + Math.random(), productId: "", qty: 1, supplements: "", options: {} }])}
              >
                ➕ {t('createAppointment.addDish')}
              </button>
            </div>
          </div>
          <small>{t('createAppointment.dishesNote')}</small>
        </div>
      )}

      {/* Description */}
      <div className="form-group full-width">
        <label htmlFor="description">📝 {t('createAppointment.description')}</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder={t('createAppointment.descriptionPlaceholder')}
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
          ❌ {t('common.cancel')}
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
        >
          {loading ? `⏳ ${t('createAppointment.creating')}` : `✅ ${t('createAppointment.createButton')}`}
        </button>
      </div>
    </form>
  );
}
