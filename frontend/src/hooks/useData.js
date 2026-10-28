import { useState, useEffect, useRef, useCallback } from 'react';
import { createWebSocket, fetchLatest, fetchHistory, fetchCropRecommendations, fetchZones, fetchIrrigationStatus, fetchStats } from '../api';

export function useLiveData() {
  const [sensorData, setSensorData] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [irrigationData, setIrrigationData] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    // Initial fetch
    fetchLatest().then(data => {
      setSensorData(data.sensors);
      setHealthData(data.health);
      setIrrigationData(data.irrigation);
    }).catch(() => {});

    // WebSocket for real-time updates
    wsRef.current = createWebSocket((msg) => {
      if (msg.type === 'sensor_update') {
        setSensorData(msg.data);
        setHealthData(msg.health);
        setIrrigationData(msg.irrigation);
        setConnected(true);
      }
    });

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return { sensorData, healthData, irrigationData, connected };
}

export function useHistory(hours = 24) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback((h) => {
    setLoading(true);
    fetchHistory(h || hours).then(data => {
      setHistory(data.readings || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [hours]);

  useEffect(() => {
    refresh();
    const interval = setInterval(() => refresh(), 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { history, loading, refresh };
}

export function useCropRecommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [mlPrediction, setMlPrediction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      fetchCropRecommendations().then(data => {
        setRecommendations(data.recommendations || []);
        setMlPrediction(data.ml_prediction);
        setLoading(false);
      }).catch(() => setLoading(false));
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  return { recommendations, mlPrediction, loading };
}

export function useZones() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      fetchZones().then(data => {
        setZones(data.zones || []);
        setLoading(false);
      }).catch(() => setLoading(false));
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  return { zones, loading };
}

export function useIrrigation() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      fetchIrrigationStatus().then(data => {
        setStatus(data);
        setLoading(false);
      }).catch(() => setLoading(false));
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  return { status, loading };
}

export function useStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const load = () => {
      fetchStats().then(setStats).catch(() => {});
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  return stats;
}
