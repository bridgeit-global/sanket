'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSession } from 'next-auth/react';

const PASSWORD_MIN_LENGTH = 6;

export function UserProfile() {
  const { data: session } = useSession();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsError(false);

    if (!currentPassword) {
      setIsError(true);
      setMessage('Current password is required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setIsError(true);
      setMessage('New passwords do not match');
      return;
    }

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      setIsError(true);
      setMessage(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (response.ok) {
        setMessage('Password updated successfully');
        setIsError(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setIsError(true);
        setMessage(data?.error || 'Failed to update password');
      }
    } catch {
      setIsError(true);
      setMessage('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="min-w-0">
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="break-words text-lg md:text-xl">
          My Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 space-y-6 p-4 pt-0 md:p-6 md:pt-0">
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">User ID</p>
            <p className="break-all font-medium">
              {session?.user?.userId ?? 'Guest'}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Role</p>
            <p className="break-words font-medium">
              {session?.user?.roleName || 'No role assigned'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="min-w-0 space-y-3">
          <h2 className="text-base font-semibold">Change password</h2>
          <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full"
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={PASSWORD_MIN_LENGTH}
                required
                className="w-full"
              />
            </div>
            <div className="min-w-0 space-y-2 md:col-span-2 lg:col-span-1">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={PASSWORD_MIN_LENGTH}
                required
                className="w-full"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Use at least {PASSWORD_MIN_LENGTH} characters.
          </p>
          {message && (
            <p
              className={`break-words text-sm ${
                isError ? 'text-destructive' : 'text-green-600'
              }`}
              role={isError ? 'alert' : 'status'}
            >
              {message}
            </p>
          )}
          <Button
            type="submit"
            className="h-10 w-full sm:w-auto"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Updating…' : 'Change password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
