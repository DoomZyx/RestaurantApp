FROM node:18

WORKDIR /app

# Installer Python et pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Copier les fichiers package
COPY package*.json ./
RUN npm install --production

# Copier tout le code
COPY . .

# Installer les dépendances Python pour RNNoise
WORKDIR /app/Services/audioProcessing
RUN pip3 install --no-cache-dir -r requirements.txt

# Retour au répertoire principal
WORKDIR /app

# Exposer les ports
EXPOSE 8080 8081

# Copier le script de démarrage
COPY start-services.sh ./
RUN chmod +x start-services.sh

# Démarrer les deux services
CMD ["./start-services.sh"]