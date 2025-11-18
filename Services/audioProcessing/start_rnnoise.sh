#!/bin/bash

# Script de démarrage du service RNNoise

echo "🎙️ Démarrage du service RNNoise..."

# Activer l'environnement virtuel
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "❌ Environnement virtuel non trouvé. Exécutez d'abord ./install.sh"
    exit 1
fi

# Port par défaut
export RNNOISE_PORT=${RNNOISE_PORT:-8081}

echo "📡 Service RNNoise démarré sur le port $RNNOISE_PORT"
echo "🔊 Réduction de bruit activée"
echo ""
echo "Pour arrêter le service, appuyez sur Ctrl+C"
echo ""

# Démarrer le service
python3 rnnoise_service.py

