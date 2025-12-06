'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Printer, Search, Calendar, UserCheck, Pencil, Trash2 } from 'lucide-react';
import { format, parseISO, startOfToday, addDays } from 'date-fns';
import type { DailyProgramme } from '@/lib/db/schema';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { VisitorManagementSkeleton } from '@/components/module-skeleton';
import { ModulePageHeader } from '@/components/module-page-header';
import { visitorFormSchema, validateForm } from '@/lib/validations';
import { useTranslations } from '@/hooks/use-translations';

interface Visitor {
  id: string;
  name: string;
  contactNumber: string;
  purpose: string;
  programmeEventId?: string | null;
  visitDate: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
  programmeEvent?: DailyProgramme | null;
}

interface VisitorManagementProps {
  userRole: string;
}

function formatDateTime(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'dd MMM yyyy, hh:mm a');
  } catch (error) {
    return String(date);
  }
}

function formatDateOnly(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'dd MMM yyyy');
  } catch (error) {
    return String(date);
  }
}

export function VisitorManagement({ userRole }: VisitorManagementProps) {
  const [activeTab, setActiveTab] = useState<'add' | 'view' | 'history'>('add');
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [programmeEvents, setProgrammeEvents] = useState<DailyProgramme[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Add visitor form state
  const [addForm, setAddForm] = useState({
    name: '',
    contactNumber: '',
    purpose: '',
    programmeEventId: '',
    visitDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  });

  // View visitors filter state - default to past 7 days to today + 7 days
  const [filterForm, setFilterForm] = useState({
    startDate: format(addDays(startOfToday(), -7), 'yyyy-MM-dd'),
    endDate: format(addDays(startOfToday(), 7), 'yyyy-MM-dd'),
    programmeEventId: '',
    searchTerm: '',
  });

  // History state
  const [historyContactNumber, setHistoryContactNumber] = useState('');
  const [visitorHistory, setVisitorHistory] = useState<Visitor[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Edit state
  const [editingVisitor, setEditingVisitor] = useState<Visitor | null>(null);

  // Confirm dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [visitorToDelete, setVisitorToDelete] = useState<string | null>(null);

  // Load programme events on mount
  useEffect(() => {
    loadProgrammeEvents();
  }, []);

  // Load visitors when switching to view tab or filters change
  useEffect(() => {
    if (activeTab === 'view') {
      loadVisitors();
    }
  }, [activeTab, filterForm.startDate, filterForm.endDate, filterForm.programmeEventId]);

  const loadProgrammeEvents = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const pastDate = format(addDays(new Date(), -7), 'yyyy-MM-dd');
      const response = await fetch(
        `/api/daily-programme?startDate=${pastDate}&endDate=${today}`,
      );
      if (response.ok) {
        const data = await response.json();
        setProgrammeEvents(data);
      }
    } catch (error) {
      console.error('Error loading programme events:', error);
    }
  };

  const loadVisitors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterForm.startDate) params.append('startDate', filterForm.startDate);
      if (filterForm.endDate) params.append('endDate', filterForm.endDate);
      if (filterForm.programmeEventId) params.append('programmeEventId', filterForm.programmeEventId);

      const response = await fetch(`/api/visitors?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setVisitors(data);
      }
    } catch (error) {
      console.error('Error loading visitors:', error);
    } finally {
      setLoading(false);
    }
  }, [filterForm.startDate, filterForm.endDate, filterForm.programmeEventId]);

  const handleAddVisitor = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const validation = validateForm(visitorFormSchema, {
      name: addForm.name,
      contactNumber: addForm.contactNumber,
      purpose: addForm.purpose,
      programmeEventId: addForm.programmeEventId || null,
      visitDate: addForm.visitDate,
    });

    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0];
      toast.error(firstError);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/visitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name,
          contactNumber: addForm.contactNumber,
          purpose: addForm.purpose,
          programmeEventId: addForm.programmeEventId && addForm.programmeEventId !== 'none' ? addForm.programmeEventId : null,
          visitDate: new Date(addForm.visitDate).toISOString(),
        }),
      });

      if (response.ok) {
        toast.success('Visitor added successfully!');
        setAddForm({
          name: '',
          contactNumber: '',
          purpose: '',
          programmeEventId: '',
          visitDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        });
        // Reload visitors if on view tab
        if (activeTab === 'view') {
          loadVisitors();
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add visitor');
      }
    } catch (error) {
      console.error('Error adding visitor:', error);
      toast.error('Failed to add visitor. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVisitor) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/visitors/${editingVisitor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingVisitor.name,
          contactNumber: editingVisitor.contactNumber,
          purpose: editingVisitor.purpose,
          programmeEventId: editingVisitor.programmeEventId && editingVisitor.programmeEventId !== 'none' ? editingVisitor.programmeEventId : null,
          visitDate: new Date(editingVisitor.visitDate).toISOString(),
        }),
      });

      if (response.ok) {
        toast.success('Visitor updated successfully!');
        setEditingVisitor(null);
        loadVisitors();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update visitor');
      }
    } catch (error) {
      console.error('Error updating visitor:', error);
      toast.error('Failed to update visitor. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVisitor = (id: string) => {
    setVisitorToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteVisitor = async () => {
    if (!visitorToDelete) return;

    try {
      const response = await fetch(`/api/visitors/${visitorToDelete}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Visitor deleted successfully!');
        loadVisitors();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete visitor');
      }
    } catch (error) {
      console.error('Error deleting visitor:', error);
      toast.error('Failed to delete visitor. Please try again.');
    } finally {
      setVisitorToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleSearchHistory = async () => {
    if (!historyContactNumber.trim()) {
      toast.error('Please enter a contact number');
      return;
    }

    setLoadingHistory(true);
    try {
      const response = await fetch(
        `/api/visitors/history/${encodeURIComponent(historyContactNumber)}`,
      );
      if (response.ok) {
        const data = await response.json();
        setVisitorHistory(data);
      } else {
        toast.error('Failed to fetch visitor history');
      }
    } catch (error) {
      console.error('Error fetching visitor history:', error);
      toast.error('Failed to fetch visitor history. Please try again.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredVisitors = visitors.filter((visitor) => {
    if (!filterForm.searchTerm) return true;
    const searchLower = filterForm.searchTerm.toLowerCase();
    return (
      visitor.name.toLowerCase().includes(searchLower) ||
      visitor.contactNumber.includes(filterForm.searchTerm) ||
      visitor.purpose.toLowerCase().includes(searchLower)
    );
  });

  const { t } = useTranslations();

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title={t('visitorManagement.title')}
        description={t('visitorManagement.description')}
      />

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg no-print">
        <Button
          variant={activeTab === 'add' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('add')}
          className="flex-1"
        >
          <UserCheck className="mr-2 h-4 w-4" />
          {t('visitorManagement.addVisitor')}
        </Button>
        <Button
          variant={activeTab === 'view' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('view')}
          className="flex-1"
        >
          <Search className="mr-2 h-4 w-4" />
          {t('visitorManagement.viewVisitors')}
        </Button>
        <Button
          variant={activeTab === 'history' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('history')}
          className="flex-1"
        >
          <Calendar className="mr-2 h-4 w-4" />
          {t('visitorManagement.visitorHistory')}
        </Button>
      </div>

      {/* Add Visitor Tab */}
      {activeTab === 'add' && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingVisitor ? t('visitorManagement.editVisitor') : t('visitorManagement.addNewVisitor')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={editingVisitor ? handleUpdateVisitor : handleAddVisitor}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={editingVisitor ? editingVisitor.name : addForm.name}
                    onChange={(e) =>
                      editingVisitor
                        ? setEditingVisitor({ ...editingVisitor, name: e.target.value })
                        : setAddForm({ ...addForm, name: e.target.value })
                    }
                    placeholder="Enter visitor name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactNumber">
                    Contact Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="contactNumber"
                    type="tel"
                    value={editingVisitor ? editingVisitor.contactNumber : addForm.contactNumber}
                    onChange={(e) =>
                      editingVisitor
                        ? setEditingVisitor({ ...editingVisitor, contactNumber: e.target.value })
                        : setAddForm({ ...addForm, contactNumber: e.target.value })
                    }
                    placeholder="Enter contact number"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">
                  Purpose of Visit <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="purpose"
                  value={editingVisitor ? editingVisitor.purpose : addForm.purpose}
                  onChange={(e) =>
                    editingVisitor
                      ? setEditingVisitor({ ...editingVisitor, purpose: e.target.value })
                      : setAddForm({ ...addForm, purpose: e.target.value })
                  }
                  placeholder="Enter purpose of visit"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="programmeEventId">Link to Programme Event (Optional)</Label>
                  <Select
                    value={editingVisitor ? (editingVisitor.programmeEventId || 'none') : (addForm.programmeEventId || 'none')}
                    onValueChange={(value) => {
                      const selectedEventId = value === 'none' ? '' : value;
                      // Try to find event in loaded events, or use visitor's programmeEvent if editing
                      let selectedEvent = programmeEvents.find(e => e.id === selectedEventId);
                      if (!selectedEvent && editingVisitor && editingVisitor.programmeEvent && editingVisitor.programmeEvent.id === selectedEventId) {
                        selectedEvent = editingVisitor.programmeEvent;
                      }

                      if (editingVisitor) {
                        const updatedVisitor = { ...editingVisitor, programmeEventId: selectedEventId };
                        // Auto-fill date and time from event if selected
                        if (selectedEvent?.date && selectedEvent?.startTime) {
                          const eventDate = typeof selectedEvent.date === 'string'
                            ? parseISO(selectedEvent.date)
                            : new Date(selectedEvent.date);
                          const [hours, minutes] = selectedEvent.startTime.split(':');
                          eventDate.setHours(Number.parseInt(hours, 10), Number.parseInt(minutes, 10), 0, 0);
                          updatedVisitor.visitDate = format(eventDate, "yyyy-MM-dd'T'HH:mm");
                        }
                        setEditingVisitor(updatedVisitor);
                      } else {
                        const updatedForm = { ...addForm, programmeEventId: selectedEventId };
                        // Auto-fill date and time from event if selected
                        if (selectedEvent?.date && selectedEvent?.startTime) {
                          const eventDate = typeof selectedEvent.date === 'string'
                            ? parseISO(selectedEvent.date)
                            : new Date(selectedEvent.date);
                          const [hours, minutes] = selectedEvent.startTime.split(':');
                          eventDate.setHours(Number.parseInt(hours, 10), Number.parseInt(minutes, 10), 0, 0);
                          updatedForm.visitDate = format(eventDate, "yyyy-MM-dd'T'HH:mm");
                        }
                        setAddForm(updatedForm);
                      }
                    }}
                  >
                    <SelectTrigger id="programmeEventId">
                      <SelectValue placeholder="Select programme event" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No event selected</SelectItem>
                      {programmeEvents.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {formatDateOnly(event.date)} - {event.title}
                        </SelectItem>
                      ))}
                      {/* Include visitor's current event if editing and it's not in the loaded events */}
                      {editingVisitor?.programmeEvent &&
                        !programmeEvents.find(e => e.id === editingVisitor.programmeEvent?.id) && (
                          <SelectItem value={editingVisitor.programmeEvent.id}>
                            {formatDateOnly(editingVisitor.programmeEvent.date)} - {editingVisitor.programmeEvent.title}
                          </SelectItem>
                        )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visitDate">
                    Visit Date & Time <span className="text-destructive">*</span>
                  </Label>
                  {(() => {
                    const currentProgrammeEventId = editingVisitor
                      ? (editingVisitor.programmeEventId || 'none')
                      : (addForm.programmeEventId || 'none');
                    const hasEvent = currentProgrammeEventId !== 'none';

                    return (
                      <Input
                        id="visitDate"
                        type="datetime-local"
                        value={
                          editingVisitor
                            ? format(new Date(editingVisitor.visitDate), "yyyy-MM-dd'T'HH:mm")
                            : addForm.visitDate
                        }
                        onChange={(e) =>
                          editingVisitor
                            ? setEditingVisitor({ ...editingVisitor, visitDate: e.target.value })
                            : setAddForm({ ...addForm, visitDate: e.target.value })
                        }
                        disabled={hasEvent}
                        required
                        className={hasEvent ? 'bg-muted' : ''}
                      />
                    );
                  })()}
                  {(() => {
                    const currentProgrammeEventId = editingVisitor
                      ? (editingVisitor.programmeEventId || 'none')
                      : (addForm.programmeEventId || 'none');
                    const hasEvent = currentProgrammeEventId !== 'none';

                    return hasEvent ? (
                      <p className="text-xs text-muted-foreground">
                        Date and time are automatically set from the selected programme event
                      </p>
                    ) : null;
                  })()}
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : editingVisitor ? 'Update Visitor' : 'Add Visitor'}
                </Button>
                {editingVisitor && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingVisitor(null)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* View Visitors Tab */}
      {activeTab === 'view' && (
        <div className="space-y-4">
          {/* Filters */}
          <Card className="no-print">
            <CardHeader>
              <CardTitle>Filter Visitors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={filterForm.startDate}
                    onChange={(e) =>
                      setFilterForm({ ...filterForm, startDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={filterForm.endDate}
                    onChange={(e) =>
                      setFilterForm({ ...filterForm, endDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eventFilter">Programme Event</Label>
                  <Select
                    value={filterForm.programmeEventId || 'all'}
                    onValueChange={(value) =>
                      setFilterForm({ ...filterForm, programmeEventId: value === 'all' ? '' : value })
                    }
                  >
                    <SelectTrigger id="eventFilter">
                      <SelectValue placeholder="All events" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All events</SelectItem>
                      {programmeEvents.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {formatDateOnly(event.date)} - {event.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Name, contact, or purpose..."
                    value={filterForm.searchTerm}
                    onChange={(e) =>
                      setFilterForm({ ...filterForm, searchTerm: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print List
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Visitors Table */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Visitors List</CardTitle>
                <span className="text-sm text-muted-foreground">
                  Total: {filteredVisitors.length}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading visitors...</div>
              ) : filteredVisitors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No visitors found for the selected filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Purpose</TableHead>
                        <TableHead>Programme Event</TableHead>
                        <TableHead>Visit Date</TableHead>
                        <TableHead className="no-print">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVisitors.map((visitor) => (
                        <TableRow key={visitor.id}>
                          <TableCell className="font-medium">{visitor.name}</TableCell>
                          <TableCell>{visitor.contactNumber}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {visitor.purpose}
                          </TableCell>
                          <TableCell>
                            {visitor.programmeEvent
                              ? `${formatDateOnly(visitor.programmeEvent.date)} - ${visitor.programmeEvent.title}`
                              : '-'}
                          </TableCell>
                          <TableCell>{formatDateTime(visitor.visitDate)}</TableCell>
                          <TableCell className="no-print">
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingVisitor(visitor);
                                  setActiveTab('add');
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteVisitor(visitor.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Visitor History Tab */}
      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle>Visitor History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="historyContact">Contact Number</Label>
                  <Input
                    id="historyContact"
                    type="tel"
                    placeholder="Enter contact number to search history"
                    value={historyContactNumber}
                    onChange={(e) => setHistoryContactNumber(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchHistory()}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleSearchHistory} disabled={loadingHistory}>
                    {loadingHistory ? 'Searching...' : 'Search History'}
                  </Button>
                </div>
              </div>

              {visitorHistory.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Visit History ({visitorHistory.length} visit
                    {visitorHistory.length !== 1 ? 's' : ''})
                  </h3>
                  <div className="space-y-3">
                    {visitorHistory.map((visit) => (
                      <div
                        key={visit.id}
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <p className="text-sm text-muted-foreground">Visitor Name</p>
                            <p className="font-medium">{visit.name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Visit Date</p>
                            <p className="font-medium">{formatDateTime(visit.visitDate)}</p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-sm text-muted-foreground">Purpose</p>
                            <p>{visit.purpose}</p>
                          </div>
                          {visit.programmeEvent && (
                            <div className="md:col-span-2">
                              <p className="text-sm text-muted-foreground">Programme Event</p>
                              <p>
                                {formatDateOnly(visit.programmeEvent.date)} -{' '}
                                {visit.programmeEvent.title}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {visitorHistory.length === 0 && historyContactNumber && !loadingHistory && (
                <div className="text-center py-8 text-muted-foreground">
                  No visit history found for this contact number.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Visitor"
        description="Are you sure you want to delete this visitor record? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={confirmDeleteVisitor}
      />
    </div>
  );
}

