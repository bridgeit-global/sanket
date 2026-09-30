'use client';

import { Bell, BellOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useModules } from '@/components/modules-context';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { PUSH_ELIGIBLE_MODULE_KEYS } from '@/lib/push/types';

export function PushNotificationSettings() {
  const { hasModuleAccess } = useModules();
  const canReceivePush = PUSH_ELIGIBLE_MODULE_KEYS.some(hasModuleAccess);

  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  if (!canReceivePush) {
    return null;
  }

  if (!isSupported) {
    return (
      <Card className="min-w-0">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="break-words text-lg md:text-xl">
            Push Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
          <p className="break-words text-sm text-muted-foreground">
            Push notifications are not supported in this browser.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="min-w-0">
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="break-words text-lg md:text-xl">
          Push Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 space-y-4 p-4 pt-0 md:p-6 md:pt-0">
        <p className="break-words text-sm text-muted-foreground">
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

        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {isSubscribed ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => void unsubscribe()}
                disabled={isLoading}
                className="h-10 w-full sm:w-auto"
              >
                <BellOff className="size-4 shrink-0" />
                <span className="sm:hidden">Disable</span>
                <span className="hidden sm:inline">Disable notifications</span>
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void subscribe()}
                disabled={isLoading || permission === 'denied'}
                className="h-10 w-full sm:w-auto"
              >
                <Bell className="size-4 shrink-0" />
                <span className="sm:hidden">Refresh</span>
                <span className="hidden sm:inline">Refresh subscription</span>
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={() => void subscribe()}
              disabled={isLoading || permission === 'denied'}
              className="h-10 w-full sm:w-auto"
            >
              <Bell className="size-4 shrink-0" />
              Enable notifications
            </Button>
          )}

          {isSubscribed && (
            <span className="text-sm text-green-600">Notifications enabled</span>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          On iOS, install the app to your home screen first, then enable
          notifications here. If alerts stop arriving, use Refresh subscription.
        </p>
      </CardContent>
    </Card>
  );
}
