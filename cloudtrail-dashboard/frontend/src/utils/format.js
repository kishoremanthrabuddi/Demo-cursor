export function formatDate(isoString) {
  if (!isoString) return '\u2014';
  const d = new Date(isoString);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDateShort(isoString) {
  if (!isoString) return '\u2014';
  const d = new Date(isoString);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatNumber(num) {
  if (num == null) return '\u2014';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

export function severityColor(severity) {
  switch (severity) {
    case 'HIGH': return 'text-red-600';
    case 'MEDIUM': return 'text-amber-600';
    case 'LOW': return 'text-emerald-600';
    default: return 'text-gray-400';
  }
}

export function severityBg(severity) {
  switch (severity) {
    case 'HIGH': return 'bg-red-50 border-l-4 border-l-red-400';
    case 'MEDIUM': return 'bg-amber-50 border-l-4 border-l-amber-400';
    case 'LOW': return 'bg-emerald-50 border-l-4 border-l-emerald-400';
    default: return '';
  }
}

export function severityBadge(severity) {
  switch (severity) {
    case 'HIGH': return 'bg-red-100 text-red-700 ring-1 ring-red-200';
    case 'MEDIUM': return 'bg-amber-100 text-amber-700 ring-1 ring-amber-200';
    case 'LOW': return 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200';
    default: return 'bg-gray-100 text-gray-500';
  }
}

export function severityDot(severity) {
  switch (severity) {
    case 'HIGH': return 'bg-red-500';
    case 'MEDIUM': return 'bg-amber-500';
    case 'LOW': return 'bg-emerald-500';
    default: return 'bg-gray-300';
  }
}

export function stripAmazonSuffix(source) {
  return source?.replace('.amazonaws.com', '') || '\u2014';
}
