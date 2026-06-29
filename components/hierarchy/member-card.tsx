'use client';

import { memo } from 'react';
import Link from 'next/link';
import { ChevronRight, Link2, Pencil, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MemberAvatar } from './member-avatar';
import {
  getMemberDisplayName,
  getMemberPhone,
  getPostGeoChip,
} from '@/lib/hierarchy/geo-attribution';
import { getPostBreadcrumbItems } from '@/lib/hierarchy/geo-navigation';
import {
  getAltPosts,
  getPostTitle,
  getPrimaryPost,
} from '@/lib/hierarchy/member-list';
import { getVerticalBadgeClass } from '@/lib/hierarchy/vertical-colors';
import type { CadreMemberCard } from '@/lib/hierarchy/types';

interface MemberCardProps {
  member: CadreMemberCard;
  canEdit?: boolean;
  onEdit?: (member: CadreMemberCard) => void;
}

export const MemberCard = memo(function MemberCard({
  member,
  canEdit,
  onEdit,
}: MemberCardProps) {
  const name = getMemberDisplayName(member);
  const phone = getMemberPhone(member);
  const primary = getPrimaryPost(member);
  const altPosts = getAltPosts(member);
  const geoChip = primary ? getPostGeoChip(primary) : null;
  const breadcrumbItems = primary ? getPostBreadcrumbItems(primary) : [];

  return (
    <div
      id={`member-card-${member.id}`}
      className="relative rounded-xl border border-border bg-card p-4 shadow-sm"
    >
      {breadcrumbItems.length > 1 && (
        <div className="mb-2 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {breadcrumbItems.map((item, i) => (
            <span
              key={breadcrumbItems.slice(0, i + 1).map((b) => b.label).join(' / ')}
              className="flex items-center gap-1"
            >
              {i > 0 && <ChevronRight className="size-3 opacity-60" />}
              <span className="truncate">{item.label}</span>
            </span>
          ))}
        </div>
      )}

      {canEdit && onEdit && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 size-7 text-muted-foreground"
          aria-label="Edit member"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(member);
          }}
        >
          <Pencil className="size-3.5" />
        </Button>
      )}

      <div className="flex items-start gap-3">
        <MemberAvatar name={name} photoUrl={member.photoUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pr-6">
            <p className="text-base font-semibold leading-tight text-foreground">
              {name}
            </p>
          </div>
          {member.verticals.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {member.verticals.map((v) => (
                <Badge
                  key={v.id}
                  variant="secondary"
                  className={`border-none px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide ${getVerticalBadgeClass(v.name)}`}
                >
                  {v.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-0.5">
        <p className="text-sm font-semibold text-foreground">
          {primary ? getPostTitle(primary) : 'No post assigned'}
        </p>
        {altPosts.map((post) => (
          <p key={post.id} className="text-xs font-medium italic text-amber-700 dark:text-amber-300">
            {getPostTitle(post)} (Alt)
          </p>
        ))}
      </div>

      {member.epicNumber && (
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Link2 className="size-3 shrink-0" />
          {member.linkedVoter ? (
            <Link
              href={`/modules/voter/${member.linkedVoter.epicNumber}`}
              className="hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              ID: {member.epicNumber}
            </Link>
          ) : (
            <span>ID: {member.epicNumber}</span>
          )}
        </div>
      )}

      {geoChip && (
        <div className="mt-2">
          <span className="inline-block rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            {geoChip}
          </span>
        </div>
      )}

      <div className="mt-3">
        {phone ? (
          <Button
            asChild
            className="h-10 w-full bg-green-600 text-white hover:bg-green-700"
          >
            <a href={`tel:${phone}`} onClick={(e) => e.stopPropagation()}>
              <Phone className="mr-2 size-4" /> Call
            </a>
          </Button>
        ) : (
          <Button disabled className="h-10 w-full" variant="outline">
            <Phone className="mr-2 size-4" /> No phone
          </Button>
        )}
      </div>
    </div>
  );
});
