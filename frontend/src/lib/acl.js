export const Can = {
  manageMembers: ['OWNER', 'ADMIN'],
  manageBilling: ['OWNER', 'ADMIN'],
  viewAuditLog: ['OWNER', 'ADMIN'],
  readOnly: ['OWNER', 'ADMIN', 'STAFF', 'READONLY'],
};

export const can = (role, action) => {
  if (!role) {
    return false;
  }
  const allowed = Can[action];
  if (!allowed) {
    return false;
  }
  return allowed.includes(String(role).toUpperCase());
};
