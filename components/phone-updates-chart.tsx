'use client';

interface PhoneUpdatesChartProps {
  phoneUpdatesBySource: Record<string, number>;
  phoneUpdatesByUser: Array<{ userId: string | null; count: number }>;
  totalUpdates: number;
  totalVotersWithPhone: number;
}

export function PhoneUpdatesChart({
  phoneUpdatesBySource,
  phoneUpdatesByUser,
  totalUpdates,
  totalVotersWithPhone,
}: PhoneUpdatesChartProps) {
  // Format module names for display
  const formatModuleName = (module: string) => {
    return module
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get max count for scaling
  const maxSourceCount = Math.max(
    ...Object.values(phoneUpdatesBySource),
    1
  );
  const maxUserCount = Math.max(
    ...phoneUpdatesByUser.map((u) => u.count),
    1
  );

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-4 bg-primary/10 rounded-lg">
          <div className="text-2xl font-bold text-primary">{totalUpdates}</div>
          <div className="text-sm text-muted-foreground">Phone Updates Today</div>
        </div>
        <div className="text-center p-4 bg-blue-500/10 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {totalVotersWithPhone.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground">Total Voters with Phone Numbers</div>
        </div>
      </div>

      {/* Module-wise Breakdown */}
      <div className="space-y-4">
        <h4 className="font-semibold text-sm text-foreground">
          By Module
        </h4>
        <div className="space-y-3">
          {Object.entries(phoneUpdatesBySource).length > 0 ? (
            Object.entries(phoneUpdatesBySource)
              .sort(([, a], [, b]) => b - a)
              .map(([module, count]) => (
                <div key={module} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {formatModuleName(module)}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {count}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{
                        width: `${(count / maxSourceCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No updates today
            </p>
          )}
        </div>
      </div>

      {/* User-wise Breakdown */}
      {phoneUpdatesByUser.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-semibold text-sm text-foreground">
            By User
          </h4>
          <div className="space-y-3">
            {phoneUpdatesByUser
              .sort((a, b) => b.count - a.count)
              .slice(0, 10) // Show top 10 users
              .map((user) => (
                <div key={user.userId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground font-mono">
                      {user.userId}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {user.count}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${(user.count / maxUserCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

