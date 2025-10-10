import React, { useState, useEffect } from "react";
import AppLayout from "../../Components/Layout/AppLayout";
import { fetchPricing, updatePricing, addProduct, updateProduct, deleteProduct } from "../../API/Pricing/api";
import "./Configuration.scss";

function Configuration() {
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("restaurant");
  const [editingProduct, setEditingProduct] = useState(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [newProduct, setNewProduct] = useState({
    nom: "",
    description: "",
    prixBase: 0,
    taille: "Moyenne", // Valeur par défaut pour les pizzas
    disponible: true
  });

  // Charger la configuration au montage
  useEffect(() => {
    loadPricing();
  }, []);

  const loadPricing = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchPricing();
      
      if (response.success) {
        const data = response.data || {};
        
        // Définir les valeurs par défaut pour horaires seulement si elles n'existent pas
        const defaultHoraires = {
          lundi: { ouvert: false, ouverture: "09:00", fermeture: "18:00" },
          mardi: { ouvert: true, ouverture: "09:00", fermeture: "18:00" },
          mercredi: { ouvert: true, ouverture: "09:00", fermeture: "18:00" },
          jeudi: { ouvert: true, ouverture: "09:00", fermeture: "18:00" },
          vendredi: { ouvert: true, ouverture: "09:00", fermeture: "18:00" },
          samedi: { ouvert: true, ouverture: "09:00", fermeture: "18:00" },
          dimanche: { ouvert: false, ouverture: "09:00", fermeture: "18:00" }
        };

        // Fusionner les horaires en conservant les données du backend
        const horaires = data.restaurantInfo?.horairesOuverture || defaultHoraires;
        
        // Construire l'objet final en GARDANT les données du backend
        const initializedData = {
          restaurantInfo: {
            nom: data.restaurantInfo?.nom || "",
            adresse: data.restaurantInfo?.adresse || "",
            telephone: data.restaurantInfo?.telephone || "",
            email: data.restaurantInfo?.email || "",
            horairesOuverture: horaires
          },
          menuPricing: data.menuPricing || {
            pizzas: { nom: "Pizzas", produits: [] },
            burgers: { nom: "Burgers", produits: [] },
            salades: { nom: "Salades", produits: [] },
            boissons: { nom: "Boissons", produits: [] },
            desserts: { nom: "Desserts", produits: [] }
          },
          deliveryPricing: {
            activerLivraison: data.deliveryPricing?.activerLivraison ?? false,
            fraisBase: data.deliveryPricing?.fraisBase ?? 0,
            prixParKm: data.deliveryPricing?.prixParKm ?? 0,
            distanceMaximale: data.deliveryPricing?.distanceMaximale ?? 0,
            montantMinimumCommande: data.deliveryPricing?.montantMinimumCommande ?? 0,
            delaiPreparation: data.deliveryPricing?.delaiPreparation ?? 0
          },
          taxes: data.taxes || {
            tva: 20,
            serviceCharge: 0,
            applicableServiceCharge: false
          },
          promotions: data.promotions || []
        };
        setPricing(initializedData);
      } else {
        console.error("❌ La réponse n'indique pas de succès");
      }
    } catch (err) {
      setError(err.message);
      console.error("❌ Erreur lors du chargement des tarifs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const response = await updatePricing(pricing);
      if (response.success) {
        setSuccess(true);
        setEditingProduct(null); // Fermer le mode édition
        setTimeout(() => setSuccess(false), 3000);
        // Recharger les données pour s'assurer qu'elles sont à jour
        await loadPricing();
      }
    } catch (err) {
      setError(err.message);
      console.error("Erreur lors de la sauvegarde:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (path, value) => {
    setPricing(prev => {
      const newPricing = { ...prev };
      const keys = path.split('.');
      let current = newPricing;
      
      // S'assurer que tous les objets intermédiaires existent
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newPricing;
    });
  };

  const handleProductAdd = async (categorie) => {
    // Validation
    if (!newProduct.nom || newProduct.nom.trim() === "") {
      setError("Le nom du produit est obligatoire");
      return;
    }
    if (!newProduct.prixBase || newProduct.prixBase <= 0) {
      setError("Le prix doit être supérieur à 0");
      return;
    }

    // Préparer les données du produit selon la catégorie
    const productData = {
      nom: newProduct.nom.trim(),
      description: newProduct.description.trim(),
      prixBase: newProduct.prixBase,
      disponible: newProduct.disponible
    };

    // Ajouter la taille seulement si la catégorie le nécessite
    if (categorie === 'pizzas') {
      productData.taille = newProduct.taille || 'Moyenne';
    } else if (categorie === 'boissons') {
      productData.taille = newProduct.taille || '33cl';
    }

    try {
      setSaving(true);
      setError(null);
      const response = await addProduct(categorie, productData);
      if (response.success) {
        await loadPricing(); // Recharger les données
        setNewProduct({ nom: "", description: "", prixBase: 0, taille: "Moyenne", disponible: true });
        setShowProductForm(false);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setError(`Erreur lors de l'ajout du produit: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleProductUpdate = async (categorie, produitId, produitData) => {
    try {
      setSaving(true);
      const response = await updateProduct(categorie, produitId, produitData);
      if (response.success) {
        await loadPricing();
        setEditingProduct(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleProductDelete = async (categorie, produitId) => {
    if (!window.confirm("⚠️ Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.")) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await deleteProduct(categorie, produitId);
      await loadPricing();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(`Erreur lors de la suppression: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = () => {
    const categoryName = prompt("Nom de la nouvelle catégorie:");
    if (categoryName && categoryName.trim()) {
      const newCategoryKey = categoryName.toLowerCase().replace(/\s+/g, '_');
      handleInputChange(`menuPricing.${newCategoryKey}`, {
        nom: categoryName.trim(),
        produits: []
      });
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="configuration-page">
          <div className="loading">Chargement de la configuration...</div>
        </div>
      </AppLayout>
    );
  }

  if (!pricing) {
    return (
      <AppLayout>
        <div className="configuration-page">
          <div className="error">Erreur lors du chargement de la configuration</div>
        </div>
      </AppLayout>
    );
  }

  // Les données sont déjà initialisées dans loadPricing, on les utilise directement
  const safePricing = pricing;
  const categories = Object.keys(safePricing.menuPricing || {});

  return (
    <AppLayout>
      <div className="configuration-page">
        <div className="page-header">
          <div className="header-actions">
            {success && <div className="success-message">✅ Configuration sauvegardée !</div>}
            <button 
              onClick={handleSave} 
              disabled={saving}
              className="btn-save"
            >
              {saving ? "⏳ Sauvegarde..." : "💾 Sauvegarder"}
            </button>
          </div>
        </div>

        {error && <div className="error-message">❌ {error}</div>}

        <div className="tabs">
          <button 
            className={activeTab === "restaurant" ? "active" : ""}
            onClick={() => setActiveTab("restaurant")}
          >
            🏪 Informations Restaurant
          </button>
          <button 
            className={activeTab === "menu" ? "active" : ""}
            onClick={() => setActiveTab("menu")}
          >
            🍕 Menu & Tarifs
          </button>
          <button 
            className={activeTab === "delivery" ? "active" : ""}
            onClick={() => setActiveTab("delivery")}
          >
            🚚 Livraison <span className="beta-badge">BETA</span>
          </button>
          <button 
            className={activeTab === "horaires" ? "active" : ""}
            onClick={() => setActiveTab("horaires")}
          >
            🕐 Horaires
          </button>
          <button 
            className={activeTab === "taxes" ? "active" : ""}
            onClick={() => setActiveTab("taxes")}
          >
            💰 Taxes & Promotions
          </button>
        </div>

        <div className="tab-content">
          {activeTab === "restaurant" && (
            <div className="restaurant-info">
              <h3>Informations du Restaurant</h3>
              <div className="form-group">
                <label>Nom du restaurant</label>
                <input
                  type="text"
                  value={safePricing.restaurantInfo.nom || ""}
                  onChange={(e) => handleInputChange("restaurantInfo.nom", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Adresse</label>
                <input
                  type="text"
                  value={safePricing.restaurantInfo.adresse || ""}
                  onChange={(e) => handleInputChange("restaurantInfo.adresse", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Téléphone</label>
                <input
                  type="tel"
                  value={safePricing.restaurantInfo.telephone || ""}
                  onChange={(e) => handleInputChange("restaurantInfo.telephone", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={safePricing.restaurantInfo.email || ""}
                  onChange={(e) => handleInputChange("restaurantInfo.email", e.target.value)}
                />
              </div>
            </div>
          )}

          {activeTab === "menu" && (
            <div className="menu-pricing">
              <h3>Configuration du Menu</h3>
              <div className="categories-container">
                <div className="categories-actions">
                  <button onClick={handleSave} className="btn-primary">
                    💾 Sauvegarder les catégories
                  </button>
                  <button onClick={handleAddCategory} className="btn-secondary">
                    ➕ Ajouter une catégorie
                  </button>
                </div>
                {categories.length === 0 ? (
                  <div className="empty-state">
                    <p>Aucune catégorie de menu disponible. Cliquez sur "Sauvegarder" pour initialiser les catégories par défaut.</p>
                  </div>
                ) : (
                categories.map(categorie => (
                <div key={categorie} className="category-section">
                  <div className="category-header">
                    <h4>{safePricing.menuPricing[categorie]?.nom || categorie}</h4>
                    <button 
                      onClick={() => setShowProductForm(categorie)}
                      className="btn-add-product"
                    >
                       Ajouter un produit
                    </button>
                  </div>
                  
                  <div className="products-list">
                    {(safePricing.menuPricing[categorie]?.produits || []).map((produit, index) => (
                      <div key={index} className="product-item">
                        {editingProduct?.categorie === categorie && editingProduct?.index === index ? (
                          <div className="product-edit-form">
                            <input
                              type="text"
                              value={produit.nom}
                              onChange={(e) => handleInputChange(`menuPricing.${categorie}.produits.${index}.nom`, e.target.value)}
                              placeholder="Nom du produit"
                            />
                            <input
                              type="text"
                              value={produit.description}
                              onChange={(e) => handleInputChange(`menuPricing.${categorie}.produits.${index}.description`, e.target.value)}
                              placeholder="Description"
                            />
                            <input
                              type="number"
                              step="0.01"
                              value={produit.prixBase}
                              onChange={(e) => handleInputChange(`menuPricing.${categorie}.produits.${index}.prixBase`, parseFloat(e.target.value))}
                              placeholder="Prix"
                            />
                            {(categorie === 'pizzas' || categorie === 'boissons') && (
                              <select
                                value={produit.taille || (categorie === 'pizzas' ? 'Moyenne' : '33cl')}
                                onChange={(e) => handleInputChange(`menuPricing.${categorie}.produits.${index}.taille`, e.target.value)}
                              >
                                {categorie === 'pizzas' ? (
                                  <>
                                    <option value="Petite">Petite</option>
                                    <option value="Moyenne">Moyenne</option>
                                    <option value="Grande">Grande</option>
                                  </>
                                ) : (
                                  <>
                                    <option value="33cl">33cl</option>
                                    <option value="50cl">50cl</option>
                                    <option value="1L">1L</option>
                                  </>
                                )}
                              </select>
                            )}
                            <div className="form-actions">
                              <button onClick={() => setEditingProduct(null)}>Annuler</button>
                              <button onClick={() => handleProductUpdate(categorie, produit._id, produit)}>Sauvegarder</button>
                            </div>
                          </div>
                        ) : (
                          <div className="product-display">
                            <div className="product-info">
                              <h5>{produit.nom}</h5>
                              <p>{produit.description}</p>
                              <span className="price">{produit.prixBase}€</span>
                            </div>
                            <div className="product-actions">
                              <button onClick={() => setEditingProduct({ categorie, index })}>
                                ✏️ Modifier
                              </button>
                              <button onClick={() => handleProductDelete(categorie, produit._id)}>
                                🗑️ Supprimer
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                ))
                )}
              </div>

              {showProductForm && (
                <div className="product-form-modal" onClick={() => setShowProductForm(false)}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <h4>Ajouter un nouveau produit - {safePricing.menuPricing[showProductForm]?.nom || showProductForm}</h4>
                    <div className="form-group">
                      <label>Nom du produit <span className="required">*</span></label>
                      <input
                        type="text"
                        value={newProduct.nom}
                        onChange={(e) => setNewProduct({...newProduct, nom: e.target.value})}
                        placeholder="Ex: Pizza Margherita"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        value={newProduct.description}
                        onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                        placeholder="Ex: Tomate, mozzarella, basilic"
                        rows="3"
                      />
                    </div>
                    <div className="form-group">
                      <label>Prix (€) <span className="required">*</span></label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newProduct.prixBase}
                        onChange={(e) => setNewProduct({...newProduct, prixBase: parseFloat(e.target.value) || 0})}
                        placeholder="Ex: 12.50"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Taille</label>
                      <select
                        value={newProduct.taille}
                        onChange={(e) => setNewProduct({...newProduct, taille: e.target.value})}
                      >
                        {showProductForm === 'pizzas' ? (
                          <>
                            <option value="Petite">Petite</option>
                            <option value="Moyenne">Moyenne</option>
                            <option value="Grande">Grande</option>
                          </>
                        ) : showProductForm === 'boissons' ? (
                          <>
                            <option value="33cl">33cl</option>
                            <option value="50cl">50cl</option>
                            <option value="1L">1L</option>
                          </>
                        ) : (
                          <option value="">Non applicable</option>
                        )}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={newProduct.disponible}
                          onChange={(e) => setNewProduct({...newProduct, disponible: e.target.checked})}
                        />
                        Produit disponible
                      </label>
                    </div>
                    <div className="form-actions">
                      <button onClick={() => setShowProductForm(false)}>Annuler</button>
                      <button onClick={() => handleProductAdd(showProductForm)}>Ajouter</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "delivery" && (
            <div className="delivery-pricing">
              <h3>Configuration de la Livraison</h3>
              <div className="beta-info">
                <span className="beta-icon">🚧</span>
                <div className="beta-content">
                  <strong>Fonctionnalité Beta</strong>
                  <p>Cette fonctionnalité est en phase de test. Vous pouvez configurer vos tarifs et zones de livraison. L'intégration avec des services de livraison externes (Stuart, Deliverect) sera ajoutée prochainement.</p>
                </div>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={safePricing.deliveryPricing.activerLivraison || false}
                    onChange={(e) => handleInputChange("deliveryPricing.activerLivraison", e.target.checked)}
                  />
                  Activer la livraison
                </label>
              </div>
              <div className="form-group">
                <label>Frais de base (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={safePricing.deliveryPricing.fraisBase || 0}
                  onChange={(e) => handleInputChange("deliveryPricing.fraisBase", parseFloat(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label>Prix par kilomètre (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={safePricing.deliveryPricing.prixParKm || 0}
                  onChange={(e) => handleInputChange("deliveryPricing.prixParKm", parseFloat(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label>Distance maximale de livraison (km)</label>
                <input
                  type="number"
                  min="0"
                  value={safePricing.deliveryPricing?.distanceMaximale || 0}
                  onChange={(e) => handleInputChange("deliveryPricing.distanceMaximale", parseInt(e.target.value) || 0)}
                  placeholder="Ex: 10"
                />
              </div>
              <div className="form-group">
                <label>Montant minimum de commande (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={safePricing.deliveryPricing?.montantMinimumCommande || 0}
                  onChange={(e) => handleInputChange("deliveryPricing.montantMinimumCommande", parseFloat(e.target.value) || 0)}
                  placeholder="Ex: 15.00"
                />
              </div>
              <div className="form-group">
                <label>Délai de préparation moyen (minutes)</label>
                <input
                  type="number"
                  min="0"
                  value={safePricing.deliveryPricing?.delaiPreparation || 0}
                  onChange={(e) => handleInputChange("deliveryPricing.delaiPreparation", parseInt(e.target.value) || 0)}
                  placeholder="Ex: 30"
                />
              </div>
              
              <div className="delivery-info">
                <h4>📍 Zones de livraison</h4>
                <p className="info-text">Gérez les zones de livraison avec des frais supplémentaires par code postal</p>
                <button className="btn-secondary" onClick={() => alert("Fonctionnalité à venir")}>
                  ➕ Ajouter une zone
                </button>
              </div>
            </div>
          )}

          {activeTab === "horaires" && (
            <div className="horaires-config">
              <h3>Horaires d'Ouverture</h3>
              <div className="horaires-grid">
                {Object.keys(safePricing.restaurantInfo.horairesOuverture || {}).map(jour => (
                  <div key={jour} className="horaire-jour">
                    <div className="jour-header">
                      <label className="jour-label">
                        <input
                          type="checkbox"
                          checked={safePricing.restaurantInfo.horairesOuverture[jour]?.ouvert || false}
                          onChange={(e) => handleInputChange(`restaurantInfo.horairesOuverture.${jour}.ouvert`, e.target.checked)}
                        />
                        <span className="jour-name">{jour.charAt(0).toUpperCase() + jour.slice(1)}</span>
                      </label>
                    </div>
                    {safePricing.restaurantInfo.horairesOuverture[jour]?.ouvert && (
                      <div className="horaires-inputs">
                        <input
                          type="time"
                          value={safePricing.restaurantInfo.horairesOuverture[jour]?.ouverture || "09:00"}
                          onChange={(e) => handleInputChange(`restaurantInfo.horairesOuverture.${jour}.ouverture`, e.target.value)}
                          className="time-input"
                        />
                        <span className="time-separator">à</span>
                        <input
                          type="time"
                          value={safePricing.restaurantInfo.horairesOuverture[jour]?.fermeture || "18:00"}
                          onChange={(e) => handleInputChange(`restaurantInfo.horairesOuverture.${jour}.fermeture`, e.target.value)}
                          className="time-input"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "taxes" && (
            <div className="taxes-config">
              <h3>Configuration des Taxes</h3>
              <div className="form-group">
                <label>TVA (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={safePricing.taxes?.tva || 20}
                  onChange={(e) => handleInputChange("taxes.tva", parseFloat(e.target.value) || 0)}
                  placeholder="Ex: 20"
                />
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={safePricing.taxes?.applicableServiceCharge || false}
                    onChange={(e) => handleInputChange("taxes.applicableServiceCharge", e.target.checked)}
                  />
                  Appliquer des frais de service
                </label>
              </div>
              {safePricing.taxes?.applicableServiceCharge && (
                <div className="form-group">
                  <label>Frais de service (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={safePricing.taxes?.serviceCharge || 0}
                    onChange={(e) => handleInputChange("taxes.serviceCharge", parseFloat(e.target.value) || 0)}
                    placeholder="Ex: 5"
                  />
                </div>
              )}

              <hr style={{ margin: "30px 0", border: "1px solid #ddd" }} />

              <h3>Promotions</h3>
              <p className="info-text">
                Gérez vos promotions et offres spéciales. Vous pouvez créer des réductions par pourcentage, 
                montant fixe ou offrir des produits gratuits.
              </p>
              <div className="promotions-list">
                {(safePricing.promotions || []).length === 0 ? (
                  <div className="empty-state">
                    <p>Aucune promotion active pour le moment</p>
                  </div>
                ) : (
                  safePricing.promotions.map((promo, index) => (
                    <div key={index} className="promotion-item">
                      <div className="promo-header">
                        <h4>{promo.nom}</h4>
                        <span className={`promo-badge ${promo.active ? 'active' : 'inactive'}`}>
                          {promo.active ? '✅ Active' : '❌ Inactive'}
                        </span>
                      </div>
                      <p>{promo.description}</p>
                      <div className="promo-details">
                        <span>Type: {promo.type}</span>
                        <span>Valeur: {promo.valeur}{promo.type === 'pourcentage' ? '%' : '€'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button className="btn-secondary" onClick={() => alert("Fonctionnalité de création de promotions à venir")}>
                ➕ Créer une promotion
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default Configuration;
