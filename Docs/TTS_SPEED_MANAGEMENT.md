# Gestion Dynamique de la Vitesse TTS - Documentation

## Vue d'ensemble

Le système de gestion dynamique de la vitesse TTS optimise la fluidité de la prise de commande tout en garantissant que les informations critiques (numéros, heures, confirmations) restent parfaitement compréhensibles.

## Architecture

### Fichiers principaux

1. **`backend/Config/ttsSpeedConfig.js`** : Configuration des vitesses selon le contexte
2. **`backend/Services/gptServices/ttsSpeedManager.js`** : Gestionnaire de vitesse TTS dynamique
3. **`backend/Services/gptServices/gptServices.js`** : Configuration initiale de la session avec paramètre `speed`
4. **`backend/Websocket/handlers/OpenAIHandler.js`** : Intégration du gestionnaire de vitesse
5. **`backend/Websocket/handlers/openai/BargeInHandler.js`** : Mise à jour de vitesse avant `response.create`

## Configuration des vitesses

### Plage de vitesse

- **0.25** : Très lent
- **1.0** : Normal (vitesse de référence)
- **1.5** : Très rapide

### Vitesses par contexte

| Contexte | Vitesse | Description |
|----------|---------|-------------|
| `ORDER_TAKING` | 1.35 | Prise de commande générale (questions sur produits, menu) |
| `ORDER_CONFIRMATION` | 1.15 | Confirmation de commandes (récapitulatif avant validation) |
| `CRITICAL_INFO` | 1.0 | Numéros de téléphone / heures (informations critiques) |
| `FINAL_SUMMARY` | 1.05 | Récapitulatif final (avant clôture) |
| `DEFAULT` | 1.3 | Par défaut (accueil, questions générales) |

### Ajustement des vitesses

Pour modifier les vitesses, éditer `backend/Config/ttsSpeedConfig.js` :

```javascript
export const TTS_SPEED_CONFIG = {
  ORDER_TAKING: 1.35,        // Ajuster selon besoin
  ORDER_CONFIRMATION: 1.15,  // Ajuster selon besoin
  CRITICAL_INFO: 1.0,        // Ne pas modifier (critique)
  FINAL_SUMMARY: 1.05,       // Ajuster selon besoin
  DEFAULT: 1.3               // Ajuster selon besoin
};
```

## Détection du contexte

Le système analyse la transcription de la conversation pour détecter automatiquement le contexte et ajuster la vitesse.

### Mots-clés de détection

#### Prise de commande (`ORDER_TAKING`)
- menu, commande, produit, article, burger, tacos, pizza, frites, boisson, sauce
- désirez, souhaitez, voulez, autre chose, autre, encore

#### Confirmation (`ORDER_CONFIRMATION`)
- c'est bien, c'est correct, confirmer, valider, récapitulatif
- récapitule, résumé, donc, alors, pour résumer

#### Informations critiques (`CRITICAL_INFO`)
- numéro, téléphone, tél, heure, h, h00, h30, midi, minuit
- chiffre, chiffre par chiffre, répète, confirme
- Tous les chiffres (0-9) et nombres (dix, onze, douze, etc.)

#### Récapitulatif final (`FINAL_SUMMARY`)
- récapitulatif final, pour finir, en résumé, au total
- donc vous avez, votre commande, commande complète

### Priorité de détection

1. **CRITICAL_INFO** (priorité la plus haute) : Numéros, heures
2. **FINAL_SUMMARY** : Récapitulatif final
3. **ORDER_CONFIRMATION** : Confirmation de commande
4. **ORDER_TAKING** : Prise de commande
5. **DEFAULT** : Par défaut

## Fonctionnement technique

### Flux d'exécution

1. **Initialisation** : La session OpenAI est créée avec `speed: 1.3` (vitesse par défaut)

2. **Détection du contexte** : Après chaque `input_audio_buffer.committed` (utilisateur a fini de parler) :
   - Le système analyse la transcription complète et le dernier texte de l'assistant
   - Le contexte est détecté via les mots-clés
   - La vitesse cible est déterminée

