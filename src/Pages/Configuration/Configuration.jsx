import React from "react";
import { useTranslation } from "react-i18next";
import AppLayout from "../../Components/Layout/AppLayout";
import PhoneToggle from "../../Components/PhoneToggle/PhoneToggle";
import { useConfiguration } from "../../Hooks/Configuration/useConfiguration";
import "./Configuration.scss";

function Configuration() {
  const { t } = useTranslation();
  
  // Utiliser le hook qui contient toute la logique
  const {
    // États
    safePricing,
    loading,
    saving,
    error,
    success,
    activeTab,
    editingProduct,
    showProductForm,
    languageSuccess,
    newProduct,
    categories,
    
    // Setters
    setActiveTab,
    setEditingProduct,
    setShowProductForm,
    setNewProduct,
    setError,
    
    // Actions
    handleSave,
    handleInputChange,
    handleProductAdd,
    handleProductUpdate,
    handleProductDelete,
    handleOpenProductForm,
    handleLanguageChange,
    handleAddCategory
  } = useConfiguration();

  // Affichage du chargement
  if (loading) {
    return (
      <AppLayout>
        <div className="configuration-page">
          <div className="loading">{t('common.loading')}</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="configuration-page">
        <div className="config-toolbar">
          <div className="toolbar-right">
            <PhoneToggle />
          </div>
        </div>
        
        {error && <div className="error-message">❌ {error}</div>}

        <div className="tabs">
          <button 
            className={activeTab === "restaurant" ? "active" : ""}
            onClick={() => setActiveTab("restaurant")}
          >
            {t('configuration.tabs.restaurant')}
          </button>
          <button 
            className={activeTab === "menu" ? "active" : ""}
            onClick={() => setActiveTab("menu")}
          >
            {t('configuration.tabs.menu')}
          </button>
          <button 
            className={activeTab === "horaires" ? "active" : ""}
            onClick={() => setActiveTab("horaires")}
          >
            {t('configuration.tabs.hours')}
          </button>
          <button 
            className={activeTab === "langue" ? "active" : ""}
            onClick={() => setActiveTab("langue")}
          >
            {t('configuration.tabs.language')}
          </button>
        </div>

        <div className="tab-content">
          {/* TAB RESTAURANT */}
          {activeTab === "restaurant" && (
            <div className="restaurant-info">
              <h3>{t('configuration.restaurant.title')}</h3>
              
              <div className="form-group">
                <label>{t('configuration.restaurant.name')}</label>
                <input
                  type="text"
                  value={safePricing.restaurantInfo?.nom || ""}
                  onChange={(e) => handleInputChange("restaurantInfo.nom", e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label>{t('configuration.restaurant.address')}</label>
                <input
                  type="text"
                  value={safePricing.restaurantInfo?.adresse || ""}
                  onChange={(e) => handleInputChange("restaurantInfo.adresse", e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label>{t('configuration.restaurant.phone')}</label>
                <input
                  type="tel"
                  value={safePricing.restaurantInfo?.telephone || ""}
                  onChange={(e) => handleInputChange("restaurantInfo.telephone", e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label>{t('configuration.restaurant.email')}</label>
                <input
                  type="email"
                  value={safePricing.restaurantInfo?.email || ""}
                  onChange={(e) => handleInputChange("restaurantInfo.email", e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label>{t('configuration.restaurant.seats')}</label>
                <input
                  type="number"
                  min="0"
                  value={safePricing.restaurantInfo?.nombreCouverts || 0}
                  onChange={(e) => handleInputChange("restaurantInfo.nombreCouverts", parseInt(e.target.value) || 0)}
                  placeholder="Ex: 50"
                />
                <small className="help-text">{t('configuration.restaurant.seatsHelp')}</small>
              </div>
            </div>
          )}

          {/* TAB MENU */}
          {activeTab === "menu" && (
            <div className="menu-pricing">
              <h3>{t('configuration.menu.title')}</h3>
              <div className="categories-container">
                {categories.length === 0 ? (
                    <p>{t('configuration.menu.noCategories')}</p>
                ) : (
                  categories.map((categorie) => {
                    const categorieData = safePricing.menuPricing?.[categorie] || {};
                    const produits = categorieData.produits || [];

                    return (
                <div key={categorie} className="category-section">
                  <div className="category-header">
                          <h4>{categorieData.nom || categorie}</h4>
                    <button 
                      onClick={() => handleOpenProductForm(categorie)}
                            className="btn-addProduct"
                    >
                            ➕ {t('configuration.menu.addProduct')}
                    </button>
                  </div>
                  
                        {showProductForm === categorie && (
                          <div className="product-form">
                            <h5>{t('configuration.menu.newProduct')}</h5>
                            <div className="form-row">
                            <input
                              type="text"
                                placeholder={t('configuration.menu.productName')}
                                value={newProduct.nom}
                                onChange={(e) => setNewProduct({ ...newProduct, nom: e.target.value })}
                            />
                            <input
                              type="text"
                                placeholder={t('configuration.menu.description')}
                                value={newProduct.description}
                                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                            />
                            <input
                              type="number"
                                placeholder={t('configuration.menu.price')}
                                value={newProduct.prixBase}
                                onChange={(e) => setNewProduct({ ...newProduct, prixBase: parseFloat(e.target.value) || 0 })}
                                min="0"
                              step="0.01"
                              />
                            </div>
                            <div className="form-actions">
                              <button onClick={() => handleProductAdd(categorie)}>
                                {t('common.add')}
                              </button>
                              <button onClick={() => setShowProductForm(false)}>
                                {t('common.cancel')}
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="products-list">
                          {produits.length === 0 ? (
                            <p className="no-products">{t('configuration.menu.noProducts')}</p>
                          ) : (
                            produits.map((produit, index) => (
                              <div key={produit._id || index} className="product-item">
                                {editingProduct?.categorie === categorie && editingProduct?.index === index ? (
                                  <div className="product-edit">
                                    <input
                                      type="text"
                                      value={produit.nom}
                                      onChange={(e) => {
                                        const updated = [...produits];
                                        updated[index] = { ...produit, nom: e.target.value };
                                        handleInputChange(`menuPricing.${categorie}.produits`, updated);
                                      }}
                                    />
                                    <input
                                      type="text"
                                      value={produit.description}
                                      onChange={(e) => {
                                        const updated = [...produits];
                                        updated[index] = { ...produit, description: e.target.value };
                                        handleInputChange(`menuPricing.${categorie}.produits`, updated);
                                      }}
                                    />
                                    <input
                                      type="number"
                                      value={produit.prix || produit.prixBase}
                                      onChange={(e) => {
                                        const updated = [...produits];
                                        updated[index] = { ...produit, prixBase: parseFloat(e.target.value) || 0 };
                                        handleInputChange(`menuPricing.${categorie}.produits`, updated);
                                      }}
                                      min="0"
                                      step="0.01"
                                    />
                                    <div className="edit-actions">
                                      <button onClick={() => handleProductUpdate(categorie, produit._id, produit)}>
                                        {t('common.save')}
                                      </button>
                                      <button onClick={() => setEditingProduct(null)}>
                                        {t('common.cancel')}
                                      </button>
                            </div>
                          </div>
                        ) : (
                          <div className="product-display">
                            <div className="product-info">
                              <h5>{produit.nom}</h5>
                              <p>{produit.description}</p>
                                      <span className="price">{produit.prix || produit.prixBase}€</span>
                            </div>
                            <div className="product-actions">
                              <button onClick={() => setEditingProduct({ categorie, index })}>
                                ✏️ {t('common.edit')}
                              </button>
                              <button 
                                onClick={() => handleProductDelete(categorie, produit._id)}
                                disabled={!produit._id}
                                        title={t('common.delete')}
                              >
                                🗑️ {t('common.delete')}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                            ))
                          )}
                  </div>
                </div>
                    );
                  })
                )}
                
                  <div className="categories-actions">
                  <button onClick={handleAddCategory} className="btn-addCategories">
                    ➕ {t('configuration.menu.addCategory')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB HORAIRES */}
          {activeTab === "horaires" && (
            <div className="opening-hours">
              <h3>{t('configuration.hours.title')}</h3>
              <div className="hours-grid">
                {Object.keys(safePricing.restaurantInfo?.horairesOuverture || {}).map((jour) => {
                  const horaire = safePricing.restaurantInfo.horairesOuverture[jour];
                  return (
                    <div key={jour} className="day-hours">
                      <div className="day-header">
                        <label className="day-name">
                        <input
                          type="checkbox"
                            checked={horaire?.ouvert || false}
                            onChange={(e) => 
                              handleInputChange(`restaurantInfo.horairesOuverture.${jour}.ouvert`, e.target.checked)
                            }
                          />
                          {t(`configuration.hours.days.${jour}`)}
                      </label>
                    </div>
                      
                      {horaire?.ouvert && (
                        <>
                          <div className="time-slot">
                            <span>{t('configuration.hours.lunch')}</span>
                            <input
                              type="time"
                              value={horaire.midi?.ouverture || ""}
                              onChange={(e) => 
                                handleInputChange(`restaurantInfo.horairesOuverture.${jour}.midi.ouverture`, e.target.value)
                              }
                            />
                            <span>{t('configuration.hours.to')}</span>
                            <input
                              type="time"
                              value={horaire.midi?.fermeture || ""}
                              onChange={(e) => 
                                handleInputChange(`restaurantInfo.horairesOuverture.${jour}.midi.fermeture`, e.target.value)
                              }
                            />
                          </div>
                          
                          <div className="time-slot">
                            <span>{t('configuration.hours.dinner')}</span>
                            <input
                              type="time"
                              value={horaire.soir?.ouverture || ""}
                              onChange={(e) => 
                                handleInputChange(`restaurantInfo.horairesOuverture.${jour}.soir.ouverture`, e.target.value)
                              }
                            />
                            <span>{t('configuration.hours.to')}</span>
                            <input
                              type="time"
                              value={horaire.soir?.fermeture || ""}
                              onChange={(e) => 
                                handleInputChange(`restaurantInfo.horairesOuverture.${jour}.soir.fermeture`, e.target.value)
                              }
                            />
                          </div>
                        </>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB LANGUE */}
          {activeTab === "langue" && (
            <div className="language-settings">
              <h3>{t('configuration.language.title')}</h3>
              <p>{t('configuration.language.description')}</p>
              
              {languageSuccess && (
                <div className="success-message">✅ {t('configuration.language.changeSuccess')}</div>
              )}
              
              <div className="language-options">
                  <button
                    onClick={() => handleLanguageChange('fr')}
                  className="language-btn"
                  >
                  🇫🇷 {t('configuration.language.french')}
                  </button>
                  <button
                    onClick={() => handleLanguageChange('en')}
                  className="language-btn"
                  >
                  🇬🇧 {t('configuration.language.english')}
                  </button>
              </div>
            </div>
          )}
        </div>

        {/* Bouton de sauvegarde global */}
        <div className="save-section">
            <button 
              onClick={handleSave} 
              disabled={saving}
            className="save-btn"
            >
            {saving ? t('common.loading') : t('common.save')}
            </button>
          {success && <span className="success-indicator">✅ {t('common.success')}</span>}
          </div>
      </div>
    </AppLayout>
  );
}

export default Configuration;

