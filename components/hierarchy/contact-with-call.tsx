import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PhoneCallButton({
  phone,
  className,
}: {
  phone: string;
  className?: string;
}) {
  return (
    <Button
      asChild
      size="sm"
      className={cn(
        'h-7 shrink-0 bg-green-600 px-2.5 text-white hover:bg-green-700',
        className,
      )}
    >
      <a href={`tel:${phone}`}>
        <Phone className="size-3.5" /> Call
      </a>
    </Button>
  );
}

export function ContactWithCall({
  phone,
  compact = false,
}: {
  phone: string | null;
  compact?: boolean;
}) {
  if (!phone) {
    return <span className="text-xs text-muted-foreground">Contact: —</span>;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <PhoneCallButton phone={phone} />
        <span className="min-w-0 truncate text-xs text-muted-foreground">{phone}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <PhoneCallButton phone={phone} />
      <span className="min-w-0 break-all text-muted-foreground">{phone}</span>
    </div>
  );
}
