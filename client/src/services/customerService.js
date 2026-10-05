import api from './api.js';

export const customerService = {
  /**
   * Retrieves list of customers with optional search and risk filters
   */
  getCustomers: async (params = {}) => {
    const res = await api.get('/customers', { params });
    return res.data;
  },

  /**
   * Retrieves a single customer profile, transactions, alerts, and calculated metrics
   */
  getCustomerById: async (id) => {
    const res = await api.get(`/customers/${id}`);
    return res.data;
  },

  /**
   * Creates a new customer profile in the AML system
   */
  createCustomer: async (payload) => {
    const res = await api.post('/customers', payload);
    return res.data;
  }
};

export default customerService;
