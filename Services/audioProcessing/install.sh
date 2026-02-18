#!/bin/bash

# Script d'installation du service RNNoise
# Ce script installe les dépendances Python nécessaires

echo "🎙️ Installation du service RNNoise pour suppression de bruit"
echo "=============================================================="

# Vérifier que Python 3 est installé
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

echo "✅ Python 3 détecté: $(python3 --version)"

# Créer un environnement virtuel si nécessaire (évite externally-managed-environment sur Debian/Ubuntu)
if [ ! -d "venv" ]; then
    echo "Création de l'environnement virtuel..."
    if ! python3 -m venv venv; then
        echo ""
        echo "Erreur: impossible de creer le venv. Sur Debian/Ubuntu, installez d'abord:"
        echo "  sudo apt install python3.12-venv"
        echo "ou: sudo apt install python3-venv"
        echo ""
        exit 1
    fi
fi

# Activer l'environnement virtuel
echo "🔄 Activation de l'environnement virtuel..."
source venv/bin/activate

# Installer setuptools/wheel d'abord (requis pour compiler rnnoise-python)
echo "Installation de setuptools et wheel..."
pip install --upgrade pip setuptools wheel

# Installer les dépendances
echo "Installation des dependances..."
pip install -r requirements.txt

# Vérifier l'installation (dépendances principales)
echo ""
echo "Verification de l'installation..."
if ! python3 -c "import fastapi, uvicorn, numpy; print('OK')" 2>/dev/null; then
    echo "Erreur: dependances principales manquantes."
    exit 1
fi

if ./venv/bin/python3 -c "from pyrnnoise import RNNoise; print('OK')" 2>/dev/null; then
    echo "pyrnnoise: actif (reduction de bruit disponible)"
else
    echo "pyrnnoise: import echoue (voir erreur ci-dessus ou lancer: ./venv/bin/python3 -c \"from pyrnnoise import RNNoise\")"
fi

echo ""
echo "Installation terminee."
echo "Demarrer le service: ./start_rnnoise.sh"
echo "Ou: source venv/bin/activate && python3 rnnoise_service.py"

