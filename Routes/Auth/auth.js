import {
  loginUser,
  registerUser,
  getProfile,
  updateProfile,
  uploadAvatar,
  getAllUsers,
  updateUser,
  deleteUser,
} from "../../Controller/authController.js";
import { authenticateToken, requireAdmin } from "../../middleware/auth.js";
import User from "../../models/user.js";

export default async function authRoutes(fastify, options) {
  // Route de connexion (publique)
  fastify.post("/login", {
    schema: {
      body: {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 6 },
        },
        required: ["email", "password"],
      },
    },
    handler: loginUser,
  });

  // Route d'inscription (admin seulement)
  fastify.post("/register", {
    preHandler: [requireAdmin],
    schema: {
      body: {
        type: "object",
        properties: {
          username: { type: "string", minLength: 3, maxLength: 30 },
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 6 },
          role: { type: "string", enum: ["admin", "user"] },
        },
        required: ["username", "email", "password"],
      },
    },
    handler: registerUser,
  });

  // Route pour obtenir le profil (utilisateur connecté)
  fastify.get("/profile", {
    preHandler: [authenticateToken],
    handler: getProfile,
  });

  // Route pour mettre à jour le profil (utilisateur connecté)
  fastify.put("/profile", {
    preHandler: [authenticateToken],
    schema: {
      body: {
        type: "object",
        properties: {
          username: { type: "string", minLength: 3, maxLength: 30 },
          email: { type: "string", format: "email" },
          telephone: { type: "string" },
          poste: { type: "string" },
          departement: { type: "string" },
          avatar: { type: "string" },
        },
      },
    },
    handler: updateProfile,
  });

  // Route pour uploader l'avatar (utilisateur connecté)
  fastify.post("/profile/avatar", {
    preHandler: [authenticateToken],
    handler: uploadAvatar,
  });

  // Routes admin pour la gestion des utilisateurs
  fastify.get("/users", {
    preHandler: [requireAdmin],
    handler: getAllUsers,
  });

  fastify.put("/users/:id", {
    preHandler: [requireAdmin],
    schema: {
      params: {
        type: "object",
        properties: {
          id: { type: "string", minLength: 24, maxLength: 24 },
        },
        required: ["id"],
      },
      body: {
        type: "object",
        properties: {
          username: { type: "string", minLength: 3, maxLength: 30 },
          email: { type: "string", format: "email" },
          role: { type: "string", enum: ["admin", "user"] },
          isActive: { type: "boolean" },
        },
      },
    },
    handler: updateUser,
  });

  fastify.delete("/users/:id", {
    preHandler: [requireAdmin],
    schema: {
      params: {
        type: "object",
        properties: {
          id: { type: "string", minLength: 24, maxLength: 24 },
        },
        required: ["id"],
      },
    },
    handler: deleteUser,
  });
}
