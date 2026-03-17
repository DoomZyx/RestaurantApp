import { UserService } from "../../Business/services/UserService.js";
import { UserTransformer } from "../../Business/transformers/UserTransformer.js";
import logger from "../../Services/logging/logger.js";

/**
 * Controller de gestion des utilisateurs (admin)
 * Gère les endpoints CRUD pour les administrateurs
 */
export class UserController {
  /**
   * Liste tous les utilisateurs (admin)
   * GET /api/users
   */
  static async getAllUsers(request, reply) {
    try {
      const users = await UserService.getAllUsers(request.instanceId);

      return reply.code(200).send(
        UserTransformer.usersListResponse(users)
      );
    } catch (error) {
      logger.error({ err: error?.message }, "Erreur getAllUsers");

      return reply.code(500).send(
        UserTransformer.errorResponse("Erreur lors de la récupération des utilisateurs")
      );
    }
  }

  /**
   * Récupère un utilisateur par ID (admin)
   * GET /api/users/:id
   */
  static async getUserById(request, reply) {
    try {
      const { id } = request.params;
      const user = await UserService.getUserById(id, request.instanceId);

      return reply.code(200).send(
        UserTransformer.profileResponse(user)
      );
    } catch (error) {
      logger.error({ err: error?.message }, "Erreur getUserById");

      if (error.message === "Utilisateur non trouvé") {
        return reply.code(404).send(
          UserTransformer.errorResponse(error.message)
        );
      }

      return reply.code(500).send(
        UserTransformer.errorResponse("Erreur lors de la récupération de l'utilisateur")
      );
    }
  }

  /**
   * Met à jour un utilisateur (admin)
   * PUT /api/users/:id
   */
  static async updateUser(request, reply) {
    try {
      const { id } = request.params;
      const user = await UserService.updateUser(id, request.body, request.instanceId);

      return reply.code(200).send(
        UserTransformer.userUpdateResponse(user)
      );
    } catch (error) {
      logger.error({ err: error?.message }, "Erreur updateUser");

      // Erreurs de validation
      if (error.message.includes("déjà utilisé") || 
          error.message.includes("invalide")) {
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
        UserTransformer.errorResponse("Erreur lors de la mise à jour de l'utilisateur")
      );
    }
  }

  /**
   * Supprime un utilisateur (admin)
   * DELETE /api/users/:id
   */
  static async deleteUser(request, reply) {
    try {
      const { id } = request.params;
      await UserService.deleteUser(id, request.user._id.toString(), request.instanceId);

      return reply.code(200).send(
        UserTransformer.userDeleteResponse()
      );
    } catch (error) {
      logger.error({ err: error?.message }, "Erreur deleteUser");

      // Erreurs métier
      if (error.message.includes("propre compte")) {
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
        UserTransformer.errorResponse("Erreur lors de la suppression de l'utilisateur")
      );
    }
  }

  /**
   * Recherche des utilisateurs (admin)
   * GET /api/users/search?query=...
   */
  static async searchUsers(request, reply) {
    try {
      const users = await UserService.searchUsers(request.query, request.instanceId);

      return reply.code(200).send(
        UserTransformer.usersListResponse(users)
      );
    } catch (error) {
      logger.error({ err: error?.message }, "Erreur searchUsers");

      return reply.code(500).send(
        UserTransformer.errorResponse("Erreur lors de la recherche")
      );
    }
  }

  /**
   * Change le statut actif/inactif d'un utilisateur (admin)
   * PATCH /api/users/:id/status
   */
  static async toggleUserStatus(request, reply) {
    try {
      const { id } = request.params;
      const { isActive } = request.body;

      const user = await UserService.toggleUserStatus(id, isActive, request.instanceId);

      return reply.code(200).send(
        UserTransformer.userUpdateResponse(user)
      );
    } catch (error) {
      logger.error({ err: error?.message }, "Erreur toggleUserStatus");

      if (error.message === "Utilisateur non trouvé") {
        return reply.code(404).send(
          UserTransformer.errorResponse(error.message)
        );
      }

      return reply.code(500).send(
        UserTransformer.errorResponse("Erreur lors de la modification du statut")
      );
    }
  }

  /**
   * Change le rôle d'un utilisateur (admin)
   * PATCH /api/users/:id/role
   */
  static async changeUserRole(request, reply) {
    try {
      const { id } = request.params;
      const { role } = request.body;

      const user = await UserService.changeUserRole(id, role, request.instanceId);

      return reply.code(200).send(
        UserTransformer.userUpdateResponse(user)
      );
    } catch (error) {
      logger.error({ err: error?.message }, "Erreur changeUserRole");

      if (error.message.includes("invalide")) {
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
        UserTransformer.errorResponse("Erreur lors du changement de rôle")
      );
    }
  }

  /**
   * Obtient des statistiques sur les utilisateurs (admin)
   * GET /api/users/stats
   */
  static async getUserStats(request, reply) {
    try {
      const stats = await UserService.getUserStats(request.instanceId);

      return reply.code(200).send(
        UserTransformer.statsResponse(stats)
      );
    } catch (error) {
      logger.error({ err: error?.message }, "Erreur getUserStats");

      return reply.code(500).send(
        UserTransformer.errorResponse("Erreur lors de la récupération des statistiques")
      );
    }
  }
}

