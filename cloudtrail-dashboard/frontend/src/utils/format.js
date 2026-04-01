export function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function severityColor(severity) {
  switch (severity) {
    case 'HIGH':
      return 'text-severity-high';
    case 'MEDIUM':
      return 'text-severity-medium';
    case 'LOW':
      return 'text-severity-low';
    default:
      return 'text-gray-500';
  }
}

export function severityBg(severity) {
  switch (severity) {
    case 'HIGH':
      return 'bg-red-50 border-red-200';
    case 'MEDIUM':
      return 'bg-yellow-50 border-yellow-200';
    case 'LOW':
      return 'bg-green-50 border-green-200';
    default:
      return '';
  }
}

export function severityDot(severity) {
  switch (severity) {
    case 'HIGH':
      return 'bg-severity-high';
    case 'MEDIUM':
      return 'bg-severity-medium';
    case 'LOW':
      return 'bg-severity-low';
    default:
      return 'bg-gray-300';
  }
}

export function stripAmazonSuffix(source) {
  return source?.replace('.amazonaws.com', '') || '—';
}
