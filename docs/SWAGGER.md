# Documentation Swagger (API interne)

La documentation OpenAPI du backend est exposée en interne pour le site e-commerce. Après confirmation de paiement Stripe, le site envoie l’abonnement acheté et les données utilisateur ; le backend assure toute l’automatisation (création d’instance isolée, clé API, optionnellement Twilio/OpenAI).

## Accès

- **UI Swagger** : `GET /docs` (une fois le serveur principal démarré).
- **Spec OpenAPI** : fichier `backend/docs/openapi.json` (OpenAPI 3.1).

## Authentification

Tous les endpoints documentés (instances, clés API) sont protégés par **clé API** :

- Header : `x-api-key: <valeur>`
- Ou query : `?api_key=<valeur>`

Le site e-commerce doit utiliser une clé API valide (clé serveur `X_API_KEY` dans l’environnement backend, ou clé dédiée admin) pour appeler **POST /api/instances**.

## Flux Stripe : création d’instance automatisée

1. L’utilisateur paie sur le site (Stripe).
2. Le site reçoit la confirmation Stripe et les données de l’utilisateur (nom, identifiant, pays, etc.).
3. Le site appelle **POST /api/instances** avec :
   - **plan** (obligatoire) : abonnement acheté (ex. `echauffement`, `mise_en_place`, `standard`, `premium`).
   - **name** ou **clientId** : nom affiché ou identifiant métier du client.
   - **countryCode** : `FR`, `BE` ou `LU` (résidence pour Twilio).
   - **email** et **password** (optionnel) : créent le premier utilisateur pour cette instance ; le client pourra se connecter à l’app avec ces identifiants. **username** optionnel.
   - **provisionTwilio** : `true` pour provisionner un numéro Twilio (optionnel).
   - **provisionOpenAi** : `true` pour une clé OpenAI dédiée (exige **clientId** et `OPENAI_KEY_ENCRYPTION_SECRET`).
4. Le backend crée l’instance (tenant isolé), génère la clé API, crée l’utilisateur (si email/password fournis), provisionne Twilio/OpenAI si demandé.
5. Réponse 201 : **instanceId**, **apiKey** (à transmettre au client), **twilioNumber**, **twilioWebhookUrl**, **notes**. Le client se connecte ensuite à l’app avec **email + mot de passe** (header **x-api-key** = apiKey du tenant).

Détails des corps de requête, exemples et codes d’erreur : voir la spec dans `/docs` ou `openapi.json`.

## Mise à jour de la spec

Modifier `backend/docs/openapi.json` puis redémarrer le serveur. La route `/docs` sert cette spec en mode statique.
