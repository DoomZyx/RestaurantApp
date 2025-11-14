import React from "react";
import { useTranslation } from "react-i18next";
import "./CustomOptionsSection.scss";

export function CustomOptionsSection({ categorie, options, onUpdateOptions }) {
  const { t } = useTranslation();

  // Afficher pour les produits personnalisables (Tacos, Burgers, etc.)
  const categorieLower = categorie.toLowerCase();
  const isCustomizable = categorieLower.includes('tacos') || 
                         categorieLower.includes('burger') || 
                         categorieLower.includes('sandwich');
  
  // Ne pas afficher pour les menus, boissons, desserts, accompagnements
  const isExcluded = ['menus', 'menu', 'boissons', 'boisson', 'desserts', 'dessert', 'accompagnements', 'accompagnement']
    .some(cat => categorieLower.includes(cat));
  
  if (isExcluded || !isCustomizable) {
    return null;
  }

  // Initialiser les options par défaut si vide
  React.useEffect(() => {
    if (!options || Object.keys(options).length === 0) {
      const defaultOptions = categorieLower.includes('tacos') ? {
        viandes: {
          nom: "Viandes",
          choix: ["Poulet", "Bœuf", "Agneau", "Mixte"],
          multiple: false,
          obligatoire: true
        },
        sauces: {
          nom: "Sauces",
          choix: ["Algérienne", "Blanche", "Samourai", "Harissa", "Ketchup", "Mayonnaise"],
          multiple: true,
          obligatoire: true
        },
        crudites: {
          nom: "Crudités",
          choix: ["Salade", "Tomates", "Oignons", "Cornichons"],
          multiple: true,
          obligatoire: false
        }
      } : {};
      
      if (Object.keys(defaultOptions).length > 0) {
        onUpdateOptions(defaultOptions);
      }
    }
  }, []);
  
  // Si toujours vide après init, ne rien afficher
  if (!options || Object.keys(options).length === 0) {
    return null;
  }

  const handleRemoveChoice = (optionKey, choixIndex) => {
    const newOptions = { ...options };
    newOptions[optionKey].choix = newOptions[optionKey].choix.filter((_, i) => i !== choixIndex);
    onUpdateOptions(newOptions);
  };

  const handleAddChoice = (optionKey, value) => {
    const newOptions = { ...options };
    if (!newOptions[optionKey].choix) {
      newOptions[optionKey].choix = [];
    }
    newOptions[optionKey] = {
      ...newOptions[optionKey],
      choix: [...newOptions[optionKey].choix, value]
    };
    onUpdateOptions(newOptions);
  };

  return (
    <div className="custom-options-wrapper">
      <div className="options-header">
        <h6>{t('configuration.menu.customOptions')}</h6>
        <p>{t('configuration.menu.customOptionsHelp')}</p>
      </div>
      
      {Object.entries(options || {}).map(([optionKey, optionData]) => (
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
                    onClick={() => handleRemoveChoice(optionKey, idx)}
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
                    handleAddChoice(optionKey, value);
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
}


