import api from './api.js';

export const transactionService = {
  /**
   * Fetches paginated transactions with flexible filtering
   */
  getTransactions: async (params = {}) => {
    const res = await api.get('/transactions', { params });
    return res.data;
  },

  /**
   * Fetches transaction detail with populated rule hits, customer profile, risk score, and alert
   */
  getTransactionById: async (id) => {
    const res = await api.get(`/transactions/${id}`);
    return res.data;
  },

  /**
   * Ingests a single real transaction through the core AML monitoring engine
   */
  ingestSingle: async (payload) => {
    const res = await api.post('/transactions/ingest', payload);
    return res.data;
  },

  /**
   * Ingests a batch of real transactions
   */
  ingestBatch: async (transactions) => {
    const res = await api.post('/transactions/batch-ingest', { transactions });
    return res.data;
  }
};

export default transactionService;
