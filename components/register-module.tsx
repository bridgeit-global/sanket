'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Printer, Download, Paperclip, Eye, FileText, Search } from 'lucide-react';
import { format } from 'date-fns';
import { RegisterAttachmentDialog } from '@/components/register-attachment-dialog';
import { RegisterSkeleton } from '@/components/module-skeleton';
import { TablePagination, usePagination } from '@/components/table-pagination';
import { ModulePageHeader } from '@/components/module-page-header';

interface Attachment {
  id: string;
  fileName: string;
  fileSizeKb: number;
  fileUrl: string | null;
  createdAt: string;
}

interface RegisterEntry {
  id: string;
  type: 'inward' | 'outward';
  date: string;
  fromTo: string;
  subject: string;
  projectId?: string;
  mode?: string;
  refNo?: string;
  officer?: string;
  attachments?: Attachment[];
}

interface Project {
  id: string;
  name: string;
}

export function RegisterModule({ type }: { type: 'inward' | 'outward' }) {
  const [entries, setEntries] = useState<RegisterEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    fromTo: '',
    subject: '',
    projectId: '',
    mode: '',
    refNo: '',
    officer: '',
  });
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<RegisterEntry | null>(null);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, [type]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [entriesRes, projectsRes] = await Promise.all([
        fetch(`/api/register?type=${type}`),
        fetch('/api/projects'),
      ]);

      if (entriesRes.ok) {
        const entriesData = await entriesRes.json();
        // Attachments are now included in the API response
        setEntries(entriesData);
      }

      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(projectsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.subject) return;

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          ...form,
          projectId: form.projectId || undefined,
        }),
      });

      if (response.ok) {
        await loadData();
        setForm({
          date: format(new Date(), 'yyyy-MM-dd'),
          fromTo: '',
          subject: '',
          projectId: '',
          mode: '',
          refNo: '',
          officer: '',
        });
      }
    } catch (error) {
      console.error('Error creating register entry:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleOpenAttachments = (entry: RegisterEntry) => {
    setSelectedEntry(entry);
    setAttachmentDialogOpen(true);
  };

  const handleAttachmentsChange = async () => {
    // Reload attachments for the selected entry
    if (selectedEntry) {
      try {
        const response = await fetch(`/api/register/${selectedEntry.id}`);
        if (response.ok) {
          const entryData = await response.json();
          // Update the entries list with new attachment data
          setEntries((prev) =>
            prev.map((e) =>
              e.id === selectedEntry.id
                ? { ...e, attachments: entryData.attachments || [] }
                : e,
            ),
          );
          // Update selected entry
          setSelectedEntry({ ...selectedEntry, attachments: entryData.attachments || [] });
        }
      } catch (error) {
        console.error('Error refreshing attachments:', error);
      }
    }
  };

  const heading = type === 'inward' ? 'Inward Register' : 'Outward Register';
  const labelFromTo =
    type === 'inward' ? 'From (Name / Office)' : 'To (Name / Office)';

  // Filter entries based on search term
  const filteredEntries = entries.filter((entry) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const project = projects.find((p) => p.id === entry.projectId);
    return (
      entry.fromTo.toLowerCase().includes(search) ||
      entry.subject.toLowerCase().includes(search) ||
      (entry.mode || '').toLowerCase().includes(search) ||
      (entry.refNo || '').toLowerCase().includes(search) ||
      (entry.officer || '').toLowerCase().includes(search) ||
      (project?.name || '').toLowerCase().includes(search)
    );
  });

  // Pagination
  const {
    paginatedItems: paginatedEntries,
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination(filteredEntries, 10);

  if (loading) {
    return <RegisterSkeleton />;
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <ModulePageHeader
        title={heading}
        description={type === 'inward' ? 'Manage incoming documents and letters' : 'Manage outgoing documents and letters'}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{heading}</CardTitle>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print Register
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-6">
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="fromTo">{labelFromTo}</Label>
              <Input
                id="fromTo"
                placeholder="Name, designation, department..."
                value={form.fromTo}
                onChange={(e) => setForm({ ...form, fromTo: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Short description of letter / document"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="project">Project</Label>
              <Select
                value={form.projectId || 'none'}
                onValueChange={(value) =>
                  setForm({ ...form, projectId: value === 'none' ? '' : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="mode">Mode</Label>
              <Input
                id="mode"
                placeholder="Hand / Email / Dak / Courier..."
                value={form.mode}
                onChange={(e) => setForm({ ...form, mode: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="refNo">Reference No.</Label>
              <Input
                id="refNo"
                placeholder="Diary no., email id, dak no..."
                value={form.refNo}
                onChange={(e) => setForm({ ...form, refNo: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="officer">Marked to Officer</Label>
              <Input
                id="officer"
                placeholder="PA, PRO, Office staff..."
                value={form.officer}
                onChange={(e) => setForm({ ...form, officer: e.target.value })}
              />
            </div>
            <div className="md:col-span-6 flex justify-end">
              <Button type="submit">Add Entry</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Entries</CardTitle>
            <span className="text-sm text-muted-foreground">
              {filteredEntries.length} of {entries.length} entries
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by sender, subject, project, mode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>{labelFromTo}</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Ref No.</TableHead>
                  <TableHead>Officer</TableHead>
                  <TableHead>Attachments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEntries.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-muted-foreground"
                    >
                      {entries.length === 0 ? 'No entries yet.' : 'No entries match your search.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedEntries.map((entry) => {
                    const project = projects.find((p) => p.id === entry.projectId);
                    return (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {format(new Date(entry.date), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>{entry.fromTo}</TableCell>
                        <TableCell className="font-medium">
                          {entry.subject}
                        </TableCell>
                        <TableCell>{project?.name || '-'}</TableCell>
                        <TableCell>{entry.mode || '-'}</TableCell>
                        <TableCell>{entry.refNo || '-'}</TableCell>
                        <TableCell>{entry.officer || '-'}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5"
                            onClick={() => handleOpenAttachments(entry)}
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                            {entry.attachments && entry.attachments.length > 0 ? (
                              <span className="text-xs">
                                {entry.attachments.length}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Add
                              </span>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {filteredEntries.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </CardContent>
      </Card>

      {/* Attachment Dialog */}
      {selectedEntry && (
        <RegisterAttachmentDialog
          open={attachmentDialogOpen}
          onOpenChange={setAttachmentDialogOpen}
          entryId={selectedEntry.id}
          entrySubject={selectedEntry.subject}
          attachments={selectedEntry.attachments || []}
          onAttachmentsChange={handleAttachmentsChange}
        />
      )}
    </div>
  );
}

