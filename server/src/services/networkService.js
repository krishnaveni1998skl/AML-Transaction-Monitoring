import { NetworkEngine } from '../engines/NetworkEngine.js';
import { recordAuditLog } from '../middlewares/auditLogger.js';

export class NetworkService {
  /**
   * Generates graph nodes, directed transaction edges, and structural metrics
   */
  static async getNetworkGraph(params, user = null, req = null) {
    const result = await NetworkEngine.buildNetworkGraph(params);

    if (params.accountId || params.customerId) {
      await recordAuditLog({
        req,
        userId: user?._id || null,
        username: user?.username || 'ANALYST',
        userRole: user?.role || 'AML_ANALYST',
        action: 'NETWORK_GRAPH_EXPLORED',
        entity: 'NETWORK_GRAPH',
        entityId: params.accountId || params.customerId,
        previousValue: null,
        newValue: {
          depth: result.metrics.traversalDepth,
          nodesFound: result.metrics.nodeCount,
          edgesFound: result.metrics.edgeCount,
          patternsDetected: result.detectedPatterns.length
        }
      });
    }

    return result;
  }

  /**
   * Scans and returns detected suspicious topological patterns
   */
  static async detectPatterns(params) {
    const graph = await NetworkEngine.buildNetworkGraph({
      ...params,
      maxDepth: params.maxDepth || 3
    });
    return {
      patterns: graph.detectedPatterns,
      metrics: graph.metrics
    };
  }

  /**
   * Returns localized entity profile metrics and counterparties
   */
  static async getEntitySummary(entityId) {
    return NetworkEngine.getEntityNetworkSummary(entityId);
  }
}

export default NetworkService;
