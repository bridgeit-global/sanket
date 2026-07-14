'use client';

import { Phone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MemberAvatar } from './member-avatar';
import { MemberVoterIdField } from './member-voter-id-field';
import {
  getMemberDisplayName,
  getMemberPhone,
  getPostGeoChip,
} from '@/lib/hierarchy/geo-attribution';
import { getPostTitle } from '@/lib/hierarchy/member-list';
import { getVerticalBadgeClass } from '@/lib/hierarchy/vertical-colors';
import type { CadreMemberCard } from '@/lib/hierarchy/types';

interface MemberDetailProps {
  member: CadreMemberCard;
  onClose: () => void;
  canEdit?: boolean;
  onVoterIdUpdated?: () => void;
}

export function MemberDetail({
  member,
  onClose,
  canEdit,
  onVoterIdUpdated,
}: MemberDetailProps) {
  const name = getMemberDisplayName(member);
  const phone = getMemberPhone(member);

  return (
    <Card className="w-80 max-w-full border-2 shadow-xl">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3 pr-6">
          <MemberAvatar name={name} photoUrl={member.photoUrl} />
          <CardTitle className="text-base leading-tight">{name}</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {member.verticals.length > 0 && (
          <div className="flex flex-wrap gap-1">
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

        <div className="space-y-1">
          {member.posts.map((post) => {
            const geo = getPostGeoChip(post);
            return (
              <div key={post.id} className="flex items-center justify-between gap-2">
                <span className={post.isPrimary ? 'font-medium' : 'text-muted-foreground'}>
                  {getPostTitle(post)}
                </span>
                {geo && (
                  <span className="text-xs text-muted-foreground">{geo}</span>
                )}
              </div>
            );
          })}
        </div>

        <MemberVoterIdField
          member={member}
          canEdit={canEdit}
          onUpdated={onVoterIdUpdated}
        />

        {member.notes && (
          <div className="text-xs">
            <span className="text-muted-foreground">Notes: </span>
            {member.notes}
          </div>
        )}

        {phone && (
          <Button
            asChild
            className="h-10 w-full bg-green-600 text-white hover:bg-green-700"
          >
            <a href={`tel:${phone}`}>
              <Phone className="mr-2 size-4" /> Call
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
