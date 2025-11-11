import User from "../../models/user.js";
import { UserValidator } from "../validators/UserValidator.js";
import { uploadToCloudinary, deleteFromCloudinary, extractPublicIdFromUrl } from "../../Config/cloudinary.js";

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


    return user;
  }

  /**
   * Upload un avatar pour l'utilisateur vers Cloudinary
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

    // Supprimer l'ancien avatar de Cloudinary si présent
    if (user.avatar) {
      const oldPublicId = extractPublicIdFromUrl(user.avatar);
      if (oldPublicId) {
        try {
          await deleteFromCloudinary(oldPublicId);
        } catch (error) {
        }
      }
    }

    // Convertir le fichier en buffer
    const buffer = await file.toBuffer();

    // Upload vers Cloudinary avec nom unique
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const result = await uploadToCloudinary(buffer, {
      folder: 'restaurant-app/avatars',
      public_id: `avatar_${userId}_${uniqueSuffix}`,
    });

    // Récupérer l'URL sécurisée de Cloudinary
    const avatarUrl = result.secure_url;


    // Mettre à jour l'avatar dans la base de données
    user.avatar = avatarUrl;
    user.updatedAt = new Date();
    await user.save();


    return {
      avatarUrl,
      user
    };
  }

  /**
   * Supprime l'avatar d'un utilisateur de Cloudinary et de la DB
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<Object>} Utilisateur mis à jour
   */
  static async deleteAvatar(userId) {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error("Utilisateur non trouvé");
    }

    // Supprimer l'avatar de Cloudinary si présent
    if (user.avatar) {
      const publicId = extractPublicIdFromUrl(user.avatar);
      if (publicId) {
        try {
          await deleteFromCloudinary(publicId);
        } catch (error) {
        }
      }
    }

    // Supprimer l'avatar de la DB
    user.avatar = null;
    user.updatedAt = new Date();
    await user.save();


    return user;
  }
}

