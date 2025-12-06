'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/toast';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from '@/components/icons';
import { useTranslations } from '@/hooks/use-translations';
import type { VoterTask, BeneficiaryService, Voter } from '@/lib/db/schema';

interface TaskWithService extends VoterTask {
    service?: BeneficiaryService;
    voter?: Voter;
}

interface TaskResponse {
    tasks: TaskWithService[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
}

export function TaskManagement() {
    const { t } = useTranslations();
    const [tasks, setTasks] = useState<TaskWithService[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<TaskWithService | null>(null);
    const [showTaskDialog, setShowTaskDialog] = useState(false);
    const [showEscalationDialog, setShowEscalationDialog] = useState(false);
    const [escalationReason, setEscalationReason] = useState('');
    const [escalationPriority, setEscalationPriority] = useState<'high' | 'urgent'>('high');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterPriority, setFilterPriority] = useState<string>('all');
    const [filterToken, setFilterToken] = useState<string>('');
    const [filterMobile, setFilterMobile] = useState<string>('');
    const [filterVoterId, setFilterVoterId] = useState<string>('');
    const [newNote, setNewNote] = useState('');
    const [newStatus, setNewStatus] = useState<string>('');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    const fetchTasks = useCallback(async () => {
        try {
            setIsLoading(true);

            // Build query parameters
            const params = new URLSearchParams();
            if (filterStatus !== 'all') params.append('status', filterStatus);
            if (filterPriority !== 'all') params.append('priority', filterPriority);
            if (filterToken) params.append('token', filterToken);
            if (filterMobile) params.append('mobileNo', filterMobile);
            if (filterVoterId) params.append('voterId', filterVoterId);
            params.append('page', currentPage.toString());
            params.append('limit', pageSize.toString());

            const response = await fetch(`/operator/api/tasks?${params.toString()}`);

            if (!response.ok) {
                throw new Error('Failed to fetch tasks');
            }

            const data: TaskResponse = await response.json();
            setTasks(data.tasks);
            setTotalPages(data.totalPages);
            setTotalCount(data.totalCount);
            setCurrentPage(data.currentPage);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            toast({
                type: 'error',
                description: t('taskManagement.messages.fetchFailed'),
            });
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, pageSize, filterStatus, filterPriority, filterToken, filterMobile, filterVoterId]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const handleSearch = () => {
        setCurrentPage(1); // Reset to first page when searching
        fetchTasks();
    };

    const handleClearFilters = () => {
        setFilterStatus('all');
        setFilterPriority('all');
        setFilterToken('');
        setFilterMobile('');
        setFilterVoterId('');
        setCurrentPage(1);
    };

    const handleStatusUpdate = async (taskId: string, status: string, notes?: string) => {
        try {
            const response = await fetch(`/operator/api/tasks/${taskId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status,
                    notes: notes || undefined,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update task status');
            }

            toast({
                type: 'success',
                description: t('taskManagement.messages.updateSuccess'),
            });

            fetchTasks();
            setShowTaskDialog(false);
            setNewNote('');
            setNewStatus('');
        } catch (error) {
            console.error('Error updating task status:', error);
            toast({
                type: 'error',
                description: t('taskManagement.messages.updateFailed'),
            });
        }
    };

    const handleEscalation = async () => {
        if (!selectedTask || !escalationReason.trim()) {
            toast({
                type: 'error',
                description: t('taskManagement.messages.escalationReasonRequired'),
            });
            return;
        }

        try {
            const response = await fetch('/operator/api/escalate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    taskId: selectedTask.id,
                    serviceId: selectedTask.serviceId,
                    reason: escalationReason,
                    priority: escalationPriority,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to escalate request');
            }

            toast({
                type: 'success',
                description: t('taskManagement.messages.escalationSuccess'),
            });

            setShowEscalationDialog(false);
            setEscalationReason('');
            setEscalationPriority('high');
            fetchTasks();
        } catch (error) {
            console.error('Error escalating request:', error);
            toast({
                type: 'error',
                description: t('taskManagement.messages.escalationFailed'),
            });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'in_progress':
                return 'bg-blue-100 text-blue-800';
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'low':
                return 'bg-gray-100 text-gray-800';
            case 'medium':
                return 'bg-blue-100 text-blue-800';
            case 'high':
                return 'bg-orange-100 text-orange-800';
            case 'urgent':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'low':
                return <ArrowDownIcon size={12} />;
            case 'medium':
                return <MinusIcon size={12} />;
            case 'high':
                return <ArrowUpIcon size={12} />;
            case 'urgent':
                return <ArrowUpIcon size={12} />;
            default:
                return <MinusIcon size={12} />;
        }
    };


    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">{t('taskManagement.title')}</h1>
                <p className="text-muted-foreground mt-2">
                    {t('taskManagement.description')}
                </p>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                            <div>
                                <Label htmlFor="status-filter">{t('taskManagement.filters.status')}</Label>
                                <Select value={filterStatus} onValueChange={setFilterStatus}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('taskManagement.filters.selectStatus')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('taskManagement.filters.allTasks')}</SelectItem>
                                        <SelectItem value="pending">{t('taskManagement.status.pending')}</SelectItem>
                                        <SelectItem value="in_progress">{t('taskManagement.status.inProgress')}</SelectItem>
                                        <SelectItem value="completed">{t('taskManagement.status.completed')}</SelectItem>
                                        <SelectItem value="cancelled">{t('taskManagement.status.cancelled')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="priority-filter">{t('taskManagement.filters.priority')}</Label>
                                <Select value={filterPriority} onValueChange={setFilterPriority}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('taskManagement.filters.selectPriority')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('taskManagement.filters.allPriorities')}</SelectItem>
                                        <SelectItem value="low">{t('taskManagement.priority.low')}</SelectItem>
                                        <SelectItem value="medium">{t('taskManagement.priority.medium')}</SelectItem>
                                        <SelectItem value="high">{t('taskManagement.priority.high')}</SelectItem>
                                        <SelectItem value="urgent">{t('taskManagement.priority.urgent')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="token-filter">{t('taskManagement.filters.serviceToken')}</Label>
                                <Input
                                    id="token-filter"
                                    placeholder={t('taskManagement.filters.enterToken')}
                                    value={filterToken}
                                    onChange={(e) => setFilterToken(e.target.value)}
                                />
                            </div>

                            <div>
                                <Label htmlFor="mobile-filter">{t('taskManagement.filters.mobileNumber')}</Label>
                                <Input
                                    id="mobile-filter"
                                    placeholder={t('taskManagement.filters.enterMobile')}
                                    value={filterMobile}
                                    onChange={(e) => setFilterMobile(e.target.value)}
                                />
                            </div>

                            <div>
                                <Label htmlFor="voter-filter">{t('taskManagement.filters.voterId')}</Label>
                                <Input
                                    id="voter-filter"
                                    placeholder={t('taskManagement.filters.enterVoterId')}
                                    value={filterVoterId}
                                    onChange={(e) => setFilterVoterId(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                <div>
                                    <Label htmlFor="page-size">{t('taskManagement.filters.itemsPerPage')}</Label>
                                    <Select value={pageSize.toString()} onValueChange={(value) => {
                                        setPageSize(Number.parseInt(value));
                                        setCurrentPage(1);
                                    }}>
                                        <SelectTrigger className="w-20">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="5">5</SelectItem>
                                            <SelectItem value="10">10</SelectItem>
                                            <SelectItem value="20">20</SelectItem>
                                            <SelectItem value="50">50</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {t('taskManagement.filters.showing', { count: tasks.length, total: totalCount })}
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button onClick={handleSearch} disabled={isLoading} className="flex-1 sm:flex-none">
                                    {isLoading ? t('taskManagement.actions.searching') : t('taskManagement.actions.search')}
                                </Button>
                                <Button onClick={handleClearFilters} variant="outline" className="flex-1 sm:flex-none">
                                    {t('taskManagement.actions.clearFilters')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* is Loading */}
            {isLoading ? (
                <div className="min-h-screen bg-background flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full size-8 border-b-2 border-gray-900 mx-auto" />
                        <p className="mt-2 text-muted-foreground">{t('taskManagement.loading')}</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {tasks.length === 0 ? (
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground">{t('taskManagement.noTasks')}</p>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        {t('taskManagement.noTasksHelp')}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        tasks.map((task) => (
                            <Card key={task.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="pt-6">
                                    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                                        <div className="flex-1">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                                <h3 className="text-lg font-semibold">
                                                    {task.taskType.replace('service_request', '').trim() || t('taskManagement.serviceRequest')}
                                                </h3>
                                                <div className="flex gap-2">
                                                    <Badge className={getStatusColor(task.status)}>
                                                        {task.status.replace('_', ' ')}
                                                    </Badge>
                                                    <Badge className={getPriorityColor(task.priority)}>
                                                        <div className="flex items-center gap-1">
                                                            {getPriorityIcon(task.priority)}
                                                            {task.priority}
                                                        </div>
                                                    </Badge>
                                                </div>
                                            </div>

                                            {task.description && (
                                                <p className="text-muted-foreground mb-2">{task.description}</p>
                                            )}

                                            {task.service && (
                                                <div className="text-sm text-muted-foreground mb-2">
                                                    <strong>{t('taskManagement.service')}</strong> {task.service.serviceName} ({task.service.serviceType})
                                                    {task.service.token && (
                                                        <span> | <strong>{t('taskManagement.token')}</strong> {task.service.token}</span>
                                                    )}
                                                </div>
                                            )}

                                            {task.voter && (
                                                <div className="bg-gray-50 p-3 rounded-lg mb-3">
                                                    <div className="text-sm font-medium text-gray-900 mb-1">
                                                        {t('taskManagement.voterInformation')}
                                                    </div>
                                                    <div className="text-sm text-gray-700 space-y-1">
                                                        <div><strong>{t('taskManagement.name')}</strong> {task.voter.fullName}</div>
                                                        <div><strong>{t('taskManagement.voterId')}</strong> {task.voterId}</div>
                                                        {task.voter.mobileNoPrimary && (
                                                            <div><strong>{t('taskManagement.phone')}</strong> {task.voter.mobileNoPrimary}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="text-sm text-muted-foreground">
                                                <strong>{t('taskManagement.created')}</strong> {new Date(task.createdAt).toLocaleDateString()}
                                                {task.updatedAt !== task.createdAt && (
                                                    <span> | <strong>{t('taskManagement.updated')}</strong> {new Date(task.updatedAt).toLocaleDateString()}</span>
                                                )}
                                            </div>

                                            {task.notes && (
                                                <div className="mt-2 p-2 bg-muted rounded text-sm">
                                                    <strong>{t('taskManagement.notes')}</strong> {task.notes}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-2 lg:ml-4">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedTask(task);
                                                    setShowTaskDialog(true);
                                                }}
                                                className="flex-1 sm:flex-none"
                                            >
                                                {t('taskManagement.actions.manage')}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedTask(task);
                                                    setShowEscalationDialog(true);
                                                }}
                                                className="flex-1 sm:flex-none"
                                            >
                                                {t('taskManagement.actions.escalate')}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}


            {/* Task Management Dialog */}
            <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('taskManagement.dialog.manageTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('taskManagement.dialog.manageDescription')}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedTask && (
                        <div className="space-y-4">
                            <div>
                                <Label>{t('taskManagement.dialog.taskType')}</Label>
                                <p className="text-sm text-muted-foreground">{selectedTask.taskType}</p>
                            </div>

                            <div>
                                <Label htmlFor="new-status">{t('taskManagement.dialog.updateStatus')}</Label>
                                <Select value={newStatus} onValueChange={setNewStatus}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('taskManagement.dialog.selectNewStatus')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">{t('taskManagement.status.pending')}</SelectItem>
                                        <SelectItem value="in_progress">{t('taskManagement.status.inProgress')}</SelectItem>
                                        <SelectItem value="completed">{t('taskManagement.status.completed')}</SelectItem>
                                        <SelectItem value="cancelled">{t('taskManagement.status.cancelled')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="new-note">{t('taskManagement.dialog.addNote')}</Label>
                                <Textarea
                                    id="new-note"
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder={t('taskManagement.dialog.addNotePlaceholder')}
                                    rows={3}
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button
                                    onClick={() => handleStatusUpdate(selectedTask.id, newStatus || selectedTask.status, newNote)}
                                    disabled={!newStatus && !newNote.trim()}
                                    className="flex-1"
                                >
                                    {t('taskManagement.dialog.updateTask')}
                                </Button>
                                <Button variant="outline" onClick={() => setShowTaskDialog(false)} className="flex-1 sm:flex-none">
                                    {t('common.cancel')}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Escalation Dialog */}
            <Dialog open={showEscalationDialog} onOpenChange={setShowEscalationDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('taskManagement.dialog.escalationTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('taskManagement.dialog.escalationDescription')}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedTask && (
                        <div className="space-y-4">
                            <div>
                                <Label>{t('taskManagement.dialog.task')}</Label>
                                <p className="text-sm text-muted-foreground">{selectedTask.taskType}</p>
                            </div>

                            <div>
                                <Label htmlFor="escalation-priority">{t('taskManagement.dialog.priorityLevel')}</Label>
                                <Select value={escalationPriority} onValueChange={(value: 'high' | 'urgent') => setEscalationPriority(value)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="high">{t('taskManagement.priority.high')}</SelectItem>
                                        <SelectItem value="urgent">{t('taskManagement.priority.urgent')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="escalation-reason">{t('taskManagement.dialog.escalationReason')}</Label>
                                <Textarea
                                    id="escalation-reason"
                                    value={escalationReason}
                                    onChange={(e) => setEscalationReason(e.target.value)}
                                    placeholder={t('taskManagement.dialog.escalationReasonPlaceholder')}
                                    rows={4}
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button onClick={handleEscalation} disabled={!escalationReason.trim()} className="flex-1">
                                    {t('taskManagement.dialog.submitEscalation')}
                                </Button>
                                <Button variant="outline" onClick={() => setShowEscalationDialog(false)} className="flex-1 sm:flex-none">
                                    {t('common.cancel')}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Pagination */}
            {!isLoading && totalPages > 1 && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="text-sm text-muted-foreground text-center sm:text-left">
                                {t('taskManagement.pagination.page', { current: currentPage, total: totalPages, count: totalCount })}
                            </div>

                            <div className="flex items-center gap-2 justify-center sm:justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                >
                                    {t('taskManagement.pagination.first')}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                >
                                    {t('taskManagement.pagination.previous')}
                                </Button>

                                {/* Page numbers */}
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum: number;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }

                                        return (
                                            <Button
                                                key={pageNum}
                                                variant={currentPage === pageNum ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setCurrentPage(pageNum)}
                                                className="size-8 p-0"
                                            >
                                                {pageNum}
                                            </Button>
                                        );
                                    })}
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                >
                                    {t('taskManagement.pagination.next')}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                >
                                    {t('taskManagement.pagination.last')}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
