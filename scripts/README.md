# Scripts de Démonstration

## 📸 Remplir la base avec des données de démo (ce soir)

Pour remplir ta base de données avec des commandes et réservations pour ce soir (parfait pour les captures d'écran) :

```bash
cd Backend
npm run fill-demo
# ou
pnpm fill-demo
```

### Ce que le script crée :

- **10 clients fictifs** avec des noms français réalistes
- **5 commandes à emporter** pour ce soir (18h-22h)
- **5 réservations de table** pour ce soir (18h-22h)
- Des menus variés (pizzas, burgers, salades, desserts)
- Des prix réalistes

## 📅 Remplir la base avec une semaine complète (1-7 novembre)

Pour remplir ta base de données avec BEAUCOUP de commandes du 1er au 7 novembre 2025 :

```bash
cd Backend
npm run fill-week
# ou
pnpm fill-week
```

### Ce que le script crée :

- **50 clients fictifs** avec des noms français aléatoires
- **8-15 commandes à emporter par jour** (sur 7 jours)
- **5-10 réservations de table par jour** (sur 7 jours)
- **Total: ~90-175 commandes** sur la semaine
- Heures variées (18h-22h30)
- Menus variés et réalistes

### Exemple de sortie :

```
✅ DONNÉES DE DÉMONSTRATION CRÉÉES AVEC SUCCÈS !
📊 Résumé:
   - 10 clients créés
   - 5 commandes à emporter
   - 5 réservations de table
   - Total: 10 commandes pour ce soir

📸 Ton application est prête pour les captures d'écran !
```

## 🍕 Remplir le menu (Pizzas, Burgers, etc.)

Pour remplir ta base de données avec un menu complet de restaurant :

```bash
cd Backend
npm run fill-menu
# ou
pnpm fill-menu
```

### Ce que le script crée :

- **15 Pizzas** : Margherita, Reine, 4 Fromages, Pepperoni, Calzone, etc.
- **10 Burgers** : Classic, Cheeseburger, Bacon Burger, Chicken, Veggie, etc.
  - **+ 9 Suppléments** : Bacon, Cheddar, Avocat, Œuf, Steak supplémentaire, etc.
- **Tacos Personnalisables** 🌮 :
  - 3 Tailles (M/L/XL avec nombre de viandes)
  - 8 Choix de viandes (Poulet, Merguez, Kebab, etc.)
  - 8 Sauces disponibles (Blanche, Algérienne, Samouraï, etc.)
  - Instructions claires pour que le GPT comprenne les choix du client
- **8 Salades** : César, Grecque, Niçoise, Chèvre chaud, etc.
- **12 Desserts** : Tiramisu, Fondant chocolat, Cheesecake, etc.
- **20 Boissons** : Sodas, jus, cafés, thés, etc.
- **8 Entrées** : Bruschetta, Antipasti, Carpaccio, etc.
- **7 Accompagnements** : Frites, Potatoes, Onion rings, etc.

**Total: ~90 produits + système tacos personnalisable**

## 🧹 Nettoyer les données de démo

Après tes captures d'écran, tu peux nettoyer toutes les données de démonstration :

```bash
cd Backend
npm run clean-demo
# ou
pnpm clean-demo
```

### Ce que le script supprime :

- Toutes les commandes créées par les scripts de démo
- Tous les appels associés
- **Note**: Les clients ne sont PAS supprimés par défaut (pour éviter de supprimer de vrais clients)

## ⚠️ Important

- Ces scripts se connectent à ta base de données MongoDB configurée dans `.env`
- Les données créées ont le tag `createdBy: "demo-script"` pour faciliter le nettoyage
- Assure-toi que ton serveur MongoDB est bien lancé avant d'exécuter ces scripts

## 💡 Utilisation

1. Remplis ta base avec des données : `npm run fill-demo`
2. Fais tes captures d'écran 📸
3. Nettoie les données : `npm run clean-demo`
4. C'est tout ! 🎉

