import { AuditLog } from '../models/index.js';
import { logger } from '../utils/logger.js';

/**
 * Creates an immutable audit record in MongoDB
 */
export const recordAuditLog = async ({
  req = null,
  userId = null,
  username = 'SYSTEM',
  userRole = 'SYSTEM',
  action,
  entity,
  entityId = null,
  previousValue = null,
  newValue = null
}) => {
  try {
    let ipAddress = '127.0.0.1';
    let userAgent = 'System/Internal';

    if (req) {
      ipAddress = req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1';
      userAgent = req.headers?.['user-agent'] || 'API-Client';

      if (req.user) {
        userId = userId || req.user._id;
        username = username === 'SYSTEM' ? (req.user.username || req.user.email) : username;
        userRole = userRole === 'SYSTEM' ? req.user.role : userRole;
      }
    }

    const logEntry = await AuditLog.create({
      userId,
      username,
      userRole,
      action,
      entity,
      entityId,
      ipAddress: String(ipAddress),
      userAgent: String(userAgent),
      previousValue,
      newValue,
      timestamp: new Date()
    });

    return logEntry;
  } catch (err) {
    logger.error(`Failed to record audit log: ${err.message}`, { action, entity, entityId });
    return null;
  }
};

export default recordAuditLog;
