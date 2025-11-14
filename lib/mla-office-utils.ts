// Helper utilities for MLA e-Office modules

/**
 * Format time string (HH:MM) for display
 */
export function formatTime(time: string): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'pm' : 'am';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Get status badge color
 */
export function getStatusColor(
  status: 'Concept' | 'Proposal' | 'In Progress' | 'Completed',
): string {
  const colors = {
    Concept: 'bg-blue-100 text-blue-700',
    Proposal: 'bg-yellow-100 text-yellow-700',
    'In Progress': 'bg-green-100 text-green-700',
    Completed: 'bg-gray-100 text-gray-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

