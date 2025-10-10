import jwt from "jsonwebtoken";
import User from "../models/user.js";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";

// Middleware pour vérifier le token JWT
export const authenticateToken = async (request, reply) => {
  try {
    const authHeader = request.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return reply.code(401).send({ error: "Token d'accès manquant" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return reply
        .code(401)
        .send({ error: "Utilisateur invalide ou désactivé" });
    }

    // Ajouter l'utilisateur à la requête
    request.user = user;
  } catch (error) {
    console.error("Erreur d'authentification:", error);
    return reply.code(401).send({ error: "Token invalide" });
  }
};

// Middleware pour vérifier le rôle admin
export const requireAdmin = async (request, reply) => {
  try {
    await authenticateToken(request, reply);

    if (!request.user) {
      return reply.code(401).send({ error: "Non authentifié" });
    }

    if (request.user.role !== "admin") {
      return reply
        .code(403)
        .send({ error: "Accès refusé - Rôle admin requis" });
    }
  } catch (error) {
    console.error("Erreur vérification admin:", error);
    return reply.code(403).send({ error: "Accès refusé" });
  }
};

// Middleware pour vérifier le rôle user ou admin
export const requireUser = async (request, reply) => {
  try {
    await authenticateToken(request, reply);

    if (!request.user) {
      return reply.code(401).send({ error: "Non authentifié" });
    }

    if (!["user", "admin"].includes(request.user.role)) {
      return reply
        .code(403)
        .send({ error: "Accès refusé - Rôle utilisateur requis" });
    }
  } catch (error) {
    console.error("Erreur vérification utilisateur:", error);
    return reply.code(403).send({ error: "Accès refusé" });
  }
};

// Fonction pour générer un token JWT
export const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "24h" });
};

// Fonction pour décoder un token JWT
export const decodeToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};
