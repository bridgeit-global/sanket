'use client';

import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPickerCombobox } from './user-picker-combobox';
import { VoterPickerCombobox } from './voter-picker-combobox';
import { toast } from '@/components/toast';
import type { CadreConfig, CadreNodeDetail } from '@/lib/hierarchy/types';

interface HierarchyNodeEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: CadreConfig | null;
  node?: CadreNodeDetail | null;
  parentId?: string | null;
  verticalId: string;
  constituencyId: string;
  electionId: string;
  onSaved: () => void;
}

export function HierarchyNodeEditSheet({
  open,
  onOpenChange,
  config,
  node,
  parentId,
  verticalId,
  constituencyId,
  electionId,
  onSaved,
}: HierarchyNodeEditSheetProps) {
  const [positionId, setPositionId] = useState('');
  const [personName, setPersonName] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [personEmail, setPersonEmail] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [epicNumber, setEpicNumber] = useState<string | null>(null);
  const [boothNo, setBoothNo] = useState('');
  const [wardGeoId, setWardGeoId] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [notes, setNotes] = useState('');
  const [isVacant, setIsVacant] = useState(false);
  const [booths, setBooths] = useState<Array<{ boothNo: string; boothName: string | null }>>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (node) {
      setPositionId(node.positionId);
      setPersonName(node.personName ?? '');
      setPersonPhone(node.personPhone ?? '');
      setPersonEmail(node.personEmail ?? '');
      setUserId(node.userId);
      setEpicNumber(node.epicNumber);
      setBoothNo(node.boothNo ?? '');
      setWardGeoId(node.wardGeoId ?? '');
      setDivisionId(node.divisionId ?? '');
      setNotes(node.notes ?? '');
      setIsVacant(node.isVacant);
    } else {
      setPositionId('');
      setPersonName('');
      setPersonPhone('');
      setPersonEmail('');
      setUserId(null);
      setEpicNumber(null);
      setBoothNo('');
      setWardGeoId('');
      setDivisionId('');
      setNotes('');
      setIsVacant(false);
    }
  }, [node, open]);

  useEffect(() => {
    if (!electionId || !open) return;
    fetch(`/api/hierarchy/lookups/booths?electionId=${encodeURIComponent(electionId)}`)
      .then((r) => r.json())
      .then((d) => setBooths(d.booths ?? []))
      .catch(() => setBooths([]));
  }, [electionId, open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        parentId: node?.parentId ?? parentId ?? null,
        verticalId,
        positionId,
        constituencyId,
        divisionId: divisionId || null,
        wardGeoId: wardGeoId || null,
        electionId: boothNo ? electionId : null,
        boothNo: boothNo || null,
        personName: personName || null,
        personPhone: personPhone || null,
        personEmail: personEmail || null,
        userId,
        epicNumber,
        notes: notes || null,
        isVacant,
      };

      const url = node ? `/api/hierarchy/nodes/${node.id}` : '/api/hierarchy/nodes';
      const method = node ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      toast({ type: 'success', description: node ? 'Node updated' : 'Node created' });
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast({
        type: 'error',
        description: e instanceof Error ? e.message : 'Save failed',
      });
    } finally {
      setSaving(false);
    }
  };

  const wardUnits = config?.geoUnits.filter((g) => g.type === 'ward') ?? [];
  const divisions = config?.geoUnits.filter((g) => g.type === 'division') ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{node ? 'Edit cadre position' : 'Add cadre position'}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div>
            <Label>Position</Label>
            <Select value={positionId} onValueChange={setPositionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                {config?.positions
                  .filter((p) => p.isActive)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.levelName})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="vacant"
              checked={isVacant}
              onChange={(e) => setIsVacant(e.target.checked)}
            />
            <Label htmlFor="vacant">Vacant position</Label>
          </div>

          {!isVacant && (
            <Tabs defaultValue="manual">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="user">Link User</TabsTrigger>
                <TabsTrigger value="voter">Link Voter</TabsTrigger>
                <TabsTrigger value="manual">Manual</TabsTrigger>
              </TabsList>
              <TabsContent value="user" className="pt-2">
                <UserPickerCombobox
                  value={userId}
                  onSelect={(u) => {
                    setUserId(u?.id ?? null);
                    if (u) setPersonName(u.userId);
                  }}
                />
              </TabsContent>
              <TabsContent value="voter" className="pt-2">
                <VoterPickerCombobox
                  value={epicNumber}
                  onSelect={(v) => {
                    setEpicNumber(v?.epicNumber ?? null);
                    if (v) setPersonName(v.fullName);
                  }}
                />
              </TabsContent>
              <TabsContent value="manual" className="space-y-2 pt-2">
                <Input placeholder="Name" value={personName} onChange={(e) => setPersonName(e.target.value)} />
                <Input placeholder="Phone" value={personPhone} onChange={(e) => setPersonPhone(e.target.value)} />
                <Input placeholder="Email" value={personEmail} onChange={(e) => setPersonEmail(e.target.value)} />
              </TabsContent>
            </Tabs>
          )}

          <div>
            <Label>Division</Label>
            <Select value={divisionId} onValueChange={setDivisionId}>
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {divisions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Ward (geo unit)</Label>
            <Select value={wardGeoId} onValueChange={setWardGeoId}>
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {wardUnits.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Booth / Part No</Label>
            <Select value={boothNo} onValueChange={setBoothNo}>
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {booths.map((b) => (
                  <SelectItem key={b.boothNo} value={b.boothNo}>
                    {b.boothNo}{b.boothName ? ` — ${b.boothName}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>

          <Button className="w-full" onClick={handleSave} disabled={saving || !positionId}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
