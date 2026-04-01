import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
});

export async function fetchEvents(params = {}) {
  const { data } = await api.get('/events', { params });
  return data;
}

export async function fetchStats(params = {}) {
  const { data } = await api.get('/stats', { params });
  return data;
}

export async function checkHealth() {
  const { data } = await api.get('/health');
  return data;
}
