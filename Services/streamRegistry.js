const activeStreams = new Map(); // streamSid -> { connection, callSid, startedAt }

export function registerStream(streamSid, connection, callSid) {
  if (!streamSid || !connection) return;
  activeStreams.set(streamSid, {
    connection,
    callSid: callSid || null,
    startedAt: Date.now(),
  });
}

export function unregisterStream(streamSid) {
  if (!streamSid) return;
  activeStreams.delete(streamSid);
}

export function stopStream(streamSid, reason = "Stopped by API") {
  const entry = activeStreams.get(streamSid);
  if (!entry) return false;
  try {
    if (entry.connection && entry.connection.readyState === entry.connection.OPEN) {
      entry.connection.close(4000, reason);
    }
  } finally {
    activeStreams.delete(streamSid);
  }
  return true;
}

export default {
  registerStream,
  unregisterStream,
  stopStream,
};


