'use client';

import { Bell, BellOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/use-push-notifications';

export function PushNotificationSettings() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Push Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Push notifications are not supported in this browser.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Push Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Receive alerts for task escalations, assignments, and beneficiary
          service updates — even when the app is in the background.
        </p>

        {permission === 'denied' && (
          <p className="text-sm text-destructive">
            Notifications are blocked. Enable them in your browser settings,
            then return here to subscribe.
          </p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center gap-3">
          {isSubscribed ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void unsubscribe()}
              disabled={isLoading}
            >
              <BellOff className="mr-2 size-4" />
              Disable notifications
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => void subscribe()}
              disabled={isLoading || permission === 'denied'}
            >
              <Bell className="mr-2 size-4" />
              Enable notifications
            </Button>
          )}

          {isSubscribed && (
            <span className="text-sm text-green-600">Notifications enabled</span>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          On iOS, install the app to your home screen first, then enable
          notifications here.
        </p>
      </CardContent>
    </Card>
  );
}
