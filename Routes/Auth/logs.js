import { requireAdmin } from "../../middleware/auth.js";
import User from "../../models/user.js";
import fs from "fs";
import path from "path";

export default async function logsRoutes(fastify, options) {
  // Route pour obtenir les logs système (admin seulement)
  fastify.get("/logs", {
    preHandler: [requireAdmin],
    handler: async (request, reply) => {
      try {
        const { type, limit = 50 } = request.query;
        const logs = [];

        // Logs de connexion des utilisateurs RÉELS
        const recentUsers = await User.find({})
          .sort({ lastLogin: -1 })
          .limit(20);

        recentUsers.forEach((user, index) => {
          if (user.lastLogin) {
            logs.push({
              id: `login_${user._id}_${index}`,
              timestamp: user.lastLogin.toISOString(),
              type: "info",
              action: "Connexion utilisateur",
              utilisateur: user.username.toUpperCase(),
              details: `Connexion réussie - ${user.role}`,
            });
          }
        });

        // Lire les vrais logs du fichier Winston si disponible
        try {
          const logsDir = path.join(process.cwd(), "logs");
          const combinedLogPath = path.join(logsDir, "combined.log");
          
          if (fs.existsSync(combinedLogPath)) {
            const logContent = fs.readFileSync(combinedLogPath, "utf8");
            const logLines = logContent.split('\n').filter(line => line.trim());
            
            // Prendre les dernières lignes et les parser
            const recentLogLines = logLines.slice(-30);
            
            recentLogLines.forEach((line, index) => {
              try {
                const logEntry = JSON.parse(line);
                logs.push({
                  id: `system_${index}`,
                  timestamp: logEntry.timestamp,
                  type: logEntry.level || "info",
                  action: "Activité système",
                  utilisateur: "SYSTÈME",
                  details: logEntry.message || "Log système",
                });
              } catch (parseError) {
                // Ignorer les lignes qui ne sont pas en JSON
              }
            });
          }
        } catch (fileError) {
          console.log("Aucun fichier de log Winston trouvé");
        }

        // Trier tous les logs par timestamp
        const allLogs = logs.sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        );

        // Filtrer par type si spécifié
        let filteredLogs = allLogs;
        if (type && type !== "all") {
          filteredLogs = allLogs.filter(log => log.type === type);
        }

        // Limiter le nombre de logs
        filteredLogs = filteredLogs.slice(0, parseInt(limit));

        return reply.code(200).send({
          success: true,
          data: filteredLogs,
          total: allLogs.length,
          filtered: filteredLogs.length,
        });
      } catch (error) {
        console.error("Erreur récupération logs:", error);
        return reply.code(500).send({
          error: "Erreur lors de la récupération des logs",
        });
      }
    },
  });
}
