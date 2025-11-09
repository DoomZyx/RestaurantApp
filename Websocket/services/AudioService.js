import audioCacheService from "../../Services/audioCacheService.js";
import elevenLabsService from "../../Services/elevenLabsService.js";

/**
 * Service de gestion de l'audio avec ElevenLabs
 * Gère la génération, le cache et le streaming de l'audio
 */
export class AudioService {
  /**
   * Génère l'audio avec ElevenLabs et l'envoie à Twilio
   * Stratégie : Cache-first pour économiser les coûts
   * 
   * @param {string} text - Texte à convertir en audio
   * @param {string} streamSid - ID du stream Twilio
   * @param {Object} connection - Connexion WebSocket Twilio
   * @param {Object} callLogger - Logger pour les logs
   * @returns {Promise<void>}
   */
  static async generateAndStreamAudio(text, streamSid, connection, callLogger) {
    try {
      const CHUNK_SIZE = 160; // 20ms pour µ-law 8kHz
      let buffer = Buffer.alloc(0);
      let sentChunks = 0;
      let lastSendTime = Date.now();
      let fromCache = false;

      // 🎯 STRATÉGIE 1 : Vérifier le cache en PREMIER
      const cachedAudio = await audioCacheService.getFromCache(text);
      
      if (cachedAudio) {
        // ✅ CACHE HIT - Utiliser l'audio en cache (INSTANTANÉ + GRATUIT)
        buffer = cachedAudio;
        fromCache = true;
        callLogger.info(streamSid, `🎯 Cache HIT: "${text.substring(0, 30)}..." (${buffer.length} bytes)`);
      } else {
        // ❌ CACHE MISS - Générer avec ElevenLabs et mettre en cache
        callLogger.info(streamSid, `🔄 Cache MISS: Génération ElevenLabs pour "${text.substring(0, 30)}..."`);
        
        // Streaming avec voix AudiA (paramètres optimaux)
        const audioStream = elevenLabsService.textToSpeechStream(text, null, {
          stability: 0.5,
          similarityBoost: 0.85,
          style: 0.15,
          outputFormat: "ulaw_8000",
        });
        
        let tempBuffer = Buffer.alloc(0);
        
        // 🚀 STREAMING EN TEMPS RÉEL : Envoyer dès qu'on reçoit les chunks d'ElevenLabs
        for await (const audioChunk of audioStream) {
          // Ajouter le nouveau chunk au buffer temporaire (pour le cache)
          tempBuffer = Buffer.concat([tempBuffer, audioChunk]);
          
          // Ajouter aussi au buffer d'envoi
          let sendBuffer = Buffer.from(tempBuffer);
          
          // Envoyer tous les chunks de 160 bytes disponibles
          while (sendBuffer.length >= CHUNK_SIZE) {
            const chunk = sendBuffer.slice(0, CHUNK_SIZE);
            sendBuffer = sendBuffer.slice(CHUNK_SIZE);
            
            // Gérer le timing (20ms entre chaque chunk)
            const now = Date.now();
            const elapsed = now - lastSendTime;
            if (elapsed < 20) {
              await new Promise(resolve => setTimeout(resolve, 20 - elapsed));
            }
            
            const audioDelta = {
              event: "media",
              streamSid: streamSid,
              media: {
                payload: chunk.toString("base64"),
              },
            };
            
            connection.send(JSON.stringify(audioDelta));
            sentChunks++;
            lastSendTime = Date.now();
          }
        }
        
        // Envoyer le reste du buffer (< 160 bytes)
        if (buffer.length > 0) {
          const audioDelta = {
            event: "media",
            streamSid: streamSid,
            media: {
              payload: buffer.toString("base64"),
            },
          };
          connection.send(JSON.stringify(audioDelta));
          sentChunks++;
        }
        
        // 💾 Mettre en cache pour les prochaines fois (asynchrone)
        audioCacheService.generateAndCache(text, null, {
          stability: 0.5,
          similarityBoost: 0.85,
          style: 0.15,
        }).catch(err => {
          callLogger.error(streamSid, err, {
            context: "cache_audio_save",
          });
        });
        
        return; // Déjà envoyé dans la boucle streaming
      }
      
      // 📤 ENVOI DEPUIS LE CACHE (buffer complet disponible)
      if (fromCache) {
        let offset = 0;
        
        while (offset < buffer.length) {
          const chunk = buffer.slice(offset, offset + CHUNK_SIZE);
          offset += CHUNK_SIZE;
          
          // Gérer le timing (20ms entre chaque chunk)
          const now = Date.now();
          const elapsed = now - lastSendTime;
          if (elapsed < 20) {
            await new Promise(resolve => setTimeout(resolve, 20 - elapsed));
          }
          
          const audioDelta = {
            event: "media",
            streamSid: streamSid,
            media: {
              payload: chunk.toString("base64"),
            },
          };
          
          connection.send(JSON.stringify(audioDelta));
          sentChunks++;
          lastSendTime = Date.now();
        }
      }
      
      callLogger.info(
        streamSid, 
        `✅ Audio ${fromCache ? '🎯 (cache)' : '🔄 (généré)'} streamé: ${sentChunks} chunks`
      );
      
    } catch (error) {
      callLogger.error(streamSid, error, {
        context: "elevenlabs_tts_generation",
        text: text.substring(0, 100)
      });
    }
  }
}

