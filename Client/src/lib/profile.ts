export const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80';

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

export function getRoleLabel(role: string): string {
  const normalized = role.toLowerCase();
  if (normalized === 'owner') return 'Owner';
  if (normalized === 'user' || normalized === 'renter') return 'Renter';
  return role;
}

export function resolveBackendAssetUrl(assetUrl?: string | null, fallback = DEFAULT_AVATAR): string {
  if (!assetUrl) return fallback;
  if (assetUrl.startsWith('http://') || assetUrl.startsWith('https://')) {
    return assetUrl;
  }
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  return `${baseUrl}${assetUrl}`;
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
