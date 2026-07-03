'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useTranslations } from '@/hooks/use-translations';

interface AdmMilestoneRowProps {
  id: string;
  label: string;
  sublabel?: string;
  checked: boolean;
  date: string;
  onCheckedChange: (checked: boolean) => void;
  onDateChange: (date: string) => void;
}

export function AdmMilestoneRow({
  id,
  label,
  sublabel,
  checked,
  date,
  onCheckedChange,
  onDateChange,
}: AdmMilestoneRowProps) {
  const { t } = useTranslations();

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex items-center gap-2">
        <Checkbox
          id={id}
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
        />
        <Label htmlFor={id} className="cursor-pointer text-sm font-medium">
          {label}
          {sublabel && (
            <span className="ml-1 text-xs text-muted-foreground">({sublabel})</span>
          )}
        </Label>
      </div>
      <Input
        type="date"
        value={date}
        onChange={(e) => onDateChange(e.target.value)}
        disabled={!checked}
        className="min-h-11 w-full sm:w-40"
        aria-label={`${label} ${t('adm.milestones')}`}
      />
    </div>
  );
}
