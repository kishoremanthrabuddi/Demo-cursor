import { useState, useEffect, useCallback } from 'react';
import { fetchEvents, fetchStats } from '../services/api';

export function useDashboard() {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState({ events: false, stats: false });
  const [error, setError] = useState(null);

  const loadEvents = useCallback(async (currentFilters, page = 1) => {
    setLoading((prev) => ({ ...prev, events: true }));
    setError(null);
    try {
      const result = await fetchEvents({ ...currentFilters, page, pageSize: 50 });
      setEvents(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading((prev) => ({ ...prev, events: false }));
    }
  }, []);

  const loadStats = useCallback(async (currentFilters) => {
    setLoading((prev) => ({ ...prev, stats: true }));
    try {
      const result = await fetchStats(currentFilters);
      setStats(result);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading((prev) => ({ ...prev, stats: false }));
    }
  }, []);

  const applyFilters = useCallback(
    (newFilters) => {
      setFilters(newFilters);
      loadEvents(newFilters, 1);
      loadStats(newFilters);
    },
    [loadEvents, loadStats]
  );

  const goToPage = useCallback(
    (page) => {
      loadEvents(filters, page);
    },
    [filters, loadEvents]
  );

  useEffect(() => {
    loadEvents({}, 1);
    loadStats({});
  }, [loadEvents, loadStats]);

  return {
    events,
    stats,
    pagination,
    filters,
    loading,
    error,
    applyFilters,
    goToPage,
  };
}
