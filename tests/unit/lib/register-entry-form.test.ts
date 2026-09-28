import { describe, expect, it } from 'vitest';
import { validateForm, registerEntryFormSchema } from '@/lib/validations';

const base = {
  date: '2026-09-28',
  fromTo: 'BMC Ward Office',
  subject: 'Road repair',
};

describe('registerEntryFormSchema assignee fields', () => {
  it('accepts a blank person and phone', () => {
    const result = validateForm(registerEntryFormSchema, base);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.assignedPerson).toBeUndefined();
    expect(result.data.assignedPhone).toBeUndefined();
  });

  it('stores a normalized Indian mobile', () => {
    const result = validateForm(registerEntryFormSchema, {
      ...base,
      assignedPerson: 'Asha Patil',
      assignedPhone: '+91 98765-43210',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.assignedPerson).toBe('Asha Patil');
    expect(result.data.assignedPhone).toBe('9876543210');
  });

  it('rejects an invalid phone', () => {
    const result = validateForm(registerEntryFormSchema, {
      ...base,
      assignedPhone: '12345',
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.assignedPhone).toBe(
      'Enter a valid 10-digit Indian mobile number',
    );
  });
});
