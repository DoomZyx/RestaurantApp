import React from "react";
import { useTranslation } from "react-i18next";
import AppLayout from "../../Components/Layout/AppLayout";
import PhoneToggle from "../../Components/PhoneToggle/PhoneToggle";
import { useConfiguration } from "../../Hooks/Configuration/useConfiguration";
import "./Configuration.scss";

function Configuration() {
  const { t } = useTranslation();
  
  // État local pour gérer l'ouverture/fermeture des catégories
  const [collapsedCategories, setCollapsedCategories] = React.useState({});
  
  // État pour le filtre de recherche des produits dans les menus
  const [searchFilter, setSearchFilter] = React.useState("");
  
  // Fonction pour toggle une catégorie
  const toggleCategory = (categorie) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [categorie]: !prev[categorie]
    }));
  };
  
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
    handleAddCategory,
    generateMenuDescription
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
        
        {error && (
          <div className="notification-toast error-message">
            <i className="bi bi-exclamation-triangle-fill"></i>
            <span className="message-content">{error}</span>
          </div>
        )}

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
                <div key={categorie} className={`category-section ${collapsedCategories[categorie] ? 'collapsed' : ''}`}>
                  <div className="category-header">
                    <div className="category-header-left">
                      <button 
                        onClick={() => toggleCategory(categorie)}
                        className="btn-collapse"
                        aria-label={collapsedCategories[categorie] ? 'Ouvrir' : 'Fermer'}
                      >
                        <i className={`bi bi-chevron-${collapsedCategories[categorie] ? 'right' : 'down'}`}></i>
                      </button>
                          <h4>{categorieData.nom || categorie}</h4>
                    </div>
                    <button 
                      onClick={() => handleOpenProductForm(categorie)}
                            className="btn-addProduct"
                    >
                            {t('configuration.menu.addProduct')}
                    </button>
                  </div>
                  
                  {!collapsedCategories[categorie] && (
                    <div className="category-content">
                  
                        {showProductForm === categorie && (
                          <div className="product-form">
                            <div className="form-header">
                            <h5>{t('configuration.menu.newProduct')}</h5>
                              <button 
                                type="button"
                                className="close-form-btn"
                                onClick={() => setShowProductForm(false)}
                                title="Fermer"
                              >
                                ✕
                              </button>
                            </div>
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
                            
                            {/* Options personnalisables - uniquement pour les Tacos */}
                            {categorie.toLowerCase() === 'tacos' && (
                            <div className="custom-options-wrapper">
                              <div className="options-header">
                                <h6>{t('configuration.menu.customOptions')}</h6>
                                <p>{t('configuration.menu.customOptionsHelp')}</p>
                              </div>
                              
                              {Object.entries(newProduct.options || {}).map(([optionKey, optionData]) => (
                                <div key={optionKey} className="option-box">
                                  <div className="option-top">
                                    <div className="option-name">
                                      <strong>{optionData.nom}</strong>
                                    </div>
                                  </div>
                                  
                                  <div className="option-choices">
                                    <label className="choices-label">Choix disponibles :</label>
                                    <div className="tags-list">
                                      {(optionData.choix || []).map((choix, idx) => (
                                        <span key={idx} className="choice-badge">
                                          {choix}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const newOptions = { ...newProduct.options };
                                              newOptions[optionKey].choix = newOptions[optionKey].choix.filter((_, i) => i !== idx);
                                              setNewProduct({ ...newProduct, options: newOptions });
                                            }}
                                          >
                                            ×
                                          </button>
                                        </span>
                                      ))}
                                    </div>
                                    <input
                                      type="text"
                                      className="choice-input"
                                      placeholder="Ajouter un choix (appuyez sur Entrée)"
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          const value = e.target.value.trim();
                                          if (value) {
                                            const newOptions = { ...newProduct.options };
                                            if (!newOptions[optionKey].choix) {
                                              newOptions[optionKey].choix = [];
                                            }
                                            newOptions[optionKey] = {
                                              ...newOptions[optionKey],
                                              choix: [...newOptions[optionKey].choix, value]
                                            };
                                            setNewProduct({ ...newProduct, options: newOptions });
                                            e.target.value = '';
                                          }
                                        }
                                      }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                            )}

                            {/* Composition de menu - uniquement pour les Menus */}
                            {categorie.toLowerCase() === 'menus' && (
                            <div className="menu-composition-wrapper">
                              <div className="options-header">
                                <h6>{t('configuration.menu.menuComposition')}</h6>
                                <p>Sélectionnez le plat principal. Les frites et la boisson sont automatiquement incluses.</p>
                              </div>

                              {/* Input de recherche */}
                              <div className="search-filter">
                                <input
                                  type="text"
                                  placeholder={t('common.search') + "..."}
                                  value={searchFilter}
                                  onChange={(e) => setSearchFilter(e.target.value)}
                                />
                              </div>
                              
                              {/* Plat principal */}
                              <div className="composition-section">
                                <label>{t('configuration.menu.mainDish')}</label>
                                <div className="product-cards">
                                  {Object.keys(safePricing.menuPricing || {})
                                    .filter(cat => !['boissons', 'menus', 'desserts', 'accompagnements'].includes(cat.toLowerCase()))
                                    .map(cat => {
                                      const category = safePricing.menuPricing[cat];
                                      return category.produits?.filter(p => p.disponible && p.nom.toLowerCase().includes(searchFilter.toLowerCase())).map(produit => (
                                        <div 
                                          key={produit._id}
                                          className={`product-card ${newProduct.composition?.platPrincipal?.produitId === produit._id ? 'selected' : ''}`}
                                          onClick={() => {
                                            setNewProduct({
                                              ...newProduct,
                                              composition: {
                                                platPrincipal: { categorie: cat, produitId: produit._id }
                                              },
                                              description: generateMenuDescription({
                                                platPrincipal: { categorie: cat, produitId: produit._id }
                                              })
                                            });
                                          }}
                                        >
                                          <div className="card-name">{produit.nom}</div>
                                          <div className="card-price">{produit.prixBase}€</div>
                                        </div>
                                      ));
                                    })}
                                </div>
                              </div>

                              {/* Description générée */}
                              {newProduct.description && (
                                <div className="auto-description">
                                  <strong>{t('configuration.menu.autoDescription')} :</strong> {newProduct.description}
                                </div>
                              )}
                            </div>
                            )}
                            
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
                                      placeholder={t('configuration.menu.productName')}
                                      value={produit.nom}
                                      onChange={(e) => {
                                        const updated = [...produits];
                                        updated[index] = { ...produit, nom: e.target.value };
                                        handleInputChange(`menuPricing.${categorie}.produits`, updated);
                                      }}
                                    />
                                    <input
                                      type="text"
                                      placeholder={t('configuration.menu.description')}
                                      value={produit.description}
                                      onChange={(e) => {
                                        const updated = [...produits];
                                        updated[index] = { ...produit, description: e.target.value };
                                        handleInputChange(`menuPricing.${categorie}.produits`, updated);
                                      }}
                                    />
                                    <input
                                      type="number"
                                      placeholder={t('configuration.menu.price')}
                                      value={produit.prix || produit.prixBase}
                                      onChange={(e) => {
                                        const updated = [...produits];
                                        updated[index] = { ...produit, prixBase: parseFloat(e.target.value) || 0 };
                                        handleInputChange(`menuPricing.${categorie}.produits`, updated);
                                      }}
                                      min="0"
                                      step="0.01"
                                    />

                                    {/* Options personnalisables en mode édition - uniquement pour les Tacos */}
                                    {categorie.toLowerCase() === 'tacos' && (() => {
                                      // Initialiser les options par défaut si elles n'existent pas
                                      const defaultOptions = {
                                        sauces: { nom: "Sauces", choix: [] },
                                        viandes: { nom: "Viandes", choix: [] },
                                        crudites: { nom: "Crudités", choix: [] }
                                      };
                                      
                                      // Fusionner avec les options existantes
                                      const currentOptions = produit.options || {};
                                      const mergedOptions = {
                                        sauces: { ...defaultOptions.sauces, ...(currentOptions.sauces || {}) },
                                        viandes: { ...defaultOptions.viandes, ...(currentOptions.viandes || {}) },
                                        crudites: { ...defaultOptions.crudites, ...(currentOptions.crudites || {}) }
                                      };
                                      
                                      return (
                                    <div className="custom-options-wrapper">
                                      <div className="options-header">
                                        <h6>{t('configuration.menu.customOptions')}</h6>
                                        <p>{t('configuration.menu.customOptionsHelp')}</p>
                                      </div>
                                      
                                      {Object.entries(mergedOptions).map(([optionKey, optionData]) => (
                                        <div key={optionKey} className="option-box">
                                          <div className="option-top">
                                            <div className="option-name">
                                              <strong>{optionData.nom}</strong>
                                            </div>
                                          </div>
                                          
                                          <div className="option-choices">
                                            <label className="choices-label">Choix disponibles :</label>
                                            <div className="tags-list">
                                              {(optionData.choix || []).map((choix, idx) => (
                                                <span key={idx} className="choice-badge">
                                                  {choix}
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      const updated = [...produits];
                                                      const updatedOptions = { ...mergedOptions };
                                                      updatedOptions[optionKey] = {
                                                        ...updatedOptions[optionKey],
                                                        choix: updatedOptions[optionKey].choix.filter((_, i) => i !== idx)
                                                      };
                                                      updated[index] = { ...produit, options: updatedOptions };
                                                      handleInputChange(`menuPricing.${categorie}.produits`, updated);
                                                    }}
                                                  >
                                                    ×
                                                  </button>
                                                </span>
                                              ))}
                                            </div>
                                            <input
                                              type="text"
                                              className="choice-input"
                                              placeholder="Ajouter un choix (appuyez sur Entrée)"
                                              onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                  e.preventDefault();
                                                  const value = e.target.value.trim();
                                                  if (value) {
                                                    const updated = [...produits];
                                                    const currentOptions = { ...mergedOptions };
                                                    if (!currentOptions[optionKey].choix) {
                                                      currentOptions[optionKey].choix = [];
                                                    }
                                                    currentOptions[optionKey] = {
                                                      ...currentOptions[optionKey],
                                                      choix: [...currentOptions[optionKey].choix, value]
                                                    };
                                                    updated[index] = { ...produit, options: currentOptions };
                                                    handleInputChange(`menuPricing.${categorie}.produits`, updated);
                                                    e.target.value = '';
                                                  }
                                                }
                                              }}
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                      );
                                    })()}

                                    <div className="edit-actions">
                                      <button onClick={() => {
                                        // Récupérer le produit mis à jour depuis safePricing
                                        const updatedProduits = safePricing.menuPricing[categorie]?.produits || [];
                                        const updatedProduit = updatedProduits[index];
                                        
                                        if (updatedProduit) {
                                          // Utiliser l'_id du produit original si celui de updatedProduit est undefined
                                          const productId = updatedProduit._id || produit._id;
                                          
                                          if (!productId) {
                                            setError('Erreur: ID du produit manquant');
                                            return;
                                          }
                                          
                                          // Nettoyer les données : retirer _id, __v et autres champs MongoDB
                                          const { _id, __v, ...cleanData } = updatedProduit;
                                          
                                          // Normaliser les données
                                          const produitToSave = {
                                            nom: cleanData.nom?.trim() || '',
                                            description: cleanData.description?.trim() || '',
                                            prixBase: parseFloat(cleanData.prixBase || cleanData.prix || 0),
                                            disponible: Boolean(cleanData.disponible !== false),
                                            ...(cleanData.taille && { taille: cleanData.taille }),
                                            ...(cleanData.options && { options: cleanData.options })
                                          };
                                          
                                          handleProductUpdate(categorie, productId, produitToSave);
                                        }
                                      }}>
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
                                onClick={() => {
                                  if (!produit._id) {
                                    setError('Impossible de supprimer: produit sans ID. Veuillez recharger la page.');
                                    return;
                                  }
                                  handleProductDelete(categorie, produit._id);
                                }}
                                disabled={!produit._id}
                                        title={produit._id ? t('common.delete') : 'Produit sans ID - Rechargez la page'}
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
                  )}
                </div>
                    );
                  })
                )}
                
                  <div className="categories-actions">
                  <button onClick={handleAddCategory} className="btn-addCategories">
                    {t('configuration.menu.addCategory')}
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
                <div className="notification-toast success-message">
                  <i className="bi bi-check-circle-fill"></i>
                  <span className="message-content">{t('configuration.language.changeSuccess')}</span>
                </div>
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

        {success && (
          <div className="notification-toast success-message">
            <i className="bi bi-check-circle-fill"></i>
            <span className="message-content">{t('common.success')}</span>
          </div>
        )}

        {/* Bouton de sauvegarde global */}
        <div className="save-section">
            <button 
              onClick={handleSave} 
              disabled={saving}
            className="save-btn"
            >
            {saving ? t('common.loading') : t('common.save')}
            </button>
          </div>
      </div>
    </AppLayout>
  );
}

export default Configuration;

