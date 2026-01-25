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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import { MapPin, Search, X, Save, Loader2 } from 'lucide-react';
import { toast } from '@/components/toast';
import { TableSkeleton } from '@/components/module-skeleton';

interface User {
  id: string;
  userId: string;
  permissions: Record<string, boolean>;
  roleInfo?: {
    id: string;
    name: string;
  } | null;
}

interface Assignment {
  id: string;
  boothNo: string;
  electionId: string;
  boothName: string | null;
  boothAddress: string | null;
  createdAt: string;
}

interface Booth {
  boothNo: string;
  boothName: string | null;
}

interface Election {
  electionId: string;
  electionType: string;
  year: number;
  constituencyType: string | null;
  constituencyId: string | null;
}

export function FieldAssignmentManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [availableBooths, setAvailableBooths] = useState<Booth[]>([]);
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElectionId, setSelectedElectionId] = useState<string>('');
  const [selectedBoothNos, setSelectedBoothNos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadUsers();
    loadElections();
  }, []);

  useEffect(() => {
    // Filter users to only those with field-visitor module access
    const fieldVisitorUsers = users.filter((user) => {
      const modules = Object.keys(user.permissions).filter(
        (key) => user.permissions[key] === true
      );
      return modules.includes('field-visitor');
    });

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      setFilteredUsers(
        fieldVisitorUsers.filter(
          (user) =>
            user.userId.toLowerCase().includes(searchLower) ||
            user.roleInfo?.name.toLowerCase().includes(searchLower)
        )
      );
    } else {
      setFilteredUsers(fieldVisitorUsers);
    }
  }, [users, searchTerm]);

  useEffect(() => {
    if (selectedUser && selectedElectionId) {
      loadAssignments(selectedUser, selectedElectionId);
    } else {
      setAssignments([]);
      setAvailableBooths([]);
    }
  }, [selectedUser, selectedElectionId]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        toast.error('Failed to load users');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadElections = async () => {
    try {
      const response = await fetch('/api/elections');
      if (response.ok) {
        const data = await response.json();
        setElections(data.elections || []);
        // Auto-select latest election (first one, as they're sorted by year desc)
        if (data.elections && data.elections.length > 0) {
          setSelectedElectionId(data.elections[0].electionId);
        }
      }
    } catch (error) {
      console.error('Error loading elections:', error);
    }
  };

  const loadAssignments = async (userId: string, electionId: string) => {
    try {
      setLoadingAssignments(true);
      const response = await fetch(
        `/api/admin/user-parts?userId=${userId}&electionId=${electionId}`
      );
      if (response.ok) {
        const data = await response.json();
        setAssignments(data.assignments || []);
        setAvailableBooths(data.availableBooths || []);
        // Initialize selected booth numbers with current assignments
        setSelectedBoothNos(
          (data.assignments || []).map((a: Assignment) => a.boothNo)
        );
      } else {
        toast.error('Failed to load assignments');
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
      toast.error('Failed to load assignments');
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUser(userId);
  };

  const handleBoothToggle = (boothNo: string) => {
    setSelectedBoothNos((prev) => {
      if (prev.includes(boothNo)) {
        return prev.filter((b) => b !== boothNo);
      } else {
        return [...prev, boothNo];
      }
    });
  };

  const handleSave = async () => {
    if (!selectedUser || !selectedElectionId) {
      toast.error('Please select a user and election');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/admin/user-parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser,
          electionId: selectedElectionId,
          boothNos: selectedBoothNos,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Assignments saved successfully');
        // Reload assignments
        await loadAssignments(selectedUser, selectedElectionId);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save assignments');
      }
    } catch (error) {
      console.error('Error saving assignments:', error);
      toast.error('Failed to save assignments');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      const response = await fetch(`/api/admin/user-parts?id=${assignmentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Assignment removed successfully');
        // Reload assignments
        if (selectedUser && selectedElectionId) {
          await loadAssignments(selectedUser, selectedElectionId);
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to remove assignment');
      }
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast.error('Failed to remove assignment');
    }
  };

  const selectedUserData = users.find((u) => u.id === selectedUser);

  if (loading) {
    return <TableSkeleton />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Field Visitor Part Assignments
          </CardTitle>
          <CardDescription>
            Assign part numbers (booth numbers) to field visitors for data
            collection. Only users with field-visitor module access are shown.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Election Selection */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">
                Search Users
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user ID or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-64">
              <label className="text-sm font-medium mb-2 block">Election</label>
              <Select
                value={selectedElectionId}
                onValueChange={setSelectedElectionId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select election" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    // Group elections by year
                    const electionsByYear = elections.reduce((acc, election) => {
                      const year = election.year;
                      if (!acc[year]) {
                        acc[year] = [];
                      }
                      acc[year].push(election);
                      return acc;
                    }, {} as Record<number, Election[]>);

                    // Sort years in descending order
                    const sortedYears = Object.keys(electionsByYear)
                      .map(Number)
                      .sort((a, b) => b - a);

                    return sortedYears.map((year) => (
                      <SelectGroup key={year}>
                        <SelectLabel>{year}</SelectLabel>
                        {electionsByYear[year].map((election) => {
                          // Format display as "Ward 140" or "Assembly 172"
                          const constituencyType = election.constituencyType 
                            ? election.constituencyType.charAt(0).toUpperCase() + election.constituencyType.slice(1)
                            : '';
                          const displayLabel = election.constituencyType && election.constituencyId
                            ? `${constituencyType} ${election.constituencyId}`
                            : election.electionId;
                          
                          return (
                            <SelectItem key={election.electionId} value={election.electionId}>
                              {displayLabel}
                            </SelectItem>
                          );
                        })}
                      </SelectGroup>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* User List */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Select User ({filteredUsers.length} field visitor users)
            </label>
            <div className="border rounded-md max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No field visitor users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow
                        key={user.id}
                        className={selectedUser === user.id ? 'bg-muted' : ''}
                      >
                        <TableCell className="font-medium">{user.userId}</TableCell>
                        <TableCell>
                          {user.roleInfo?.name || (
                            <span className="text-muted-foreground">No role</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant={selectedUser === user.id ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleUserSelect(user.id)}
                          >
                            {selectedUser === user.id ? 'Selected' : 'Select'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Assignment Interface */}
          {selectedUser && selectedElectionId && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Assignments for {selectedUserData?.userId}
                </CardTitle>
                <CardDescription>
                  Select part numbers to assign to this user
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingAssignments ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {/* Current Assignments */}
                    {assignments.length > 0 && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Current Assignments ({assignments.length})
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {assignments.map((assignment) => (
                            <Badge
                              key={assignment.id}
                              variant="secondary"
                              className="flex items-center gap-1"
                            >
                              {assignment.boothNo}
                              {assignment.boothName && ` - ${assignment.boothName}`}
                              <button
                                onClick={() => handleRemoveAssignment(assignment.id)}
                                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Available Booths Selection */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Select Part Numbers ({availableBooths.length} available)
                      </label>
                      <div className="border rounded-md max-h-64 overflow-y-auto p-4">
                        {availableBooths.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No booths available for this election
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {availableBooths.map((booth) => (
                              <label
                                key={booth.boothNo}
                                className="flex items-center space-x-2 p-2 rounded border hover:bg-muted cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedBoothNos.includes(booth.boothNo)}
                                  onChange={() => handleBoothToggle(booth.boothNo)}
                                  className="rounded"
                                />
                                <span className="text-sm">
                                  {booth.boothNo}
                                  {booth.boothName && (
                                    <span className="text-muted-foreground ml-1">
                                      - {booth.boothName}
                                    </span>
                                  )}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end">
                      <Button onClick={handleSave} disabled={saving}>
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Assignments ({selectedBoothNos.length} selected)
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
