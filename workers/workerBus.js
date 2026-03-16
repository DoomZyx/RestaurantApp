/**
 * Bus d'événements in-memory pour le Gateway (Phase 4).
 * Permet de découpler réception audio, traitement (audioWorker) et LLM (llmWorker).
 */

const listeners = new Map();

/**
 * Souscrit à un topic. Retourne une fonction unsubscribe.
 * @param {string} topic - Ex: "media:in", "media:cleaned", "openai:out"
 * @param {(data: unknown) => void | Promise<void>} handler
 * @returns {() => void}
 */
export function subscribe(topic, handler) {
  if (!listeners.has(topic)) {
    listeners.set(topic, []);
  }
  listeners.get(topic).push(handler);
  return () => {
    const list = listeners.get(topic);
    if (!list) return;
    const i = list.indexOf(handler);
    if (i !== -1) list.splice(i, 1);
  };
}

/**
 * Publie un message sur un topic (tous les handlers sont appelés).
 * @param {string} topic
 * @param {unknown} data
 */
export function publish(topic, data) {
  const list = listeners.get(topic);
  if (!list || list.length === 0) return;
  for (const handler of list) {
    try {
      const r = handler(data);
      if (r && typeof r.then === "function") {
        r.catch((err) => {
          console.error(`[workerBus] handler error on ${topic}:`, err);
        });
      }
    } catch (err) {
      console.error(`[workerBus] handler error on ${topic}:`, err);
    }
  }
}

export const workerBus = { subscribe, publish };