3. **Mise à jour de vitesse** : Avant `response.create` :
   - Si la vitesse cible diffère de la vitesse actuelle
   - Un `session.update` est envoyé avec le nouveau paramètre `speed`
   - La vitesse est mise à jour uniquement entre les tours (pas pendant qu'une réponse est en cours)

4. **Application** : La nouvelle vitesse s'applique à la prochaine réponse de l'assistant

### Points d'intégration

#### `BargeInHandler.handleUserSpeechCommitted()`
- Appelle `speedManager.updateSpeedForContext()` avant `response.create`
- Garantit que la vitesse est mise à jour avant chaque nouvelle réponse

#### `TranscriptionHandler`
- Met à jour `speedManager.updateLastAssistantText()` à chaque delta de transcription
- Permet l'analyse du contexte basée sur le dernier texte prononcé

#### `OpenAIHandler`
- Initialise le `TTSSpeedManager` et le passe aux handlers
- Met à jour la transcription dans le gestionnaire après chaque événement pertinent

## Tests et validation

### Scénarios de test

#### Test 1 : Prise de commande rapide
1. Client appelle
2. Assistant demande : "Que désirez-vous commander ?"
3. **Vérifier** : Vitesse = 1.35 (ORDER_TAKING)

#### Test 2 : Confirmation de commande
1. Assistant récapitule : "Donc vous avez un menu burger et des frites, c'est bien ça ?"
2. **Vérifier** : Vitesse = 1.15 (ORDER_CONFIRMATION)

#### Test 3 : Numéro de téléphone (critique)
1. Assistant demande : "Quel est votre numéro de téléphone ?"
2. Client donne le numéro
3. Assistant répète : "C'est bien le 0 7 8 6 8 7 6 7 8 9 ?"
4. **Vérifier** : Vitesse = 1.0 (CRITICAL_INFO)

#### Test 4 : Heure (critique)
1. Assistant demande : "Pour quelle heure ?"
2. Client répond : "19h30"
3. Assistant confirme : "Pour 19h30 c'est bien ça ?"
4. **Vérifier** : Vitesse = 1.0 (CRITICAL_INFO)

#### Test 5 : Récapitulatif final
1. Assistant dit : "Récapitulatif final de votre commande..."
2. **Vérifier** : Vitesse = 1.05 (FINAL_SUMMARY)

### Vérifications critiques

- [ ] Aucune information critique (numéro, heure) n'est perdue ou mal comprise
- [ ] La voix reste claire et naturelle même à vitesse rapide (1.35)
- [ ] Le changement de vitesse se fait bien entre les tours (pas pendant qu'une réponse est en cours)
- [ ] Les chiffres sont parfaitement compréhensibles à vitesse 1.0
- [ ] La prise de commande est plus rapide (vitesse 1.35) sans perte de qualité

### Logs de diagnostic

Le système enregistre les changements de vitesse dans les logs :

```
[INFO] Vitesse TTS mise à jour: 1.3 → 1.0 (contexte: CRITICAL_INFO)
{
  previousSpeed: 1.3,
  newSpeed: 1.0,
  context: "CRITICAL_INFO"
}
```

## Ajustements et personnalisation

### Ajouter de nouveaux mots-clés

Éditer `backend/Config/ttsSpeedConfig.js` :

```javascript
export const CONTEXT_KEYWORDS = {
  ORDER_TAKING: [
    // ... mots-clés existants
    'nouveau_mot_cle'  // Ajouter ici
  ],
  // ...
};
```

### Modifier les vitesses

Éditer `backend/Config/ttsSpeedConfig.js` :

```javascript
export const TTS_SPEED_CONFIG = {
  ORDER_TAKING: 1.4,  // Augmenter pour plus de rapidité
  // ...
};
```

### Ajouter un nouveau contexte

1. Ajouter la vitesse dans `TTS_SPEED_CONFIG`
2. Ajouter les mots-clés dans `CONTEXT_KEYWORDS`
3. Ajouter le cas dans `detectConversationContext()`
4. Ajouter le cas dans `getSpeedForContext()`

## Limitations et contraintes

1. **Changement entre tours uniquement** : La vitesse ne peut être modifiée qu'entre les tours de conversation, pas pendant qu'une réponse est en cours
2. **Détection basée sur mots-clés** : La détection du contexte repose sur l'analyse de mots-clés dans la transcription
3. **Latence de mise à jour** : La vitesse est mise à jour avant `response.create`, donc la première réponse après un changement peut encore utiliser l'ancienne vitesse

## Troubleshooting

### La vitesse ne change pas

- Vérifier les logs pour voir si `updateSpeedForContext()` est appelé
- Vérifier que les mots-clés correspondent au contexte attendu
- Vérifier que `session.update` est bien envoyé avec le paramètre `speed`

### La vitesse change trop souvent

- Ajuster les mots-clés pour être plus spécifiques
- Ajouter une logique de seuil (ne changer que si la différence est significative)

### Les informations critiques ne sont pas détectées

- Vérifier que les mots-clés dans `CRITICAL_INFO` couvrent tous les cas
- Ajouter des variantes (ex: "tél" en plus de "téléphone")

## Références

- [OpenAI Realtime API Documentation](https://platform.openai.com/docs/guides/realtime)
- Paramètre `speed` : Plage 0.25 - 1.5, valeur par défaut 1.0

