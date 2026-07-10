'use client';

import { CompactMemberCard } from './compact-member-card';
import { MemberCard } from './member-card';
import { PanelSectionHeader } from './leadership-section';
import { TablePagination } from '@/components/table-pagination';
import { MEMBER_PAGE_SIZE_OPTIONS } from '@/lib/hierarchy/member-list';
import type { CadreMemberCard } from '@/lib/hierarchy/types';

export interface MemberListPaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

interface MemberListProps {
  members: CadreMemberCard[];
  canEdit?: boolean;
  onEdit?: (member: CadreMemberCard) => void;
  pagination: MemberListPaginationProps;
  emptyMessage?: string;
  emptyHint?: string;
  variant?: 'default' | 'compact';
  sectionTitle?: string;
}

export function MemberList({
  members,
  canEdit,
  onEdit,
  pagination,
  emptyMessage = 'No members match the current filters',
  emptyHint = 'Try a different ward, vertical, or search term.',
  variant = 'default',
  sectionTitle,
}: MemberListProps) {
  const emptyState = (
    <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-6 text-center">
      <p className="text-sm font-medium text-muted-foreground">{emptyMessage}</p>
      {emptyHint ? (
        <p className="text-xs text-muted-foreground/80">{emptyHint}</p>
      ) : null}
    </div>
  );

  if (pagination.totalItems === 0) {
    if (variant === 'compact' && sectionTitle) {
      return (
        <div className="overflow-hidden rounded-xl border border-primary/20 dark:border-primary/50">
          <PanelSectionHeader>
            {sectionTitle} (0)
          </PanelSectionHeader>
          <div className="border border-t-0 border-primary/20 bg-card p-3 dark:border-primary/50">
            {emptyState}
          </div>
        </div>
      );
    }
    return emptyState;
  }

  const memberCards =
    variant === 'compact' ? (
      <div className="grid gap-2 sm:grid-cols-2">
        {members.map((member) => (
          <CompactMemberCard
            key={member.id}
            member={member}
            canEdit={canEdit}
            onEdit={onEdit}
          />
        ))}
      </div>
    ) : (
      <>
        {members.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            canEdit={canEdit}
            onEdit={onEdit}
          />
        ))}
      </>
    );

  const paginationBlock = (
    <TablePagination
      currentPage={pagination.currentPage}
      totalPages={pagination.totalPages}
      pageSize={pagination.pageSize}
      totalItems={pagination.totalItems}
      onPageChange={pagination.onPageChange}
      onPageSizeChange={pagination.onPageSizeChange}
      pageSizeOptions={[...MEMBER_PAGE_SIZE_OPTIONS]}
    />
  );

  if (variant === 'compact' && sectionTitle) {
    return (
      <div className="overflow-hidden rounded-xl border border-primary/20 dark:border-primary/50">
        <PanelSectionHeader>
          {sectionTitle} ({pagination.totalItems})
        </PanelSectionHeader>
        <div className="flex flex-col gap-3 border border-t-0 border-primary/20 bg-card p-3 dark:border-primary/50">
          {memberCards}
          {paginationBlock}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {memberCards}
      {paginationBlock}
    </div>
  );
}
