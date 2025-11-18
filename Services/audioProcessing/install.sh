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

# Créer un environnement virtuel si nécessaire
if [ ! -d "venv" ]; then
    echo "📦 Création de l'environnement virtuel..."
    python3 -m venv venv
fi

# Activer l'environnement virtuel
echo "🔄 Activation de l'environnement virtuel..."
source venv/bin/activate

# Installer les dépendances
echo "📥 Installation des dépendances..."
pip install --upgrade pip
pip install -r requirements.txt

# Vérifier l'installation
echo ""
echo "🔍 Vérification de l'installation..."
python3 -c "from rnnoise_python import RNNoise; print('✅ RNNoise importé avec succès')"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Installation terminée avec succès !"
    echo ""
    echo "Pour démarrer le service:"
    echo "  source venv/bin/activate"
    echo "  python3 rnnoise_service.py"
    echo ""
    echo "Ou utilisez le script de démarrage:"
    echo "  ./start_rnnoise.sh"
else
    echo ""
    echo "❌ Erreur lors de l'installation. Vérifiez les messages ci-dessus."
    exit 1
fi

