import React from "react";
import { useTranslation } from "react-i18next";
import AppLayout from "../../Components/Layout/AppLayout";
import PhoneToggle from "../../Components/PhoneToggle/PhoneToggle";
import { useConfiguration } from "../../Hooks/Configuration/useConfiguration";
import { ConfigurationRestaurant } from "../../Components/Configuration/ConfigurationRestaurant";
import { ConfigurationLanguage } from "../../Components/Configuration/ConfigurationLanguage";
import { ConfigurationHoraires } from "../../Components/Configuration/ConfigurationHoraires";
import { ProductForm } from "../../Components/Configuration/ProductForm";
import { CustomOptionsSection } from "../../Components/Configuration/CustomOptionsSection";
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
            <ConfigurationRestaurant 
              safePricing={safePricing}
              handleInputChange={handleInputChange}
            />
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
                          <ProductForm 
                            categorie={categorie}
                            newProduct={newProduct}
                            setNewProduct={setNewProduct}
                            searchFilter={searchFilter}
                            setSearchFilter={setSearchFilter}
                            safePricing={safePricing}
                            generateMenuDescription={generateMenuDescription}
                            onSubmit={() => handleProductAdd(categorie)}
                            onCancel={() => setShowProductForm(false)}
                          />
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
                                    {categorie.toLowerCase() === 'tacos' && (
                                      <CustomOptionsSection 
                                        categorie={categorie}
                                        options={produit.options || {}}
                                        onUpdateOptions={(newOptions) => {
                                          const updated = [...produits];
                                          updated[index] = { ...produit, options: newOptions };
                                          handleInputChange(`menuPricing.${categorie}.produits`, updated);
                                        }}
                                      />
                                    )}

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
            <ConfigurationHoraires 
              safePricing={safePricing}
              handleInputChange={handleInputChange}
            />
          )}

          {/* TAB LANGUE */}
          {activeTab === "langue" && (
            <ConfigurationLanguage 
              languageSuccess={languageSuccess}
              handleLanguageChange={handleLanguageChange}
            />
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

