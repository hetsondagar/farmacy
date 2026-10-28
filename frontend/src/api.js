const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const API_ORIGIN = API_BASE ? new URL(API_BASE, window.location.origin) : window.location;
const WS_BASE = import.meta.env.VITE_WS_BASE_URL
  || `${API_ORIGIN.protocol === 'https:' ? 'wss:' : 'ws:'}//${API_ORIGIN.host}`;

async function request(path, options) {
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) {
    throw new Error(`FARMACY API request failed (${response.status} ${response.statusText})`);
  }
  return response.json();
}

export async function fetchLatest() {
  return request('/api/sensors/latest');
}

export async function fetchHistory(hours = 24) {
  return request(`/api/sensors/history?hours=${hours}`);
}

export async function fetchFarmHealth() {
  return request('/api/farm/health');
}

export async function fetchCropRecommendations() {
  return request('/api/crops/recommend');
}

export async function fetchIrrigationStatus() {
  return request('/api/irrigation/status');
}

export async function controlIrrigation(data) {
  return request('/api/irrigation/control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function fetchIrrigationHistory(limit = 50) {
  return request(`/api/irrigation/history?limit=${limit}`);
}

export async function fetchZones() {
  return request('/api/zones');
}

export async function fetchStats() {
  return request('/api/stats');
}

export async function fetchReverseCheckCrops() {
  return request('/api/crops/reverse-check/crops');
}

export async function fetchReverseCheck(crop = 'tomato') {
  return request(`/api/crops/reverse-check?crop=${encodeURIComponent(crop)}`);
}

export async function checkCustomConditions(data) {
  return request('/api/crops/reverse-check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function saveCropData(data) {
  return request('/api/crops/save-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function createWebSocket(onMessage, onStatusChange = () => {}) {
  let socket;
  let reconnectTimer;
  let stopped = false;

  const connect = () => {
    if (stopped) return;
    socket = new WebSocket(`${WS_BASE}/ws/live`);
    socket.onopen = () => {
      console.log('[WS] Connected to FARMACY backend');
      onStatusChange(true);
    };
    socket.onmessage = (event) => {
      try {
        onMessage(JSON.parse(event.data));
      } catch (error) {
        console.error('[WS] Message error:', error);
      }
    };
    socket.onerror = (error) => console.error('[WS] Error:', error);
    socket.onclose = () => {
      onStatusChange(false);
      if (!stopped) {
        console.log('[WS] Disconnected. Reconnecting in 3s...');
        reconnectTimer = setTimeout(connect, 3000);
      }
    };
  };

  connect();

  return {
    close() {
      stopped = true;
      clearTimeout(reconnectTimer);
      socket?.close();
    },
  };
}
