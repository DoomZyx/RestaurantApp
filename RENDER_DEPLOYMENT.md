# Déploiement sur Render avec RNNoise

Ce guide explique comment déployer le backend Node.js avec le service RNNoise sur le même serveur Render.

## Architecture

Le Dockerfile démarre **deux services en parallèle** :
1. **Backend Node.js** sur le port `8080`
2. **Service RNNoise (Python)** sur le port `8081`

Les deux services communiquent via `localhost`.

## Configuration sur Render

### 1. Créer un nouveau Web Service

1. Allez sur [render.com](https://render.com)
2. Cliquez sur **"New +"** → **"Web Service"**
3. Connectez votre dépôt Git
4. Configurez le service :

### 2. Paramètres du Service

| Paramètre | Valeur |
|-----------|--------|
| **Name** | `restaurant-app-backend` (ou votre choix) |
| **Region** | Choisir la région la plus proche |
| **Branch** | `main` (ou votre branche) |
| **Root Directory** | `Backend` |
| **Environment** | `Docker` |
| **Instance Type** | Au minimum **Starter** (512 MB RAM) |

### 3. Variables d'environnement

Dans l'onglet **"Environment"** de votre service Render, ajoutez :

```bash
# MongoDB
MONGODB_URI=mongodb+srv://...

# JWT
JWT_SECRET=votre_secret_jwt

# OpenAI
OPENAI_API_KEY=sk-...

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+33...

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# RNNoise - IMPORTANT
ENABLE_NOISE_REDUCTION=true
RNNOISE_SERVICE_URL=http://localhost:8081
RNNOISE_PORT=8081

# Port backend
PORT=8080

# Node Environment
NODE_ENV=production
```

### 4. Configuration importante

**IMPORTANT** : Comme les deux services tournent sur le même serveur, utilisez :
```bash
RNNOISE_SERVICE_URL=http://localhost:8081
```

**NE PAS** utiliser d'URL externe comme `http://0.0.0.0:8081` ou l'URL publique Render.

## Déploiement

1. **Commit et push** vos modifications :
   ```bash
   git add .
   git commit -m "feat: add RNNoise support for Render"
   git push origin main
   ```

2. Render détectera automatiquement le Dockerfile et :
   - Installera Python et Node.js
   - Installera les dépendances Python (RNNoise)
   - Installera les dépendances Node.js
   - Démarrera les deux services via `start-services.sh`

3. Vérifiez les logs de déploiement pour confirmer :
   ```
   🎙️ Démarrage du service RNNoise sur le port 8081...
   ✅ RNNoise démarré
   🚀 Démarrage du backend Node.js sur le port 8080...
   ✅ Backend Node.js démarré
   ```

## Vérification

Une fois déployé, testez le health check RNNoise :

```bash
# Remplacez par votre URL Render
curl https://votre-app.onrender.com/health
```

Vous devriez voir dans les logs backend :
```
✅ RNNoise activé - Réduction de bruit en temps réel
```

## Résolution de problèmes

### Erreur : "RNNoise non disponible"

**Cause** : Le service Python n'a pas démarré correctement

**Solution** :
1. Vérifiez les logs Render
2. Assurez-vous que `RNNOISE_SERVICE_URL=http://localhost:8081`
3. Vérifiez que l'instance Render a assez de RAM (minimum 512 MB)

### Erreur : "Out of memory"

**Cause** : L'instance Render est trop petite

**Solution** : Passez à une instance plus grande (au minimum **Starter**)

### Le service démarre mais crash après quelques secondes

**Cause** : Possible conflit de ports ou dépendances manquantes

**Solution** :
1. Vérifiez que les ports 8080 et 8081 ne sont pas utilisés
2. Vérifiez que `requirements.txt` contient toutes les dépendances

## Ressources requises

| Service | RAM | CPU | Disque |
|---------|-----|-----|--------|
| Node.js Backend | ~256 MB | 0.1 vCPU | 200 MB |
| RNNoise Python | ~50 MB | 0.05 vCPU | 100 MB |
| **TOTAL** | **~300-400 MB** | **0.15 vCPU** | **300 MB** |

**Instance recommandée** : Render **Starter** (512 MB RAM) ou supérieur

## Coûts

- **Instance Starter** : ~7$/mois
- **Instance Professional** : ~25$/mois (recommandé pour production)

## Alternative : Deux services séparés

Si vous préférez séparer les services pour plus de flexibilité :

1. **Service 1** : Backend Node.js seul
2. **Service 2** : Service RNNoise Python seul

Dans ce cas :
```bash
# Service 1 (.env)
RNNOISE_SERVICE_URL=https://votre-rnnoise-service.onrender.com

# Service 2 expose juste le port 8081
```

**Avantages** : Scalabilité indépendante
**Inconvénients** : Coût double + latence réseau

## Support

Pour toute question :
1. Vérifiez les logs Render
2. Testez le health check : `curl http://localhost:8081/health`
3. Testez avec `ENABLE_NOISE_REDUCTION=false` pour isoler le problème

