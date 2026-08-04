export const formatNotificationTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Vừa cập nhật';

  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absoluteSeconds = Math.abs(seconds);
  const relative = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });
  if (absoluteSeconds < 45) return 'Vừa xong';
  if (absoluteSeconds < 3_600) return relative.format(Math.round(seconds / 60), 'minute');
  if (absoluteSeconds < 86_400) return relative.format(Math.round(seconds / 3_600), 'hour');
  if (absoluteSeconds < 604_800) return relative.format(Math.round(seconds / 86_400), 'day');
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};
