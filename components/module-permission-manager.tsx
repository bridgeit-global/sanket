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
import { ALL_MODULES } from '@/lib/module-constants';
import { Trash2, Plus, User as UserIcon, Shield } from 'lucide-react';
import type { User, Role } from '@/lib/db/schema';

interface UserWithPermissions extends User {
  permissions: Record<string, boolean>;
  roleInfo?: Role | null;
}

interface RoleOption {
  id: string;
  name: string;
  description: string | null;
}

export function ModulePermissionManager() {
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    userId: '',
    password: '',
    roleId: '' as string | null,
  });
  const [editingUser, setEditingUser] = useState<UserWithPermissions | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const response = await fetch('/api/admin/roles');
      if (response.ok) {
        const data = await response.json();
        setRoles(data.map((r: Role & { permissions: Record<string, boolean> }) => ({
          id: r.id,
          name: r.name,
          description: r.description,
        })));
      }
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, roleId: string | null) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId }),
      });

      if (response.ok) {
        await loadUsers();
        setEditingUser(null);
        setEditingRoleId(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update user role');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Failed to update user role');
    } finally {
      setSaving(false);
    }
  };

  const handleEditUser = (user: UserWithPermissions) => {
    setEditingUser(user);
    setEditingRoleId(user.roleId || null);
  };

  const handleAddUser = async () => {
    if (!newUser.userId || !newUser.password) {
      alert('User ID and password are required');
      return;
    }

    if (!newUser.roleId) {
      alert('Please select a role for the user');
      return;
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: newUser.userId,
          password: newUser.password,
          roleId: newUser.roleId,
        }),
      });

      if (response.ok) {
        await loadUsers();
        setShowAddUser(false);
        setNewUser({ userId: '', password: '', roleId: null });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Failed to create user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch('/api/admin/users/' + userId, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadUsers();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.roleInfo?.name || '').toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage users and their module access permissions
              </CardDescription>
            </div>
            <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>
                    Create a new user account with initial permissions
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="userId">User ID</Label>
                    <Input
                      id="userId"
                      type="text"
                      value={newUser.userId}
                      onChange={(e) =>
                        setNewUser({ ...newUser, userId: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) =>
                        setNewUser({ ...newUser, password: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role *</Label>
                    <Select
                      value={newUser.roleId || ''}
                      onValueChange={(value) =>
                        setNewUser({ ...newUser, roleId: value || null })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                            {role.description && ` - ${role.description}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAddUser} className="w-full">
                    Create User
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full">
            <Accordion type="single">
              {filteredUsers.map((user) => (
                <AccordionItem key={user.id} value={user.id}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium">
                        <UserIcon className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{user.userId}</span>
                        {user.roleInfo && (
                          <div className="flex items-center gap-1">
                            <Shield className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {user.roleInfo.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium">Assigned Role</Label>
                          <div className="mt-2">
                            {editingUser?.id === user.id ? (
                              <div className="flex items-center gap-2">
                                <Select
                                  value={editingRoleId || ''}
                                  onValueChange={(value) =>
                                    setEditingRoleId(value || null)
                                  }
                                  disabled={saving}
                                >
                                  <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Select a role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {roles.map((role) => (
                                      <SelectItem key={role.id} value={role.id}>
                                        {role.name}
                                        {role.description && ` - ${role.description}`}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  onClick={() => handleRoleChange(user.id, editingRoleId)}
                                  disabled={saving || editingRoleId === user.roleId}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingUser(null);
                                    setEditingRoleId(null);
                                  }}
                                  disabled={saving}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 p-2 rounded-md border bg-muted/50">
                                  <Shield className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">
                                    {user.roleInfo?.name || 'No role assigned'}
                                  </span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditUser(user)}
                                >
                                  Change Role
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        {user.roleInfo && (
                          <div>
                            <Label className="text-sm font-medium">Module Permissions (from role)</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                              {ALL_MODULES.map((module) => {
                                const hasAccess = user.permissions[module.key] || false;
                                return (
                                  <div
                                    key={module.key}
                                    className={`flex items-center space-x-2 p-2 rounded-md border ${hasAccess
                                        ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                                        : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 opacity-50'
                                      }`}
                                  >
                                    <span className="text-sm font-normal">
                                      {module.label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete User
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No users found matching your search.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

