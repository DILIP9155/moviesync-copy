import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { trips, offices, vehicles, simulator, demo, locations as locationsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket, useLocationUpdates, useGeofenceEvents, useTripUpdates, useStatsUpdates } from '../hooks/useSocket';
import CommandCenter from '../components/CommandCenter';
import Filters from '../components/Filters';

const DEFAULT_CENTER = [12.9716, 77.5946];
const DEFAULT_ZOOM = 12;

// Animated vehicle icon with speed-based colour
function makeVehicleIcon(vehicleId, speed) {
  const color = speed > 20 ? '#10b981' : speed > 5 ? '#f59e0b' : '#6366f1';
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:36px;height:36px;">
        <div style="
          position:absolute;inset:0;border-radius:50%;background:${color}22;
          animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;
        "></div>
        <div style="
          position:absolute;inset:6px;border-radius:50%;
          background:${color};border:2.5px solid #fff;
          box-shadow:0 2px 8px ${color}88;
          display:flex;align-items:center;justify-content:center;
          font-size:9px;color:#fff;font-weight:700;letter-spacing:-.5px;
        ">${vehicleId.replace('VEH-', '')}</div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function LiveMarkers({ vehiclePositions, activeTrips }) {
  const map = useMap();
  useEffect(() => {
    if (!vehiclePositions.length) return;
    if (vehiclePositions.length === 1) {
      map.setView([vehiclePositions[0].lat, vehiclePositions[0].lng], 14);
      return;
    }
    const bounds = L.latLngBounds(vehiclePositions.map(({ lat, lng }) => [lat, lng]));
    map.fitBounds(bounds.pad(0.15));
  }, [map, vehiclePositions.length]);

  // Deduplicate offices from active trips
  const uniqueOffices = Array.from(
    new Map(
      activeTrips
        .filter((t) => t.officeId && t.officeId.latitude)
        .map((t) => [String(t.officeId._id), t.officeId])
    ).values()
  );

  return (
    <>
      {vehiclePositions.map((v) => (
        <Marker
          key={v.vehicleId}
          position={[v.lat, v.lng]}
          icon={makeVehicleIcon(v.vehicleId, v.speed ?? 0)}
        >
          <Popup>
            <div style={{ minWidth: 140 }}>
              <p style={{ fontWeight: 700, marginBottom: 4 }}>{v.vehicleId}</p>
              <p style={{ fontSize: 12, color: '#64748b' }}>Trip: {v.tripId || '–'}</p>
              <p style={{ fontSize: 12, color: '#64748b' }}>Speed: {v.speed ?? 0} km/h</p>
              <p style={{ fontSize: 12, color: '#64748b' }}>
                {v.lat?.toFixed(5)}, {v.lng?.toFixed(5)}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
      {uniqueOffices.map((office) => (
        <Circle
          key={office._id}
          center={[office.latitude, office.longitude]}
          radius={office.geofenceRadiusMeters || 200}
          pathOptions={{ color: '#0d9488', fillColor: '#0d9488', fillOpacity: 0.10, weight: 2, dashArray: '6 3' }}
        />
      ))}
    </>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTrips, setActiveTrips] = useState([]);
  const [allTrips, setAllTrips] = useState([]);
  const [officesList, setOfficesList] = useState([]);
  const [vehiclePositions, setVehiclePositions] = useState({});
  const [stats, setStats] = useState({ ongoing: 0, delayed: 0, inOffice: 0, nearPickup: 0, totalCompleted: 0, activeVehicles: 0 });
  const [filters, setFilters] = useState({ region: '', officeId: '', routeId: '', from: '', to: '' });
  const [recentEvents, setRecentEvents] = useState([]);
  const [simRunning, setSimRunning] = useState([]);
  const [simLoading, setSimLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [toast, setToast] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [streamForm, setStreamForm] = useState({ vehicleId: 'VEH-001', tripId: 'TRIP-001', latitude: 12.9716, longitude: 77.5946, speed: 0 });
  const [streaming, setStreaming] = useState(false);
  const streamIntervalRef = useRef(null);
  const { socket, connected } = useSocket();

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      setNotificationsEnabled(true);
      showToast('Notifications already enabled');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === 'granted');
    if (permission === 'granted') showToast('Notifications enabled ✓');
    else showToast('Notifications blocked', 'warning');
  }, []);

  const showBrowserNotification = useCallback((title, body) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try { new Notification(title, { body, icon: '/favicon.svg' }); } catch (e) { /* noop */ }
  }, []);

  const fetchActive = useCallback(async () => {
    try {
      const { data } = await trips.active();
      setActiveTrips(data);
      setStats((s) => ({ ...s, ongoing: data.length }));
      setApiError('');
    } catch (err) {
      if (err.response?.status !== 401) setApiError(err.response?.data?.error || 'Failed to load trips');
    }
  }, []);

  const fetchTrips = useCallback(async () => {
    try {
      const params = {};
      if (filters.region) params.region = filters.region;
      if (filters.officeId) params.officeId = filters.officeId;
      if (filters.routeId) params.routeId = filters.routeId;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      const { data } = await trips.list(params);
      setAllTrips(data);
    } catch (err) {
      if (err.response?.status !== 401) setApiError(err.response?.data?.error || 'Failed to load trips');
    }
  }, [filters]);

  const fetchOffices = useCallback(async () => {
    try {
      const { data } = await offices.list(filters.region ? { region: filters.region } : {});
      setOfficesList(data);
    } catch (err) {
      if (err.response?.status !== 401) setApiError(err.response?.data?.error || 'Failed to load offices');
    }
  }, [filters.region]);

  const fetchVehicles = useCallback(async () => {
    try {
      const { data } = await vehicles.list();
      const positions = {};
      data.forEach((v) => {
        if (v.lastLocation?.lat != null) {
          positions[v.vehicleId] = {
            vehicleId: v.vehicleId,
            tripId: null,
            lat: v.lastLocation.lat,
            lng: v.lastLocation.lng,
            speed: v.lastLocation.speed
          };
        }
      });
      setVehiclePositions(positions);
      setApiError('');
    } catch (err) {
      if (err.response?.status !== 401) setApiError(err.response?.data?.error || 'Failed to load vehicles');
    }
  }, []);

  const fetchSimStatus = useCallback(async () => {
    try {
      const { data } = await simulator.status();
      setSimRunning(data.running || []);
    } catch {
      setSimRunning([]);
    }
  }, []);

  // --- Socket hooks ---
  useLocationUpdates(socket, (payload) => {
    setVehiclePositions((prev) => ({
      ...prev,
      [payload.vehicleId]: {
        vehicleId: payload.vehicleId,
        tripId: payload.tripId,
        lat: payload.latitude,
        lng: payload.longitude,
        speed: payload.speed
      }
    }));
  });

  useGeofenceEvents(socket, (event) => {
    const ts = new Date().toLocaleTimeString('en-IN', { hour12: false });
    setRecentEvents((prev) => [{ ...event, receivedAt: ts }, ...prev.slice(0, 19)]);
    const label = event.type || event.eventType || 'Event';
    showBrowserNotification(`🚌 ${label}`, `Trip ${event.tripId} · Vehicle ${event.vehicleId}`);
    showToast(`${label} — ${event.tripId}`, label.includes('Completed') ? 'success' : 'info');
  });

  useTripUpdates(socket, (updatedTrip) => {
    setActiveTrips((prev) => {
      const idx = prev.findIndex((t) => t.tripId === updatedTrip.tripId);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], status: updatedTrip.status };
        return next.filter((t) => t.status !== 'Completed');
      }
      return prev;
    });
  });

  // NEW: Real-time stats from server
  useStatsUpdates(socket, (liveStats) => {
    setStats(liveStats);
  });

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') setNotificationsEnabled(true);
  }, []);

  useEffect(() => {
    fetchActive();
    fetchOffices();
    fetchVehicles();
    fetchSimStatus();
    const t = setInterval(() => {
      fetchActive();
      fetchTrips();
      fetchSimStatus();
    }, 15000);
    return () => clearInterval(t);
  }, [fetchActive, fetchOffices, fetchVehicles, fetchSimStatus]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);
  useEffect(() => { return () => { if (streamIntervalRef.current) clearInterval(streamIntervalRef.current); }; }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const sendLocationNow = async () => {
    try {
      await locationsApi.stream({
        vehicleId: streamForm.vehicleId,
        tripId: streamForm.tripId,
        latitude: Number(streamForm.latitude),
        longitude: Number(streamForm.longitude),
        speed: Number(streamForm.speed) || 0,
        timestamp: new Date().toISOString()
      });
      showToast('Location sent — map updated ✓');
    } catch (err) {
      setApiError(err.response?.data?.error || 'Failed to send location');
    }
  };

  const toggleStreamEvery5s = () => {
    if (streaming) {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
      setStreaming(false);
      showToast('Stream stopped');
      return;
    }
    setStreaming(true);
    showToast('Streaming every 5s — watch the map!');
    const send = () => {
      locationsApi.stream({
        vehicleId: streamForm.vehicleId, tripId: streamForm.tripId,
        latitude: Number(streamForm.latitude), longitude: Number(streamForm.longitude),
        speed: Number(streamForm.speed) || 0, timestamp: new Date().toISOString()
      }).catch(() => setStreaming(false));
    };
    send();
    streamIntervalRef.current = setInterval(send, 5000);
  };

  // Load demo + auto-start fleet
  const handleLoadFleetDemo = async () => {
    setDemoLoading(true);
    setApiError('');
    try {
      await demo.seed();
      await fetchActive();
      await fetchOffices();
      await fetchVehicles();
      showToast('🚀 Fleet loaded! Click "Start Fleet" to run all vehicles.', 'success');
    } catch (err) {
      setApiError(err.response?.data?.error || 'Failed to load demo data');
      showToast('Failed to load demo', 'error');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleStartFleet = async () => {
    setSimLoading(true);
    setApiError('');
    try {
      const { data } = await simulator.startFleet();
      await fetchSimStatus();
      showToast(`🚗 Fleet started! ${data.message}`);
    } catch (err) {
      setApiError(err.response?.data?.error || 'Failed to start fleet');
      showToast('Failed to start fleet', 'error');
    } finally {
      setSimLoading(false);
    }
  };

  const handleStopFleet = async () => {
    setSimLoading(true);
    try {
      await simulator.stopFleet();
      setSimRunning([]);
      showToast('Fleet stopped');
    } catch (err) {
      setApiError(err.response?.data?.error || 'Failed to stop fleet');
    } finally {
      setSimLoading(false);
    }
  };

  const handleSimStart = async (tripId) => {
    setSimLoading(true);
    setApiError('');
    try {
      await simulator.start(tripId);
      setSimRunning((r) => (r.includes(tripId) ? r : [...r, tripId]));
      showToast('Simulation started — watch the map!');
    } catch (err) {
      setApiError(err.response?.data?.error || 'Failed to start simulation');
    } finally {
      setSimLoading(false);
    }
  };

  const handleSimStop = async (tripId) => {
    setSimLoading(true);
    try {
      await simulator.stop(tripId);
      setSimRunning((r) => r.filter((id) => id !== tripId));
      showToast('Simulation stopped');
    } catch (err) {
      setApiError(err.response?.data?.error || 'Failed to stop simulation');
    } finally {
      setSimLoading(false);
    }
  };

  const positionsList = Object.values(vehiclePositions);
  const anySimRunning = simRunning.length > 0;

  return (
    <div className="flex flex-col h-screen bg-slate-950">
      {/* CSS keyframes injected inline */}
      <style>{`
        @keyframes ping { 75%,100%{transform:scale(2);opacity:0} }
        @keyframes pulse-stat { 0%,100%{opacity:1} 50%{opacity:.65} }
        .stat-pulse { animation: pulse-stat .6s ease-in-out 2; }
      `}</style>

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/90 shrink-0 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-teal-500/30">
            M
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">Moveinsync Vehicle Tracking</h1>
            <p className="text-[11px] text-slate-500">Real-time geofence &amp; trip automation</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${connected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            {connected ? 'Live' : 'Offline'}
          </span>
          <span className="text-sm text-slate-400 hidden sm:block">{user?.name}</span>
          <button type="button" onClick={handleLogout} className="text-xs text-slate-500 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition">
            Logout
          </button>
        </div>
      </header>

      {apiError && (
        <div className="mx-4 mt-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs px-4 py-2">
          ⚠ {apiError}
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-xl shadow-2xl text-sm font-medium backdrop-blur-sm transition-all ${toast.type === 'error' ? 'bg-red-600/95 text-white' :
            toast.type === 'warning' ? 'bg-amber-500/95 text-slate-900' :
              'bg-teal-600/95 text-white'
          }`}>
          {toast.message}
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-80 border-r border-slate-800 bg-slate-900/60 flex flex-col shrink-0 min-h-0 overflow-y-auto">

          {/* Notifications */}
          <div className="shrink-0 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-400">🔔 Push Notifications</span>
            <button
              type="button"
              onClick={requestNotificationPermission}
              className={`text-xs px-3 py-1 rounded-lg font-medium transition ${notificationsEnabled || (typeof Notification !== 'undefined' && Notification.permission === 'granted')
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-700 text-slate-300 hover:bg-teal-500/20 hover:text-teal-400 border border-slate-600'
                }`}
            >
              {typeof Notification !== 'undefined' && Notification.permission === 'granted' ? '✓ On' : 'Enable'}
            </button>
          </div>

          {/* Filters */}
          <div className="shrink-0">
            <Filters filters={filters} setFilters={setFilters} offices={officesList} />
          </div>

          {/* Fleet Controls */}
          <div className="shrink-0 border-b border-slate-800 p-4 bg-slate-800/20">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-slate-200">🚗 Fleet Simulator</h3>
              {anySimRunning && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 animate-pulse">
                  {simRunning.length} running
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mb-3">
              Enable notifications · Load demo · Start fleet · Watch map &amp; stats update live
            </p>

            {activeTrips.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-teal-500/30 bg-teal-500/5 p-4 text-center">
                <p className="text-xs text-slate-400 mb-3">No active trips. Load 5-vehicle fleet demo first.</p>
                <button
                  type="button"
                  onClick={handleLoadFleetDemo}
                  disabled={demoLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-semibold text-sm transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50"
                >
                  {demoLoading ? '⏳ Loading…' : '🚀 Load Fleet Demo (5 vehicles)'}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Fleet-wide buttons */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleStartFleet}
                    disabled={simLoading || anySimRunning}
                    className="flex-1 py-2 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white text-xs font-semibold transition-all shadow shadow-teal-500/20 disabled:opacity-40"
                  >
                    ▶ Start Fleet
                  </button>
                  <button
                    type="button"
                    onClick={handleStopFleet}
                    disabled={simLoading || !anySimRunning}
                    className="flex-1 py-2 rounded-lg bg-red-500/80 hover:bg-red-500 text-white text-xs font-semibold transition disabled:opacity-40"
                  >
                    ■ Stop Fleet
                  </button>
                </div>

                {/* Reload demo button */}
                <button
                  type="button"
                  onClick={handleLoadFleetDemo}
                  disabled={demoLoading}
                  className="w-full py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 text-xs transition disabled:opacity-40"
                >
                  {demoLoading ? 'Loading…' : '↺ Re-seed Fleet'}
                </button>

                {/* Per-trip controls */}
                <div className="space-y-1 pt-1 max-h-48 overflow-y-auto">
                  {activeTrips.slice(0, 10).map((t) => (
                    <div
                      key={t.tripId}
                      className={`flex items-center justify-between gap-2 p-2 rounded-lg border transition ${simRunning.includes(t.tripId)
                          ? 'bg-emerald-500/5 border-emerald-500/30'
                          : 'bg-slate-800/40 border-slate-700/60'
                        }`}
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-medium text-slate-200 truncate">{t.tripId}</p>
                        <p className="text-[10px] text-slate-500">{t.vehicleId}</p>
                      </div>
                      {simRunning.includes(t.tripId) ? (
                        <button
                          type="button"
                          onClick={() => handleSimStop(t.tripId)}
                          disabled={simLoading}
                          className="shrink-0 rounded bg-red-500 hover:bg-red-400 text-white px-2 py-1 text-[10px] font-semibold transition disabled:opacity-50"
                        >
                          Stop
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSimStart(t.tripId)}
                          disabled={simLoading}
                          className="shrink-0 rounded bg-teal-500 hover:bg-teal-400 text-white px-2 py-1 text-[10px] font-semibold transition disabled:opacity-50"
                        >
                          Start
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Manual Location Stream */}
          <div className="shrink-0 border-b border-slate-800 p-4 bg-slate-800/10">
            <h3 className="text-sm font-semibold text-slate-200 mb-1">📡 Location Stream API</h3>
            <p className="text-[10px] text-slate-500 mb-3">Manually push GPS: vehicleId · tripId · lat · lng · speed · timestamp</p>
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                <input type="text" value={streamForm.vehicleId} onChange={(e) => setStreamForm((f) => ({ ...f, vehicleId: e.target.value }))} placeholder="Vehicle ID" className="rounded-lg bg-slate-800 border border-slate-700 px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500/50" />
                <input type="text" value={streamForm.tripId} onChange={(e) => setStreamForm((f) => ({ ...f, tripId: e.target.value }))} placeholder="Trip ID" className="rounded-lg bg-slate-800 border border-slate-700 px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500/50" />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <input type="number" step="any" value={streamForm.latitude} onChange={(e) => setStreamForm((f) => ({ ...f, latitude: e.target.value }))} placeholder="Lat" className="rounded-lg bg-slate-800 border border-slate-700 px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500/50" />
                <input type="number" step="any" value={streamForm.longitude} onChange={(e) => setStreamForm((f) => ({ ...f, longitude: e.target.value }))} placeholder="Lng" className="rounded-lg bg-slate-800 border border-slate-700 px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500/50" />
              </div>
              <input type="number" min="0" value={streamForm.speed} onChange={(e) => setStreamForm((f) => ({ ...f, speed: e.target.value }))} placeholder="Speed (km/h)" className="w-full rounded-lg bg-slate-800 border border-slate-700 px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500/50" />
              <div className="flex gap-1.5 pt-1">
                <button type="button" onClick={sendLocationNow} className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition">Send Once</button>
                <button type="button" onClick={toggleStreamEvery5s} className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${streaming ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-teal-600 hover:bg-teal-500 text-white'}`}>
                  {streaming ? '⏹ Stop 5s' : '▶ Stream 5s'}
                </button>
              </div>
            </div>
          </div>

          {/* Command Center */}
          <div className="shrink-0 min-h-[300px]">
            <CommandCenter
              stats={stats}
              activeTrips={activeTrips}
              recentEvents={recentEvents}
              simRunning={simRunning}
            />
          </div>
        </aside>

        {/* Map */}
        <main className="flex-1 relative min-w-0">
          {positionsList.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="text-center bg-slate-900/80 backdrop-blur rounded-2xl border border-slate-700 p-6 max-w-xs">
                <div className="text-4xl mb-2">🗺️</div>
                <p className="text-sm font-semibold text-slate-200 mb-1">No live vehicles yet</p>
                <p className="text-xs text-slate-500">Load Fleet Demo → Start Fleet to see 5 vehicles move in real-time</p>
              </div>
            </div>
          )}
          <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} className="h-full w-full" zoomControl>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <LiveMarkers vehiclePositions={positionsList} activeTrips={activeTrips} />
          </MapContainer>
        </main>
      </div>
    </div>
  );
}
