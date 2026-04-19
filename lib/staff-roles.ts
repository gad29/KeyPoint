/** Roles that may open /admin (advisor finance dashboard). */
const BLOCKED_ADMIN_ROLES = new Set(['secretary', 'reception', 'viewer', 'read-only', 'readonly']);

export function normalizeStaffRole(raw: string | undefined | null): string {
  const r = (raw || 'advisor').trim().toLowerCase();
  return r || 'advisor';
}

export function canAccessAdvisorFinanceDashboard(role: string): boolean {
  const r = normalizeStaffRole(role);
  if (BLOCKED_ADMIN_ROLES.has(r)) return false;
  return true;
}
