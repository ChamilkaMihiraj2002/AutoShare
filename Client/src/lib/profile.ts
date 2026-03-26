import type { UserProfile, UserRole } from '../types';

export const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80';
export const PROFILE_UPDATED_EVENT = 'autoshare:profile-updated';

export function getDisplayNameFromEmail(email: string): string {
  const local = (email || '').split('@')[0] || 'User';
  return local
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

export function getProfileDisplayName(fullName: string | null | undefined, email: string): string {
  const cleaned = (fullName || '').trim();
  if (cleaned) return cleaned;
  return getDisplayNameFromEmail(email);
}

export function getNormalizedRoles(roles?: UserRole[] | null): UserRole[] {
  if (!Array.isArray(roles) || roles.length === 0) {
    return ['user'];
  }

  return Array.from(new Set(roles));
}

export function hasRole(roles: UserRole[] | null | undefined, role: UserRole): boolean {
  return getNormalizedRoles(roles).includes(role);
}

export function isVehicleOwner(roles: UserRole[] | null | undefined): boolean {
  return hasRole(roles, 'vehicle_owner');
}

export function getDefaultDashboardPath(profile: Pick<UserProfile, 'roles'>): string {
  return isVehicleOwner(profile.roles) ? '/dashboard' : '/user-dashboard';
}

export function getRoleLabel(roles: UserRole[] | null | undefined): string {
  const normalized = getNormalizedRoles(roles);
  const isOwner = normalized.includes('vehicle_owner');
  const isRenter = normalized.includes('renter') || normalized.includes('user');

  if (isOwner && isRenter) return 'Owner & Renter';
  if (isOwner) return 'Owner';
  if (isRenter) return 'Renter';
  return normalized.join(', ');
}

export function resolveBackendAssetUrl(assetUrl?: string | null, fallback = DEFAULT_AVATAR): string {
  if (!assetUrl) return fallback;

  const normalizedAssetUrl = assetUrl.trim().replace(/\\/g, '/');
  if (!normalizedAssetUrl) return fallback;

  const uploadsIndex = normalizedAssetUrl.toLowerCase().indexOf('/uploads/');
  if (uploadsIndex >= 0) {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    return `${baseUrl}${normalizedAssetUrl.slice(uploadsIndex)}`;
  }

  if (normalizedAssetUrl.startsWith('http://') || normalizedAssetUrl.startsWith('https://')) {
    return normalizedAssetUrl;
  }

  const relativePath = normalizedAssetUrl.startsWith('/') ? normalizedAssetUrl : `/${normalizedAssetUrl}`;
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  return `${baseUrl}${relativePath}`;
}

export function resolveAvatarUrl(avatarUrl?: string | null): string {
  return resolveBackendAssetUrl(avatarUrl, DEFAULT_AVATAR);
}

export function getPrimaryVehicleImage(
  imageUrls?: string[] | null,
  legacyImageUrl?: string | null,
  fallback = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80',
): string {
  const candidate = (imageUrls && imageUrls.length > 0 ? imageUrls[0] : legacyImageUrl) || null;
  return resolveBackendAssetUrl(candidate, fallback);
}

export function notifyProfileUpdated(profile: UserProfile): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<UserProfile>(PROFILE_UPDATED_EVENT, { detail: profile }));
}
