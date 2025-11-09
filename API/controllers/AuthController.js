import { AuthService } from "../../Business/services/AuthService.js";
import { UserTransformer } from "../../Business/transformers/UserTransformer.js";

/**
 * Controller d'authentification
 * Gère les endpoints d'authentification (login, register)
 */
export class AuthController {
  /**
   * Inscription d'un nouvel utilisateur
   * POST /api/auth/register
   */
  static async register(request, reply) {
    try {
      const { user, token } = await AuthService.register(request.body);

      return reply.code(201).send(
        UserTransformer.registrationSuccessResponse(user, token)
      );
    } catch (error) {
      console.error("❌ Erreur registration:", error);

      // Erreurs de validation ou de duplication
      if (error.message.includes("existe déjà") || 
          error.message.includes("requis") ||
          error.message.includes("invalide")) {
        return reply.code(400).send(
          UserTransformer.errorResponse(error.message)
        );
      }

      return reply.code(500).send(
        UserTransformer.errorResponse("Erreur lors de la création de l'utilisateur")
      );
    }
  }

  /**
   * Connexion d'un utilisateur
   * POST /api/auth/login
   */
  static async login(request, reply) {
    try {
      const { user, token } = await AuthService.login(request.body);

      return reply.code(200).send(
        UserTransformer.authSuccessResponse(user, token)
      );
    } catch (error) {
      console.error("❌ Erreur login:", error);

      // Erreurs d'authentification
      if (error.message.includes("incorrect") || 
          error.message.includes("désactivé") ||
          error.message.includes("requis")) {
        return reply.code(401).send(
          UserTransformer.errorResponse(error.message)
        );
      }

      return reply.code(500).send(
        UserTransformer.errorResponse("Erreur lors de la connexion")
      );
    }
  }

  /**
   * Vérifie le token de l'utilisateur
   * GET /api/auth/verify
   */
  static async verifyToken(request, reply) {
    try {
      const user = await AuthService.verifyToken(request.user.id);

      return reply.code(200).send(
        UserTransformer.profileResponse(user)
      );
    } catch (error) {
      console.error("❌ Erreur verification token:", error);

      return reply.code(401).send(
        UserTransformer.errorResponse(error.message)
      );
    }
  }

  /**
   * Déconnexion (côté client uniquement, supprime le token)
   * POST /api/auth/logout
   */
  static async logout(request, reply) {
    // La déconnexion est gérée côté client (suppression du token)
    // Cette route est là pour la cohérence de l'API
    return reply.code(200).send({
      success: true,
      message: "Déconnexion réussie"
    });
  }
}

