'use client';

import Link from 'next/link';
import { ChevronRight, Link2, Pencil } from 'lucide-react';
import { ContactWithCall } from './contact-with-call';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  getMemberDisplayName,
  getMemberPhone,
  getPostGeoChip,
  getPostGeoContextLine,
} from '@/lib/hierarchy/geo-attribution';
import { getPostBreadcrumbItems } from '@/lib/hierarchy/geo-navigation';
import {
  getAltPosts,
  getPostTitle,
  getPrimaryPost,
} from '@/lib/hierarchy/member-list';
import { getVerticalBadgeClass } from '@/lib/hierarchy/vertical-colors';
import type { CadreMemberCard } from '@/lib/hierarchy/types';
import { cn } from '@/lib/utils';

interface CompactMemberCardProps {
  member: CadreMemberCard;
  canEdit?: boolean;
  onEdit?: (member: CadreMemberCard) => void;
  detail?: 'minimal' | 'full';
}

export function CompactMemberCard({
  member,
  canEdit,
  onEdit,
  detail = 'minimal',
}: CompactMemberCardProps) {
  const name = getMemberDisplayName(member);
  const phone = getMemberPhone(member);
  const primary = getPrimaryPost(member);
  const altPosts = getAltPosts(member);
  const roleLabel = primary ? getPostTitle(primary) : 'No post assigned';
  const geoChip = primary ? getPostGeoChip(primary) : null;
  const geoContext = primary ? getPostGeoContextLine(primary) : null;
  const breadcrumbItems = primary ? getPostBreadcrumbItems(primary) : [];
  const showFullDetail = detail === 'full';

  return (
    <div
      id={`member-card-${member.id}`}
      className="relative flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5"
    >
      {showFullDetail && breadcrumbItems.length > 1 ? (
        <div
          className={cn(
            'flex flex-wrap items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground',
            canEdit && onEdit && 'pr-7',
          )}
        >
          {breadcrumbItems.map((item, index) => (
            <span
              key={breadcrumbItems.slice(0, index + 1).map((entry) => entry.label).join(' / ')}
              className="flex items-center gap-1"
            >
              {index > 0 ? <ChevronRight className="size-3 opacity-60" aria-hidden /> : null}
              <span className="truncate">{item.label}</span>
            </span>
          ))}
        </div>
      ) : null}

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

      <div className={cn('min-w-0 space-y-1.5', canEdit && onEdit && !showFullDetail && 'pr-7')}>
        <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          {roleLabel}
        </p>
        <p className="truncate text-sm font-semibold text-foreground">{name}</p>

        {showFullDetail && member.verticals.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {member.verticals.map((vertical) => (
              <Badge
                key={vertical.id}
                variant="secondary"
                className={cn(
                  'border-none px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide',
                  getVerticalBadgeClass(vertical.name),
                )}
              >
                {vertical.name}
              </Badge>
            ))}
          </div>
        ) : null}

        {showFullDetail && (geoContext || geoChip) ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {geoContext ? (
              <span className="text-[11px] text-muted-foreground">{geoContext}</span>
            ) : null}
            {geoChip && geoChip !== geoContext ? (
              <span className="inline-block rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {geoChip}
              </span>
            ) : null}
          </div>
        ) : null}

        {showFullDetail
          ? altPosts.map((post) => {
              const altGeoContext = getPostGeoContextLine(post);
              const altGeoChip = getPostGeoChip(post);
              return (
                <div key={post.id} className="space-y-0.5">
                  <p className="text-xs font-medium italic text-amber-700 dark:text-amber-300">
                    {getPostTitle(post)} (Alt)
                  </p>
                  {altGeoContext || altGeoChip ? (
                    <p className="text-[11px] text-muted-foreground">
                      {[altGeoContext, altGeoChip && altGeoChip !== altGeoContext ? altGeoChip : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  ) : null}
                </div>
              );
            })
          : null}

        {showFullDetail && member.epicNumber ? (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Link2 className="size-3 shrink-0" aria-hidden />
            {member.linkedVoter ? (
              <Link
                href={`/modules/voter/${member.linkedVoter.epicNumber}`}
                className="truncate hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                ID: {member.epicNumber}
              </Link>
            ) : (
              <span className="truncate">ID: {member.epicNumber}</span>
            )}
          </div>
        ) : null}
      </div>

      <ContactWithCall phone={phone} compact />
    </div>
  );
}
