'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/components/toast';
import type { CadreNodeDetail } from '@/lib/hierarchy/types';

interface HierarchyManageAdminProps {
  nodes: CadreNodeDetail[];
  onAdd: () => void;
  onEdit: (node: CadreNodeDetail) => void;
  onRefresh: () => void;
}

export function HierarchyManageAdmin({
  nodes,
  onAdd,
  onEdit,
  onRefresh,
}: HierarchyManageAdminProps) {
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this node?')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/hierarchy/nodes/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ type: 'success', description: 'Node deleted' });
      onRefresh();
    } catch (e) {
      toast({
        type: 'error',
        description: e instanceof Error ? e.message : 'Delete failed',
      });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={onAdd}>
          <Plus className="size-4 mr-1" /> Add node
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Position</TableHead>
              <TableHead>Person</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Voter</TableHead>
              <TableHead>Booth</TableHead>
              <TableHead>Vacant</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {nodes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No nodes yet. Add a root or subordinate position.
                </TableCell>
              </TableRow>
            ) : (
              nodes.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="font-medium">{n.positionName}</TableCell>
                  <TableCell>{n.isVacant ? '—' : n.personName ?? '—'}</TableCell>
                  <TableCell>{n.linkedUser?.userId ?? '—'}</TableCell>
                  <TableCell>{n.linkedVoter?.epicNumber ?? '—'}</TableCell>
                  <TableCell>{n.boothNo ?? '—'}</TableCell>
                  <TableCell>{n.isVacant ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(n)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={deleting === n.id}
                        onClick={() => handleDelete(n.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
