/**
 * Role-Based Access Control (RBAC) Guard
 * @param {Array<string>} allowedRoles - Array of roles permitted to access endpoint
 */
export const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthenticated user'
      });
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: User role '${req.user.role}' lacks sufficient privileges for this resource`
      });
    }

    next();
  };
};

export default authorize;
