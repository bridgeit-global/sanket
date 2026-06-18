'use client';

import { MemberCard } from './member-card';
import { TablePagination } from '@/components/table-pagination';
import { cn } from '@/lib/utils';
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
  onSelect?: (member: CadreMemberCard) => void;
  onEdit?: (member: CadreMemberCard) => void;
  pagination: MemberListPaginationProps;
}

export function MemberList({
  members,
  canEdit,
  onSelect,
  onEdit,
  pagination,
}: MemberListProps) {
  if (pagination.totalItems === 0) {
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
    <div
      className={cn(
        'flex flex-col gap-3',
        canEdit && 'pb-4 pr-16',
      )}
    >
      {members.map((member) => (
        <MemberCard
          key={member.id}
          member={member}
          canEdit={canEdit}
          onSelect={onSelect}
          onEdit={onEdit}
        />
      ))}
      <TablePagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        pageSize={pagination.pageSize}
        totalItems={pagination.totalItems}
        onPageChange={pagination.onPageChange}
        onPageSizeChange={pagination.onPageSizeChange}
        pageSizeOptions={[...MEMBER_PAGE_SIZE_OPTIONS]}
      />
    </div>
  );
}
