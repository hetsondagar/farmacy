const API_BASE = 'http://localhost:8000';
const WS_BASE = 'ws://localhost:8000';

export async function fetchLatest() {
  const res = await fetch(`${API_BASE}/api/sensors/latest`);
  return res.json();
}

export async function fetchHistory(hours = 24) {
  const res = await fetch(`${API_BASE}/api/sensors/history?hours=${hours}`);
  return res.json();
}

export async function fetchFarmHealth() {
  const res = await fetch(`${API_BASE}/api/farm/health`);
  return res.json();
}

export async function fetchCropRecommendations() {
  const res = await fetch(`${API_BASE}/api/crops/recommend`);
  return res.json();
}

export async function fetchIrrigationStatus() {
  const res = await fetch(`${API_BASE}/api/irrigation/status`);
  return res.json();
}

export async function controlIrrigation(data) {
  const res = await fetch(`${API_BASE}/api/irrigation/control`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchIrrigationHistory(limit = 50) {
  const res = await fetch(`${API_BASE}/api/irrigation/history?limit=${limit}`);
  return res.json();
}

export async function fetchZones() {
  const res = await fetch(`${API_BASE}/api/zones`);
  return res.json();
}

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/api/stats`);
  return res.json();
}

export async function fetchReverseCheckCrops() {
  const res = await fetch(`${API_BASE}/api/crops/reverse-check/crops`);
  return res.json();
}

export async function fetchReverseCheck(crop = 'tomato') {
  const res = await fetch(`${API_BASE}/api/crops/reverse-check?crop=${encodeURIComponent(crop)}`);
  return res.json();
}

export async function checkCustomConditions(data) {
  const res = await fetch(`${API_BASE}/api/crops/reverse-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function saveCropData(data) {
  const res = await fetch(`${API_BASE}/api/crops/save-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export function createWebSocket(onMessage) {
  const ws = new WebSocket(`${WS_BASE}/ws/live`);

  ws.onopen = () => {
    console.log('[WS] Connected to FARMACY backend');
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      console.error('[WS] Parse error:', e);
    }
  };

  ws.onerror = (err) => {
    console.error('[WS] Error:', err);
  };

  ws.onclose = () => {
    console.log('[WS] Disconnected. Reconnecting in 3s...');
    setTimeout(() => createWebSocket(onMessage), 3000);
  };

  return ws;
}
