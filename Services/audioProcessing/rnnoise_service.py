"""
Service RNNoise pour suppression de bruit en temps réel
API HTTP légère pour traiter l'audio des appels téléphoniques
"""

import os
import io
import wave
import base64
import numpy as np
import audioop
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Importer rnnoise (sera installé via pip)
try:
    from rnnoise_python import RNNoise
except ImportError:
    print("WARNING: rnnoise-python non installe. Executez: pip install rnnoise-python")
    RNNoise = None

app = FastAPI(title="RNNoise Audio Cleaning Service", version="1.0.0")

# CORS pour permettre les requêtes depuis le backend Node.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instance RNNoise globale (réutilisée pour chaque requête)
denoiser = None

class AudioRequest(BaseModel):
    """Modèle pour les requêtes audio"""
    audio_payload: str  # Base64 encoded audio (mulaw from Twilio)
    sample_rate: int = 8000  # Twilio utilise 8kHz par défaut

class AudioResponse(BaseModel):
    """Modèle pour les réponses audio"""
    cleaned_audio: str  # Base64 encoded cleaned audio
    noise_detected: bool
    success: bool

@app.on_event("startup")
async def startup_event():
    """Initialiser RNNoise au démarrage"""
    global denoiser
    if RNNoise:
        denoiser = RNNoise()
        print("✅ RNNoise initialisé avec succès")
    else:
        print("❌ RNNoise non disponible")

@app.get("/")
async def root():
    """Health check"""
    return {
        "status": "running",
        "service": "RNNoise Audio Cleaning",
        "rnnoise_available": denoiser is not None
    }

@app.get("/health")
async def health():
    """Health check détaillé"""
    return {
        "status": "healthy" if denoiser else "degraded",
        "rnnoise_loaded": denoiser is not None,
        "version": "1.0.0"
    }

@app.post("/clean-audio", response_model=AudioResponse)
async def clean_audio(request: AudioRequest):
    """
    Nettoyer l'audio en supprimant le bruit de fond
    
    Args:
        request: AudioRequest contenant l'audio en base64 (mulaw)
    
    Returns:
        AudioResponse avec l'audio nettoyé
    """
    if not denoiser:
        raise HTTPException(
            status_code=503,
            detail="RNNoise non disponible. Installez: pip install rnnoise-python"
        )
    
    try:
        # Décoder l'audio base64 (format mulaw de Twilio)
        audio_bytes = base64.b64decode(request.audio_payload)
        
        # Convertir mulaw en PCM 16-bit avec audioop (plus fiable)
        pcm_bytes = audioop.ulaw2lin(audio_bytes, 2)  # 2 = 16-bit
        pcm_audio = np.frombuffer(pcm_bytes, dtype=np.int16)
        
        # Convertir en numpy array (float32 normalisé entre -1 et 1)
        audio_float = pcm_audio.astype(np.float32) / 32768.0
        
        # RNNoise fonctionne par blocs de 480 échantillons (10ms à 48kHz)
        # Pour 8kHz, on utilise des blocs de 80 échantillons
        frame_size = 80  # 10ms à 8kHz
        
        # Padding si nécessaire
        remainder = len(audio_float) % frame_size
        if remainder != 0:
            padding = frame_size - remainder
            audio_float = np.pad(audio_float, (0, padding), mode='constant')
        
        # Traiter l'audio par blocs
        cleaned_frames = []
        noise_detected = False
        
        for i in range(0, len(audio_float), frame_size):
            frame = audio_float[i:i + frame_size]
            
            # RNNoise traite le frame et retourne la probabilité de bruit
            cleaned_frame = denoiser.process_frame(frame)
            
            if cleaned_frame is not None:
                cleaned_frames.append(cleaned_frame)
            else:
                # Si RNNoise échoue, garder le frame original
                cleaned_frames.append(frame)
        
        # Reconstituer l'audio nettoyé
        cleaned_audio = np.concatenate(cleaned_frames)
        
        # Reconvertir en PCM 16-bit
        cleaned_pcm = (cleaned_audio * 32768.0).astype(np.int16)
        
        # Reconvertir en mulaw avec audioop (plus fiable)
        cleaned_pcm_bytes = cleaned_pcm.tobytes()
        cleaned_mulaw = audioop.lin2ulaw(cleaned_pcm_bytes, 2)  # 2 = 16-bit
        
        # Encoder en base64
        cleaned_base64 = base64.b64encode(cleaned_mulaw).decode('utf-8')
        
        return AudioResponse(
            cleaned_audio=cleaned_base64,
            noise_detected=noise_detected,
            success=True
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors du nettoyage audio: {str(e)}"
        )

# NOTE: Fonctions de conversion mulaw remplacées par audioop (plus fiable)
# audioop.ulaw2lin() et audioop.lin2ulaw() sont des implémentations natives
# conformes à la norme ITU-T G.711

if __name__ == "__main__":
    port = int(os.getenv("RNNOISE_PORT", 8081))
    print(f"🎙️ Démarrage du service RNNoise sur le port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)

