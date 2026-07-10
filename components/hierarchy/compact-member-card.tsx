'use client';

import { Pencil } from 'lucide-react';
import { ContactWithCall } from './contact-with-call';
import { Button } from '@/components/ui/button';
import {
  getMemberDisplayName,
  getMemberPhone,
} from '@/lib/hierarchy/geo-attribution';
import {
  getPostTitle,
  getPrimaryPost,
} from '@/lib/hierarchy/member-list';
import type { CadreMemberCard } from '@/lib/hierarchy/types';
import { cn } from '@/lib/utils';

interface CompactMemberCardProps {
  member: CadreMemberCard;
  canEdit?: boolean;
  onEdit?: (member: CadreMemberCard) => void;
}

export function CompactMemberCard({
  member,
  canEdit,
  onEdit,
}: CompactMemberCardProps) {
  const name = getMemberDisplayName(member);
  const phone = getMemberPhone(member);
  const primary = getPrimaryPost(member);
  const roleLabel = primary ? getPostTitle(primary) : 'No post assigned';

  return (
    <div
      id={`member-card-${member.id}`}
      className="relative flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5"
    >
      {canEdit && onEdit ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1 size-7 text-muted-foreground"
          aria-label="Edit member"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(member);
          }}
        >
          <Pencil className="size-3.5" />
        </Button>
      ) : null}

      <div className={cn('min-w-0', canEdit && onEdit && 'pr-7')}>
        <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          {roleLabel}
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-foreground">{name}</p>
      </div>

      <ContactWithCall phone={phone} compact />
    </div>
  );
}
