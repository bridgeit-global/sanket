import { z } from 'zod';

// Project form validation
export const projectFormSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(255, 'Project name is too long'),
  ward: z.string().max(100, 'Ward name is too long').optional(),
  type: z.string().max(100, 'Type is too long').optional(),
  status: z.enum(['Concept', 'Proposal', 'In Progress', 'Completed']),
});

export type ProjectFormData = z.infer<typeof projectFormSchema>;

// Register entry form validation
export const registerEntryFormSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  fromTo: z.string().min(1, 'Sender/recipient is required').max(500, 'Name is too long'),
  subject: z.string().min(1, 'Subject is required').max(1000, 'Subject is too long'),
  projectId: z.string().optional(),
  mode: z.string().max(100, 'Mode is too long').optional(),
  refNo: z.string().max(100, 'Reference number is too long').optional(),
  officer: z.string().max(255, 'Officer name is too long').optional(),
});

export type RegisterEntryFormData = z.infer<typeof registerEntryFormSchema>;

// Daily programme form validation
export const dailyProgrammeFormSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  duration: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(500, 'Title is too long'),
  location: z.string().min(1, 'Location is required').max(500, 'Location is too long'),
  remarks: z.string().max(1000, 'Remarks are too long').optional(),
});

export type DailyProgrammeFormData = z.infer<typeof dailyProgrammeFormSchema>;

// User form validation (for admin)
export const userFormSchema = z.object({
  userId: z
    .string()
    .min(3, 'User ID must be at least 3 characters')
    .max(50, 'User ID is too long')
    .regex(/^[a-zA-Z0-9_]+$/, 'User ID can only contain letters, numbers, and underscores'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password is too long'),
  roleId: z.string().min(1, 'Role is required'),
});

export type UserFormData = z.infer<typeof userFormSchema>;

// Role form validation
export const roleFormSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(100, 'Role name is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
  permissions: z.record(z.string(), z.boolean()),
});

export type RoleFormData = z.infer<typeof roleFormSchema>;

// Helper function to validate form data and return errors
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  for (const error of result.error.errors) {
    const path = error.path.join('.');
    if (!errors[path]) {
      errors[path] = error.message;
    }
  }

  return { success: false, errors };
}

// Custom hook for form validation
export function useFormValidation<T>(schema: z.ZodSchema<T>) {
  const validate = (data: unknown) => validateForm(schema, data);

  const validateField = (field: string, value: unknown, allData: Record<string, unknown>) => {
    const testData = { ...allData, [field]: value };
    const result = schema.safeParse(testData);

    if (result.success) {
      return null;
    }

    const fieldError = result.error.errors.find((e) => e.path.join('.') === field);
    return fieldError?.message || null;
  };

  return { validate, validateField };
}

