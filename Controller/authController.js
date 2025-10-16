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

// Mettre à jour le profil de l'utilisateur connecté
export async function updateProfile(request, reply) {
  try {
    const userId = request.user.id;
    const { username, email, telephone, poste, departement, avatar } = request.body;

    // Trouver l'utilisateur
    const user = await User.findById(userId);
    if (!user) {
      return reply.code(404).send({
        error: "Utilisateur non trouvé",
      });
    }

    // Vérifier si l'email est déjà utilisé par un autre utilisateur
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return reply.code(400).send({
          error: "Cet email est déjà utilisé",
        });
      }
      user.email = email;
    }

    // Vérifier si le username est déjà utilisé par un autre utilisateur
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return reply.code(400).send({
          error: "Ce nom d'utilisateur est déjà utilisé",
        });
      }
      user.username = username;
    }

    // Mettre à jour les autres champs
    if (telephone !== undefined) user.telephone = telephone;
    if (poste !== undefined) user.poste = poste;
    if (departement !== undefined) user.departement = departement;
    if (avatar !== undefined) user.avatar = avatar;

    user.updatedAt = new Date();
    await user.save();

    return reply.code(200).send({
      success: true,
      message: "Profil mis à jour avec succès",
      data: {
        user: user.toPublicJSON(),
      },
    });
  } catch (error) {
    console.error("Erreur mise à jour profil:", error);
    return reply.code(500).send({
      error: "Erreur lors de la mise à jour du profil",
    });
  }
}

// Upload de l'avatar utilisateur (avec @fastify/multipart)
export async function uploadAvatar(request, reply) {
  try {
    const userId = request.user.id;

    // Récupérer le fichier depuis multipart
    const data = await request.file();
    
    if (!data) {
      return reply.code(400).send({
        error: "Aucun fichier uploadé",
      });
    }

    // Vérifier le type de fichier
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'image/bmp',
      'image/tiff',
      'image/x-icon',
      'image/vnd.microsoft.icon',
      'image/avif',
      'image/heic',
      'image/heif'
    ];

    if (!allowedMimeTypes.includes(data.mimetype)) {
      return reply.code(400).send({
        error: "Type de fichier invalide. Seules les images sont acceptées.",
      });
    }

    // Trouver l'utilisateur
    const user = await User.findById(userId);
    if (!user) {
      return reply.code(404).send({
        error: "Utilisateur non trouvé",
      });
    }

    // Générer un nom de fichier unique
    const ext = data.filename.split('.').pop();
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename = `avatar_${userId}_${uniqueSuffix}.${ext}`;
    const filepath = `uploads/avatars/${filename}`;

    // Créer le dossier s'il n'existe pas
    const fs = await import('fs/promises');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const uploadDir = path.join(__dirname, '..', 'uploads', 'avatars');
    
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }

    // Sauvegarder le fichier
    const fullPath = path.join(__dirname, '..', filepath);
    const buffer = await data.toBuffer();
    await fs.writeFile(fullPath, buffer);

    // Construire l'URL de l'avatar
    const avatarUrl = `/${filepath}`;

    console.log("📁 Fichier sauvegardé:", fullPath);
    console.log("🔗 Avatar URL:", avatarUrl);

    // Mettre à jour l'avatar dans la base de données
    user.avatar = avatarUrl;
    user.updatedAt = new Date();
    await user.save();

    console.log("✅ Avatar mis à jour en DB pour user:", userId);

    return reply.code(200).send({
      success: true,
      message: "Avatar uploadé avec succès",
      data: {
        avatar: avatarUrl,
        user: user.toPublicJSON(),
      },
    });
  } catch (error) {
    console.error("Erreur upload avatar:", error);
    return reply.code(500).send({
      error: "Erreur lors de l'upload de l'avatar",
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