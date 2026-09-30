'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSession } from 'next-auth/react';

export function UserProfile({ userId }: { userId: string }) {
  const { data: session } = useSession();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsError(false);

    if (newPassword !== confirmPassword) {
      setIsError(true);
      setMessage('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setIsError(true);
      setMessage('Password must be at least 6 characters');
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });

      if (response.ok) {
        setMessage('Password updated successfully');
        setIsError(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setIsError(true);
        setMessage('Failed to update password');
      }
    } catch (error) {
      setIsError(true);
      setMessage('An error occurred');
    }
  };

  return (
    <Card className="min-w-0">
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="break-words">My Profile</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 p-4 pt-0 md:p-6 md:pt-0">
        <div className="mb-4 min-w-0">
          <p className="break-words font-medium">
            {session?.user?.userId ?? 'Guest'}
          </p>
          <p className="break-words text-sm text-muted-foreground">
            Role: {session?.user?.roleName || 'No role assigned'}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3"
        >
          <div className="min-w-0 space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          {message && (
            <p
              className={`break-words text-sm md:col-span-2 lg:col-span-3 ${
                isError ? 'text-destructive' : 'text-green-600'
              }`}
            >
              {message}
            </p>
          )}
          <div className="md:col-span-2 lg:col-span-3">
            <Button type="submit" className="h-10 w-full sm:w-auto">
              Change Password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

