# WebSocket - Architecture Refactorisée 🎯

Ce dossier contient la logique WebSocket refactorisée pour la gestion des appels Twilio et OpenAI.

## 📁 Structure

```
Websocket/
├── connection.js              # Point d'entrée principal - Orchestre les connexions
├── handlers/                  # Gestionnaires de messages
│   ├── OpenAIHandler.js      # Traite les messages OpenAI (audio, transcription, etc.)
│   ├── TwilioHandler.js      # Traite les messages Twilio (start, stop, media)
│   └── TranscriptionHandler.js # Traite et valide les transcriptions
└── services/                  # Services métier
    ├── AudioService.js        # Gestion audio ElevenLabs (cache, streaming)
    ├── FunctionCallService.js # Function calls API (disponibilités, rendez-vous)
    └── ValidationService.js   # Validation des transcriptions
```

## 🔄 Flux de données

1. **Connexion initiale** → `connection.js`
   - Établit les connexions Twilio ↔ OpenAI
   - Initialise les gestionnaires

2. **Messages Twilio** → `TwilioHandler.js`
   - `start` : Démarre l'appel
   - `media` : Audio de l'utilisateur
   - `stop` : Fin de l'appel

3. **Messages OpenAI** → `OpenAIHandler.js`
   - Session, réponses audio, transcription
   - Function calls (rendez-vous)
   - Interruptions utilisateur

4. **Traitement final** → `TranscriptionHandler.js`
   - Validation de la transcription
   - Envoi à l'API de traitement
   - Notifications

## 📦 Services

### AudioService
Gère la génération audio avec ElevenLabs :
- **Cache-first** : Vérifie d'abord le cache
- **Streaming temps réel** : Envoie l'audio au fur et à mesure
- **Optimisation coûts** : Économise les appels API

### FunctionCallService
Gère les appels API métier :
- `checkAvailability(date)` : Vérifie les créneaux disponibles
- `createAppointment(args)` : Crée un rendez-vous

### ValidationService
Valide les transcriptions avant traitement :
- Longueur minimale
- Présence d'interactions client
- Filtrage du bruit

## 🎨 Avantages de la refactorisation

### ✅ Avant (connection.js - 914 lignes)
- Tout mélangé dans un seul fichier
- Difficile à maintenir et tester
- Responsabilités non séparées

### ✅ Après (structure modulaire)
- **Séparation des responsabilités** : Chaque classe a un rôle clair
- **Testabilité** : Facile de tester chaque module indépendamment
- **Lisibilité** : Code organisé et bien commenté
- **Maintenabilité** : Modifications localisées dans les bons fichiers
- **Réutilisabilité** : Services utilisables ailleurs

## 🚀 Utilisation

```javascript
import { handleWebSocketConnection } from "./Websocket/connection.js";

// Dans une route Fastify
fastify.get("/media-stream", { websocket: true }, (connection, request) => {
  handleWebSocketConnection(connection, request);
});
```

## 🔧 Configuration

Variables d'environnement requises :
- `OPENAI_API_KEY` : Clé API OpenAI
- `ELEVENLABS_API_KEY` : Clé API ElevenLabs (optionnel)
- `X_API_KEY` : Clé pour les appels API internes
- `PORT` : Port du serveur (défaut: 8080)

## 📝 Notes importantes

- **ElevenLabs désactivé par défaut** : Pour économiser les coûts
- **OpenAI TTS utilisé** : Voix "ballad" par défaut
- **Heartbeat actif** : Ping toutes les 30 secondes
- **Validation stricte** : Les transcriptions vides sont filtrées

## 🔗 Dépendances externes

- `ws` : WebSocket client/server
- `node-fetch` : Appels HTTP
- `dotenv` : Variables d'environnement
- Services : `gptServices`, `callLogger`, `streamRegistry`

