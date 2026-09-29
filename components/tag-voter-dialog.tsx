'use client';

import { Loader2 } from 'lucide-react';
import { VoterSearchPanel } from '@/components/voter-search-panel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { VoterWithPartNo } from '@/lib/db/schema';

export function TagVoterDialog({
  open,
  onOpenChange,
  title,
  description,
  pending = false,
  onSelectVoter,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  pending?: boolean;
  onSelectVoter: (voter: VoterWithPartNo) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="relative">
          {open ? (
            <VoterSearchPanel
              searchEndpoint="/api/visitor/search-voter"
              onSelectVoter={(voter) => {
                if (pending) return;
                onSelectVoter(voter);
              }}
            />
          ) : null}
          {pending ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
