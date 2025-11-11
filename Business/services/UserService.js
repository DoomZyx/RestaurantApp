import User from "../../models/user.js";
import { UserValidator } from "../validators/UserValidator.js";

/**
 * Service de gestion des utilisateurs (admin)
 * Gère les opérations CRUD sur les utilisateurs (admin only)
 */
export class UserService {
  /**
   * Récupère tous les utilisateurs
   * @returns {Promise<Array>} Liste des utilisateurs
   */
  static async getAllUsers() {
    const users = await User.find({}).select("-password");
    return users;
  }

  /**
   * Récupère un utilisateur par ID
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<Object>} Utilisateur trouvé
   */
  static async getUserById(userId) {
    const user = await User.findById(userId).select("-password");

    if (!user) {
      throw new Error("Utilisateur non trouvé");
    }

    return user;
  }

  /**
   * Met à jour un utilisateur (admin)
   * @param {string} userId - ID de l'utilisateur à modifier
   * @param {Object} updates - Données à mettre à jour
   * @returns {Promise<Object>} Utilisateur mis à jour
   */
  static async updateUser(userId, updates) {
    const { username, email, role, isActive } = updates;

    const user = await User.findById(userId);

    if (!user) {
      throw new Error("Utilisateur non trouvé");
    }

    // Valider le rôle si fourni
    if (role !== undefined && !UserValidator.validateRole(role)) {
      throw new Error(`Rôle invalide: ${role}`);
    }

    // Vérifier l'unicité de l'email
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error("Cet email est déjà utilisé");
      }
      user.email = email;
    }

    // Vérifier l'unicité du username
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        throw new Error("Ce nom d'utilisateur est déjà utilisé");
      }
      user.username = username;
    }

    // Mettre à jour les champs
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();


    return user;
  }

  /**
   * Supprime un utilisateur
   * @param {string} userId - ID de l'utilisateur à supprimer
   * @param {string} requesterId - ID de l'utilisateur qui fait la requête
   * @returns {Promise<void>}
   */
  static async deleteUser(userId, requesterId) {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error("Utilisateur non trouvé");
    }

    // Empêcher la suppression de son propre compte
    if (user._id.toString() === requesterId) {
      throw new Error("Vous ne pouvez pas supprimer votre propre compte");
    }

    await User.findByIdAndDelete(userId);

  }

  /**
   * Recherche des utilisateurs par critères
   * @param {Object} criteria - Critères de recherche
   * @returns {Promise<Array>} Utilisateurs trouvés
   */
  static async searchUsers(criteria) {
    const { query, role, isActive } = criteria;

    const filters = {};

    if (query) {
      filters.$or = [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { prenom: { $regex: query, $options: 'i' } },
        { nom: { $regex: query, $options: 'i' } }
      ];
    }

    if (role !== undefined) {
      filters.role = role;
    }

    if (isActive !== undefined) {
      filters.isActive = isActive;
    }

    const users = await User.find(filters).select("-password");
    return users;
  }

  /**
   * Change le statut actif/inactif d'un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @param {boolean} isActive - Nouveau statut
   * @returns {Promise<Object>} Utilisateur mis à jour
   */
  static async toggleUserStatus(userId, isActive) {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error("Utilisateur non trouvé");
    }

    user.isActive = isActive;
    await user.save();


    return user;
  }

  /**
   * Change le rôle d'un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @param {string} newRole - Nouveau rôle
   * @returns {Promise<Object>} Utilisateur mis à jour
   */
  static async changeUserRole(userId, newRole) {
    if (!UserValidator.validateRole(newRole)) {
      throw new Error(`Rôle invalide: ${newRole}`);
    }

    const user = await User.findById(userId);

    if (!user) {
      throw new Error("Utilisateur non trouvé");
    }

    user.role = newRole;
    await user.save();


    return user;
  }

  /**
   * Obtient des statistiques sur les utilisateurs
   * @returns {Promise<Object>} Statistiques
   */
  static async getUserStats() {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const regularUsers = await User.countDocuments({ role: 'user' });

    return {
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
      admins: adminUsers,
      users: regularUsers
    };
  }
}

