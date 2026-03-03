# AUDIT : Problèmes Commandes et Logs

**Date** : 2025-01-XX  
**Contexte** : Le tableau `commandes` est toujours vide dans les commandes créées depuis GPT, et les logs ne permettent pas de diagnostiquer le problème.

---

## PROBLÈMES IDENTIFIÉS

### 🔴 PRIORITÉ CRITIQUE

#### 1. **Champ `commandes` non défini dans la fonction GPT**
**Fichier** : `backend/Services/gptServices/gptServices.js` (lignes 98-139)

**Problème** :
- La fonction `create_appointment` ne contient **aucun paramètre** pour les commandes/plats
- GPT ne peut donc **pas envoyer** les articles commandés car ils ne sont pas dans le schéma de la fonction
- Le paramètre `commandes` n'existe pas dans la définition de la fonction

**Impact** :
- GPT ne peut pas extraire et envoyer les plats commandés
- Le tableau `commandes` sera toujours vide, même si le client mentionne des plats

**Solution** :
- Ajouter le paramètre `commandes` (ou `orders`/`items`) dans le schéma de la fonction GPT
- Définir la structure attendue (array d'objets avec produitId, nom, quantite, etc.)

---

#### 2. **Champ `commandes` non traité dans `createOrderFromAI`**
**Fichier** : `backend/Controller/orderController.js` (lignes 405-473)

**Problème** :
- La fonction `createOrderFromAI` ne récupère **jamais** le champ `commandes` depuis `orderData`
- Ligne 445-456 : création de la commande sans inclure `commandes: orderData.commandes`
- Même si GPT envoie `commandes`, elles seront ignorées

**Impact** :
- Les commandes envoyées par GPT (si ajoutées au schéma) ne seront pas sauvegardées
- Le tableau restera vide en base de données

**Solution** :
- Ajouter `commandes: orderData.commandes || []` dans la création de la commande (ligne 445)

---

#### 3. **Schéma de validation ne valide pas `commandes`**
**Fichier** : `backend/Routes/Appointments/appointments.js` (lignes 232-250)

**Problème** :
- Le schéma de validation pour `/api/orders/ai/create` ne contient **pas** le champ `commandes`
- Même si GPT envoie `commandes`, Fastify les rejettera ou les ignorera silencieusement

**Impact** :
- Les données `commandes` envoyées par GPT seront rejetées par la validation
- Aucune erreur ne sera levée, les données seront simplement ignorées

**Solution** :
- Ajouter la validation du champ `commandes` dans le schéma (similaire aux lignes 44-57 pour `/orders`)

---

### 🟠 PRIORITÉ HAUTE

#### 4. **Logs insuffisants dans `FunctionCallHandler`**
**Fichier** : `backend/Websocket/handlers/openai/FunctionCallHandler.js` (lignes 28-33)

**Problème** :
- Les arguments sont loggés avec `callLogger.info` mais seulement le nom et les arguments bruts
- Le JSON parsé (`args`) n'est **jamais loggé** avant traitement
- Impossible de voir le contenu exact reçu de GPT

**Impact** :
- Impossible de diagnostiquer si GPT envoie `commandes` ou non
- Impossible de voir la structure exacte des données reçues

**Solution** :
- Logger le JSON parsé (`args`) avec `JSON.stringify` pour voir le contenu complet
- Logger avant et après le traitement dans `FunctionCallService.createAppointment`

---

#### 5. **Aucun log dans `FunctionCallService.createAppointment`**
**Fichier** : `backend/Websocket/services/FunctionCallService.js` (lignes 53-121)

**Problème** :
- Aucun log du JSON envoyé à l'API `/api/orders/ai/create`
- Aucun log de la réponse reçue
- Impossible de tracer le flux de données

**Impact** :
- Impossible de savoir ce qui est envoyé à l'API
- Impossible de voir si l'API rejette les données ou les accepte

**Solution** :
- Logger le `body` envoyé (avec `JSON.stringify(args)`)
- Logger la réponse reçue (`data`)
- Logger les erreurs avec plus de détails

---

#### 6. **Aucun log dans `createOrderFromAI`**
**Fichier** : `backend/Controller/orderController.js` (lignes 405-473)

**Problème** :
- Aucun log du `orderData` reçu
- Aucun log de la commande créée
- Impossible de voir si `commandes` est présent dans les données reçues

**Impact** :
- Impossible de diagnostiquer si le problème vient de GPT ou du traitement backend
- Pas de traçabilité

**Solution** :
- Logger `orderData` complet au début de la fonction
- Logger spécifiquement `orderData.commandes` pour voir si présent
- Logger la commande créée avec `commandes` incluses

---

### 🟡 PRIORITÉ MOYENNE

#### 7. **Logs console non visibles**
**Fichier** : `backend/Services/logging/logger.js`

**Problème** :
- Les logs utilisent `winston` mais peuvent ne pas s'afficher correctement dans la console
- Le format console peut masquer certaines informations importantes

**Impact** :
- Les logs ne sont pas visibles en temps réel
- Difficile de déboguer pendant le développement

**Solution** :
- Vérifier la configuration du transport Console
- S'assurer que le niveau de log est correctement configuré
- Ajouter des `console.log` temporaires pour le debug si nécessaire

---

#### 8. **Pas de validation du format `commandes`**
**Fichier** : `backend/models/order.js` (lignes 65-95)

**Problème** :
- Le schéma Mongoose définit `commandes` mais sans validation stricte
- Les champs `produitId`, `nom`, `quantite` sont optionnels
- Pas de validation que `commandes` est un array valide

**Impact** :
- Des données invalides peuvent être acceptées
- Pas d'erreur claire si le format est incorrect

**Solution** :
- Ajouter des validations Mongoose plus strictes
- Valider que `commandes` est un array
- Valider que chaque élément contient au minimum `nom` et `quantite`

---

## PLAN D'ACTION RECOMMANDÉ

### Phase 1 : Correction Critique (Immédiat)

1. **Ajouter `commandes` dans la fonction GPT**
   - Modifier `gptServices.js` pour inclure le paramètre `commandes` dans le schéma
   - Définir la structure attendue (array d'objets)

2. **Traiter `commandes` dans `createOrderFromAI`**
   - Ajouter `commandes: orderData.commandes || []` dans la création de la commande

3. **Valider `commandes` dans le schéma Fastify**
   - Ajouter la validation dans `appointments.js` pour `/api/orders/ai/create`

### Phase 2 : Amélioration Logs (Urgent)

4. **Logger les arguments complets dans `FunctionCallHandler`**
   - Logger `args` parsé avec `JSON.stringify`

5. **Logger dans `FunctionCallService.createAppointment`**
   - Logger le body envoyé
   - Logger la réponse reçue

6. **Logger dans `createOrderFromAI`**
   - Logger `orderData` complet
   - Logger spécifiquement `orderData.commandes`

### Phase 3 : Amélioration Validation (Important)

7. **Renforcer la validation Mongoose**
   - Ajouter des validations plus strictes pour `commandes`

8. **Vérifier la configuration des logs**
   - S'assurer que les logs s'affichent correctement dans la console

---

## FICHIERS À MODIFIER

1. `backend/Services/gptServices/gptServices.js` - Ajouter paramètre `commandes`
2. `backend/Controller/orderController.js` - Traiter `commandes` dans `createOrderFromAI`
3. `backend/Routes/Appointments/appointments.js` - Valider `commandes` dans le schéma
4. `backend/Websocket/handlers/openai/FunctionCallHandler.js` - Améliorer les logs
5. `backend/Websocket/services/FunctionCallService.js` - Ajouter des logs
6. `backend/models/order.js` - Renforcer la validation (optionnel)

---

## TESTS À EFFECTUER

1. **Test avec GPT** :
   - Vérifier que GPT envoie bien `commandes` dans les arguments
   - Vérifier le format exact des données envoyées

2. **Test API** :
   - Envoyer une requête POST à `/api/orders/ai/create` avec `commandes`
   - Vérifier que les `commandes` sont bien sauvegardées

3. **Test End-to-End** :
   - Faire un appel complet
   - Vérifier que les plats mentionnés sont bien dans `commandes` en BDD

---

## NOTES TECHNIQUES

- Le champ `commandes` existe déjà dans le modèle `Order` (lignes 65-95 de `order.js`)
- Le champ `commandes` est déjà traité dans `createOrder` (ligne 31) mais pas dans `createOrderFromAI`
- La route `/orders` (manuelle) accepte déjà `commandes` dans le schéma (lignes 44-57)
- Le frontend envoie déjà `commandes` correctement formatées (voir `CreateAppointmentForm.jsx`)

**Conclusion** : Le problème principal est que GPT ne peut pas envoyer `commandes` car le paramètre n'existe pas dans la définition de la fonction, et même s'il existait, il ne serait pas traité ni validé.

