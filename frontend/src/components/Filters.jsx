export default function Filters({ filters, setFilters, offices }) {
  return (
    <div className="border-b border-slate-800 p-4">
      <h2 className="text-sm font-semibold text-slate-300 mb-3">Filters</h2>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Region</label>
          <input
            type="text"
            value={filters.region}
            onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value }))}
            placeholder="e.g. Bangalore"
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-moveinsync-green/50 focus:border-moveinsync-green"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Office</label>
          <select
            value={filters.officeId}
            onChange={(e) => setFilters((f) => ({ ...f, officeId: e.target.value }))}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-moveinsync-green/50"
          >
            <option value="">All offices</option>
            {offices.map((o) => (
              <option key={o._id} value={o._id}>{o.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Route ID</label>
          <input
            type="text"
            value={filters.routeId}
            onChange={(e) => setFilters((f) => ({ ...f, routeId: e.target.value }))}
            placeholder="Route ID"
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-moveinsync-green/50"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-slate-500 mb-1">From</label>
            <input
              type="datetime-local"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-2 py-1.5 text-xs text-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">To</label>
            <input
              type="datetime-local"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-2 py-1.5 text-xs text-slate-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
