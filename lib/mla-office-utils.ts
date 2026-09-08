// Helper utilities for MLA e-Office modules

import { formatDisplayDateIST } from '@/lib/ist-date';

/**
 * Format amount in Indian Rupees
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format time string (HH:MM) for display
 */
export function formatTime(time: string): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = Number.parseInt(hours, 10);
  const ampm = hour >= 12 ? 'pm' : 'am';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

/**
 * Format date for display as `dd-mm-yyyy` (IST).
 */
export function formatDate(date: Date | string): string {
  return formatDisplayDateIST(date);
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

