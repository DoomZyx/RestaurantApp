# 🔍 Système de Filtrage des Appels

## 📖 Vue d'ensemble

Ce système filtre automatiquement les appels inutiles (raccrochages rapides, pas d'infos, etc.) pour éviter :
- ❌ Extraction GPT inutile (coût)
- ❌ Notifications vides
- ❌ Encombrement de la base de données
- ❌ Fausses alertes

---

## 🎯 Stratégie de Filtrage en 2 Étapes

```
┌────────────────────────────┐
│  Client raccroche          │
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────────────────────┐
│  ÉTAPE 1: Validation de la Transcription   │
│  (connection.js)                           │
└────────────┬───────────────────────────────┘
             │
       ┌─────┴─────┐
       │           │
    INVALIDE    VALIDE
       │           │
       ▼           ▼
   ⏭️ IGNORÉ    Extraction GPT
                   │
                   ▼
┌────────────────────────────────────────────┐
│  ÉTAPE 2: Validation des Données Extraites│
│  (processCall.js)                          │
└────────────┬───────────────────────────────┘
             │
       ┌─────┴─────┐
       │           │
   INUTILE      UTILE
       │           │
       ▼           ▼
   ⏭️ IGNORÉ    Sauvegarde + Notification
```

---

## ✅ ÉTAPE 1 : Validation de la Transcription

**Fichier :** `Backend/Connection/connection.js`  
**Classe :** `TranscriptionProcessor.validateTranscription()`

### Critères de Validation

| # | Critère | Seuil | Raison |
|---|---------|-------|--------|
| 1 | **Longueur minimale** | ≥ 50 caractères | Appel raccroché trop vite |
| 2 | **Nombre de mots** | ≥ 10 mots | Conversation trop courte |
| 3 | **Interaction client** | Présence de "Client:" | Client n'a rien dit |
| 4 | **Mots du client** | ≥ 5 mots | Client a parlé trop peu |
| 5 | **Mots significatifs** | ≥ 3 mots (hors bruit) | Que du bruit (euh, ah, um) |

### Exemples d'Appels IGNORÉS (Étape 1)

#### ❌ Exemple 1 : Appel raccroché immédiatement
```
Transcription : "Appel démarré - StreamSid: CA123..."
Longueur : 38 caractères

❌ IGNORÉ
Raison : Transcription trop courte (< 50 caractères)
```

#### ❌ Exemple 2 : Client ne parle pas
```
Transcription :
"Appel démarré - StreamSid: CA123...
Assistant: Bonjour ! Vous êtes bien au restaurant La Bella Pizza, je vous écoute."

❌ IGNORÉ
Raison : Aucune interaction client détectée
```

#### ❌ Exemple 3 : Client ne dit que du bruit
```
Transcription :
"Assistant: Bonjour !
Client: Euh... ah... mmm... hein ?"

❌ IGNORÉ
Raison : Transcription ne contient que du bruit
```

### Logs Console (Étape 1)

```bash
⏭️  APPEL IGNORÉ (CA1234567890abcdef)
   Raison: Client a parlé trop peu (3 mots) - Informations insuffisantes
   Transcription: "Appel démarré...Assistant: Bonjour ! Client: Oui oui."
```

---

## ✅ ÉTAPE 2 : Validation des Données Extraites

**Fichier :** `Backend/Routes/CallData/processCall.js`

### Critères de Validation

Un appel est considéré **INUTILE** si **TOUTES** ces conditions sont vraies :

| Condition | Valeur |
|-----------|--------|
| **Pas de commande** | `order === null` |
| **Pas de nom** | `nom === "Client inconnu"` |
| **Pas de téléphone** | `telephone === "Non fourni"` |
| **Type basique** | `type_demande === "Information menu"` OU `"Autre"` |

### Exemples d'Appels IGNORÉS (Étape 2)

#### ❌ Exemple 1 : Question simple sans suite
```javascript
Données extraites :
{
  nom: "Client inconnu",
  telephone: "Non fourni",
  type_demande: "Information menu",
  order: null,
  description: "Demande des horaires d'ouverture"
}

❌ IGNORÉ
Raison : Aucune donnée exploitable (pas de nom, pas de commande)
```

#### ❌ Exemple 2 : Appel test / erreur
```javascript
Données extraites :
{
  nom: "Client inconnu",
  telephone: "Non fourni",
  type_demande: "Autre",
  order: null,
  description: "Conversation non claire"
}

❌ IGNORÉ
Raison : Aucune donnée exploitable
```

### Logs Console (Étape 2)

```bash
⏭️  APPEL IGNORÉ APRÈS EXTRACTION (CA1234567890abcdef)
   Raison: Aucune donnée exploitable
   - Nom: Client inconnu
   - Téléphone: Non fourni
   - Type: Information menu
   - Commande: Non
```

---

## ✅ Appels CONSERVÉS (Exemples)

### ✅ Exemple 1 : Commande avec nom partiel
```javascript
{
  nom: "Martin",  // ✅ Nom présent
  telephone: "Non fourni",
  type_demande: "Commande à emporter",
  order: { ... }  // ✅ Commande présente
}

→ CONSERVÉ : Une commande avec un nom, c'est utile
```

### ✅ Exemple 2 : Téléphone sans nom
```javascript
{
  nom: "Client inconnu",
  telephone: "0612345678",  // ✅ Téléphone présent
  type_demande: "Information menu",
  order: null
}

→ CONSERVÉ : On a un téléphone, on peut recontacter
```

### ✅ Exemple 3 : Réservation sans téléphone
```javascript
{
  nom: "Madame Dubois",  // ✅ Nom présent
  telephone: "Non fourni",
  type_demande: "Réservation de table",
  order: { ... }  // ✅ Réservation présente
}

→ CONSERVÉ : Réservation avec nom complet
```

---

## 📊 Impact sur les Coûts et Performance

### Sans Filtrage (Avant)

| Appels/mois | Extraction GPT | Notifications | Base de données |
|-------------|---------------|---------------|-----------------|
| 1000 | 1000 (100%) | 1000 | 1000 entrées |
| **Coût GPT** | ~50€ | - | - |

### Avec Filtrage (Après)

| Appels/mois | Extraction GPT | Notifications | Base de données |
|-------------|---------------|---------------|-----------------|
| 1000 | 1000 (100%) | ~400 (40%) | ~400 entrées |
| **Coût GPT** | ~50€ | - | - |
| **Économie** | 0€ (extraction faite) | **-60% notifications** | **-60% stockage** |

**Note :** L'extraction GPT est toujours faite (Étape 2), mais on évite les notifications et le stockage inutiles.

### Optimisation Future Possible

Pour économiser sur l'extraction GPT, on pourrait implémenter un **filtrage AVANT extraction** :

```javascript
// Étape 1 : Validation transcription (actuel)
if (!isValidTranscription) return; // ✅ Implémenté

// Étape 1.5 : Pré-analyse rapide (à implémenter)
if (transcription.includes("horaires") && !transcription.includes("commander")) {
  return; // Question simple → pas besoin d'extraction GPT
}

// Étape 2 : Extraction GPT (actuel)
const data = await extractCallData(transcription);
```

---

## 🔧 Configuration

### Ajuster les Seuils de Filtrage

Dans `Backend/Connection/connection.js` :

```javascript
// Longueur minimale de transcription
if (transcription.trim().length < 50) {  // ← Modifier ici (défaut: 50)
  return "Transcription trop courte";
}

// Nombre de mots minimum
if (words.length < 10) {  // ← Modifier ici (défaut: 10)
  return "Pas assez de mots";
}

// Nombre de mots client minimum
if (clientWords.length < 5) {  // ← Modifier ici (défaut: 5)
  return "Client a parlé trop peu";
}

// Nombre de mots significatifs minimum
if (meaningfulWords.length < 3) {  // ← Modifier ici (défaut: 3)
  return "Que du bruit";
}
```

### Ajuster les Critères d'Inutilité

Dans `Backend/Routes/CallData/processCall.js` :

```javascript
const isUseless = 
  (!extractedData.order || extractedData.order === null) &&  // ← Modifier
  (extractedData.nom === "Client inconnu") &&                // ← Modifier
  (extractedData.telephone === "Non fourni") &&              // ← Modifier
  (extractedData.type_demande === "Information menu" || 
   extractedData.type_demande === "Autre");                  // ← Modifier
```

**Exemples de modifications :**

```javascript
// Plus strict : Ignorer aussi les appels sans téléphone
const isUseless = extractedData.telephone === "Non fourni";

// Plus permissif : Garder toutes les réservations
const isUseless = 
  (!extractedData.order || extractedData.order === null) &&
  (extractedData.nom === "Client inconnu") &&
  (extractedData.telephone === "Non fourni") &&
  extractedData.type_demande !== "Réservation de table";  // ← Ajout
```

---

## 📈 Monitoring et Statistiques

### Logs à Surveiller

```bash
# Appels ignorés Étape 1
grep "APPEL IGNORÉ" Backend/logs/combined.log | wc -l

# Appels ignorés Étape 2
grep "APPEL IGNORÉ APRÈS EXTRACTION" Backend/logs/combined.log | wc -l

# Taux de filtrage
# (Ignorés / Total) × 100
```

### Exemple de Statistiques

```bash
# Sur 1000 appels :
- Étape 1 (Transcription) : 300 ignorés (30%)
- Étape 2 (Extraction) : 300 ignorés (30%)
- TOTAL CONSERVÉS : 400 appels (40%)
```

---

## ❓ FAQ

### Q: Un client raccroche après avoir donné son nom, est-ce conservé ?
**R:** OUI, si le nom n'est pas "Client inconnu", l'appel est conservé.

### Q: Un client demande juste les horaires, est-ce conservé ?
**R:** NON (si pas de nom + pas de téléphone + pas de commande).

### Q: Un client donne son téléphone mais pas de nom, est-ce conservé ?
**R:** OUI, car on a un moyen de le recontacter.

### Q: Comment voir les appels ignorés ?
**R:** Dans les logs : `grep "APPEL IGNORÉ" Backend/logs/combined.log`

### Q: Peut-on désactiver le filtrage ?
**R:** Oui, commenter les validations dans les 2 fichiers :
- `Backend/Connection/connection.js` (ligne ~626-646)
- `Backend/Routes/CallData/processCall.js` (ligne ~36-71)

---

## 🎯 Résumé

| Aspect | Avant | Après |
|--------|-------|-------|
| **Appels traités** | 100% | ~40% |
| **Notifications** | 100% | ~40% |
| **Base de données** | 100% | ~40% |
| **Coût GPT extraction** | 100% | 100% (pas optimisé) |
| **Fausses alertes** | Oui | Non |

**Bénéfices :**
- ✅ Moins de notifications inutiles
- ✅ Base de données propre
- ✅ Logs plus clairs
- ✅ Focus sur les vrais clients

---

📝 **Auteur:** Système de filtrage intelligent des appels  
📅 **Date:** 2025-10-22  
🔄 **Version:** 1.0






