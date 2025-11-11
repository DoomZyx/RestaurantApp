import User from "../../models/user.js";
import { generateToken } from "../../middleware/auth.js";
import { UserValidator } from "../validators/UserValidator.js";

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

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
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
   * Connecte un utilisateur
   * @param {Object} credentials - Identifiants (email, password)
   * @returns {Promise<Object>} { user, token }
   */
  static async login(credentials) {
    const { email, password } = credentials;

    // Validation
    const validation = UserValidator.validateLogin({ email, password });
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ email: email.toLowerCase() });

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
   * Crée un administrateur par défaut (pour le premier démarrage)
   * @returns {Promise<void>}
   */
  static async createDefaultAdmin() {
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
      console.error("❌ Erreur création admin par défaut:", error);
    }
  }
}

