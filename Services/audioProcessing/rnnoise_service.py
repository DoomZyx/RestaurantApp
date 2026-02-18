"""
Service RNNoise pour suppression de bruit en temps réel
API HTTP légère pour traiter l'audio des appels téléphoniques
"""

import sys
import os

def _log(msg):
    """Log vers stderr (visible au demarrage avant uvicorn)."""
    print(f"[RNNoise-service] {msg}", file=sys.stderr, flush=True)

_log(f"Python: {sys.executable}")
_log(f"sys.path[0]: {sys.path[0] if sys.path else 'vide'}")

import io
import wave
import base64
import numpy as np
import audioop
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# pyrnnoise (PyPI, compatible Python 3.12) : 48kHz, 480 samples/frame
RNNoise = None
try:
    import pyrnnoise as _pyrnnoise_mod
    _log(f"pyrnnoise module: {getattr(_pyrnnoise_mod, '__file__', '?')}")
    from pyrnnoise import RNNoise
    _log("pyrnnoise.RNNoise importe OK")
except Exception as e:
    import traceback
    _log(f"pyrnnoise import KO: {type(e).__name__}: {e}")
    _log("Traceback:\n" + traceback.format_exc())

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
    """Initialiser RNNoise au démarrage (pyrnnoise: 48kHz)"""
    global denoiser
    if RNNoise:
        try:
            denoiser = RNNoise(sample_rate=48000)
            _log("RNNoise initialise (pyrnnoise)")
        except Exception as e:
            import traceback
            _log(f"RNNoise(sample_rate=48000) KO: {type(e).__name__}: {e}")
            _log(traceback.format_exc())
    else:
        _log("RNNoise non disponible (voir traceback ci-dessus)")

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
            detail="RNNoise non disponible. pip install pyrnnoise"
        )

    try:
        # Décoder l'audio base64 (format mulaw de Twilio, 8kHz)
        audio_bytes = base64.b64decode(request.audio_payload)
        pcm_bytes = audioop.ulaw2lin(audio_bytes, 2)
        pcm_audio = np.frombuffer(pcm_bytes, dtype=np.int16)
        audio_float = pcm_audio.astype(np.float32) / 32768.0

        # pyrnnoise attend 48kHz, 480 échantillons/frame (10ms). On re-échantillonne 8k -> 48k par frame.
        frame_8k_size = 80   # 10ms à 8kHz
        frame_48k_size = 480  # 10ms à 48kHz
        remainder = len(audio_float) % frame_8k_size
        if remainder != 0:
            audio_float = np.pad(audio_float, (0, frame_8k_size - remainder), mode="constant")

        cleaned_frames = []
        noise_detected = False

        for i in range(0, len(audio_float), frame_8k_size):
            frame_8k = audio_float[i : i + frame_8k_size]
            # Upsample 80 -> 480 (interpolation linéaire)
            x_old = np.arange(frame_8k_size, dtype=np.float64)
            x_new = np.linspace(0, frame_8k_size - 1, frame_48k_size, dtype=np.float64)
            frame_48k = np.interp(x_new, x_old, frame_8k).astype(np.float32)

            try:
                speech_prob, denoised_48k = denoiser.denoise_frame(frame_48k, partial=False)
            except Exception:
                denoised_48k = frame_48k
            if denoised_48k is None or len(denoised_48k) != frame_48k_size:
                denoised_48k = frame_48k
            # Downsample 480 -> 80 (un échantillon sur 6)
            frame_out = np.asarray(denoised_48k[::6], dtype=np.float32)
            cleaned_frames.append(frame_out)

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

