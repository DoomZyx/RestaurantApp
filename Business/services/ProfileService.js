import User from "../../models/user.js";
import { UserValidator } from "../validators/UserValidator.js";
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Service de gestion du profil utilisateur
 * Gère les profils et l'upload d'avatars
 */
export class ProfileService {
  /**
   * Récupère le profil d'un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<Object>} Utilisateur trouvé
   */
  static async getProfile(userId) {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error("Utilisateur non trouvé");
    }

    return user;
  }

  /**
   * Met à jour le profil d'un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @param {Object} updates - Données à mettre à jour
   * @returns {Promise<Object>} Utilisateur mis à jour
   */
  static async updateProfile(userId, updates) {
    const { username, email, telephone, poste, departement, avatar } = updates;

    // Validation
    const validation = UserValidator.validateProfileUpdate({ username, email });
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    // Trouver l'utilisateur
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("Utilisateur non trouvé");
    }

    // Vérifier si l'email est déjà utilisé
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error("Cet email est déjà utilisé");
      }
      user.email = email;
    }

    // Vérifier si le username est déjà utilisé
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        throw new Error("Ce nom d'utilisateur est déjà utilisé");
      }
      user.username = username;
    }

    // Mettre à jour les autres champs
    if (telephone !== undefined) user.telephone = telephone;
    if (poste !== undefined) user.poste = poste;
    if (departement !== undefined) user.departement = departement;
    if (avatar !== undefined) user.avatar = avatar;

    user.updatedAt = new Date();
    await user.save();

    console.log("✅ Profil mis à jour:", userId);

    return user;
  }

  /**
   * Upload un avatar pour l'utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @param {Object} file - Fichier uploadé
   * @returns {Promise<Object>} { avatarUrl, user }
   */
  static async uploadAvatar(userId, file) {
    if (!file) {
      throw new Error("Aucun fichier uploadé");
    }

    // Validation du type de fichier
    if (!UserValidator.validateImageType(file.mimetype)) {
      throw new Error("Type de fichier invalide. Seules les images sont acceptées.");
    }

    // Trouver l'utilisateur
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("Utilisateur non trouvé");
    }

    // Générer un nom de fichier unique
    const ext = file.filename.split('.').pop();
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename = `avatar_${userId}_${uniqueSuffix}.${ext}`;
    const filepath = `uploads/avatars/${filename}`;

    // Créer le dossier s'il n'existe pas
    const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'avatars');
    
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }

    // Sauvegarder le fichier
    const fullPath = path.join(__dirname, '..', '..', filepath);
    const buffer = await file.toBuffer();
    await fs.writeFile(fullPath, buffer);

    // Construire l'URL de l'avatar
    const avatarUrl = `/${filepath}`;

    console.log("📁 Fichier sauvegardé:", fullPath);
    console.log("🔗 Avatar URL:", avatarUrl);

    // Mettre à jour l'avatar dans la base de données
    user.avatar = avatarUrl;
    user.updatedAt = new Date();
    await user.save();

    console.log("✅ Avatar mis à jour pour user:", userId);

    return {
      avatarUrl,
      user
    };
  }

  /**
   * Supprime l'avatar d'un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<Object>} Utilisateur mis à jour
   */
  static async deleteAvatar(userId) {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error("Utilisateur non trouvé");
    }

    // Supprimer le fichier si présent
    if (user.avatar) {
      try {
        const avatarPath = path.join(__dirname, '..', '..', user.avatar.substring(1));
        await fs.unlink(avatarPath);
        console.log("🗑️ Fichier avatar supprimé:", avatarPath);
      } catch (error) {
        console.warn("⚠️ Impossible de supprimer le fichier avatar:", error.message);
      }
    }

    // Supprimer l'avatar de la DB
    user.avatar = null;
    user.updatedAt = new Date();
    await user.save();

    console.log("✅ Avatar supprimé pour user:", userId);

    return user;
  }
}

