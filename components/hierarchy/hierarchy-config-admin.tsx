'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/toast';
import type { CadreConfig } from '@/lib/hierarchy/types';

interface HierarchyConfigAdminProps {
  config: CadreConfig;
  onRefresh: () => void;
}

export function HierarchyConfigAdmin({ config, onRefresh }: HierarchyConfigAdminProps) {
  const [dialog, setDialog] = useState<'vertical' | 'position' | 'geo' | 'category' | null>(null);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [geoType, setGeoType] = useState<'division' | 'district' | 'taluka' | 'ward'>('division');
  const [saving, setSaving] = useState(false);

  const save = async (url: string, body: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ type: 'success', description: 'Saved' });
      setDialog(null);
      setName('');
      onRefresh();
    } catch (e) {
      toast({
        type: 'error',
        description: e instanceof Error ? e.message : 'Save failed',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Tabs defaultValue="verticals">
        <TabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="verticals">Verticals</TabsTrigger>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="geo">Geographic</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <Button onClick={() => setDialog('category')}>Add category</Button>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {config.categories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.sortOrder}</TableCell>
                  <TableCell>{c.isActive ? 'Yes' : 'No'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="verticals" className="space-y-4">
          <Button onClick={() => setDialog('vertical')}>Add vertical</Button>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {config.verticals.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>{v.name}</TableCell>
                  <TableCell>{v.categoryName}</TableCell>
                  <TableCell>{v.sortOrder}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="positions" className="space-y-4">
          <Button onClick={() => setDialog('position')}>Add position</Button>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {config.positions.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.levelName}</TableCell>
                  <TableCell>{p.sortOrder}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="geo" className="space-y-4">
          <Button onClick={() => setDialog('geo')}>Add geographic unit</Button>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>AC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {config.geoUnits.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="capitalize">{g.type}</TableCell>
                  <TableCell>{g.name}</TableCell>
                  <TableCell>{g.acNo ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      <Dialog open={dialog !== null} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === 'vertical' && 'Add vertical'}
              {dialog === 'position' && 'Add position'}
              {dialog === 'geo' && 'Add geographic unit'}
              {dialog === 'category' && 'Add category'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            {dialog === 'vertical' && (
              <div>
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {config.categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {dialog === 'position' && (
              <div>
                <Label>Level</Label>
                <Select value={levelId} onValueChange={setLevelId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {config.levels.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {dialog === 'geo' && (
              <div>
                <Label>Type</Label>
                <Select value={geoType} onValueChange={(v) => setGeoType(v as typeof geoType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="division">Division</SelectItem>
                    <SelectItem value="district">District</SelectItem>
                    <SelectItem value="taluka">Taluka / City</SelectItem>
                    <SelectItem value="ward">Ward</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              className="w-full"
              disabled={saving || !name.trim()}
              onClick={() => {
                if (dialog === 'vertical') {
                  save('/api/hierarchy/config/verticals', { categoryId, name, sortOrder: 99 });
                } else if (dialog === 'position') {
                  save('/api/hierarchy/config/positions', { levelId, name, sortOrder: 99 });
                } else if (dialog === 'geo') {
                  save('/api/hierarchy/config/geo-units', { type: geoType, name, sortOrder: 99 });
                } else if (dialog === 'category') {
                  save('/api/hierarchy/config/geo-units', { entityType: 'category', name, sortOrder: 99 });
                }
              }}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
