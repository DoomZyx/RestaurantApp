#!/bin/bash

# Script de démarrage pour Render - Lance Node.js + RNNoise en parallèle

echo "🚀 Démarrage des services..."

# Démarrer le service RNNoise en arrière-plan
echo "🎙️ Démarrage du service RNNoise sur le port 8081..."
cd /app/Services/audioProcessing
python3 rnnoise_service.py &
RNNOISE_PID=$!

# Attendre que RNNoise soit prêt
echo "⏳ Attente du démarrage de RNNoise..."
sleep 5

# Vérifier que RNNoise a bien démarré
if ! kill -0 $RNNOISE_PID 2>/dev/null; then
    echo "❌ Erreur : RNNoise n'a pas démarré correctement"
    exit 1
fi

echo "✅ RNNoise démarré (PID: $RNNOISE_PID)"

# Retour au répertoire principal et démarrer le backend Node.js
cd /app
echo "🚀 Démarrage du backend Node.js sur le port 8080..."
node server.js &
NODE_PID=$!

echo "✅ Backend Node.js démarré (PID: $NODE_PID)"

# Fonction pour gérer l'arrêt propre
cleanup() {
    echo "🛑 Arrêt des services..."
    kill $RNNOISE_PID $NODE_PID 2>/dev/null
    exit 0
}

# Capturer les signaux d'arrêt
trap cleanup SIGTERM SIGINT

# Attendre indéfiniment (les deux processus tournent en arrière-plan)
wait

