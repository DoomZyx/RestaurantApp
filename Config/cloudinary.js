import { v2 as cloudinary } from 'cloudinary';

/**
 * Configuration Cloudinary pour l'upload d'images
 * Configuration retardée pour s'assurer que les variables d'env sont chargées
 */
let isConfigured = false;

function ensureCloudinaryConfigured() {
  if (isConfigured) return;
  
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('❌ Variables Cloudinary manquantes dans .env (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)');
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  isConfigured = true;
  console.log('✅ Cloudinary configuré:', process.env.CLOUDINARY_CLOUD_NAME);
}

/**
 * Upload un fichier vers Cloudinary
 * @param {Buffer} fileBuffer - Le buffer du fichier à uploader
 * @param {Object} options - Options d'upload
 * @returns {Promise<Object>} Résultat de l'upload avec URL
 */
export async function uploadToCloudinary(fileBuffer, options = {}) {
  ensureCloudinaryConfigured(); // S'assurer que Cloudinary est configuré
  
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'restaurant-app/avatars',
        resource_type: 'image',
        transformation: [
          { width: 500, height: 500, crop: 'fill', gravity: 'face' }, // Redimensionner et centrer sur le visage
          { quality: 'auto' }, // Optimisation automatique de la qualité
          { fetch_format: 'auto' }, // Format automatique (WebP si supporté)
        ],
        ...options,
      },
      (error, result) => {
        if (error) {
          console.error('❌ Erreur upload Cloudinary:', error);
          reject(error);
        } else {
          console.log('✅ Upload Cloudinary réussi:', result.secure_url);
          resolve(result);
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
}

/**
 * Supprime une image de Cloudinary
 * @param {string} publicId - L'ID public de l'image à supprimer
 * @returns {Promise<Object>} Résultat de la suppression
 */
export async function deleteFromCloudinary(publicId) {
  ensureCloudinaryConfigured(); // S'assurer que Cloudinary est configuré
  
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('🗑️ Image supprimée de Cloudinary:', publicId);
    return result;
  } catch (error) {
    console.error('❌ Erreur suppression Cloudinary:', error);
    throw error;
  }
}

/**
 * Extrait le public_id d'une URL Cloudinary
 * @param {string} url - L'URL Cloudinary
 * @returns {string|null} Le public_id ou null
 */
export function extractPublicIdFromUrl(url) {
  if (!url || !url.includes('cloudinary.com')) return null;
  
  // Extraire le public_id de l'URL
  // Ex: https://res.cloudinary.com/xxx/image/upload/v123/folder/image.jpg
  const matches = url.match(/\/v\d+\/(.+)\.\w+$/);
  return matches ? matches[1] : null;
}

export default cloudinary;

