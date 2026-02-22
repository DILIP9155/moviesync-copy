import { useState, useEffect, useRef } from 'react';

// Configuration for different vehicle statuses
const STAT_CONFIGS = [
  { key: 'ongoing', label: 'Ongoing', color: 'emerald', icon: '\uD83D\uDE97' },
  { key: 'delayed', label: 'Delayed', color: 'amber', icon: '\u26A0\uFE0F' },
  { key: 'inOffice', label: 'At Office', color: 'cyan', icon: '\uD83C\uDFE2' },
  { key: 'nearPickup', label: 'Pickup', color: 'violet', icon: '\uD83D\uDCCD' },
];

// Color mapping for status badges
const COLOR = {
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', ring: 'ring-emerald-500/40' },
  amber: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/25', ring: 'ring-amber-500/40' },
  cyan: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/25', ring: 'ring-cyan-500/40' },
  violet: { text: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/25', ring: 'ring-violet-500/40' },
};

// AnimatedStat component: Displays a statistic with animation on value change
function AnimatedStat({ cfg, value }) {
  const [pulse, setPulse] = useState(false);
  const prevRef = useRef(value);
  const c = COLOR[cfg.color];

  useEffect(() => {
    if (prevRef.current !== value) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 700);
      prevRef.current = value;
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <div className={`rounded-xl p-3 border transition-all duration-300 ${c.bg} ${c.border} ${pulse ? `ring-2 ${c.ring} scale-105` : ''}`}>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1">
        <span>{cfg.icon}</span>{cfg.label}
      </p>
      <p className={`text-2xl font-bold leading-none ${c.text} ${pulse ? 'animate-bounce' : ''}`}>
        {value ?? 0}
      </p>
    </div>
  );
}

// StatusBadge component: Displays a badge for trip status
function StatusBadge({ status }) {
  const map = {
    'In Progress': 'bg-emerald-500/20 text-emerald-400',
    'Started': 'bg-cyan-500/20 text-cyan-400',
    'Completed': 'bg-slate-600/50 text-slate-400',
    'Scheduled': 'bg-violet-500/20 text-violet-400',
    'Cancelled': 'bg-red-500/20 text-red-400',
  };
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${map[status] || ''}`}>{status}</span>
  );
}

export default function CommandCenter({ stats, activeTrips, recentEvents, simRunning = [] }) {
  const [lastTick, setLastTick] = useState('–');

  useEffect(() => {
    if (recentEvents.length === 0) return;
    setLastTick(new Date().toLocaleTimeString('en-IN', { hour12: false }));
  }, [recentEvents.length]);

  return (
    <div className="border-t border-slate-800 flex flex-col">
      {/* Header */}
      <div className="px-4 py-2.5 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${simRunning.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
          <h2 className="text-sm font-bold text-slate-200">Command Center</h2>
        </div>
        <span className="text-[10px] text-slate-600 font-mono">{lastTick}</span>
      </div>

      {/* Stat cards */}
      <div className="p-3 grid grid-cols-2 gap-2 shrink-0">
        {STAT_CONFIGS.map((cfg) => (
          <AnimatedStat key={cfg.key} cfg={cfg} value={stats?.[cfg.key]} />
        ))}
      </div>

      {/* Extra counters row */}
      <div className="px-3 pb-2 flex gap-2 text-[10px] text-slate-500">
        <span className="flex-1 text-center bg-slate-800/40 rounded-lg py-1 border border-slate-700/50">
          <span className="text-teal-400 font-bold">{stats?.activeVehicles ?? 0}</span> sim running
        </span>
        <span className="flex-1 text-center bg-slate-800/40 rounded-lg py-1 border border-slate-700/50">
          <span className="text-slate-300 font-bold">{stats?.totalCompleted ?? 0}</span> completed
        </span>
      </div>

      {/* Active trips */}
      <div className="px-3 pb-2">
        <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active trips
        </h3>
        <ul className="space-y-1 max-h-28 overflow-y-auto pr-0.5">
          {activeTrips.slice(0, 10).map((t) => (
            <li key={t.tripId} className={`flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg border transition ${simRunning.includes(t.tripId)
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-slate-800/40 border-slate-700/40'
              }`}>
              <div className="min-w-0 flex-1">
                <span className="font-mono text-slate-200 text-[11px]">{t.tripId}</span>
                <span className="text-slate-600 text-[10px] ml-1.5">{t.vehicleId}</span>
              </div>
              <StatusBadge status={t.status} />
            </li>
          ))}
          {activeTrips.length === 0 && (
            <li className="text-xs text-slate-600 px-2 py-2 text-center italic">
              No active trips — load fleet demo
            </li>
          )}
        </ul>
      </div>

      {/* Geofence events */}
      <div className="px-3 pb-3">
        <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Live events
        </h3>
        <ul className="space-y-1 max-h-40 overflow-y-auto pr-0.5">
          {recentEvents.slice(0, 15).map((ev, i) => {
            const type = ev.eventType || ev.type || 'Event';
            const isArrival = type.toLowerCase().includes('pickup');
            const isCompleted = type.toLowerCase().includes('completed');
            const dotColor = isCompleted ? 'bg-emerald-400' : isArrival ? 'bg-violet-400' : 'bg-cyan-400';
            return (
              <li key={i} className="flex items-start gap-2 py-1.5 px-2 rounded-lg bg-slate-800/30 border border-slate-700/30 text-[10px]">
                <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${dotColor}`} />
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate ${isCompleted ? 'text-emerald-400' : isArrival ? 'text-violet-400' : 'text-cyan-400'}`}>
                    {type}
                  </p>
                  <p className="text-slate-500 font-mono truncate">
                    {ev.tripId}
                    {ev.vehicleId ? ` · ${ev.vehicleId}` : ''}
                  </p>
                </div>
                <span className="text-slate-600 font-mono shrink-0">{ev.receivedAt || ''}</span>
              </li>
            );
          })}
          {recentEvents.length === 0 && (
            <li className="text-[10px] text-slate-600 px-2 py-3 text-center italic">
              Start simulator → events appear here ~30s later
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
