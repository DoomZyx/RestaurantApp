import {
  loginUser,
  registerUser,
  getProfile,
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
