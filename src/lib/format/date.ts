// Date and time formatters respecting IST (Asia/Kolkata) default timezone

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';
export const TIMEZONE_LABEL = 'IST';

export function formatTimeIST(dateInput: string | Date): string {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '—';
  
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: DEFAULT_TIMEZONE,
  }).format(d);
}

export function formatDateIST(dateInput: string | Date): string {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: DEFAULT_TIMEZONE,
  }).format(d);
}

export function formatDateTimeIST(dateInput: string | Date): string {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '—';

  return `${formatDateIST(d)}, ${formatTimeIST(d)} ${TIMEZONE_LABEL}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return remMinutes > 0 ? `${hours} hr ${remMinutes} min` : `${hours} hr`;
}

export function pluralize(count: number, singular: string, plural: string = `${singular}s`): string {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural}`;
}
