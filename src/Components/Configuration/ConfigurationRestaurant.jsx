import React from "react";
import { useTranslation } from "react-i18next";
import "./ConfigurationRestaurant.scss";

export function ConfigurationRestaurant({ safePricing, handleInputChange }) {
  const { t } = useTranslation();

  return (
    <div className="restaurant-info">
      <h3>{t('configuration.restaurant.title')}</h3>

      {/* Numéro intelligent (IA) - lecture seule */}
      <div className="form-group">
        <label>Numéro intelligent (IA mySmartFood)</label>
        <input
          type="tel"
          value={safePricing.instancePhoneNumber || ""}
          readOnly
        />
        <small className="help-text">
          Ce numéro est celui de votre IA téléphonique. Il peut être communiqué à vos clients pour qu&apos;ils appellent directement l&apos;assistant.
        </small>
      </div>

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
        <small className="help-text">
          Numéro du restaurant pour le transfert humain : lorsque l&apos;IA doit passer l&apos;appel à votre équipe, elle utilise ce numéro.
        </small>
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
          onFocus={(e) => e.target.select()}
          placeholder="Ex: 50"
        />
        <small className="help-text">{t('configuration.restaurant.seatsHelp')}</small>
      </div>
    </div>
  );
}

