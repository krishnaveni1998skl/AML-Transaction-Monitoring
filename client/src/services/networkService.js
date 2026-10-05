import api from './api.js';

export const networkService = {
  getNetworkGraph: async (params = {}) => {
    const response = await api.get('/network/graph', { params });
    return response.data;
  },

  getPatterns: async (params = {}) => {
    const response = await api.get('/network/patterns', { params });
    return response.data;
  },

  getEntitySummary: async (entityId) => {
    const response = await api.get(`/network/entity/${entityId}`);
    return response.data;
  }
};

export default networkService;
