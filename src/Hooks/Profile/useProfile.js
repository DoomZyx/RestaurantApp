import { useState } from "react";
import { getProfile } from "../../API/auth";

export function useProfile() {
 const [profileData, setProfileData] = useState({
  nom: "",
  email: "",
  telephone: "",
  poste: "",
  departement: "",
  dateCreation: "",
  derniereConnexion: new Date().toISOString(),
});

const [editMode, setEditMode] = useState(false);
const [tempData, setTempData] = useState({ ...profileData });
const [saving, setSaving] = useState(false);
const [success, setSuccess] = useState(false);

const [statsPersonnelles] = useState({
  totalAppelsTraites: 147,
  tempsResponseMoyen: 2.5,
  satisfactionClient: 96,
  appelsMoisCourant: 23,
});

const handleEdit = () => {
  setEditMode(true);
  setTempData({ ...profileData });
};

const handleCancel = () => {
  setEditMode(false);
  setTempData({ ...profileData });
};

const handleSave = async () => {
  setSaving(true);

  // Simulation d'un appel API
  setTimeout(() => {
    setProfileData({ ...tempData });
    setEditMode(false);
    setSaving(false);
    setSuccess(true);

    setTimeout(() => setSuccess(false), 3000);
  }, 1000);
};

const handleInputChange = (field, value) => {
  setTempData((prev) => ({
    ...prev,
    [field]: value,
  }));
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatDateTime = (dateString) => {
  return new Date(dateString).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
 return {
  profileData,
  setProfileData,
  editMode,
  setEditMode,
  tempData,
  setTempData,
  saving,
  setSaving,
  success,
  setSuccess,
  statsPersonnelles,

  handleEdit,
  handleCancel,
  handleSave,
  handleInputChange,
  formatDate,
  formatDateTime
 }
}