import Form from 'next/form';

import { Input } from './ui/input';
import { Label } from './ui/label';

export function AuthForm({
  action,
  children,
  defaultUserId = '',
}: {
  action: NonNullable<
    string | ((formData: FormData) => void | Promise<void>) | undefined
  >;
  children: React.ReactNode;
  defaultUserId?: string;
}) {
  return (
    <Form action={action} className="flex flex-col gap-4 px-4 sm:px-16">
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="userId"
          className="text-zinc-600 font-normal dark:text-zinc-400"
        >
          User ID
        </Label>

        <Input
          id="userId"
          name="userId"
          className="bg-muted text-md md:text-sm"
          type="text"
          placeholder="Enter user ID"
          autoComplete="username"
          required
          autoFocus
          defaultValue={defaultUserId}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="password"
          className="text-zinc-600 font-normal dark:text-zinc-400"
        >
          Password
        </Label>

        <Input
          id="password"
          name="password"
          className="bg-muted text-md md:text-sm"
          type="password"
          required
        />
      </div>

      {children}
    </Form>
  );
}
