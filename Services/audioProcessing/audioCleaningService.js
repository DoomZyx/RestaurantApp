/**
 * Nettoyage audio via RNNoise WASM (réduction du bruit)
 * Remplace l'ancien service Python : tout s'exécute dans le processus Node.
 */

import { fileURLToPath, pathToFileURL } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgDir = join(__dirname, "../../node_modules/@jitsi/rnnoise-wasm");
const WASM_PATH = join(pkgDir, "dist/rnnoise.wasm");

// Import direct du dist (le package index utilise "./dist/rnnoise" sans .js, incompatible Node ESM)
const { default: createRNNWasmModule } = await import(pathToFileURL(join(pkgDir, "dist/rnnoise.js")).href);
const FRAME_SAMPLES = 480; // RNNoise attend 480 échantillons float32 (10 ms à 48 kHz)
const IN_RATE = 8000;   // Twilio : 8 kHz
const OUT_RATE = 48000; // RNNoise : 48 kHz
const MULAW_FRAME = 160; // 20 ms à 8 kHz

let wasmModule = null;
let rnnoiseContext = null;
let heapF32 = null;
let ptrInput = null;
let ptrOutput = null;

// Table G.711 mu-law -> lin16 (pour décode)
const MULAW_DECODE_TABLE = new Int16Array(256);
(function () {
  for (let i = 0; i < 256; i++) {
    const mulaw = ~i;
    const sign = (mulaw & 0x80) ? -1 : 1;
    const exponent = (mulaw >> 4) & 0x07;
    const mantissa = mulaw & 0x0f;
    MULAW_DECODE_TABLE[i] = sign * (((mantissa << 3) + 132) << exponent) - 132;
  }
})();

function mulawDecode(buffer) {
  const out = new Int16Array(buffer.length);
  for (let i = 0; i < buffer.length; i++) out[i] = MULAW_DECODE_TABLE[buffer[i] & 0xff];
  return out;
}

// Table lin16 -> mu-law (pour encode)
const MULAW_ENCODE_TABLE = new Uint8Array(65536);
(function () {
  const BIAS = 0x84;
  const CLIP = 32635;
  for (let i = -32768; i <= 32767; i++) {
    const sample = i < 0 ? Math.max(-CLIP, i) : Math.min(CLIP, i);
    const sign = (sample >> 8) & 0x80;
    const abs = sample < 0 ? (BIAS - sample) : (sample + BIAS);
    let exponent = 7;
    for (let expMask = 0x4000; (abs & expMask) === 0 && exponent > 0; exponent--, expMask >>= 1) {}
    const mantissa = (abs >> (exponent + 3)) & 0x0f;
    MULAW_ENCODE_TABLE[i + 32768] = ~(sign | (exponent << 4) | mantissa) & 0xff;
  }
})();

function mulawEncode(pcm) {
  const out = new Uint8Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-32768, Math.min(32767, pcm[i]));
    out[i] = MULAW_ENCODE_TABLE[s + 32768];
  }
  return out;
}

/** Upsample 8 kHz -> 48 kHz (x6), linear interpolation */
function upsampleTo48k(float32_8k) {
  const lenIn = float32_8k.length;
  const lenOut = lenIn * 6;
  const out = new Float32Array(lenOut);
  for (let i = 0; i < lenOut; i++) {
    const j = i / 6;
    const lo = Math.floor(j);
    const hi = Math.min(lo + 1, lenIn - 1);
    const t = j - lo;
    out[i] = float32_8k[lo] * (1 - t) + float32_8k[hi] * t;
  }
  return out;
}

/** Downsample 48 kHz -> 8 kHz (take every 6th sample) */
function downsampleTo8k(float32_48k) {
  const lenOut = Math.floor(float32_48k.length / 6);
  const out = new Float32Array(lenOut);
  for (let i = 0; i < lenOut; i++) out[i] = float32_48k[i * 6];
  return out;
}

/**
 * Vérifie si RNNoise WASM est disponible (chargement une fois par processus)
 */
export async function checkRNNoiseAvailability() {
  if (wasmModule !== null) return true;
  if (process.env.ENABLE_NOISE_REDUCTION !== "true") return false;
  try {
    const wasmBinary = readFileSync(WASM_PATH);
    wasmModule = await createRNNWasmModule({ wasmBinary });
    if (!wasmModule._rnnoise_create || !wasmModule._rnnoise_process_frame) {
      wasmModule = null;
      return false;
    }
    wasmModule._rnnoise_init();
    rnnoiseContext = wasmModule._rnnoise_create();
    if (!rnnoiseContext) {
      wasmModule = null;
      return false;
    }
    const byteSize = FRAME_SAMPLES * 4;
    ptrInput = wasmModule._malloc(byteSize);
    ptrOutput = wasmModule._malloc(byteSize);
    if (!ptrInput || !ptrOutput) {
      if (ptrInput) wasmModule._free(ptrInput);
      if (ptrOutput) wasmModule._free(ptrOutput);
      wasmModule._rnnoise_destroy(rnnoiseContext);
      wasmModule = null;
      rnnoiseContext = null;
      return false;
    }
    return true;
  } catch (e) {
    console.warn("RNNoise WASM non disponible:", e?.message || e);
    wasmModule = null;
    return false;
  }
}

/**
 * Traite un bloc de 480 float32 dans le WASM
 */
function processFrame(float480) {
  const heap = wasmModule.HEAPF32;
  const inputOffset = ptrInput / 4;
  const outputOffset = ptrOutput / 4;
  for (let i = 0; i < FRAME_SAMPLES; i++) heap[inputOffset + i] = float480[i];
  wasmModule._rnnoise_process_frame(rnnoiseContext, ptrOutput, ptrInput);
  const out = new Float32Array(FRAME_SAMPLES);
  for (let i = 0; i < FRAME_SAMPLES; i++) out[i] = heap[outputOffset + i];
  return out;
}

/**
 * Nettoie l'audio : base64 mulaw (8 kHz) -> RNNoise WASM -> base64 mulaw
 */
export async function cleanAudio(audioPayload) {
  if (!wasmModule || !rnnoiseContext) return audioPayload;
  try {
    const raw = Buffer.from(audioPayload, "base64");
    if (raw.length !== MULAW_FRAME) return audioPayload;
    const pcm16 = mulawDecode(raw);
    const float8k = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) float8k[i] = pcm16[i] / 32768;
    const float48k = upsampleTo48k(float8k);
    const out48k = new Float32Array(float48k.length);
    for (let f = 0; f + FRAME_SAMPLES <= float48k.length; f += FRAME_SAMPLES) {
      const frame = processFrame(float48k.subarray(f, f + FRAME_SAMPLES));
      out48k.set(frame, f);
    }
    const out8k = downsampleTo8k(out48k);
    const out16 = new Int16Array(out8k.length);
    for (let i = 0; i < out8k.length; i++) out16[i] = Math.max(-32768, Math.min(32767, Math.round(out8k[i] * 32768)));
    const mulawOut = mulawEncode(out16);
    return Buffer.from(mulawOut).toString("base64");
  } catch (e) {
    console.warn("cleanAudio WASM error:", e?.message || e);
    return audioPayload;
  }
}
