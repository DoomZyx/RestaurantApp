import crypto from "crypto";
import User from "../../models/user.js";
import { generateToken } from "../../middleware/auth.js";
import { UserValidator } from "../validators/UserValidator.js";
import logger from "../../Services/logging/logger.js";

/**
 * Service d'authentification
 * Gère l'inscription, la connexion et la génération de tokens
 */
export class AuthService {
  /**
   * Inscrit un nouvel utilisateur
   * @param {Object} userData - Données de l'utilisateur
   * @returns {Promise<Object>} { user, token }
   */
  static async register(userData) {
    const { username, email, password, role = "user" } = userData;

    // Validation
    const validation = UserValidator.validateRegistration({ username, email, password });
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    // Vérifier si l'utilisateur existe déjà (utilisateurs globaux : sans instance ou instanceId vide)
    const existingUser = await User.findOne({
      $and: [
        { $or: [{ email }, { username }] },
        { $or: [{ instanceId: null }, { instanceId: "" }, { instanceId: { $exists: false } }] },
      ],
    });

    if (existingUser) {
      throw new Error("Un utilisateur avec cet email ou nom d'utilisateur existe déjà");
    }

    // Valider le rôle
    if (!UserValidator.validateRole(role)) {
      throw new Error(`Rôle invalide: ${role}`);
    }

    // Créer l'utilisateur
    const user = new User({
      username,
      email,
      password,
      role,
    });

    await user.save();

    // Générer le token
    const token = generateToken(user._id);

    // Mettre à jour la dernière connexion
    user.lastLogin = new Date();
    await user.save();


    return {
      user,
      token
    };
  }

  /**
   * Crée le premier utilisateur (admin) pour une instance (après achat abonnement).
   * Si password absent (ex. utilisateur inscrit via Google), un mot de passe aléatoire est généré (connexion app via session site).
   * @param {string} instanceId - ID de l'instance (tenant)
   * @param {Object} data - { email, password?, username?, role? } role par défaut "admin" pour premier utilisateur
   * @returns {Promise<Object>} { user }
   */
  static async createUserForInstance(instanceId, data) {
    const { email, password: rawPassword, username: rawUsername, role = "admin" } = data;
    if (!email || typeof email !== "string" || !email.trim()) {
      throw new Error("Email requis pour créer l'utilisateur de l'instance");
    }
    const emailNorm = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      throw new Error("Format d'email invalide");
    }

    const existing = await User.findOne({ email: emailNorm, instanceId });
    if (existing) {
      throw new Error("Un utilisateur avec cet email existe déjà pour cette instance");
    }

    const password = (rawPassword && String(rawPassword).trim().length >= 6)
      ? String(rawPassword).trim()
      : null;
    const finalPassword = password || crypto.randomBytes(24).toString("hex");

    let username = (rawUsername && String(rawUsername).trim()) || emailNorm.replace(/@.*/, "").replace(/[^a-z0-9]/gi, "_").slice(0, 26);
    if (username.length < 3) username = username + "01";
    const base = username.slice(0, 26);
    let suffix = 0;
    while (await User.findOne({ username, instanceId })) {
      username = (base + String(++suffix)).slice(0, 30);
    }

    const user = new User({
      instanceId,
      username,
      email: emailNorm,
      password: finalPassword,
      role: role === "admin" ? "admin" : "user",
    });
    await user.save();
    return { user };
  }

  /**
   * Connecte un utilisateur (scopé par instance si request envoie x-api-key tenant).
   * @param {Object} credentials - Identifiants (email, password)
   * @param {string} [instanceId] - instanceId issu de la clé API (multiTenantAuth)
   * @returns {Promise<Object>} { user, token }
   */
  static async login(credentials, instanceId) {
    const { email, password } = credentials;

    const validation = UserValidator.validateLogin({ email, password });
    if (!validation.isValid) {
      throw new Error(validation.errors.join(", "));
    }

    const emailNorm = email.trim().toLowerCase();
    const filter = { email: emailNorm };
    if (instanceId && instanceId !== "inst_default") {
      filter.instanceId = instanceId;
    } else {
      filter.$or = [
        { instanceId: null },
        { instanceId: "" },
        { instanceId: "inst_default" },
        { instanceId: { $exists: false } },
      ];
    }

    const user = await User.findOne(filter);

    if (!user) {
      throw new Error("Email ou mot de passe incorrect");
    }

    // Vérifier si l'utilisateur est actif
    if (!user.isActive) {
      throw new Error("Compte désactivé");
    }

    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      throw new Error("Email ou mot de passe incorrect");
    }

    // Générer le token
    const token = generateToken(user._id);

    // Mettre à jour la dernière connexion
    user.lastLogin = new Date();
    await user.save();


    return {
      user,
      token
    };
  }

  /**
   * Vérifie la validité d'un token
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<Object>} Utilisateur trouvé
   */
  static async verifyToken(userId) {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error("Utilisateur non trouvé");
    }

    if (!user.isActive) {
      throw new Error("Compte désactivé");
    }

    return user;
  }

  /**
   * Crée un administrateur par défaut (pour le premier démarrage).
   * audit-fix: désactivé en production pour éviter credentials codés en dur.
   * @returns {Promise<void>}
   */
  static async createDefaultAdmin() {
    if (process.env.NODE_ENV === "production") {
      return;
    }
    try {
      const adminExists = await User.findOne({ role: "admin" });

      if (!adminExists) {
        const adminUser = new User({
          username: "admin",
          email: "admin@handlehome.com",
          password: "admin123",
          role: "admin",
        });

        await adminUser.save();
      }
    } catch (error) {
      logger.error({ err: error?.message }, "Erreur création admin par défaut");
    }
  }
}

