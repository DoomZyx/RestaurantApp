# 🛒 Configuration des Commandes Fournisseurs Automatiques

## 📋 Vue d'ensemble

Système complet pour passer des commandes automatiques aux fournisseurs via **Twilio + GPT-4**.

### Fonctionnalités

- ✅ Appel automatique au fournisseur via Twilio
- ✅ Conversation intelligente avec GPT (OpenAI Realtime API)
- ✅ Extraction automatique des informations de livraison
- ✅ Sauvegarde en base de données MongoDB
- ✅ Historique des commandes par fournisseur
- ✅ Interface frontend temps réel avec polling

## ⚙️ Configuration requise

### 1. Variables d'environnement

Ajouter dans le fichier `.env` du **Backend** (si pas déjà fait) :

```env
# Existant (vous les avez déjà normalement)
MONGO_URI=mongodb://localhost:27017/handlehome
OPENAI_API_KEY=sk-...
X_API_KEY=votre_api_key
PORT=8080

# Configuration Twilio (probablement déjà présent pour les appels entrants)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+33xxxxxxxxx

# OPTIONNEL - Uniquement si votre host public est différent
PUBLIC_HOST=votre-domaine.com
```

**Note** : Si `PUBLIC_HOST` n'est pas défini, le système utilisera automatiquement `request.headers.host` comme pour les appels entrants.

### 2. Variables d'environnement Frontend

Ajouter dans le fichier `.env` du **Frontend** (créer si nécessaire) :

```env
VITE_API_URL=http://localhost:8080
VITE_API_KEY=votre_api_key
```

### 3. Configuration Twilio

