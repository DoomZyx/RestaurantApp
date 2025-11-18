# 🎙️ Service RNNoise - Suppression de Bruit en Temps Réel

Ce service utilise **RNNoise** pour supprimer le bruit de fond des appels téléphoniques en temps réel.

## 📋 Table des matières

- [Pourquoi RNNoise ?](#pourquoi-rnnoise-)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Utilisation](#utilisation)
- [Tests](#tests)
- [Performance](#performance)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Pourquoi RNNoise ?

### ✅ Avantages
- **Temps réel** : Latence < 10ms par chunk
- **Léger** : ~50 Mo de RAM, CPU minimal
- **Optimisé pour la voix** : Spécialement conçu pour les appels
- **Économique** : Pas besoin de serveur puissant
- **Fail-safe** : Si le service échoue, l'audio original est utilisé

### ❌ Pourquoi pas Spleeter ?
- Trop lourd (plusieurs Go de RAM)
- Latence 500ms à 2 secondes
- Nécessite TensorFlow/PyTorch
- Coût d'hébergement élevé

---

## 🏗️ Architecture

```
Twilio (Audio mulaw 8kHz)
    ↓
Backend Node.js
    ↓
Service RNNoise (Python) ← Suppression du bruit
    ↓
Audio nettoyé
    ↓
OpenAI Realtime API
```

### Composants

1. **rnnoise_service.py** : API FastAPI qui expose `/clean-audio`
2. **audioCleaningService.js** : Client Node.js pour communiquer avec le service Python
3. **connection.js** : Intégration dans le flux WebSocket

---

## 📦 Installation

### 1️⃣ Installation automatique

```bash
cd Backend/Services/audioProcessing
chmod +x install.sh
./install.sh
```

### 2️⃣ Installation manuelle

```bash
# Créer un environnement virtuel Python
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
.\venv\Scripts\activate  # Windows

# Installer les dépendances
pip install -r requirements.txt

# Vérifier l'installation
python3 -c "from rnnoise_python import RNNoise; print('✅ RNNoise OK')"
```

---

## ⚙️ Configuration

### Variables d'environnement

Ajouter dans `.env` du backend :

```bash
# Activer la réduction de bruit (true/false)
ENABLE_NOISE_REDUCTION=true

# URL du service RNNoise (par défaut: http://localhost:8081)
RNNOISE_SERVICE_URL=http://localhost:8081

# Port du service RNNoise
RNNOISE_PORT=8081
```

### Configuration serveur de production

Pour héberger sur un serveur distant :

```bash
# .env
RNNOISE_SERVICE_URL=http://votre-serveur:8081
```

---

## 🚀 Utilisation

### Démarrage du service

#### Option 1 : Script automatique

```bash
cd Backend/Services/audioProcessing
chmod +x start_rnnoise.sh
./start_rnnoise.sh
```

#### Option 2 : Manuel

```bash
cd Backend/Services/audioProcessing
source venv/bin/activate
python3 rnnoise_service.py
```

#### Option 3 : Avec PM2 (production)

```bash
pm2 start rnnoise_service.py --name rnnoise --interpreter python3
pm2 save
pm2 startup
```

### Vérifier que le service fonctionne

```bash
curl http://localhost:8081/health
```

Réponse attendue :
```json
{
  "status": "healthy",
  "rnnoise_loaded": true,
  "version": "1.0.0"
}
```

---

## 🧪 Tests

### Test manuel de l'API

```bash
# Test health check
curl http://localhost:8081/health

# Test avec audio (exemple)
curl -X POST http://localhost:8081/clean-audio \
  -H "Content-Type: application/json" \
  -d '{
    "audio_payload": "BASE64_ENCODED_AUDIO",
    "sample_rate": 8000
  }'
```

### Test intégration

Le backend Node.js vérifie automatiquement la disponibilité du service au démarrage de chaque appel. Consultez les logs :

```
✅ RNNoise activé - Réduction de bruit en temps réel
```

ou

```
⚠️ RNNoise non disponible - Audio non filtré
```

---

## ⚡ Performance

### Ressources

| Métrique | Valeur |
|----------|--------|
| RAM | ~50 Mo |
| CPU | < 5% (1 core) |
| Latence | < 10ms/chunk |
| Bande passante | Négligeable |

### Optimisations

- **Cache** : Les chunks audio identiques sont mis en cache
- **Fail-safe** : En cas d'erreur, l'audio original est utilisé
- **Timeout** : 100ms max par requête pour rester temps réel

---

## 🔧 Troubleshooting

### Le service ne démarre pas

**Problème** : `ModuleNotFoundError: No module named 'rnnoise_python'`

**Solution** :
```bash
source venv/bin/activate
pip install rnnoise-python
```

---

### Le backend ne peut pas se connecter au service

**Problème** : `⚠️ Service RNNoise non disponible`

**Solution** :
1. Vérifier que le service Python est démarré :
   ```bash
   curl http://localhost:8081/health
   ```
2. Vérifier le port dans `.env` :
   ```bash
   RNNOISE_PORT=8081
   ```
3. Vérifier les logs du service Python

---

### L'audio n'est pas nettoyé

**Problème** : Toujours du bruit de fond

**Solutions** :
1. Vérifier que `ENABLE_NOISE_REDUCTION=true` dans `.env`
2. Vérifier les logs : `🎙️ RNNoise activé` doit apparaître
3. Le bruit peut être trop fort (RNNoise filtre le bruit de fond léger/moyen)

---

### Latence trop élevée

**Problème** : Délai audible dans la conversation

**Solutions** :
1. Vérifier que le service RNNoise est local (pas sur un serveur distant)
2. Réduire le timeout dans `audioCleaningService.js` (actuellement 100ms)
3. Désactiver temporairement : `ENABLE_NOISE_REDUCTION=false`

---

## 🐳 Docker (optionnel)

Pour déployer le service RNNoise avec Docker :

```dockerfile
# Dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY rnnoise_service.py .

EXPOSE 8081

CMD ["python3", "rnnoise_service.py"]
```

```bash
# Build
docker build -t rnnoise-service .

# Run
docker run -d -p 8081:8081 --name rnnoise rnnoise-service
```

---

## 📊 Monitoring

Le service expose des statistiques via le backend Node.js :

```javascript
import { getAudioCleaningStats } from './Services/audioProcessing/audioCleaningService.js';

const stats = getAudioCleaningStats();
console.log(stats);
// {
//   totalProcessed: 1234,
//   totalErrors: 2,
//   totalFallbacks: 5,
//   avgProcessingTime: 8.5
// }
```

---

## 🆘 Support

Pour toute question ou problème :
1. Consulter les logs du service Python
2. Consulter les logs du backend Node.js
3. Vérifier la configuration `.env`
4. Tester avec `ENABLE_NOISE_REDUCTION=false` pour isoler le problème

---

## 📝 Licence

Ce service utilise RNNoise, développé par Mozilla et Jean-Marc Valin.
Licence : BSD-3-Clause

