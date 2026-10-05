import api from './api.js';

export const ruleService = {
  /**
   * Retrieves all configurable AML rules
   */
  getRules: async (params = {}) => {
    const res = await api.get('/rules', { params });
    return res.data;
  },

  /**
   * Retrieves a single AML rule by ID
   */
  getRuleById: async (id) => {
    const res = await api.get(`/rules/${id}`);
    return res.data;
  },

  /**
   * Creates a new configurable AML rule (Admin / Compliance)
   */
  createRule: async (payload) => {
    const res = await api.post('/rules', payload);
    return res.data;
  },

  /**
   * Updates rule parameters, severity, weight, or active state
   */
  updateRule: async (id, payload) => {
    const res = await api.put(`/rules/${id}`, payload);
    return res.data;
  },

  /**
   * Toggles rule enabled/disabled state
   */
  toggleRule: async (id, isEnabled) => {
    const res = await api.patch(`/rules/${id}/toggle`, { isEnabled });
    return res.data;
  }
};

export default ruleService;
