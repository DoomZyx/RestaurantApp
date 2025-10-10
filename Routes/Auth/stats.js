import CallModel from "../../models/callData.js";
import User from "../../models/user.js";
import { requireAdmin } from "../../middleware/auth.js";

export default async function statsRoutes(fastify, options) {
  // Route pour obtenir les statistiques système (admin seulement)
  fastify.get("/stats", {
    preHandler: [requireAdmin],
    handler: async (request, reply) => {
      try {
        // Compter le nombre total d'appels
        const totalCalls = await CallModel.countDocuments();

        // Compter les utilisateurs
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });

        // Calculer les jours de fonctionnement (depuis la création du premier appel)
        const firstCall = await CallModel.findOne().sort({ date: 1 });
        const uptimeDays = firstCall
          ? Math.floor(
              (new Date() - new Date(firstCall.date)) / (1000 * 60 * 60 * 24)
            )
          : 0;

        // Calculer le stockage utilisé (simulation basée sur le nombre d'appels)
        // En réalité, vous pourriez calculer la taille réelle de la base de données
        const storageUsed = Math.min(
          100,
          Math.max(10, Math.floor(totalCalls / 20))
        );

        // Obtenir la date de la dernière sauvegarde (simulation)
        const lastBackup = new Date();
        lastBackup.setHours(lastBackup.getHours() - 2); // 2 heures en arrière

        const stats = {
          totalUtilisateurs: totalUsers,
          utilisateursActifs: activeUsers,
          appelsTotaux: totalCalls,
          stockageUtilise: storageUsed,
          tempsFonctionnement: uptimeDays,
          derniereSauvegarde: lastBackup.toISOString(),
        };

        return reply.code(200).send({
          success: true,
          data: stats,
        });
      } catch (error) {
        console.error("Erreur récupération statistiques:", error);
        return reply.code(500).send({
          error: "Erreur lors de la récupération des statistiques",
        });
      }
    },
  });
}
