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

export function ContactWithCall({ phone }: { phone: string | null }) {
  if (!phone) {
    return <span className="text-muted-foreground">Contact: —</span>;
  }

  return (
    <span className="inline-flex items-center gap-2">
      <PhoneCallButton phone={phone} />
      <span className="text-muted-foreground">: {phone}</span>
    </span>
  );
}
