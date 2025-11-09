# 📦 Business Layer - Logique Métier

Ce dossier contient toute la logique métier de l'application, séparée de l'infrastructure et de l'API.

## 📁 Structure

```
Business/
├── services/           # Services métier
│   ├── CallService.js     # Gestion des appels
│   ├── ClientService.js   # Gestion des clients
│   └── OrderService.js    # Gestion des commandes
├── validators/         # Validation des données
│   └── CallValidator.js   # Validation appels/clients
└── transformers/       # Transformation des données
    └── CallTransformer.js # Formatage des réponses
```

## 🔄 Architecture

### Services (Logique Métier)

Les services contiennent toute la logique métier et orchestrent les opérations complexes.

**Exemple - CallService** :
```javascript
import { CallService } from './services/CallService.js';

// Sauvegarder un appel avec client et commande
const { call, order } = await CallService.saveCall(data);

// Récupérer les appels avec pagination
const result = await CallService.getCalls({ page: 1, limit: 10 });
```

**Avantages** :
- ✅ Logique métier centralisée
- ✅ Réutilisable dans plusieurs controllers
- ✅ Testable indépendamment
- ✅ Indépendant du framework web

### Validators (Validation)

Les validators valident les données avant traitement.

**Exemple - CallValidator** :
```javascript
import { CallValidator } from './validators/CallValidator.js';

// Valider les données d'appel
const validation = CallValidator.validateCallData(data);
if (!validation.isValid) {
  throw new Error(validation.errors.join(', '));
}

// Valider un statut
const isValid = CallValidator.validateStatus('nouveau'); // true
```

**Avantages** :
- ✅ Validation centralisée
- ✅ Règles métier respectées
- ✅ Messages d'erreur cohérents
- ✅ Réutilisable partout

### Transformers (Transformation)

Les transformers formatent les données pour les réponses API.

**Exemple - CallTransformer** :
```javascript
import { CallTransformer } from './transformers/CallTransformer.js';

// Transformer un appel
const formatted = CallTransformer.transformCall(call);

// Réponse de succès
return CallTransformer.successResponse(data, "Opération réussie");

// Réponse paginée
return CallTransformer.paginatedResponse(calls, 1, 100);
```

**Avantages** :
- ✅ Format de réponse cohérent
- ✅ Masquage des champs sensibles
- ✅ Normalisation des données
- ✅ Facilite les changements d'API

## 🎯 Flux de données

```
API Request
    ↓
Controller (API Layer)
    ↓
Validator (validation basique)
    ↓
Service (logique métier)
    ↓
Repository/Model (base de données)
    ↓
Service (traitement résultat)
    ↓
Transformer (formatage)
    ↓
Controller → API Response
```

## 📚 Services disponibles

### CallService
Gestion complète des appels téléphoniques.

**Méthodes principales** :
- `saveCall(data)` - Sauvegarde un appel avec client et commande
- `getCalls(params)` - Liste paginée avec filtres
- `getCallById(id)` - Détails d'un appel
- `updateCallStatus(id, status)` - Mise à jour statut
- `updateCallAndClient(id, updates)` - Mise à jour appel + client
- `deleteCall(id)` - Suppression
- `unifiedSearch(query)` - Recherche globale

### ClientService
Gestion des clients et fournisseurs.

**Méthodes principales** :
- `findClientByPhone(telephone)` - Recherche par téléphone
- `createClient(data)` - Création nouveau client
- `updateClient(id, updates)` - Mise à jour
- `getAllClients()` - Liste complète
- `getClientHistory(id)` - Historique complet
- `searchClients(criteria)` - Recherche avec critères

### OrderService
Gestion des commandes et rendez-vous.

**Méthodes principales** :
- `createOrderFromAppointment(data, options)` - Création depuis appel
- `searchOrders(criteria)` - Recherche avec filtres
- `getOrdersByClient(clientId)` - Commandes d'un client

## 🔒 Principes respectés

### Single Responsibility Principle (SRP)
Chaque service a une responsabilité unique :
- **CallService** : Gestion des appels uniquement
- **ClientService** : Gestion des clients uniquement
- **OrderService** : Gestion des commandes uniquement

### Dependency Inversion Principle (DIP)
Les services dépendent d'abstractions (models) et non de détails.

### Don't Repeat Yourself (DRY)
Logique réutilisable centralisée dans les services.

### Separation of Concerns
- **Validators** : Validation
- **Services** : Logique métier
- **Transformers** : Présentation

## 🧪 Tests

Les services sont facilement testables car indépendants du framework :

```javascript
// Exemple de test
describe('CallService', () => {
  it('should save a call with client', async () => {
    const data = { /* ... */ };
    const result = await CallService.saveCall(data);
    
    expect(result.call).toBeDefined();
    expect(result.call.statut).toBe('nouveau');
  });
});
```

## 📖 Utilisation

### Dans un controller

```javascript
import { CallService } from '../../Business/services/CallService.js';
import { CallTransformer } from '../../Business/transformers/CallTransformer.js';

export class CallController {
  static async getCalls(request, reply) {
    try {
      const result = await CallService.getCalls(request.query);
      
      return reply.code(200).send(
        CallTransformer.paginatedResponse(
          result.calls,
          result.page,
          result.total
        )
      );
    } catch (error) {
      return reply.code(500).send(
        CallTransformer.errorResponse("Erreur serveur")
      );
    }
  }
}
```

### Directement (pour scripts)

```javascript
import { CallService } from './Business/services/CallService.js';

// Dans un script de migration par exemple
const calls = await CallService.getCalls({ limit: 1000 });
console.log(`${calls.total} appels trouvés`);
```

## 🚀 Évolution future

Cette architecture permet facilement de :
- ✅ Ajouter de nouveaux services
- ✅ Modifier la logique métier sans toucher l'API
- ✅ Changer de base de données
- ✅ Créer des APIs différentes (REST, GraphQL)
- ✅ Réutiliser la logique dans des workers/crons
- ✅ Tester de manière isolée

---

**Architecture** : Clean Architecture / Layered Architecture  
**Refactorisé le** : ${new Date().toLocaleDateString('fr-FR')}  
**Ancienne version** : `Controller/callData.js` (659 lignes)  
**Nouvelle version** : 6 modules modulaires (~900 lignes mais maintenables)

