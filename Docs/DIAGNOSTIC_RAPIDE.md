# 🔍 Diagnostic Rapide - Appel qui Raccroche

## Problème résolu ✅

Le code était déjà correct ! La route `/supplier-call/:orderId` existe et est bien configurée.

## Causes Possibles du Raccrochage

### 1. 🌐 PUBLIC_HOST non configuré ou inaccessible

**Symptôme :** L'appel raccroche dans les 2-3 secondes

**Solution :**
```bash
# Terminal 1 : Démarrer ngrok
ngrok http 3000

# Copier l'URL donnée (ex: abc123.ngrok.io)
# Mettre à jour Backend/.env :
PUBLIC_HOST=abc123.ngrok.io

# Terminal 2 : Redémarrer le backend
cd Backend
pnpm start
```

### 2. 🔑 Credentials Twilio incorrects

**Symptôme :** Erreur immédiate ou pas d'appel du tout

**Vérifications :**
```bash
# Dans Backend/.env
TWILIO_ACCOUNT_SID=AC...  # Commence par AC
TWILIO_AUTH_TOKEN=...      # 32 caractères
TWILIO_PHONE_NUMBER=+33... # Format international
```

**Test rapide :**
```bash
curl -X GET "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID.json" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN"
```

### 3. 🤖 OpenAI API non configurée

**Symptôme :** Le stream démarre puis se coupe rapidement

**Solution :**
```bash
# Vérifier dans Backend/.env
OPENAI_API_KEY=sk-proj-...

# Tester la connexion
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### 4. 🔌 WebSocket non accessible

**Symptôme :** "Stream démarré" dans les logs mais pas de son

**Vérifications :**
- Ngrok supporte les WebSockets (gratuit : oui)
- Pas de proxy bloquant les WebSockets
- HTTPS activé (obligatoire pour Twilio)

### 5. 📱 Numéro de téléphone invalide

**Symptôme :** Twilio renvoie "invalid phone number"

**Format correct :**
```
+33612345678  ✅ France
+41791234567  ✅ Suisse
+32471234567  ✅ Belgique

0612345678    ❌ Pas de format international
33612345678   ❌ Manque le +
```

## Tests à Effectuer

### Test 1 : Route TwiML accessible
```bash
# Remplace ORDER_ID par un vrai ID de commande
curl https://ton-domaine.ngrok.io/supplier-call/ORDER_ID

# Réponse attendue :
# <?xml version="1.0" encoding="UTF-8"?>
# <Response>
#   <Connect>
#     <Stream url="wss://ton-domaine.ngrok.io/supplier-stream/ORDER_ID" />
#   </Connect>
# </Response>
```

### Test 2 : Script de test automatique
```bash
cd Backend
node scripts/testSupplierCall.js +33612345678
```

### Test 3 : Logs en temps réel
```bash
# Terminal 1 : Backend
cd Backend
pnpm start

# Terminal 2 : Logs
tail -f Backend/logs/combined.log

# Terminal 3 : Test
node scripts/testSupplierCall.js +33612345678
```

## Messages de Log à Surveiller

### ✅ Appel réussi
```
📞 Nouvel appel fournisseur - Commande: 67890abc...
🎙️  Stream démarré: CA1234567890...
✅ Session OpenAI configurée
👤 Fournisseur: Bonjour...
🤖 Assistant: Bonjour, je vous appelle du restaurant...
```

### ❌ Erreurs communes

**"Unable to fetch TwiML"**
```
❌ Twilio ne peut pas accéder à /supplier-call/:orderId
→ Vérifier PUBLIC_HOST et ngrok
```

**"WebSocket connection failed"**
```
❌ Erreur WebSocket Twilio: Connection refused
→ Vérifier que le serveur est bien démarré
→ Vérifier les certificats SSL
```

**"OpenAI connection failed"**
```
❌ Erreur connexion OpenAI: Unauthorized
→ Vérifier OPENAI_API_KEY
→ Vérifier que tu as accès à l'API Realtime
```

## Checklist Complète

Avant de lancer un appel, vérifie :

- [ ] Backend démarré (`pnpm start`)
- [ ] Ngrok actif (`ngrok http 3000`)
- [ ] PUBLIC_HOST configuré dans `.env`
- [ ] Credentials Twilio valides
- [ ] OpenAI API key configurée
- [ ] Numéro au format international (+33...)
- [ ] Logs visibles (`tail -f logs/combined.log`)

## Aide Supplémentaire

### Console Twilio
https://console.twilio.com/monitor/logs/calls

Tu y verras :
- Tous les appels effectués
- Les erreurs éventuelles
- Les requêtes HTTP vers tes webhooks
- Les durées et statuts

### Documentation
- [Twilio TwiML Reference](https://www.twilio.com/docs/voice/twiml)
- [Twilio Streams](https://www.twilio.com/docs/voice/twiml/stream)
- [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime)

## Contact Twilio Support

Si le problème persiste :
1. Va sur https://www.twilio.com/console
2. Clique sur "Help" > "Support"
3. Fournis le CallSid de l'appel problématique

