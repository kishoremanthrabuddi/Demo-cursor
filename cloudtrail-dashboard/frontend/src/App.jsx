import { useState } from 'react';
import { useDashboard } from './hooks/useDashboard';
import FilterPanel from './components/FilterPanel';
import SummaryCards from './components/SummaryCards';
import StatsCharts from './components/StatsCharts';
import EventTable from './components/EventTable';
import TimelineView from './components/TimelineView';

const TABS = ['Overview', 'Events', 'Timeline'];

export default function App() {
  const [activeTab, setActiveTab] = useState('Overview');
  const { events, stats, pagination, loading, error, applyFilters, goToPage } = useDashboard();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">CloudTrail Dashboard</h1>
            <p className="text-xs text-gray-500">AWS API Activity Monitor & Risk Detection</p>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                  activeTab === tab
                    ? 'bg-white text-gray-900 shadow-sm font-medium'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-severity-high text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <FilterPanel onApply={applyFilters} loading={loading.events || loading.stats} />

        {activeTab === 'Overview' && (
          <>
            <SummaryCards stats={stats} loading={loading.stats} />
            <StatsCharts stats={stats} loading={loading.stats} />
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent Risk Events</h2>
              <TimelineView events={events} />
            </div>
          </>
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

      <footer className="border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-xs text-gray-400">
          CloudTrail Dashboard — Querying AWS CloudTrail via Athena
        </div>
      </footer>
    </div>
  );
}
