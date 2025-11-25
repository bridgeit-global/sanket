'use server';

import { z } from 'zod';

import { createUser, getUser } from '@/lib/db/queries';

import { signIn, signOut } from './auth';

const authFormSchema = z.object({
  userId: z.string().min(3).max(64),
  password: z.string().min(6),
});

export interface LoginActionState {
  status: 'idle' | 'in_progress' | 'success' | 'failed' | 'invalid_data';
}

export const login = async (
  _: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      userId: formData.get('userId'),
      password: formData.get('password'),
    });

    await signIn('credentials', {
      userId: validatedData.userId,
      password: validatedData.password,
      redirect: false,
    });

    return { status: 'success' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }

    return { status: 'failed' };
  }
};

export interface RegisterActionState {
  status:
  | 'idle'
  | 'in_progress'
  | 'success'
  | 'failed'
  | 'user_exists'
  | 'invalid_data';
}

export const register = async (
  _: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      userId: formData.get('userId'),
      password: formData.get('password'),
    });

    const [user] = await getUser(validatedData.userId);

    if (user) {
      return { status: 'user_exists' } as RegisterActionState;
    }
    // Create user without roleId - role assignment should be done through admin interface
    await createUser(validatedData.userId, validatedData.password, null);

    // For now, just return success and let user login manually
    // This avoids the CSRF token issue during registration
    return { status: 'success' };
  } catch (error) {
    console.error('Registration error:', error);
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }

    return { status: 'failed' };
  }
};

export const signOutAction = async () => {
  await signOut({
    redirectTo: '/',
  });
};
