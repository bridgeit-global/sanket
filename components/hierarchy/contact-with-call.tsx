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
  whatsapp,
}: {
  phone: string | null;
  whatsapp?: string | null;
}) {
  if (!phone && !whatsapp) {
    return <span className="text-muted-foreground">Contact: —</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      {phone ? <PhoneCallButton phone={phone} /> : null}
      {phone ? (
        <span className="min-w-0 break-all text-muted-foreground">{phone}</span>
      ) : null}
      {whatsapp ? (
        <span className="min-w-0 break-all text-muted-foreground">
          WhatsApp: {whatsapp}
        </span>
      ) : null}
    </div>
  );
}
