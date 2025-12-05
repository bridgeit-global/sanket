'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ALL_MODULES, type ModuleDefinition } from '@/lib/module-constants';
import { Trash2, Plus, Shield, Check } from 'lucide-react';
import type { Role } from '@/lib/db/schema';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TableSkeleton } from '@/components/module-skeleton';
import { useTranslations } from '@/hooks/use-translations';

interface RoleWithPermissions extends Role {
  permissions: Record<string, boolean>;
}

export function RoleManager() {
  const { t } = useTranslations();
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleWithPermissions | null>(null);
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    permissions: {} as Record<string, boolean>,
  });

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/roles');
      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      }
    } catch (error) {
      console.error('Error loading roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (role?: RoleWithPermissions) => {
    if (role) {
      setEditingRole(role);
      setRoleForm({
        name: role.name,
        description: role.description || '',
        permissions: { ...role.permissions },
      });
    } else {
      setEditingRole(null);
      setRoleForm({
        name: '',
        description: '',
        permissions: {},
      });
    }
    setShowRoleDialog(true);
  };

  const handleCloseDialog = () => {
    setShowRoleDialog(false);
    setEditingRole(null);
    setRoleForm({
      name: '',
      description: '',
      permissions: {},
    });
  };

  const handlePermissionChange = (moduleKey: string, hasAccess: boolean) => {
    setRoleForm({
      ...roleForm,
      permissions: {
        ...roleForm.permissions,
        [moduleKey]: hasAccess,
      },
    });
  };

  const handleSaveRole = async () => {
    if (!roleForm.name.trim()) {
      toast.error(t('roleManagement.roleNameRequired'));
      return;
    }

    try {
      setSaving(true);
      const url = editingRole
        ? `/api/admin/roles/${editingRole.id}`
        : '/api/admin/roles';
      const method = editingRole ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roleForm.name.trim(),
          description: roleForm.description.trim() || null,
          permissions: roleForm.permissions,
        }),
      });

      if (response.ok) {
        toast.success(editingRole ? t('roleManagement.roleUpdatedSuccess') : t('roleManagement.roleCreatedSuccess'));
        await loadRoles();
        handleCloseDialog();
      } else {
        const error = await response.json();
        toast.error(error.error || t('roleManagement.failedToSaveRole'));
      }
    } catch (error) {
      console.error('Error saving role:', error);
      toast.error(t('roleManagement.failedToSaveRole'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (roleId: string) => {
    setDeleteRoleId(roleId);
    setDeleteError(null);
  };

  const handleDeleteRole = async () => {
    if (!deleteRoleId) return;

    try {
      const response = await fetch(`/api/admin/roles/${deleteRoleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(t('roleManagement.roleDeletedSuccess'));
        await loadRoles();
        setDeleteRoleId(null);
      } else {
        const error = await response.json();
        setDeleteError(error.error || t('roleManagement.failedToDeleteRole'));
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      setDeleteError(t('roleManagement.failedToDeleteRole'));
    }
  };

  const filteredRoles = roles.filter((r) =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.description || '').toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <TableSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('roleManagement.title')}</CardTitle>
              <CardDescription>
                {t('roleManagement.description')}
              </CardDescription>
            </div>
            <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('roleManagement.addRole')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingRole ? t('roleManagement.editRole') : t('roleManagement.createNewRole')}
                  </DialogTitle>
                  <DialogDescription>
                    {editingRole
                      ? t('roleManagement.updateRoleDetails')
                      : t('roleManagement.defineNewRole')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="role-name">{t('roleManagement.roleName')} *</Label>
                    <Input
                      id="role-name"
                      value={roleForm.name}
                      onChange={(e) =>
                        setRoleForm({ ...roleForm, name: e.target.value })
                      }
                      placeholder={t('roleManagement.roleNamePlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role-description">{t('roleManagement.roleDescription')}</Label>
                    <Textarea
                      id="role-description"
                      value={roleForm.description}
                      onChange={(e) =>
                        setRoleForm({ ...roleForm, description: e.target.value })
                      }
                      placeholder={t('roleManagement.descriptionPlaceholder')}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label>{t('roleManagement.modulePermissions')}</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-2 border rounded-md">
                      {ALL_MODULES.map((module) => {
                        const isChecked = roleForm.permissions[module.key] || false;
                        return (
                          <label
                            key={module.key}
                            htmlFor={`role-${module.key}`}
                            className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                          >
                            <div className="relative inline-flex items-center">
                              <input
                                id={`role-${module.key}`}
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (!saving) {
                                    handlePermissionChange(
                                      module.key,
                                      e.target.checked,
                                    );
                                  }
                                }}
                                disabled={saving}
                                className="sr-only"
                              />
                              <div
                                className={cn(
                                  'h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center transition-colors',
                                  isChecked
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-background',
                                )}
                              >
                                {isChecked && (
                                  <Check className="h-3 w-3 text-primary-foreground" />
                                )}
                              </div>
                            </div>
                            <span className="text-sm font-normal flex-1 select-none">
                              {module.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={handleCloseDialog}
                      disabled={saving}
                    >
                      {t('roleManagement.cancel')}
                    </Button>
                    <Button onClick={handleSaveRole} disabled={saving}>
                      {saving ? t('roleManagement.saving') : editingRole ? t('roleManagement.update') : t('roleManagement.create')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder={t('roleManagement.searchRoles')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full">
            <Accordion type="single">
              {filteredRoles.map((roleItem) => (
                <AccordionItem key={roleItem.id} value={roleItem.id}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium">
                        <Shield className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{roleItem.name}</span>
                        {roleItem.description && (
                          <span className="text-sm text-muted-foreground">
                            {roleItem.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div>
                        <Label className="text-sm font-medium">
                          {t('roleManagement.modulePermissions')}
                        </Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                          {ALL_MODULES.map((module) => {
                            const hasAccess =
                              roleItem.permissions[module.key] || false;
                            return (
                              <div
                                key={module.key}
                                className={`flex items-center space-x-2 p-2 rounded-md border ${
                                  hasAccess
                                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                                    : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                                }`}
                              >
                                <Checkbox
                                  checked={hasAccess}
                                  disabled
                                />
                                <Label className="text-sm font-normal">
                                  {module.label}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(roleItem)}
                        >
                          {t('roleManagement.edit')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(roleItem.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('roleManagement.delete')}
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
          {filteredRoles.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm
                ? t('roleManagement.noRolesFound')
                : t('roleManagement.noRolesYet')}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={deleteRoleId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteRoleId(null);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('roleManagement.deleteRole')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteError ? (
                <span className="text-destructive">{deleteError}</span>
              ) : (
                t('roleManagement.deleteRoleDescription')
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('roleManagement.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRole}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('roleManagement.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