1. Créer un compte sur [Twilio.com](https://www.twilio.com)
2. Acheter un numéro de téléphone avec capacité **voix**
3. Récupérer :
   - `TWILIO_ACCOUNT_SID` (dans la console Twilio)
   - `TWILIO_AUTH_TOKEN` (dans la console Twilio)
   - `TWILIO_PHONE_NUMBER` (le numéro acheté au format +33...)

### 4. Configuration des appels sortants

Le système réutilise **exactement la même configuration** que vos appels entrants existants :

- ✅ Même compte Twilio
- ✅ Même numéro de téléphone  
- ✅ Même système de webhooks (le host est détecté automatiquement)

**En développement** : Si vous utilisez déjà [ngrok](https://ngrok.com/) pour les appels entrants, ça fonctionnera automatiquement.

**En production** : Si vos appels entrants fonctionnent, les appels sortants fonctionneront aussi !

## 📁 Fichiers créés

### Backend

```
Backend/
├── Config/
│   ├── env.js                        # Config Twilio mise à jour ✅
│   └── restaurant.js                 # Config restaurant (nom, horaires, etc.) ✨ NOUVEAU
├── models/
│   └── supplierOrder.js              # Modèle MongoDB pour les commandes
├── Services/
│   └── supplierCallService.js        # Logique d'appel Twilio + GPT
├── Controller/
│   └── supplierOrderController.js    # Contrôleurs API
├── Routes/
│   └── SupplierOrders/
│       └── supplierOrders.js         # Routes API
├── Connection/
│   └── supplierCallConnection.js     # Gestion WebSocket appels
└── app.js                            # Routes enregistrées ✅
```

**Nouveau** : Le fichier `Config/restaurant.js` centralise toutes les infos du restaurant (nom, téléphone, horaires, etc.). Vous pouvez le modifier selon vos besoins.

### Frontend

```
Frontend/
├── src/
│   ├── API/
│   │   └── SupplierOrders/
│   │       └── api.js                # API client
│   ├── Hooks/
│   │   └── Contacts/
│   │       └── useOrderForm.js       # Hook mis à jour ✅
│   └── Components/
│       └── Contacts/
│           └── ContactDetails.jsx    # UI mise à jour ✅
```

## 🚀 Comment ça marche

### 1. L'utilisateur soumet le formulaire

```javascript
// Frontend envoie la commande
const orderData = {
  fournisseur: {
    id: "...",
    nom: "Fournisseur ABC",
    telephone: "+33612345678",
    email: "contact@fournisseur.com"
  },
  ingredients: [
    { nom: "Tomates", quantite: 10, unite: "kg" },
    { nom: "Oignons", quantite: 5, unite: "kg" }
  ]
};
```

### 2. Le backend initie l'appel Twilio

```javascript
// Twilio appelle le fournisseur
POST https://api.twilio.com/2010-04-01/Accounts/{SID}/Calls.json
```

### 3. GPT gère la conversation

Le prompt GPT demande au fournisseur :
- Si la commande peut être préparée
- La date et l'heure de livraison
- Le prix total (optionnel)

### 4. Extraction des informations

GPT-4 analyse la transcription et extrait :
```json
{
  "accepte": true,
  "date_livraison": "2025-10-15",
  "heure_livraison": "14:00",
  "prix_total": 45.50,
  "commentaire": "Livraison par camion réfrigéré"
}
```

### 5. Mise à jour en temps réel

Le frontend fait du **polling** toutes les 2 secondes pour afficher :
- ⏳ "Appel en cours..."
- 💬 "Conversation en cours..."
- ✅ "Commande confirmée !"
- ❌ "Commande refusée"

## 📊 Structure de données

### Commande dans MongoDB

```javascript
{
  _id: ObjectId("..."),
  fournisseur: {
    id: ObjectId("..."),
    nom: "Fournisseur ABC",
    telephone: "+33612345678"
  },
  ingredients: [
    { nom: "Tomates", quantite: 10, unite: "kg" }
  ],
  statut: "confirmee", // en_attente | appel_en_cours | confirmee | refusee | erreur
  livraison: {
    date: "2025-10-15T00:00:00.000Z",
    heure: "14:00",
    commentaire: "..."
  },
  appel: {
    callSid: "CA...",
    duree: 45,
    statut: "completed",
    transcription: "Bonjour, je vous appelle...",
    dateAppel: "2025-10-07T10:30:00.000Z"
  },
  reponse_fournisseur: {
    accepte: true,
    prix_total: 45.50,
    delai_livraison: "Demain 14h"
  },
  createdAt: "2025-10-07T10:30:00.000Z",
  updatedAt: "2025-10-07T10:31:30.000Z"
}
```

## 🔐 Sécurité

- Les routes API sont protégées par `x-api-key`
- Les webhooks Twilio sont publics (mais signés par Twilio)
- Les transcriptions sont stockées de manière sécurisée

## 🧪 Tests

### Test manuel

1. Démarrer le backend :
   ```bash
   cd Backend
   npm run dev
   ```

2. Démarrer le frontend :
   ```bash
   cd Frontend
   npm run dev
   ```

3. Aller sur la page Fournisseur
4. Sélectionner un fournisseur
5. Remplir le formulaire de commande
6. Soumettre → L'appel est passé automatiquement !

### Test avec un vrai numéro

⚠️ **ATTENTION** : Les appels Twilio sont facturés !

Pour tester sans frais, utilisez le [TwiML Bin](https://www.twilio.com/console/twiml-bins) de Twilio.

## 📈 Monitoring

Tous les appels sont loggés dans la console :
```
📞 Nouvel appel fournisseur - Commande: 67...
🎙️ Stream démarré: MZ...
👤 Fournisseur: Oui, pas de problème...
🤖 Assistant: Parfait ! Vous pourriez me livrer ça quand ?
⏹️ Stream arrêté
✅ Transcription traitée avec succès
```

## 🐛 Dépannage

### Erreur "Configuration Twilio manquante"
→ Vérifier que toutes les variables `TWILIO_*` sont dans `.env`

### Erreur "Clé API manquante"
→ Vérifier que `VITE_API_KEY` est défini dans le frontend

### L'appel ne se lance pas
→ Vérifier que `SERVER_URL` est accessible publiquement (ngrok)

### Pas de transcription
→ Vérifier que l'API OpenAI fonctionne avec `OPENAI_API_KEY`

## 💰 Coûts estimés

- **Twilio** : ~0.02€ par minute d'appel
- **OpenAI Realtime API** : ~0.06$ pour l'audio + ~0.15$ pour l'audio généré par minute
- **GPT-4 pour extraction** : ~0.01$ par appel

**Total estimé** : ~0.10€ par commande

## 🎉 C'est prêt !

Votre système de commandes automatiques est maintenant opérationnel ! 🚀

Le GPT va appeler vos fournisseurs, négocier les livraisons et mettre à jour automatiquement votre historique.

---

**Besoin d'aide ?** Consultez :
- [Documentation Twilio](https://www.twilio.com/docs/voice)
- [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime)

