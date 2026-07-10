'use client';

import { ContactWithCall } from './contact-with-call';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getMemberDisplayName,
  getMemberPhone,
} from '@/lib/hierarchy/geo-attribution';
import type { CadreMemberCard } from '@/lib/hierarchy/types';

interface CommitteeMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  members: CadreMemberCard[];
  emptyLabel: string;
}

export function CommitteeMembersDialog({
  open,
  onOpenChange,
  title,
  members,
  emptyLabel,
}: CommitteeMembersDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
          <DialogTitle className="text-base leading-tight">{title}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">{emptyLabel}</p>
          ) : (
            <ul className="space-y-3">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5"
                >
                  <p className="text-sm font-medium leading-snug">
                    {getMemberDisplayName(member)}
                  </p>
                  <div className="mt-1">
                    <ContactWithCall phone={getMemberPhone(member)} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
