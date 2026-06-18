'use client';

import { MemberCard } from './member-card';
import type { CadreMemberCard } from '@/lib/hierarchy/types';

interface MemberListProps {
  members: CadreMemberCard[];
  canEdit?: boolean;
  onSelect?: (member: CadreMemberCard) => void;
  onEdit?: (member: CadreMemberCard) => void;
}

export function MemberList({
  members,
  canEdit,
  onSelect,
  onEdit,
}: MemberListProps) {
  if (members.length === 0) {
    return (
      <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-6 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          No members match the current filters
        </p>
        <p className="text-xs text-muted-foreground/80">
          Try a different ward, vertical, or search term.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-24">
      {members.map((member) => (
        <MemberCard
          key={member.id}
          member={member}
          canEdit={canEdit}
          onSelect={onSelect}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}
