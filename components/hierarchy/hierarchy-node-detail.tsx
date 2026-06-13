'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, Plus, UserPlus, X } from 'lucide-react';
import type { CadreNodeDetail } from '@/lib/hierarchy/types';
import { formatGeoContextLine } from '@/lib/hierarchy/geo-attribution';
import { isPlaceholderNode } from '@/lib/hierarchy/vacant-slots';

interface HierarchyNodeDetailProps {
  node: CadreNodeDetail;
  isAdmin: boolean;
  onClose: () => void;
  onEdit: () => void;
  onAddSubordinate: () => void;
  onFillVacant?: () => void;
}

export function HierarchyNodeDetail({
  node,
  isAdmin,
  onClose,
  onEdit,
  onAddSubordinate,
  onFillVacant,
}: HierarchyNodeDetailProps) {
  const isPlaceholder = isPlaceholderNode(node);
  const geoLine = formatGeoContextLine(node);

  return (
    <Card
      className={`w-80 shadow-xl border-2 ${
        node.isVacant ? 'border-dashed border-amber-500/60' : ''
      }`}
    >
      <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
        <div className="pr-6 space-y-1">
          <CardTitle className="text-base leading-tight">{node.positionName}</CardTitle>
          {geoLine && (
            <p className="text-xs font-medium text-muted-foreground">{geoLine}</p>
          )}
        </div>
        <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div>
          <span className="text-muted-foreground">Person: </span>
          <span className={`font-medium ${node.isVacant ? 'italic text-amber-800 dark:text-amber-200' : ''}`}>
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
          <div className="flex flex-col gap-2 pt-2">
            {isPlaceholder && onFillVacant ? (
              <>
                <p className="text-xs text-muted-foreground">
                  This expected slot has no database record yet. Create a node with ward/booth
                  context pre-filled.
                </p>
                <Button size="sm" onClick={onFillVacant}>
                  <UserPlus className="size-3.5 mr-1" /> Fill this position
                </Button>
              </>
            ) : isPlaceholder ? (
              <p className="text-xs text-muted-foreground">
                This slot has no database record yet. Ask an admin to fill it from the chart.
              </p>
            ) : node.isVacant ? (
              <>
                <Button size="sm" onClick={onEdit}>
                  <UserPlus className="size-3.5 mr-1" /> Assign person
                </Button>
                <Button size="sm" variant="outline" onClick={onEdit}>
                  <Pencil className="size-3.5 mr-1" /> Edit
                </Button>
              </>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={onEdit}>
                  <Pencil className="size-3.5 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="secondary" onClick={onAddSubordinate}>
                  <Plus className="size-3.5 mr-1" /> Add subordinate
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
