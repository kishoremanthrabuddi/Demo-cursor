import { useState } from 'react';
import {
  LayoutDashboard,
  TableProperties,
  ShieldAlert,
  Activity,
  Cloud,
} from 'lucide-react';
import { useDashboard } from './hooks/useDashboard';
import FilterPanel from './components/FilterPanel';
import SummaryCards from './components/SummaryCards';
import StatsCharts from './components/StatsCharts';
import EventTable from './components/EventTable';
import TimelineView from './components/TimelineView';

const TABS = [
  { id: 'Overview', icon: LayoutDashboard },
  { id: 'Events', icon: TableProperties },
  { id: 'Timeline', icon: ShieldAlert },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('Overview');
  const { events, stats, pagination, loading, error, applyFilters, goToPage } =
    useDashboard();

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <header className="bg-white border-b border-surface-200 sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="gradient-brand w-9 h-9 rounded-lg flex items-center justify-center shadow-sm">
              <Cloud className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 tracking-tight leading-tight">
                CloudTrail Dashboard
              </h1>
              <p className="text-[11px] text-gray-400 font-medium leading-tight">
                AWS API Activity Monitor
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-1 bg-surface-100 rounded-xl p-1">
            {TABS.map(({ id, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                  activeTab === id
                    ? 'bg-white text-brand-700 shadow-card font-semibold'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {id}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700">Live</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-5 py-4 mb-5">
            <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="font-semibold">Error</p>
              <p className="text-red-600 text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <FilterPanel
          onApply={applyFilters}
          loading={loading.events || loading.stats}
        />

        {activeTab === 'Overview' && (
          <div className="space-y-6">
            <SummaryCards stats={stats} loading={loading.stats} />
            <StatsCharts stats={stats} loading={loading.stats} />
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="w-4.5 h-4.5 text-brand-600" />
                <h2 className="text-sm font-bold text-gray-800">
                  Recent Risk Events
                </h2>
              </div>
              <TimelineView events={events} />
            </div>
          </div>
        )}

        {activeTab === 'Events' && (
          <EventTable
            events={events}
            pagination={pagination}
            onPageChange={goToPage}
            loading={loading.events}
          />
        )}

        {activeTab === 'Timeline' && <TimelineView events={events} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-200 mt-8 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            CloudTrail Dashboard &mdash; Querying AWS CloudTrail via Athena
          </p>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-gray-400">Connected</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
