'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { Edit, Trash2, Eye, Search } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { ProjectsSkeleton } from '@/components/module-skeleton';
import { TablePagination, usePagination } from '@/components/table-pagination';
import { projectFormSchema, type ProjectFormData, validateForm } from '@/lib/validations';
import { ModulePageHeader } from '@/components/module-page-header';
import { useTranslations } from '@/hooks/use-translations';

interface Project {
  id: string;
  name: string;
  ward?: string;
  type?: string;
  status: 'Concept' | 'Proposal' | 'In Progress' | 'Completed';
}

export function ProjectsModule() {
  const router = useRouter();
  const { t } = useTranslations();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    ward: '',
    type: '',
    status: 'Concept' as Project['status'],
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Form validation errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const validation = validateForm(projectFormSchema, form);
    if (!validation.success) {
      setFormErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      toast.error(firstError);
      return;
    }
    
    setFormErrors({});

    try {
      if (editingId) {
        const response = await fetch(`/api/projects/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validation.data),
        });
        if (response.ok) {
          toast.success(t('projects.projectUpdatedSuccess'));
          await loadProjects();
          resetForm();
        } else {
          toast.error(t('projects.failedToUpdateProject'));
        }
      } else {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validation.data),
        });
        if (response.ok) {
          toast.success(t('projects.projectAddedSuccess'));
          await loadProjects();
          resetForm();
        } else {
          toast.error(t('projects.failedToAddProject'));
        }
      }
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error(t('projects.failedToAddProject'));
    }
  };

  const handleEdit = (project: Project) => {
    setEditingId(project.id);
    setForm({
      name: project.name,
      ward: project.ward || '',
      type: project.type || '',
      status: project.status,
    });
  };

  const handleDelete = (id: string) => {
    setProjectToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      const response = await fetch(`/api/projects/${projectToDelete}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        toast.success(t('projects.projectDeletedSuccess'));
        await loadProjects();
        if (editingId === projectToDelete) {
          resetForm();
        }
      } else {
        toast.error(t('projects.failedToDeleteProject'));
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error(t('projects.failedToDeleteProject'));
    } finally {
      setProjectToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const resetForm = () => {
    setForm({ name: '', ward: '', type: '', status: 'Concept' });
    setEditingId(null);
    setFormErrors({});
  };

  // Filter projects based on search term and status
  const filteredProjects = projects.filter((project) => {
    const matchesSearch = searchTerm === '' || 
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.ward || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.type || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const {
    paginatedItems: paginatedProjects,
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination(filteredProjects, 10);

  if (loading) {
    return <ProjectsSkeleton />;
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <ModulePageHeader 
        title={t('projects.title')} 
        description={t('projects.description')}
      />
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-5">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">{t('projects.projectName')}</Label>
              <Input
                id="name"
                placeholder={t('projects.projectNamePlaceholder')}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ward">{t('projects.wardBeat')}</Label>
              <Input
                id="ward"
                placeholder={t('projects.wardPlaceholder')}
                value={form.ward}
                onChange={(e) => setForm({ ...form, ward: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">{t('projects.type')}</Label>
              <Input
                id="type"
                placeholder={t('projects.typePlaceholder')}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">{t('projects.status')}</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm({ ...form, status: value as Project['status'] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Concept">{t('projects.concept')}</SelectItem>
                  <SelectItem value="Proposal">{t('projects.proposal')}</SelectItem>
                  <SelectItem value="In Progress">{t('projects.inProgress')}</SelectItem>
                  <SelectItem value="Completed">{t('projects.completed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-5 flex items-center justify-end gap-2">
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  {t('projects.cancel')}
                </Button>
              )}
              <Button type="submit">
                {editingId ? t('projects.saveChanges') : t('projects.addProject')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('projects.projectList')}</CardTitle>
            <span className="text-sm text-muted-foreground">
              {t('projects.projectsCount', { filtered: filteredProjects.length.toString(), total: projects.length.toString() })}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('projects.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder={t('projects.filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('projects.allStatuses')}</SelectItem>
                <SelectItem value="Concept">{t('projects.concept')}</SelectItem>
                <SelectItem value="Proposal">{t('projects.proposal')}</SelectItem>
                <SelectItem value="In Progress">{t('projects.inProgress')}</SelectItem>
                <SelectItem value="Completed">{t('projects.completed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('projects.projectName')}</TableHead>
                  <TableHead>{t('projects.wardBeat')}</TableHead>
                  <TableHead>{t('projects.type')}</TableHead>
                  <TableHead>{t('projects.status')}</TableHead>
                  <TableHead className="text-right">{t('projects.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProjects.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground"
                    >
                      {projects.length === 0 ? t('projects.noProjectsYet') : t('projects.noProjectsMatch')}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">
                        <button
                          onClick={() =>
                            router.push(`/modules/projects/${project.id}`)
                          }
                          className="text-left hover:underline text-blue-600"
                        >
                          {project.name}
                        </button>
                      </TableCell>
                      <TableCell>{project.ward || '-'}</TableCell>
                      <TableCell>{project.type || '-'}</TableCell>
                      <TableCell>
                        {project.status === 'Concept' ? t('projects.concept') :
                         project.status === 'Proposal' ? t('projects.proposal') :
                         project.status === 'In Progress' ? t('projects.inProgress') :
                         project.status === 'Completed' ? t('projects.completed') : project.status}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/modules/projects/${project.id}`)
                            }
                            title={t('projects.viewDetails')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(project)}
                            title={t('projects.edit')}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(project.id)}
                            title={t('projects.delete')}
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
          {filteredProjects.length > 0 && (
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('projects.deleteProject')}
        description={t('projects.deleteProjectDescription')}
        confirmText={t('projects.delete')}
        cancelText={t('projects.cancel')}
        variant="destructive"
        onConfirm={confirmDeleteProject}
      />
    </div>
  );
}

