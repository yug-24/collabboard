import { clsx } from 'clsx';

/** Merge Tailwind classes safely */
export const cn = (...inputs) => clsx(inputs);

/** Format a date relative to now */
export const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  const intervals = [
    { label: 'year',   secs: 31536000 },
    { label: 'month',  secs: 2592000 },
    { label: 'week',   secs: 604800 },
    { label: 'day',    secs: 86400 },
    { label: 'hour',   secs: 3600 },
    { label: 'minute', secs: 60 },
  ];
  for (const { label, secs } of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count} ${label}${count !== 1 ? 's' : ''} ago`;
  }
  return 'just now';
};

/** Get user initials from name */
export const getInitials = (name = '') =>
  name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

/** Truncate string */
export const truncate = (str, n = 40) =>
  str?.length > n ? str.slice(0, n - 1) + '…' : str;

/** Generate a random board color */
export const randomBoardColor = () => {
  const colors = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-amber-600',
    'from-pink-500 to-rose-600',
    'from-indigo-500 to-blue-600',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

/** Extract error message from axios error */
export const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.response?.data?.errors?.[0]?.message ||
  error?.message ||
  'Something went wrong. Please try again.';
