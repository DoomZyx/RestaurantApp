import { ProfileService } from "../../Business/services/ProfileService.js";
import { UserTransformer } from "../../Business/transformers/UserTransformer.js";

/**
 * Controller de gestion du profil
 * Gère les endpoints de profil et d'avatar
 */
export class ProfileController {
  /**
   * Récupère le profil de l'utilisateur connecté
   * GET /api/profile
   */
  static async getProfile(request, reply) {
    try {
      const user = await ProfileService.getProfile(request.user.id);

      return reply.code(200).send(
        UserTransformer.profileResponse(user)
      );
    } catch (error) {
      console.error("❌ Erreur getProfile:", error);

      if (error.message === "Utilisateur non trouvé") {
        return reply.code(404).send(
          UserTransformer.errorResponse(error.message)
        );
      }

      return reply.code(500).send(
        UserTransformer.errorResponse("Erreur lors de la récupération du profil")
      );
    }
  }

  /**
   * Met à jour le profil de l'utilisateur connecté
   * PUT /api/profile
   */
  static async updateProfile(request, reply) {
    try {
      const user = await ProfileService.updateProfile(
        request.user.id,
        request.body
      );

      return reply.code(200).send(
        UserTransformer.profileUpdateResponse(user)
      );
    } catch (error) {
      console.error("❌ Erreur updateProfile:", error);

      // Erreurs de validation ou de duplication
      if (error.message.includes("déjà utilisé") || 
          error.message.includes("invalide") ||
          error.message.includes("caractères")) {
        return reply.code(400).send(
          UserTransformer.errorResponse(error.message)
        );
      }

      if (error.message === "Utilisateur non trouvé") {
        return reply.code(404).send(
          UserTransformer.errorResponse(error.message)
        );
      }

      return reply.code(500).send(
        UserTransformer.errorResponse("Erreur lors de la mise à jour du profil")
      );
    }
  }

  /**
   * Upload l'avatar de l'utilisateur connecté
   * POST /api/profile/avatar
   */
  static async uploadAvatar(request, reply) {
    try {
      // Récupérer le fichier depuis multipart
      const file = await request.file();
      
      const { avatarUrl, user } = await ProfileService.uploadAvatar(
        request.user.id,
        file
      );

      return reply.code(200).send(
        UserTransformer.avatarUploadResponse(avatarUrl, user)
      );
    } catch (error) {
      console.error("❌ Erreur uploadAvatar:", error);

      // Erreurs de validation
      if (error.message.includes("fichier") || 
          error.message.includes("Type") ||
          error.message.includes("image")) {
        return reply.code(400).send(
          UserTransformer.errorResponse(error.message)
        );
      }

      if (error.message === "Utilisateur non trouvé") {
        return reply.code(404).send(
          UserTransformer.errorResponse(error.message)
        );
      }

      return reply.code(500).send(
        UserTransformer.errorResponse("Erreur lors de l'upload de l'avatar")
      );
    }
  }

  /**
   * Supprime l'avatar de l'utilisateur connecté
   * DELETE /api/profile/avatar
   */
  static async deleteAvatar(request, reply) {
    try {
      const user = await ProfileService.deleteAvatar(request.user.id);

      return reply.code(200).send(
        UserTransformer.profileUpdateResponse(user)
      );
    } catch (error) {
      console.error("❌ Erreur deleteAvatar:", error);

      if (error.message === "Utilisateur non trouvé") {
        return reply.code(404).send(
          UserTransformer.errorResponse(error.message)
        );
      }

      return reply.code(500).send(
        UserTransformer.errorResponse("Erreur lors de la suppression de l'avatar")
      );
    }
  }
}

