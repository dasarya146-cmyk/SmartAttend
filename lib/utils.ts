// Shared server-side utilities

export function getISTDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export function getISTTime(): string {
  return new Date().toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour12: true,
  }) + ' IST';
}

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isInWindow(windowStart: string, windowEnd: string): boolean {
  const ist = new Date().toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).replace(/^24/, '00');
  const [h, m] = ist.split(':').map(Number);
  const [sh, sm] = windowStart.split(':').map(Number);
  const [eh, em] = windowEnd.split(':').map(Number);
  const now = h * 60 + m;
  return now >= sh * 60 + sm && now <= eh * 60 + em;
}

export function escapeCSV(val: unknown): string {
  return `"${String(val ?? '').replace(/"/g, '""')}"`;
}
