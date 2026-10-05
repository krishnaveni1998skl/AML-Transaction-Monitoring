import api from './api.js';
import * as XLSX from 'xlsx';

export const sarService = {
  getCandidates: async (params = {}) => {
    const response = await api.get('/sar/candidates', { params });
    return response.data;
  },

  getCases: async (params = {}) => {
    const response = await api.get('/sar/cases', { params });
    return response.data;
  },

  getCaseById: async (id) => {
    const response = await api.get(`/sar/cases/${id}`);
    return response.data;
  },

  createSAR: async ({ alertId, narrativeSummary, typology }) => {
    const response = await api.post('/sar/create', { alertId, narrativeSummary, typology });
    return response.data;
  },

  updateSARStatus: async (id, { status, narrativeSummary }) => {
    const response = await api.patch(`/sar/cases/${id}/status`, { status, narrativeSummary });
    return response.data;
  },

  exportCustomerDetailsCSV: async (params = {}) => {
    const res = await api.get('/reports/export/sar-customers', {
      params,
      responseType: 'blob'
    });
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `aml_sar_customer_details_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  exportSARRegisterCSV: async (params = {}) => {
    const res = await api.get('/reports/export/sar', {
      params,
      responseType: 'blob'
    });
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `aml_sar_cases_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  exportSARRegisterExcel: async ({ cases = [], candidates = [] } = {}) => {
    let targetCases = cases;
    let targetCandidates = candidates;

    if (!targetCases || targetCases.length === 0) {
      try {
        const res = await api.get('/sar/cases', { params: { limit: 100 } });
        if (res.data?.success && res.data?.data?.cases) {
          targetCases = res.data.data.cases;
        }
      } catch (err) {
        console.warn('Failed to prefetch cases for excel export:', err);
      }
    }

    if (!targetCandidates || targetCandidates.length === 0) {
      try {
        const res = await api.get('/sar/candidates', { params: { limit: 100 } });
        if (res.data?.success && res.data?.data?.candidates) {
          targetCandidates = res.data.data.candidates;
        }
      } catch (err) {
        console.warn('Failed to prefetch candidates for excel export:', err);
      }
    }

    // Sheet 1: SAR Case Register
    const caseRows = (targetCases || []).map((c) => ({
      'SAR ID': c.caseId || 'N/A',
      'Customer ID': c.customerId || 'N/A',
      'Customer Name': c.customerName || 'N/A',
      'Typology': c.typology || 'N/A',
      'Suspicious Amount (INR)': c.totalSuspiciousAmountINR ?? 0,
      'Status': c.caseStatus || 'DRAFT',
      'Created Date': c.createdAt ? new Date(c.createdAt).toISOString() : 'N/A',
      'Approved/Reviewed By':
        c.complianceOfficerId?.fullName ||
        c.complianceOfficerId?.username ||
        (c.caseStatus === 'APPROVED_SAR' ? 'Chief Compliance Officer' : 'Pending Assignment'),
      'Approved Date': c.approvedAt ? new Date(c.approvedAt).toISOString() : 'N/A',
      'Narrative Summary': c.narrativeSummary || 'N/A',
      'Linked Alerts': Array.isArray(c.alertIds)
        ? c.alertIds.map((a) => (typeof a === 'object' && a.alertId ? a.alertId : String(a))).join(', ')
        : 'None',
      'Associated Transactions': Array.isArray(c.transactionIds)
        ? c.transactionIds.join(', ')
        : 'None'
    }));

    // Sheet 2: Flagged SAR Candidates
    const candidateRows = (targetCandidates || []).map((cand) => ({
      'Alert / Candidate ID': cand.alertId || 'N/A',
      'Customer ID': cand.customerId || 'N/A',
      'Customer Name': cand.customerName || 'N/A',
      'Risk Score': cand.riskScore ?? 0,
      'Risk Priority': cand.priority || cand.riskLevel || 'HIGH',
      'Amount (INR)': cand.normalizedAmountINR ?? 0,
      'Status': cand.status || 'OPEN',
      'Triggered Rules': Array.isArray(cand.triggeredRules)
        ? cand.triggeredRules.map((r) => r.ruleName || r.ruleCode || String(r)).join('; ')
        : 'None',
      'Created Date': cand.createdAt ? new Date(cand.createdAt).toISOString() : 'N/A',
      'Assigned Analyst': cand.assignedTo?.fullName || cand.assignedTo?.username || 'Unassigned',
      'SAR Candidate Flag': cand.sarCandidate ? 'YES' : 'NO'
    }));

    const wb = XLSX.utils.book_new();

    const wsCases = XLSX.utils.json_to_sheet(
      caseRows.length > 0
        ? caseRows
        : [
            {
              'SAR ID': 'No internal SAR cases recorded',
              'Customer ID': '-',
              'Customer Name': '-',
              'Typology': '-',
              'Suspicious Amount (INR)': 0,
              'Status': '-',
              'Created Date': '-',
              'Approved/Reviewed By': '-',
              'Approved Date': '-',
              'Narrative Summary': '-'
            }
          ]
    );

    wsCases['!cols'] = [
      { wch: 18 },
      { wch: 16 },
      { wch: 24 },
      { wch: 28 },
      { wch: 24 },
      { wch: 22 },
      { wch: 24 },
      { wch: 30 },
      { wch: 24 },
      { wch: 45 },
      { wch: 24 },
      { wch: 24 }
    ];
    XLSX.utils.book_append_sheet(wb, wsCases, 'SAR Cases Register');

    if (candidateRows.length > 0) {
      const wsCandidates = XLSX.utils.json_to_sheet(candidateRows);
      wsCandidates['!cols'] = [
        { wch: 20 },
        { wch: 16 },
        { wch: 24 },
        { wch: 12 },
        { wch: 18 },
        { wch: 22 },
        { wch: 16 },
        { wch: 35 },
        { wch: 24 },
        { wch: 24 },
        { wch: 18 }
      ];
      XLSX.utils.book_append_sheet(wb, wsCandidates, 'Flagged Candidates');
    }

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `aml_sar_register_${Date.now()}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

export default sarService;
