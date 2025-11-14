import React from "react";
import { useTranslation } from "react-i18next";
import "./CustomOptionsSection.scss";

export function CustomOptionsSection({ categorie, options, onUpdateOptions }) {
  const { t } = useTranslation();

  // Ne pas afficher si ce n'est pas un tacos
  if (categorie.toLowerCase() !== 'tacos') {
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


