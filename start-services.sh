#!/bin/bash

# Script de démarrage pour Render - Lance Node.js + RNNoise en parallèle

set -e  # Arrêter en cas d'erreur

echo "[STARTUP] Demarrage des services..."

# Démarrer le service RNNoise en arrière-plan
echo "[RNNOISE] Demarrage du service RNNoise sur le port 8081..."
cd /app/Services/audioProcessing
python3 rnnoise_service.py > /tmp/rnnoise.log 2>&1 &
RNNOISE_PID=$!

# Attendre que RNNoise réponde au health check
echo "[RNNOISE] Attente du health check..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:8081/health > /dev/null 2>&1; then
        echo "[RNNOISE] Service demarre avec succes (PID: $RNNOISE_PID)"
        break
    fi
    
    # Vérifier que le processus tourne toujours
    if ! kill -0 $RNNOISE_PID 2>/dev/null; then
        echo "[ERROR] RNNoise a crash au demarrage"
        echo "[ERROR] Logs RNNoise:"
        cat /tmp/rnnoise.log
        exit 1
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "[RNNOISE] En attente... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 1
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "[ERROR] RNNoise n'a pas repondu au health check apres 30 secondes"
    echo "[ERROR] Logs RNNoise:"
    cat /tmp/rnnoise.log
    exit 1
fi

# Retour au répertoire principal et démarrer le backend Node.js
cd /app
echo "[NODEJS] Demarrage du backend Node.js sur le port 8080..."
node server.js &
NODE_PID=$!

echo "[SUCCESS] Tous les services sont demarres"
echo "[INFO] RNNoise PID: $RNNOISE_PID"
echo "[INFO] Node.js PID: $NODE_PID"

# Fonction pour gérer l'arrêt propre
cleanup() {
    echo "[SHUTDOWN] Arret des services..."
    kill $RNNOISE_PID $NODE_PID 2>/dev/null
    exit 0
}

# Capturer les signaux d'arrêt
trap cleanup SIGTERM SIGINT

# Attendre indéfiniment (les deux processus tournent en arrière-plan)
wait

