# Guide Rapide - Gestion Vitesse TTS

## Vue d'ensemble

Le système ajuste automatiquement la vitesse de parole du TTS selon le contexte de la conversation pour optimiser la fluidité tout en garantissant la compréhensibilité des informations critiques.

## Configuration rapide

### Ajuster les vitesses

Éditer `backend/Config/ttsSpeedConfig.js` :

```javascript
export const TTS_SPEED_CONFIG = {
  ORDER_TAKING: 1.35,        // Prise de commande (rapide)
  ORDER_CONFIRMATION: 1.15,  // Confirmation (moyen)
  CRITICAL_INFO: 1.0,        // Numéros/heures (normal - NE PAS MODIFIER)
  FINAL_SUMMARY: 1.05,       // Récapitulatif (lent)
  DEFAULT: 1.3               // Par défaut (rapide)
};
```

## Comportement automatique

Le système détecte automatiquement le contexte et ajuste la vitesse :

- **Questions sur produits/menu** → Vitesse 1.35 (rapide)
- **Confirmation de commande** → Vitesse 1.15 (moyen)
- **Numéros de téléphone/heures** → Vitesse 1.0 (normal - critique)
- **Récapitulatif final** → Vitesse 1.05 (lent)

## Tests

### Test rapide

1. Passer un appel de test
2. Observer les logs pour voir les changements de vitesse :
   ```
   [INFO] Vitesse TTS mise à jour: 1.3 → 1.0 (contexte: CRITICAL_INFO)
   ```
3. Vérifier que les numéros/heures sont prononcés à vitesse normale (1.0)
4. Vérifier que la prise de commande est rapide (1.35)

### Scénario de test complet

1. **Accueil** : Vitesse 1.3 (DEFAULT)
2. **"Que désirez-vous commander ?"** : Vitesse 1.35 (ORDER_TAKING)
3. **"C'est bien un menu burger ?"** : Vitesse 1.15 (ORDER_CONFIRMATION)
4. **"Quel est votre numéro ?"** : Vitesse 1.0 (CRITICAL_INFO)
5. **"C'est bien le 0 7 8 6 8 7 6 7 8 9 ?"** : Vitesse 1.0 (CRITICAL_INFO)
6. **"Récapitulatif final..."** : Vitesse 1.05 (FINAL_SUMMARY)

## Dépannage

### La vitesse ne change pas

- Vérifier les logs : `tail -f backend/logs/combined.log | grep "Vitesse TTS"`
- Vérifier que les mots-clés correspondent au contexte

### Ajuster la détection

Éditer `backend/Config/ttsSpeedConfig.js` → `CONTEXT_KEYWORDS` pour ajouter/modifier les mots-clés.

## Documentation complète

Voir `backend/Docs/TTS_SPEED_MANAGEMENT.md` pour la documentation détaillée.

