import { useState, useRef } from "react";
import AppLayout from "../../Components/Layout/AppLayout";
import "./Profile.scss";
import { useProfile } from "../../Hooks/Profile/useProfile";

function Profile() {
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
        setError("Veuillez sélectionner une image valide");
        return;
      }
      // Vérifier la taille (5 MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError("L'image ne doit pas dépasser 5 MB");
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
            <p>Chargement du profil...</p>
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
            Profil mis à jour avec succès !
          </div>
        )}

        {error && (
          <div className="error-message">
            <i className="bi bi-exclamation-triangle-fill"></i>
            {error}
            <button onClick={() => setError(null)}>✕</button>
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
                      src={`http://localhost:8080${profileData.avatar}`}  // TODO: Changer en VITE_API_URL pour le backend en production
                      alt="Avatar"
                      onError={(e) => {
                        console.error("Erreur chargement avatar:", e.target.src);
                        console.log("📋 Avatar URL dans DB:", profileData.avatar);
                      }}
                      onLoad={() => {
                        console.log("Avatar chargé:", `http://localhost:8080${profileData.avatar}`);
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
                  {saving ? "Upload en cours..." : "Changer la photo"}
                </button>
              </div>

              <div className="info-grid">
                <div className="info-item">
                  <label>Nom complet</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={tempData.nom}
                      onChange={(e) => handleInputChange("nom", e.target.value)}
                      placeholder="Votre nom complet"
                    />
                  ) : (
                    <span>{profileData.nom}</span>
                  )}
                </div>

                <div className="info-item">
                  <label>Email professionnel</label>
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
                  <label>Téléphone</label>
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
                  <label>Poste</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={tempData.poste}
                      onChange={(e) =>
                        handleInputChange("poste", e.target.value)
                      }
                      placeholder="Votre poste"
                    />
                  ) : (
                    <span>{profileData.poste}</span>
                  )}
                </div>

                <div className="info-item">
                  <label>Département</label>
                  {editMode ? (
                    <select
                      value={tempData.departement}
                      onChange={(e) =>
                        handleInputChange("departement", e.target.value)
                      }
                    >
                      <option value="Service Client">Service Client</option>
                      <option value="Support Technique">
                        Support Technique
                      </option>
                      <option value="Ventes">Ventes</option>
                      <option value="Administration">Administration</option>
                    </select>
                  ) : (
                    <span>{profileData.departement}</span>
                  )}
                </div>

                <div className="info-item">
                  <label>Membre depuis</label>
                  <span>{formatDate(profileData.dateCreation)}</span>
                </div>

                <div className="info-item">
                  <label>Dernière connexion</label>
                  <span>{formatDateTime(profileData.derniereConnexion)}</span>
                </div>
              </div>
            </div>

            {/* Actions en bas */}
            <div className="profile-actions">
              {!editMode ? (
                <button onClick={handleEdit} className="edit-btn">
                  <i className="bi bi-pencil-square"></i>
                  Modifier
                </button>
              ) : (
                <div className="edit-actions">
                  <button onClick={handleCancel} className="cancel-btn">
                    <i className="bi bi-x-circle"></i>
                    Annuler
                  </button>
                  <button
                    onClick={handleSave}
                    className="save-btn"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <i className="bi bi-arrow-repeat spinning"></i>
                        Sauvegarde...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle"></i>
                        Sauvegarder
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
