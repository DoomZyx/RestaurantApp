import User from "../models/user.js";
import { generateToken } from "../middleware/auth.js";

// Inscription d'un nouvel utilisateur (admin seulement)
export async function registerUser(request, reply) {
  try {
    const { username, email, password, role = "user" } = request.body;

    // Validation des données
    if (!username || !email || !password) {
      return reply.code(400).send({
        error: "Tous les champs sont requis",
      });
    }

    if (password.length < 6) {
      return reply.code(400).send({
        error: "Le mot de passe doit contenir au moins 6 caractères",
      });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return reply.code(409).send({
        error: "Un utilisateur avec cet email ou nom d'utilisateur existe déjà",
      });
    }

    // Créer le nouvel utilisateur
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

    return reply.code(201).send({
      success: true,
      message: "Utilisateur créé avec succès",
      data: {
        user: user.toPublicJSON(),
        token,
      },
    });
  } catch (error) {
    console.error("Erreur création utilisateur:", error);
    return reply.code(500).send({
      error: "Erreur lors de la création de l'utilisateur",
    });
  }
}

// Connexion utilisateur
export async function loginUser(request, reply) {
  try {
    const { email, password } = request.body;

    // Validation des données
    if (!email || !password) {
      return reply.code(400).send({
        error: "Email et mot de passe requis",
      });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return reply.code(401).send({
        error: "Email ou mot de passe incorrect",
      });
    }

    // Vérifier si l'utilisateur est actif
    if (!user.isActive) {
      return reply.code(401).send({
        error: "Compte désactivé",
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return reply.code(401).send({
        error: "Email ou mot de passe incorrect",
      });
    }

    // Générer le token
    const token = generateToken(user._id);

    // Mettre à jour la dernière connexion
    user.lastLogin = new Date();
    await user.save();

    return reply.code(200).send({
      success: true,
      message: "Connexion réussie",
      data: {
        user: user.toPublicJSON(),
        token,
      },
    });
  } catch (error) {
    console.error("Erreur connexion:", error);
    return reply.code(500).send({
      error: "Erreur lors de la connexion",
    });
  }
}

// Obtenir le profil de l'utilisateur connecté
export async function getProfile(request, reply) {
  try {
    return reply.code(200).send({
      success: true,
      data: {
        user: request.user.toPublicJSON(),
      },
    });
  } catch (error) {
    console.error("Erreur récupération profil:", error);
    return reply.code(500).send({
      error: "Erreur lors de la récupération du profil",
    });
  }
}

// Lister tous les utilisateurs (admin seulement)
export async function getAllUsers(request, reply) {
  try {
    const users = await User.find({}).select("-password");

    return reply.code(200).send({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Erreur récupération utilisateurs:", error);
    return reply.code(500).send({
      error: "Erreur lors de la récupération des utilisateurs",
    });
  }
}

// Modifier un utilisateur (admin seulement)
export async function updateUser(request, reply) {
  try {
    const { id } = request.params;
    const { username, email, role, isActive } = request.body;

    const user = await User.findById(id);

    if (!user) {
      return reply.code(404).send({
        error: "Utilisateur non trouvé",
      });
    }

    // Mettre à jour les champs
    if (username !== undefined) user.username = username;
    if (email !== undefined) user.email = email;
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    return reply.code(200).send({
      success: true,
      message: "Utilisateur mis à jour avec succès",
      data: user.toPublicJSON(),
    });
  } catch (error) {
    console.error("Erreur mise à jour utilisateur:", error);
    return reply.code(500).send({
      error: "Erreur lors de la mise à jour de l'utilisateur",
    });
  }
}

// Supprimer un utilisateur (admin seulement)
export async function deleteUser(request, reply) {
  try {
    const { id } = request.params;

    const user = await User.findById(id);

    if (!user) {
      return reply.code(404).send({
        error: "Utilisateur non trouvé",
      });
    }

    // Empêcher la suppression de son propre compte
    if (user._id.toString() === request.user._id.toString()) {
      return reply.code(400).send({
        error: "Vous ne pouvez pas supprimer votre propre compte",
      });
    }

    await User.findByIdAndDelete(id);

    return reply.code(200).send({
      success: true,
      message: "Utilisateur supprimé avec succès",
    });
  } catch (error) {
    console.error("Erreur suppression utilisateur:", error);
    return reply.code(500).send({
      error: "Erreur lors de la suppression de l'utilisateur",
    });
  }
}

// Créer un utilisateur admin par défaut (pour le premier démarrage)
export async function createDefaultAdmin() {
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
      console.log("✅ Utilisateur admin créé par défaut");
      console.log("📧 Email: admin@handlehome.com");
      console.log("🔑 Mot de passe: admin123");
      console.log("⚠️  Changez ces identifiants en production !");
    }
  } catch (error) {
    console.error("Erreur création admin par défaut:", error);
  }
} 