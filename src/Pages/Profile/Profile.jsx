import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import AppLayout from "../../Components/Layout/AppLayout";
import EmojiText from "../../Components/Common/EmojiText";
import "./Profile.scss";
import { useProfile } from "../../Hooks/Profile/useProfile";

function Profile() {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);

  const {
    profileData,
    editMode,
    tempData,
    saving,
    loading,
    error,
    setError,
    success,
    statsPersonnelles, 
    handleEdit,
    handleCancel,
    handleSave,
    handleAvatarUpload,
    handleInputChange,
    formatDate,
    formatDateTime
  } = useProfile();

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Vérifier le type de fichier
      if (!file.type.startsWith("image/")) {
        setError(t('profile.errors.invalidImage'));
        return;
      }
      // Vérifier la taille (5 MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError(t('profile.errors.imageTooLarge'));
        return;
      }
      await handleAvatarUpload(file);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="my-profile-container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>{t('profile.loadingProfile')}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="my-profile-container">
        {success && (
          <div className="success-message">
            <i className="bi bi-check-circle-fill"></i>
            {t('profile.profileUpdated')}
          </div>
        )}

        {error && (
          <div className="error-message">
            <i className="bi bi-exclamation-triangle-fill"></i>
            {error}
            <button onClick={() => setError(null)}><EmojiText>✕</EmojiText></button>
          </div>
        )}

        <div className="profile-content">
          {/* Informations personnelles */}
          <div className="profile-card">
            <div className="profile-info">
              <div className="avatar-section">
                <div className="avatar">
                  {profileData.avatar ? (
                    <img 
                      src={profileData.avatar.startsWith('http') ? profileData.avatar : `${import.meta.env.VITE_API_URL}${profileData.avatar}`}
                      alt="Avatar"
                      onError={(e) => {
                        console.error("Erreur chargement avatar:", e.target.src);
                        console.log("📋 Avatar URL dans DB:", profileData.avatar);
                      }}
                      onLoad={() => {
                        console.log("✅ Avatar chargé:", profileData.avatar);
                      }}
                    />
                  ) : (
                    <i className="bi bi-person-fill"></i>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  style={{ display: "none" }}
                />
                <button 
                  className="change-avatar"
                  onClick={handleAvatarClick}
                  disabled={saving}
                >
                  <i className="bi bi-camera-fill"></i>
                  {saving ? t('profile.uploadInProgress') : t('profile.changePhoto')}
                </button>
              </div>

              <div className="info-grid">
                <div className="info-item">
                  <label>{t('profile.fullName')}</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={tempData.nom}
                      onChange={(e) => handleInputChange("nom", e.target.value)}
                      placeholder={t('profile.fullName')}
                    />
                  ) : (
                    <span>{profileData.nom}</span>
                  )}
                </div>

                <div className="info-item">
                  <label>{t('profile.professionalEmail')}</label>
                  {editMode ? (
                    <input
                      type="email"
                      value={tempData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      placeholder="votre.email@handlehome.fr"
                    />
                  ) : (
                    <span>{profileData.email}</span>
                  )}
                </div>

                <div className="info-item">
                  <label>{t('profile.phone')}</label>
                  {editMode ? (
                    <input
                      type="tel"
                      value={tempData.telephone}
                      onChange={(e) =>
                        handleInputChange("telephone", e.target.value)
                      }
                      placeholder="+33 6 12 34 56 78"
                    />
                  ) : (
                    <span>{profileData.telephone}</span>
                  )}
                </div>

                <div className="info-item">
                  <label>{t('profile.position')}</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={tempData.poste}
                      onChange={(e) =>
                        handleInputChange("poste", e.target.value)
                      }
                      placeholder={t('profile.position')}
                    />
                  ) : (
                    <span>{profileData.poste}</span>
                  )}
                </div>

                <div className="info-item">
                  <label>{t('profile.department')}</label>
                  {editMode ? (
                    <select
                      value={tempData.departement}
                      onChange={(e) =>
                        handleInputChange("departement", e.target.value)
                      }
                    >
                      <option value="Service Client">{t('profile.departments.customerService')}</option>
                      <option value="Support Technique">
                        {t('profile.departments.technicalSupport')}
                      </option>
                      <option value="Ventes">{t('profile.departments.sales')}</option>
                      <option value="Administration">{t('profile.departments.administration')}</option>
                    </select>
                  ) : (
                    <span>{profileData.departement}</span>
                  )}
                </div>

                <div className="info-item">
                  <label>{t('profile.memberSince')}</label>
                  <span>{formatDate(profileData.dateCreation)}</span>
                </div>

                <div className="info-item">
                  <label>{t('profile.lastConnection')}</label>
                  <span>{formatDateTime(profileData.derniereConnexion)}</span>
                </div>
              </div>
            </div>

            {/* Actions en bas */}
            <div className="profile-actions">
              {!editMode ? (
                <button onClick={handleEdit} className="edit-btn">
                  <i className="bi bi-pencil-square"></i>
                  {t('profile.modify')}
                </button>
              ) : (
                <div className="edit-actions">
                  <button onClick={handleCancel} className="cancel-btn">
                    <i className="bi bi-x-circle"></i>
                    {t('profile.cancel')}
                  </button>
                  <button
                    onClick={handleSave}
                    className="save-btn"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <i className="bi bi-arrow-repeat spinning"></i>
                        {t('profile.saving')}
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle"></i>
                        {t('profile.save')}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default Profile;
