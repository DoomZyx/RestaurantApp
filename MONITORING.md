# 📊 Guide de Monitoring - HandleHome

## 🚀 Système de Logs Avancé

Votre application dispose maintenant d'un système de monitoring professionnel avec Winston.

### 📁 Structure des Logs

```
Backend/
├── logs/
│   ├── combined.log    # Tous les logs
│   └── error.log       # Erreurs uniquement
└── scripts/
    └── monitor.js      # Script de monitoring
```

### 🎯 Types de Logs

#### 📞 Logs d'Appels
- **Début d'appel** : `📞 Appel démarré`
- **Transcription** : `🎤 Transcription reçue`
- **Extraction GPT-4** : `🔍 Extraction GPT-4 démarrée`
- **Sauvegarde API** : `🌐 Appel API démarré`
- **Succès** : `✅ Appel terminé avec succès`

#### ⏱️ Métriques de Performance
- Durée d'extraction GPT-4
- Durée d'appel API
- Durée totale de traitement

#### ❌ Gestion d'Erreurs
- Erreurs de parsing JSON
- Erreurs d'API
- Erreurs WebSocket
- Erreurs de validation

### 🛠️ Utilisation

#### 1. Lancer le serveur
```bash
cd Backend
pnpm run dev
```

#### 2. Lancer le monitoring (nouveau terminal)
```bash
cd Backend
pnpm run monitor
```

#### 3. Tester un appel
Appelez votre numéro Twilio et observez les logs en temps réel !

### 📊 Exemple de Logs

```
2024-01-15 10:30:15 📞 [INFO] 📞 Appel démarré
  📞 StreamSid: MS1234567890abcdef
  🎯 Événement: call_started

2024-01-15 10:30:20 🎤 [INFO] 🎤 Transcription reçue
  📞 StreamSid: MS1234567890abcdef
  🎯 Événement: transcription_received

2024-01-15 10:30:25 🔍 [INFO] 🔍 Extraction GPT-4 démarrée
  📞 StreamSid: MS1234567890abcdef
  🎯 Événement: extraction_started

2024-01-15 10:30:30 ✅ [INFO] ✅ Extraction GPT-4 terminée
  📞 StreamSid: MS1234567890abcdef
  🎯 Événement: extraction_completed

2024-01-15 10:30:35 🌐 [INFO] 🌐 Appel API démarré
  📞 StreamSid: MS1234567890abcdef
  🎯 Événement: api_call_started

2024-01-15 10:30:40 ✅ [INFO] ✅ Appel API terminé
  📞 StreamSid: MS1234567890abcdef
  🎯 Événement: api_call_completed

2024-01-15 10:30:45 ⏱️ [INFO] ⏱️ Performance
  📞 StreamSid: MS1234567890abcdef
  ⏱️ Durée: 5000ms

2024-01-15 10:30:50 🎉 [INFO] 🎉 Appel terminé avec succès
  📞 StreamSid: MS1234567890abcdef
  ⏱️ Durée: 35000ms
```

### 🔍 Surveillance des Erreurs

Les erreurs sont automatiquement :
- ✅ Affichées en rouge dans la console
- ✅ Sauvegardées dans `logs/error.log`
- ✅ Incluent le contexte et la stack trace

### 📈 Métriques Disponibles

- **Temps de réponse** : Extraction GPT-4 + API
- **Taux de succès** : Appels traités vs erreurs
- **Performance** : Durée par étape
- **Erreurs** : Types et fréquences

### 🎯 Avantages

1. **Monitoring en temps réel** : Voir les appels en direct
2. **Debugging facile** : Logs structurés avec contexte
3. **Performance tracking** : Métriques détaillées
4. **Alertes automatiques** : Erreurs visibles immédiatement
5. **Historique complet** : Logs persistants

### 🚀 Pour votre prototype

Ce système vous permet de :
- ✅ Voir si les appels fonctionnent
- ✅ Identifier les erreurs rapidement
- ✅ Mesurer les performances
- ✅ Déboguer facilement
- ✅ Impressionner lors de la présentation !

**Votre prototype est maintenant équipé d'un monitoring professionnel !** 🎉 