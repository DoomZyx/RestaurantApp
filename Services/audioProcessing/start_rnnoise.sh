#!/bin/bash

# Script de démarrage du service RNNoise

echo "🎙️ Démarrage du service RNNoise..."

# Repertoire du script (pour appeler le bon venv)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [ -d "venv" ]; then
    PYTHON="venv/bin/python3"
elif [ -d ".venv" ]; then
    PYTHON=".venv/bin/python3"
else
    echo "Environnement virtuel non trouve. Executez d'abord: ./install.sh"
    exit 1
fi

# Port par défaut
export RNNOISE_PORT=${RNNOISE_PORT:-8081}

echo "📡 Service RNNoise démarré sur le port $RNNOISE_PORT"
echo "🔊 Réduction de bruit activée"
echo ""
echo "Pour arrêter le service, appuyez sur Ctrl+C"
echo ""

# Demarrer le service avec le Python du venv
exec "$PYTHON" rnnoise_service.py

