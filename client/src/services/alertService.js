import api from './api.js';

export const alertService = {
  getAlerts: async (params = {}) => {
    const response = await api.get('/alerts', { params });
    return response.data;
  },

  getAlertById: async (id) => {
    const response = await api.get(`/alerts/${id}`);
    return response.data;
  },

  assignAlert: async (id, assignedToUserId) => {
    const response = await api.patch(`/alerts/${id}/assign`, { assignedToUserId });
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await api.patch(`/alerts/${id}/status`, { status });
    return response.data;
  },

  addNote: async (id, { noteText, actionTaken = 'NOTE_ADDED', tags = [] }) => {
    const response = await api.post(`/alerts/${id}/notes`, { noteText, actionTaken, tags });
    return response.data;
  },

  escalateAlert: async (id, reason) => {
    const response = await api.post(`/alerts/${id}/escalate`, { reason });
    return response.data;
  },

  closeAlert: async (id, { closingCategory, closingRemarks }) => {
    const response = await api.post(`/alerts/${id}/close`, { closingCategory, closingRemarks });
    return response.data;
  }
};

export default alertService;
