import User from "../../models/user.js";
import { UserValidator } from "../validators/UserValidator.js";

/**
 * Service de gestion des utilisateurs (admin), scopé par instance (isolation multi-tenant).
 */
function resolveInstanceFilter(instanceId) {
  if (instanceId && instanceId !== "inst_default") {
    return { instanceId };
  }
  return { $or: [{ instanceId: null }, { instanceId: "" }, { instanceId: "inst_default" }, { instanceId: { $exists: false } }] };
}

export class UserService {
  /**
   * Récupère tous les utilisateurs de l'instance
   * @param {string} [instanceId] - ID instance (clé API tenant)
   * @returns {Promise<Array>} Liste des utilisateurs
   */
  static async getAllUsers(instanceId) {
    const filter = resolveInstanceFilter(instanceId);
    const users = await User.find(filter).select("-password");
    return users;
  }

  /**
   * Récupère un utilisateur par ID (même instance uniquement)
   * @param {string} userId - ID de l'utilisateur
   * @param {string} [instanceId] - ID instance
   * @returns {Promise<Object>} Utilisateur trouvé
   */
  static async getUserById(userId, instanceId) {
    const filter = resolveInstanceFilter(instanceId);
    const user = await User.findOne({ _id: userId, ...filter }).select("-password");

    if (!user) {
      throw new Error("Utilisateur non trouvé");
    }

    return user;
  }

  /**
   * Met à jour un utilisateur (admin), même instance uniquement
   * @param {string} userId - ID de l'utilisateur à modifier
   * @param {Object} updates - Données à mettre à jour
   * @param {string} [instanceId] - ID instance
   * @returns {Promise<Object>} Utilisateur mis à jour
   */
  static async updateUser(userId, updates, instanceId) {
    const { username, email, role, isActive } = updates;
    const filter = resolveInstanceFilter(instanceId);
    const user = await User.findOne({ _id: userId, ...filter });

    if (!user) {
      throw new Error("Utilisateur non trouvé");
    }

    if (role !== undefined && !UserValidator.validateRole(role)) {
      throw new Error(`Rôle invalide: ${role}`);
    }

    const emailFilter = { ...resolveInstanceFilter(instanceId), email: email?.trim().toLowerCase() };
    if (email && email !== user.email) {
      const existingUser = await User.findOne(emailFilter);
      if (existingUser) {
        throw new Error("Cet email est déjà utilisé");
      }
      user.email = email.trim().toLowerCase();
    }

    const usernameFilter = { ...resolveInstanceFilter(instanceId), username };
    if (username && username !== user.username) {
      const existingUser = await User.findOne(usernameFilter);
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
  static async deleteUser(userId, requesterId, instanceId) {
    const filter = resolveInstanceFilter(instanceId);
    const user = await User.findOne({ _id: userId, ...filter });

    if (!user) {
      throw new Error("Utilisateur non trouvé");
    }

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
  static async searchUsers(criteria, instanceId) {
    const { query, role, isActive } = criteria;
    const base = resolveInstanceFilter(instanceId);
    const filters = { ...base };

    if (query) {
      filters.$or = [
        { username: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
        { prenom: { $regex: query, $options: "i" } },
        { nom: { $regex: query, $options: "i" } }
      ];
    }
    if (role !== undefined) filters.role = role;
    if (isActive !== undefined) filters.isActive = isActive;

    const users = await User.find(filters).select("-password");
    return users;
  }

  /**
   * Change le statut actif/inactif d'un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @param {boolean} isActive - Nouveau statut
   * @returns {Promise<Object>} Utilisateur mis à jour
   */
  static async toggleUserStatus(userId, isActive, instanceId) {
    const filter = resolveInstanceFilter(instanceId);
    const user = await User.findOne({ _id: userId, ...filter });

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
  static async changeUserRole(userId, newRole, instanceId) {
    if (!UserValidator.validateRole(newRole)) {
      throw new Error(`Rôle invalide: ${newRole}`);
    }
    const filter = resolveInstanceFilter(instanceId);
    const user = await User.findOne({ _id: userId, ...filter });

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
  static async getUserStats(instanceId) {
    const filter = resolveInstanceFilter(instanceId);
    const totalUsers = await User.countDocuments(filter);
    const activeUsers = await User.countDocuments({ ...filter, isActive: true });
    const adminUsers = await User.countDocuments({ ...filter, role: "admin" });
    const regularUsers = await User.countDocuments({ ...filter, role: "user" });

    return {
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
      admins: adminUsers,
      users: regularUsers
    };
  }
}

