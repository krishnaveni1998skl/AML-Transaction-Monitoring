import api from './api.js';

export const dashboardService = {
  getOverview: async (params = {}) => {
    const res = await api.get('/dashboard/overview', { params });
    return res.data;
  },

  getTrends: async (params = {}) => {
    const res = await api.get('/dashboard/trends', { params });
    return res.data;
  },

  getDistributions: async (params = {}) => {
    const res = await api.get('/dashboard/distributions', { params });
    return res.data;
  },

  getRules: async (params = {}) => {
    const res = await api.get('/dashboard/rules', { params });
    return res.data;
  },

  getWorkload: async (params = {}) => {
    const res = await api.get('/dashboard/workload', { params });
    return res.data;
  },

  getTopEntities: async (params = {}) => {
    const res = await api.get('/dashboard/top-entities', { params });
    return res.data;
  },

  getSummaryReport: async (params = {}) => {
    const res = await api.get('/reports/summary', { params });
    return res.data;
  },

  // Helper to trigger browser download of CSV data
  downloadCSV: async (endpoint, filename, params = {}) => {
    const res = await api.get(endpoint, {
      params,
      responseType: 'blob'
    });
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

export default dashboardService;
