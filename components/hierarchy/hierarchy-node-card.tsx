'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { User, Vote } from 'lucide-react';
import type { CadreNodeDetail } from '@/lib/hierarchy/types';

export type CadreNodeCardData = {
  cadre: CadreNodeDetail;
  color: string;
};

function CadreNodeCardComponent({ data, selected }: NodeProps) {
  const { cadre, color } = data as CadreNodeCardData;
  const displayName = cadre.isVacant
    ? 'Vacant'
    : cadre.personName ?? cadre.linkedVoter?.fullName ?? cadre.linkedUser?.userId ?? '—';

  return (
    <div
      className={`rounded-lg border-2 bg-card px-3 py-2 shadow-md min-w-[200px] max-w-[220px] ${selected ? 'ring-2 ring-primary' : ''}`}
      style={{ borderColor: color }}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground" />
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground truncate">
        {cadre.positionName}
      </p>
      <p className="text-sm font-semibold truncate">{displayName}</p>
      <div className="mt-1 flex items-center gap-1 flex-wrap">
        {cadre.linkedUser && (
          <span className="inline-flex items-center gap-0.5 rounded bg-blue-100 px-1 py-0.5 text-[10px] text-blue-800 dark:bg-blue-900 dark:text-blue-100">
            <User className="size-2.5" /> User
          </span>
        )}
        {cadre.linkedVoter && (
          <span className="inline-flex items-center gap-0.5 rounded bg-green-100 px-1 py-0.5 text-[10px] text-green-800 dark:bg-green-900 dark:text-green-100">
            <Vote className="size-2.5" /> Voter
          </span>
        )}
        {cadre.boothNo && (
          <span className="text-[10px] text-muted-foreground">Booth {cadre.boothNo}</span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground" />
    </div>
  );
}

export const CadreNodeCard = memo(CadreNodeCardComponent);
