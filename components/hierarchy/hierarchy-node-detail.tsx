'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, Plus, X } from 'lucide-react';
import type { CadreNodeDetail } from '@/lib/hierarchy/types';

interface HierarchyNodeDetailProps {
  node: CadreNodeDetail;
  isAdmin: boolean;
  onClose: () => void;
  onEdit: () => void;
  onAddSubordinate: () => void;
}

export function HierarchyNodeDetail({
  node,
  isAdmin,
  onClose,
  onEdit,
  onAddSubordinate,
}: HierarchyNodeDetailProps) {
  return (
    <Card className="w-80 shadow-xl border-2">
      <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
        <CardTitle className="text-base leading-tight pr-6">{node.positionName}</CardTitle>
        <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div>
          <span className="text-muted-foreground">Person: </span>
          <span className="font-medium">
            {node.isVacant ? 'Vacant' : node.personName ?? '—'}
          </span>
        </div>
        {node.personPhone && (
          <div>
            <span className="text-muted-foreground">Phone: </span>
            {node.personPhone}
          </div>
        )}
        {node.personEmail && (
          <div>
            <span className="text-muted-foreground">Email: </span>
            {node.personEmail}
          </div>
        )}
        <div>
          <span className="text-muted-foreground">Vertical: </span>
          {node.verticalName}
        </div>
        {node.constituencyId && (
          <div>
            <span className="text-muted-foreground">AC: </span>
            {node.constituencyId}
          </div>
        )}
        {(node.divisionName || node.districtName || node.talukaName || node.wardGeoName) && (
          <div>
            <span className="text-muted-foreground">Geo: </span>
            {[node.divisionName, node.districtName, node.talukaName, node.wardGeoName]
              .filter(Boolean)
              .join(' → ')}
          </div>
        )}
        {node.boothNo && (
          <div>
            <span className="text-muted-foreground">Booth/Part: </span>
            {node.boothNo}
            {node.electionId ? ` (${node.electionId})` : ''}
          </div>
        )}
        {node.linkedUser && (
          <div>
            <span className="text-muted-foreground">Portal user: </span>
            {node.linkedUser.userId}
          </div>
        )}
        {node.linkedVoter && (
          <div>
            <span className="text-muted-foreground">Voter: </span>
            <Link
              href={`/modules/voter/${node.linkedVoter.epicNumber}`}
              className="text-primary underline"
            >
              {node.linkedVoter.fullName} ({node.linkedVoter.epicNumber})
            </Link>
          </div>
        )}
        {node.notes && (
          <div>
            <span className="text-muted-foreground">Notes: </span>
            {node.notes}
          </div>
        )}
        {isAdmin && (
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Pencil className="size-3.5 mr-1" /> Edit
            </Button>
            <Button size="sm" variant="secondary" onClick={onAddSubordinate}>
              <Plus className="size-3.5 mr-1" /> Add subordinate
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
