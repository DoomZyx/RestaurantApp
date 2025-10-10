# 📞 HandleHome Backend - Système de Gestion d'Appels Automatisé

## 🎯 Vue d'ensemble

Système backend pour la gestion automatisée d'appels téléphoniques avec :
- ✅ Assistant vocal IA (OpenAI Realtime API)
- ✅ Transcription automatique (Whisper)
- ✅ Extraction de données client (GPT-4)
- ✅ Sauvegarde automatique (MongoDB)
- ✅ Monitoring avancé (Winston)

## 🚀 Démarrage rapide

### Prérequis
- Node.js 18+
- MongoDB
- Compte Twilio
- Clé API OpenAI

### Installation
```bash
cd Backend
pnpm install
```

### Configuration
Créer un fichier `.env` :
```env
# MongoDB
MONGO_URI=mongodb://localhost:27017/handlehome

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# API Security
X_API_KEY=your_api_key

# Server
PORT=8080
NODE_ENV=development
```

### Lancement
```bash
# Développement (avec hot reload)
pnpm run dev

# Production
pnpm run start

# Monitoring des logs
pnpm run monitor

# Tests multiples
pnpm run test-multiple
```

## 📁 Structure du projet

```
Backend/
├── app.js                    # Configuration Fastify
├── server.js                 # Point d'entrée
├── Connection/
│   └── connection.js         # Gestion WebSocket (refactorisé)
├── Controller/
│   └── callData.js          # Logique métier
├── Routes/
│   ├── Calls/call.js        # Routes Twilio
│   ├── CallData/            # Routes données
│   └── Ws/ws.js            # WebSocket
├── Services/
│   ├── gptServices/         # OpenAI services
│   ├── twilioServices/      # Twilio TwiML
│   └── logging/            # Système de logs
├── models/                  # Modèles MongoDB
└── scripts/                # Outils de monitoring/test
```

## 🔧 Architecture refactorisée

### Classes principales

#### `OpenAIMessageHandler`
Gère les messages OpenAI Realtime :
- Streaming audio
- Transcription Whisper
- Réponses de l'assistant

#### `TwilioMessageHandler`
Gère les événements Twilio :
- Début/fin d'appel
- Events WebSocket

#### `TranscriptionProcessor`
Traite la transcription complète :
- Extraction GPT-4
- Sauvegarde automatique

## 📊 Monitoring

### Logs structurés
- **Niveaux** : error, warn, info, debug
- **Fichiers** : `logs/combined.log`, `logs/error.log`
- **Console** : Colorisé avec emojis

### Métriques
- Durée des appels
- Performance GPT-4
- Temps de sauvegarde API

## 🧪 Tests

### Tests multiples
```bash
pnpm run test-multiple
```
Simule 5 appels différents :
- Site web restaurant
- Logo startup
- Formation Excel
- Gestion réseaux sociaux
- Automatisation

## 🛡️ Sécurité

- Authentification par clé API (`x-api-key`)
- Validation des paramètres
- Gestion d'erreurs robuste

## 📈 Optimisations réalisées

### ✅ Code nettoyé
- Suppression des fichiers de debug
- Refactorisation en classes
- Separation of concerns

### ✅ Dépendances optimisées
- Suppression de `twilio` package (inutile)
- Suppression de `prism-media`
- Moins de scripts de test

### ✅ Performance
- Classes réutilisables
- Gestion d'erreurs améliorée
- Logs optimisés

## 🔄 Flux d'appel

1. **Réception** → Twilio reçoit l'appel
2. **WebSocket** → Connexion OpenAI Realtime
3. **Conversation** → Assistant vocal IA
4. **Transcription** → Whisper capture la voix
5. **Extraction** → GPT-4 analyse les données
6. **Sauvegarde** → MongoDB stockage
7. **Logs** → Monitoring complet

## 📞 API Endpoints

### POST `/incoming-call`
TwiML pour Twilio

### POST `/api/callsdata`
Sauvegarde données client

### POST `/api/process-call`
Traitement transcription

### GET `/api/calls`
Liste des appels

### WebSocket `/media-stream`
Stream audio temps réel

## 🏆 Résultat

**Système 100% automatisé :**
- Aucune saisie manuelle
- Extraction précise des données
- Monitoring complet
- Code maintenable et évolutif

---

**Prêt pour la production ! 🚀** 