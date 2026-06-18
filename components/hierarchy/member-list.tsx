'use client';

import { MemberCard } from './member-card';
import { TablePagination } from '@/components/table-pagination';
import { MEMBER_PAGE_SIZE_OPTIONS } from '@/lib/hierarchy/member-list';
import type { GeoBreadcrumbTarget } from '@/lib/hierarchy/geo-navigation';
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
  allMembers: CadreMemberCard[];
  canEdit?: boolean;
  onEdit?: (member: CadreMemberCard) => void;
  onNavigateToGeo?: (target: GeoBreadcrumbTarget) => void;
  pagination: MemberListPaginationProps;
}

export function MemberList({
  members,
  allMembers,
  canEdit,
  onEdit,
  onNavigateToGeo,
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
    <div className="flex flex-col gap-3">
      {members.map((member) => (
        <MemberCard
          key={member.id}
          member={member}
          members={allMembers}
          canEdit={canEdit}
          onEdit={onEdit}
          onNavigateToGeo={onNavigateToGeo}
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
