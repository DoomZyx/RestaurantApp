# Test des Appels Fournisseurs

## Configuration Préalable

### 1. Ngrok (Développement local)
```bash
# Installer ngrok si pas déjà fait
# Démarrer ngrok sur le port de ton backend (3000 par défaut)
ngrok http 3000
```

### 2. Configurer PUBLIC_HOST
Dans ton `.env` Backend :
```env
PUBLIC_HOST=abc123.ngrok.io  # Remplace par l'URL donnée par ngrok
```

### 3. Redémarrer le serveur
```bash
cd Backend
pnpm start
```

## Test d'un Appel

### 1. Via l'API
```bash
curl -X POST https://abc123.ngrok.io/api/supplier-orders \
  -H "Content-Type: application/json" \
  -H "x-api-key: TON_API_KEY" \
  -d '{
    "fournisseur": {
      "id": "fournisseur_1",
      "nom": "Fruits & Légumes Pro",
      "telephone": "+33612345678",
      "email": "contact@fruitslegumes.fr"
    },
    "ingredients": [
      {
        "nom": "Tomates",
        "quantite": 10,
        "unite": "kg"
      },
      {
        "nom": "Oignons",
        "quantite": 5,
        "unite": "kg"
      }
    ]
  }'
```

### 2. Vérifier les logs

Dans la console du Backend, tu devrais voir :
```
📞 Nouvel appel fournisseur - Commande: 6789...
🎙️  Stream démarré: CA...
✅ Session OpenAI configurée
```

## Déboguer si ça raccroche

### Vérifier que Twilio reçoit le TwiML
1. Va dans le [Console Twilio](https://console.twilio.com)
2. Clique sur "Monitor" > "Logs" > "Calls"
3. Trouve ton appel dans la liste
4. Vérifie le statut et les erreurs

### Erreurs communes

**❌ "Unable to fetch TwiML"**
- Le PUBLIC_HOST n'est pas accessible
- Vérifie que ngrok tourne et que l'URL est correcte

**❌ "WebSocket connection failed"**
- Le WebSocket `/supplier-stream/:orderId` n'est pas accessible
- Vérifie que fastify-websocket est bien installé
- Vérifie les logs du serveur

**❌ "OpenAI connection failed"**
- La clé OPENAI_API_KEY est invalide ou manquante
- Vérifie que tu as accès à l'API Realtime d'OpenAI

## Logs utiles

Les logs sont dans `Backend/logs/`:
- `combined.log` : tous les logs
- `error.log` : uniquement les erreurs

```bash
# Suivre les logs en temps réel
tail -f Backend/logs/combined.log
```

## Structure d'un appel réussi

```
1. POST /api/supplier-orders
   ↓
2. Twilio appelle le numéro du fournisseur
   ↓
3. Twilio récupère le TwiML depuis /supplier-call/:orderId
   ↓
4. Twilio se connecte au WebSocket /supplier-stream/:orderId
   ↓
5. Le WebSocket se connecte à OpenAI Realtime API
   ↓
6. L'IA discute avec le fournisseur
   ↓
7. Fin de l'appel : transcription sauvegardée et analysée
```

## Troubleshooting avancé

### Tester le WebSocket manuellement
```javascript
// Dans la console du navigateur
const ws = new WebSocket('wss://abc123.ngrok.io/supplier-stream/ORDER_ID');
ws.onopen = () => console.log('Connecté !');
ws.onerror = (e) => console.error('Erreur:', e);
```

### Vérifier les permissions Twilio
- Assure-toi que ton compte Twilio n'est pas en mode "trial" avec restrictions
- Vérifie que le numéro du fournisseur est au bon format international (+33...)

