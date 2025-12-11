'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { ArrowLeft, Edit, Trash2, Plus, FileText, Inbox, Send, Paperclip, Printer, Upload, X } from 'lucide-react';
import { format } from 'date-fns';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { ProjectsSkeleton } from '@/components/module-skeleton';
import { RegisterAttachmentDialog } from '@/components/register-attachment-dialog';

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
  documentType: 'VIP' | 'Department' | 'General';
  date: string;
  fromTo: string;
  subject: string;
  projectId?: string;
  mode?: string;
  refNo?: string;
  officer?: string;
  createdAt?: string;
  attachments?: Attachment[];
}

interface Project {
  id: string;
  name: string;
  ward?: string;
  type?: string;
  status: 'Concept' | 'Proposal' | 'In Progress' | 'Completed';
  registerEntries?: RegisterEntry[];
}

interface ProjectDetailProps {
  projectId: string;
}

export function ProjectDetail({ projectId }: ProjectDetailProps) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [entries, setEntries] = useState<RegisterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<RegisterEntry | null>(null);
  const [editingProject, setEditingProject] = useState(false);

  // Project form
  const [projectForm, setProjectForm] = useState({
    name: '',
    ward: '',
    type: '',
    status: 'Concept' as Project['status'],
  });

  // Entry form
  const [entryForm, setEntryForm] = useState({
    type: 'inward' as 'inward' | 'outward',
    documentType: 'General' as 'VIP' | 'Department' | 'General',
    date: format(new Date(), 'yyyy-MM-dd'),
    fromTo: '',
    subject: '',
    mode: '',
    refNo: '',
    officer: '',
  });

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  // Attachment dialog
  const [attachmentDialogEntry, setAttachmentDialogEntry] = useState<RegisterEntry | null>(null);

  // File upload state for new entries
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
        setEntries(data.registerEntries || []);
        setProjectForm({
          name: data.name,
          ward: data.ward || '',
          type: data.type || '',
          status: data.status,
        });
      } else if (response.status === 404) {
        toast.error('Project not found');
        router.push('/modules/projects');
      }
    } catch (error) {
      console.error('Error loading project:', error);
      toast.error('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.name.trim()) return;

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectForm),
      });

      if (response.ok) {
        const updated = await response.json();
        if (project) {
          setProject({ ...project, ...updated });
        }
        setEditingProject(false);
        toast.success('Project updated successfully');
      } else {
        toast.error('Failed to update project');
      }
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Failed to update project');
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryForm.date || !entryForm.fromTo || !entryForm.subject) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      // Create the entry first
      const response = await fetch(`/api/projects/${projectId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entryForm),
      });

      if (response.ok) {
        const newEntry = await response.json();

        // Upload files if any
        if (selectedFiles.length > 0) {
          setUploadingFiles(true);
          let successCount = 0;
          let errorCount = 0;

          for (const file of selectedFiles) {
            try {
              const formData = new FormData();
              formData.append('file', file);

              const uploadResponse = await fetch(`/api/register/${newEntry.id}/attachments`, {
                method: 'POST',
                body: formData,
              });

              if (uploadResponse.ok) {
                successCount++;
              } else {
                const errorData = await uploadResponse.json();
                toast.error(`Failed to upload ${file.name}: ${errorData.error}`);
                errorCount++;
              }
            } catch (error) {
              console.error('Upload error:', error);
              toast.error(`Failed to upload ${file.name}`);
              errorCount++;
            }
          }

          setUploadingFiles(false);

          if (successCount > 0) {
            toast.success(
              `Entry created and ${successCount} file${successCount > 1 ? 's' : ''} uploaded successfully`,
            );
          }
        } else {
          toast.success('Entry added successfully');
        }

        await loadProject();
        setShowAddForm(false);
        setSelectedFiles([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setEntryForm({
          type: 'inward',
          documentType: 'General',
          date: format(new Date(), 'yyyy-MM-dd'),
          fromTo: '',
          subject: '',
          mode: '',
          refNo: '',
          officer: '',
        });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add entry');
      }
    } catch (error) {
      console.error('Error adding entry:', error);
      toast.error('Failed to add entry');
      setUploadingFiles(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      // Validate file types and sizes
      const validFiles: File[] = [];
      const MAX_SIZE = 10 * 1024 * 1024; // 10MB
      const ALLOWED_TYPES = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
      ];

      for (const file of fileArray) {
        if (file.size > MAX_SIZE) {
          toast.error(`${file.name} is too large. Maximum size is 10MB.`);
          continue;
        }
        if (!ALLOWED_TYPES.includes(file.type)) {
          toast.error(`${file.name} is not an allowed file type.`);
          continue;
        }
        validFiles.push(file);
      }

      setSelectedFiles((prev) => [...prev, ...validFiles]);
    }
    // Reset input
    if (e.target) {
      e.target.value = '';
    }
  };

  const removeFile = (fileToRemove: File) => {
    setSelectedFiles((prev) =>
      prev.filter(
        (file) =>
          file.name !== fileToRemove.name ||
          file.size !== fileToRemove.size ||
          file.lastModified !== fileToRemove.lastModified
      )
    );
  };

  const handleUpdateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    try {
      const response = await fetch(`/api/register/${editingEntry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: entryForm.date,
          fromTo: entryForm.fromTo,
          subject: entryForm.subject,
          documentType: entryForm.documentType,
          mode: entryForm.mode,
          refNo: entryForm.refNo,
          officer: entryForm.officer,
        }),
      });

      if (response.ok) {
        await loadProject();
        setEditingEntry(null);
        toast.success('Entry updated successfully');
      } else {
        toast.error('Failed to update entry');
      }
    } catch (error) {
      console.error('Error updating entry:', error);
      toast.error('Failed to update entry');
    }
  };

  const handleDeleteEntry = (entryId: string) => {
    setEntryToDelete(entryId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteEntry = async () => {
    if (!entryToDelete) return;

    try {
      const response = await fetch(`/api/register/${entryToDelete}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadProject();
        toast.success('Entry deleted successfully');
      } else {
        toast.error('Failed to delete entry');
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Failed to delete entry');
    } finally {
      setEntryToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const startEditEntry = (entry: RegisterEntry) => {
    setEditingEntry(entry);
    setEntryForm({
      type: entry.type,
      documentType: entry.documentType || 'General',
      date: entry.date,
      fromTo: entry.fromTo,
      subject: entry.subject,
      mode: entry.mode || '',
      refNo: entry.refNo || '',
      officer: entry.officer || '',
    });
  };

  // Helper function to sort entries chronologically (by date descending, then createdAt descending)
  const sortEntriesChronologically = (entriesList: RegisterEntry[]) => {
    return [...entriesList].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateB !== dateA) {
        return dateB - dateA; // Descending by date
      }
      // If dates are equal, sort by createdAt descending
      const createdAtA = new Date(a.createdAt || 0).getTime();
      const createdAtB = new Date(b.createdAt || 0).getTime();
      return createdAtB - createdAtA;
    });
  };

  // Filter entries by documentType
  const vipEntries = sortEntriesChronologically(entries.filter((e) => e.documentType === 'VIP'));
  const departmentEntries = sortEntriesChronologically(entries.filter((e) => e.documentType === 'Department'));
  const generalEntries = sortEntriesChronologically(entries.filter((e) => e.documentType === 'General'));

  // Filter entries by type for print view
  const inwardEntries = sortEntriesChronologically(entries.filter((e) => e.type === 'inward'));
  const outwardEntries = sortEntriesChronologically(entries.filter((e) => e.type === 'outward'));

  const inwardCount = entries.filter((e) => e.type === 'inward').length;
  const outwardCount = entries.filter((e) => e.type === 'outward').length;

  if (loading) {
    return <ProjectsSkeleton />;
  }

  if (!project) {
    return <div className="p-4">Project not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Print-only content */}
      <div className="project-print-content hidden">
        <div className="project-print-header">
          <h2>Hon&apos; MLA, Smt. Sana Malik Shaikh</h2>
          <h1>Project Details</h1>
          <p className="print-date">Printed on: {format(new Date(), 'dd MMM yyyy')}</p>
        </div>

        <div className="project-info-section">
          <h3>Project Information</h3>
          <table className="project-info-table">
            <tbody>
              <tr>
                <td><strong>Project Name:</strong></td>
                <td>{project.name}</td>
              </tr>
              {project.ward && (
                <tr>
                  <td><strong>Ward / Beat:</strong></td>
                  <td>{project.ward}</td>
                </tr>
              )}
              {project.type && (
                <tr>
                  <td><strong>Type:</strong></td>
                  <td>{project.type}</td>
                </tr>
              )}
              <tr>
                <td><strong>Status:</strong></td>
                <td>{project.status}</td>
              </tr>
              <tr>
                <td><strong>Total Entries:</strong></td>
                <td>{entries.length} (Inward: {inwardCount}, Outward: {outwardCount})</td>
              </tr>
            </tbody>
          </table>
        </div>

        {inwardEntries.length > 0 && (
          <div className="register-section">
            <h3>Inward Register Entries</h3>
            <table className="register-table">
              <thead>
                <tr>
                  <th>Sr.</th>
                  <th>Date</th>
                  <th>From</th>
                  <th>Subject</th>
                  <th>Mode</th>
                  <th>Ref No</th>
                  <th>Officer</th>
                </tr>
              </thead>
              <tbody>
                {inwardEntries.map((entry, index) => (
                  <tr key={entry.id}>
                    <td>{index + 1}</td>
                    <td>{format(new Date(entry.date), 'dd MMM yyyy')}</td>
                    <td>{entry.fromTo}</td>
                    <td>{entry.subject}</td>
                    <td>{entry.mode || '-'}</td>
                    <td>{entry.refNo || '-'}</td>
                    <td>{entry.officer || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {outwardEntries.length > 0 && (
          <div className="register-section">
            <h3>Outward Register Entries</h3>
            <table className="register-table">
              <thead>
                <tr>
                  <th>Sr.</th>
                  <th>Date</th>
                  <th>To</th>
                  <th>Subject</th>
                  <th>Mode</th>
                  <th>Ref No</th>
                  <th>Officer</th>
                </tr>
              </thead>
              <tbody>
                {outwardEntries.map((entry, index) => (
                  <tr key={entry.id}>
                    <td>{index + 1}</td>
                    <td>{format(new Date(entry.date), 'dd MMM yyyy')}</td>
                    <td>{entry.fromTo}</td>
                    <td>{entry.subject}</td>
                    <td>{entry.mode || '-'}</td>
                    <td>{entry.refNo || '-'}</td>
                    <td>{entry.officer || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {entries.length === 0 && (
          <div className="no-entries">
            <p>No register entries for this project.</p>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 no-print">
        <SidebarToggle />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/modules/projects')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
      </div>

      {/* Project Info Card */}
      <Card className="no-print">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{project.name}</CardTitle>
              <CardDescription className="mt-1">
                {project.ward && `Ward: ${project.ward}`}
                {project.type && ` | Type: ${project.type}`}
                {` | Status: ${project.status}`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (project) {
                    // Reset form to current project values when starting to edit
                    setProjectForm({
                      name: project.name,
                      ward: project.ward || '',
                      type: project.type || '',
                      status: project.status,
                    });
                  }
                  setEditingProject(!editingProject);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Project
              </Button>
            </div>
          </div>
        </CardHeader>
        {editingProject && (
          <CardContent>
            <form onSubmit={handleUpdateProject} className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  value={projectForm.name}
                  onChange={(e) =>
                    setProjectForm({ ...projectForm, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ward">Ward / Beat</Label>
                <Input
                  id="ward"
                  value={projectForm.ward}
                  onChange={(e) =>
                    setProjectForm({ ...projectForm, ward: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Input
                  id="type"
                  value={projectForm.type}
                  onChange={(e) =>
                    setProjectForm({ ...projectForm, type: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={projectForm.status}
                  onValueChange={(value) =>
                    setProjectForm({
                      ...projectForm,
                      status: value as Project['status'],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Concept">Concept</SelectItem>
                    <SelectItem value="Proposal">Proposal</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-4 flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    // Reset form to current project values when canceling
                    if (project) {
                      setProjectForm({
                        name: project.name,
                        ward: project.ward || '',
                        type: project.type || '',
                        status: project.status,
                      });
                    }
                    setEditingProject(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3 no-print">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{entries.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inward Entries</CardTitle>
            <Inbox className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inwardCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outward Entries</CardTitle>
            <Send className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{outwardCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Register Entries */}
      <Card className="no-print">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Register Entries</CardTitle>
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Entry
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddForm && (
            <form onSubmit={handleAddEntry} className="mb-6 p-4 border rounded-lg space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="entry-type">Type *</Label>
                  <Select
                    value={entryForm.type}
                    onValueChange={(value) =>
                      setEntryForm({ ...entryForm, type: value as 'inward' | 'outward' })
                    }
                  >
                    <SelectTrigger id="entry-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inward">Inward</SelectItem>
                      <SelectItem value="outward">Outward</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entry-documentType">Document Type *</Label>
                  <Select
                    value={entryForm.documentType}
                    onValueChange={(value) =>
                      setEntryForm({ ...entryForm, documentType: value as 'VIP' | 'Department' | 'General' })
                    }
                  >
                    <SelectTrigger id="entry-documentType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIP">VIP</SelectItem>
                      <SelectItem value="Department">Department</SelectItem>
                      <SelectItem value="General">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entry-date">Date *</Label>
                  <Input
                    id="entry-date"
                    type="date"
                    value={entryForm.date}
                    onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="entry-fromTo">
                  {entryForm.type === 'inward' ? 'From' : 'To'} *
                </Label>
                <Input
                  id="entry-fromTo"
                  placeholder="Name, designation, department..."
                  value={entryForm.fromTo}
                  onChange={(e) => setEntryForm({ ...entryForm, fromTo: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="entry-subject">Subject *</Label>
                <Input
                  id="entry-subject"
                  placeholder="Short description..."
                  value={entryForm.subject}
                  onChange={(e) => setEntryForm({ ...entryForm, subject: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="entry-mode">Mode</Label>
                  <Input
                    id="entry-mode"
                    placeholder="Hand, Email, Dak..."
                    value={entryForm.mode}
                    onChange={(e) => setEntryForm({ ...entryForm, mode: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entry-refNo">Reference No</Label>
                  <Input
                    id="entry-refNo"
                    value={entryForm.refNo}
                    onChange={(e) => setEntryForm({ ...entryForm, refNo: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entry-officer">Officer</Label>
                  <Input
                    id="entry-officer"
                    value={entryForm.officer}
                    onChange={(e) => setEntryForm({ ...entryForm, officer: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="entry-files">Attachments (Optional)</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-fit"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Select Files
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileSelect}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.txt"
                    />
                    {selectedFiles.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                      </span>
                    )}
                  </div>
                  {selectedFiles.length > 0 && (
                    <div className="space-y-1 max-h-32 overflow-y-auto border rounded p-2">
                      {selectedFiles.map((file) => (
                        <div
                          key={`${file.name}-${file.size}-${file.lastModified}`}
                          className="flex items-center justify-between text-sm bg-muted p-2 rounded"
                        >
                          <span className="flex items-center gap-2">
                            <Paperclip className="h-3 w-3" />
                            <span className="truncate max-w-xs">{file.name}</span>
                            <span className="text-muted-foreground">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(file)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    setSelectedFiles([]);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  disabled={uploadingFiles}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={uploadingFiles}>
                  {uploadingFiles ? 'Uploading...' : 'Add Entry'}
                </Button>
              </div>
            </form>
          )}

          <Tabs defaultValue="VIP" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="VIP">VIP ({vipEntries.length})</TabsTrigger>
              <TabsTrigger value="Department">Department ({departmentEntries.length})</TabsTrigger>
              <TabsTrigger value="General">General ({generalEntries.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="VIP" className="mt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>From/To</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Ref No</TableHead>
                      <TableHead>Officer</TableHead>
                      <TableHead>Attachments</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vipEntries.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="text-center text-muted-foreground"
                        >
                          No VIP register entries yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      vipEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${entry.type === 'inward'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                                }`}
                            >
                              {entry.type === 'inward' ? (
                                <Inbox className="mr-1 h-3 w-3" />
                              ) : (
                                <Send className="mr-1 h-3 w-3" />
                              )}
                              {entry.type}
                            </span>
                          </TableCell>
                          <TableCell>
                            {format(new Date(entry.date), 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell>{entry.fromTo}</TableCell>
                          <TableCell className="font-medium">{entry.subject}</TableCell>
                          <TableCell>{entry.mode || '-'}</TableCell>
                          <TableCell>{entry.refNo || '-'}</TableCell>
                          <TableCell>{entry.officer || '-'}</TableCell>
                          <TableCell>
                            {entry.attachments && entry.attachments.length > 0 ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto py-1 px-2 text-sm text-muted-foreground hover:text-foreground"
                                onClick={() => setAttachmentDialogEntry(entry)}
                              >
                                <Paperclip className="h-3 w-3 mr-1" />
                                {entry.attachments.length} file(s)
                              </Button>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditEntry(entry)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteEntry(entry.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            <TabsContent value="Department" className="mt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>From/To</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Ref No</TableHead>
                      <TableHead>Officer</TableHead>
                      <TableHead>Attachments</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departmentEntries.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="text-center text-muted-foreground"
                        >
                          No Department register entries yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      departmentEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${entry.type === 'inward'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                                }`}
                            >
                              {entry.type === 'inward' ? (
                                <Inbox className="mr-1 h-3 w-3" />
                              ) : (
                                <Send className="mr-1 h-3 w-3" />
                              )}
                              {entry.type}
                            </span>
                          </TableCell>
                          <TableCell>
                            {format(new Date(entry.date), 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell>{entry.fromTo}</TableCell>
                          <TableCell className="font-medium">{entry.subject}</TableCell>
                          <TableCell>{entry.mode || '-'}</TableCell>
                          <TableCell>{entry.refNo || '-'}</TableCell>
                          <TableCell>{entry.officer || '-'}</TableCell>
                          <TableCell>
                            {entry.attachments && entry.attachments.length > 0 ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto py-1 px-2 text-sm text-muted-foreground hover:text-foreground"
                                onClick={() => setAttachmentDialogEntry(entry)}
                              >
                                <Paperclip className="h-3 w-3 mr-1" />
                                {entry.attachments.length} file(s)
                              </Button>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditEntry(entry)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteEntry(entry.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            <TabsContent value="General" className="mt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>From/To</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Ref No</TableHead>
                      <TableHead>Officer</TableHead>
                      <TableHead>Attachments</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generalEntries.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="text-center text-muted-foreground"
                        >
                          No General register entries yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      generalEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${entry.type === 'inward'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                                }`}
                            >
                              {entry.type === 'inward' ? (
                                <Inbox className="mr-1 h-3 w-3" />
                              ) : (
                                <Send className="mr-1 h-3 w-3" />
                              )}
                              {entry.type}
                            </span>
                          </TableCell>
                          <TableCell>
                            {format(new Date(entry.date), 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell>{entry.fromTo}</TableCell>
                          <TableCell className="font-medium">{entry.subject}</TableCell>
                          <TableCell>{entry.mode || '-'}</TableCell>
                          <TableCell>{entry.refNo || '-'}</TableCell>
                          <TableCell>{entry.officer || '-'}</TableCell>
                          <TableCell>
                            {entry.attachments && entry.attachments.length > 0 ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto py-1 px-2 text-sm text-muted-foreground hover:text-foreground"
                                onClick={() => setAttachmentDialogEntry(entry)}
                              >
                                <Paperclip className="h-3 w-3 mr-1" />
                                {entry.attachments.length} file(s)
                              </Button>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditEntry(entry)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteEntry(entry.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Entry Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Register Entry</DialogTitle>
            <DialogDescription>
              Update the details of this {editingEntry?.type} entry
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateEntry} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Input value={editingEntry?.type} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-documentType">Document Type *</Label>
                <Select
                  value={entryForm.documentType}
                  onValueChange={(value) =>
                    setEntryForm({ ...entryForm, documentType: value as 'VIP' | 'Department' | 'General' })
                  }
                >
                  <SelectTrigger id="edit-documentType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIP">VIP</SelectItem>
                    <SelectItem value="Department">Department</SelectItem>
                    <SelectItem value="General">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-date">Date *</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={entryForm.date}
                  onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-fromTo">
                {editingEntry?.type === 'inward' ? 'From' : 'To'} *
              </Label>
              <Input
                id="edit-fromTo"
                value={entryForm.fromTo}
                onChange={(e) => setEntryForm({ ...entryForm, fromTo: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-subject">Subject *</Label>
              <Input
                id="edit-subject"
                value={entryForm.subject}
                onChange={(e) => setEntryForm({ ...entryForm, subject: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="edit-mode">Mode</Label>
                <Input
                  id="edit-mode"
                  value={entryForm.mode}
                  onChange={(e) => setEntryForm({ ...entryForm, mode: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-refNo">Reference No</Label>
                <Input
                  id="edit-refNo"
                  value={entryForm.refNo}
                  onChange={(e) => setEntryForm({ ...entryForm, refNo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-officer">Officer</Label>
                <Input
                  id="edit-officer"
                  value={entryForm.officer}
                  onChange={(e) =>
                    setEntryForm({ ...entryForm, officer: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingEntry(null)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Entry"
        description="Are you sure you want to delete this register entry? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={confirmDeleteEntry}
      />

      {/* Attachment Dialog */}
      {attachmentDialogEntry && (
        <RegisterAttachmentDialog
          open={!!attachmentDialogEntry}
          onOpenChange={(open) => !open && setAttachmentDialogEntry(null)}
          entryId={attachmentDialogEntry.id}
          entrySubject={attachmentDialogEntry.subject}
          attachments={attachmentDialogEntry.attachments || []}
          onAttachmentsChange={loadProject}
        />
      )}
    </div>
  );
}

