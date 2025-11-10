# 📸 Configuration Cloudinary

## Variables d'environnement requises

Ajoutez ces variables à votre fichier `.env` (Backend) :

```bash
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

## 🔑 Où trouver vos credentials Cloudinary ?

1. Créez un compte sur [cloudinary.com](https://cloudinary.com/) (gratuit jusqu'à 25 GB)
2. Sur le dashboard, trouvez la section **"Product Environment Credentials"**
3. Copiez les 3 valeurs :
   - **Cloud Name** → `CLOUDINARY_CLOUD_NAME`
   - **API Key** → `CLOUDINARY_API_KEY`
   - **API Secret** → `CLOUDINARY_API_SECRET`

## 📦 Fonctionnalités

✅ **Upload automatique** des avatars sur Cloudinary  
✅ **Optimisation automatique** des images (WebP, compression)  
✅ **Redimensionnement** automatique (500x500px, centré sur le visage)  
✅ **Suppression automatique** de l'ancien avatar lors d'un nouvel upload  
✅ **URLs permanentes** - Les images ne disparaissent plus au redémarrage du serveur  
✅ **CDN mondial** - Chargement rapide partout dans le monde  

## 🗂️ Organisation

Les avatars sont stockés dans le dossier Cloudinary :
```
restaurant-app/avatars/avatar_USER_ID_TIMESTAMP.ext
```

## 🔗 Format des URLs

Les avatars sont maintenant des URLs complètes Cloudinary :
```
https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v123456/restaurant-app/avatars/avatar_xxx.jpg
```

Le frontend détecte automatiquement si l'avatar est une URL Cloudinary ou locale.

## ⚙️ Configuration avancée

La configuration est dans `Backend/Config/cloudinary.js`. Vous pouvez modifier :
- Le dossier de destination (`folder`)
- Les transformations d'image (dimensions, qualité, format)
- Les options de sécurité

## 🧪 Test

1. Ajoutez vos credentials dans `.env`
2. Redémarrez le backend
3. Uploadez un avatar depuis la page profil
4. Vérifiez dans votre dashboard Cloudinary que l'image apparaît
5. L'avatar s'affiche maintenant en production ! 🎉

