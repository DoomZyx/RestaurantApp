import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  role: {
    type: String,
    enum: ["admin", "user"],
    default: "user",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  // Paramètres utilisateur
  settings: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      // Général
      nomEntreprise: "RestaurantApp",
      langue: "fr",
      fuseauHoraire: "Europe/Paris",
      formatDate: "DD/MM/YYYY",
      deviseDefaut: "EUR",

      // Notifications
      emailNotifications: true,
      notificationsSonores: true,
      notificationsDesktop: false,
      notificationsUrgentes: true,
      frequenceRapports: "hebdomadaire",

      // Sécurité
      authentificationDeuxFacteurs: false,
      dureeSessionMax: 8,
      historiqueConnexions: true,
      chiffrementDonnees: true,
      sauvegardeAuto: true,

      // API
      apiKey: "ak_prod_****************************",
      limiteTauxAPI: 1000,
      timeoutAPI: 30,
      logAPI: true,

      // Apparence
      theme: "dark",
      taillePolice: "normal",
      animationsReducees: false,
      contrastEleve: false,

      // Sauvegarde
      sauvegardeQuotidienne: true,
      conservationLogs: 90,
      compressionSauvegardes: true,
    },
  },
});

// Middleware pour hasher le mot de passe avant sauvegarde
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    this.updatedAt = new Date();
    next();
  } catch (error) {
    next(error);
  }
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Méthode pour obtenir les informations publiques de l'utilisateur
userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
    isActive: this.isActive,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
  };
};

const User = mongoose.model("User", userSchema);

export default User;
