/**
 * Validation des données utilisateurs
 * Valide les données d'authentification et de profil
 */
export class UserValidator {
  /**
   * Valide les données d'inscription
   * @param {Object} data - Données à valider
   * @returns {Object} { isValid: boolean, errors: string[] }
   */
  static validateRegistration(data) {
    const errors = [];
    const { username, email, password } = data;

    if (!username || username.trim().length === 0) {
      errors.push("Le nom d'utilisateur est requis");
    }

    if (username && username.length < 3) {
      errors.push("Le nom d'utilisateur doit contenir au moins 3 caractères");
    }

    if (!email || email.trim().length === 0) {
      errors.push("L'email est requis");
    }

    if (email && !this.validateEmail(email)) {
      errors.push("Format d'email invalide");
    }

    if (!password || password.length === 0) {
      errors.push("Le mot de passe est requis");
    }

    if (password && password.length < 6) {
      errors.push("Le mot de passe doit contenir au moins 6 caractères");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valide les données de connexion
   * @param {Object} data - Données à valider
   * @returns {Object} { isValid: boolean, errors: string[] }
   */
  static validateLogin(data) {
    const errors = [];
    const { email, password } = data;

    if (!email || email.trim().length === 0) {
      errors.push("L'email est requis");
    }

    if (!password || password.length === 0) {
      errors.push("Le mot de passe est requis");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valide les données de mise à jour du profil
   * @param {Object} data - Données à valider
   * @returns {Object} { isValid: boolean, errors: string[] }
   */
  static validateProfileUpdate(data) {
    const errors = [];
    const { username, email } = data;

    if (username !== undefined && username.length < 3) {
      errors.push("Le nom d'utilisateur doit contenir au moins 3 caractères");
    }

    if (email !== undefined && !this.validateEmail(email)) {
      errors.push("Format d'email invalide");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valide un format d'email
   * @param {string} email - Email à valider
   * @returns {boolean}
   */
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Valide un rôle utilisateur
   * @param {string} role - Rôle à valider
   * @returns {boolean}
   */
  static validateRole(role) {
    const validRoles = ["admin", "user", "manager"];
    return validRoles.includes(role);
  }

  /**
   * Valide un type de fichier image
   * @param {string} mimetype - Type MIME du fichier
   * @returns {boolean}
   */
  static validateImageType(mimetype) {
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

    return allowedMimeTypes.includes(mimetype);
  }

  /**
   * Valide la taille d'un fichier (max 5MB)
   * @param {number} size - Taille du fichier en bytes
   * @returns {boolean}
   */
  static validateFileSize(size, maxSize = 5 * 1024 * 1024) {
    return size <= maxSize;
  }
}

