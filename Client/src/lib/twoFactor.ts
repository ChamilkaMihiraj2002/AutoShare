export function getTwoFactorQrUrl(otpauthUrl: string, size = 220): string {
  return `https://quickchart.io/qr?size=${size}&text=${encodeURIComponent(otpauthUrl)}`;
}
