'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
import type { VoterTask, BeneficiaryService, CommunityServiceArea } from '@/lib/db/schema';
import { TablePagination } from '@/components/table-pagination';
import { QrCode, Share2 } from 'lucide-react';
import { buildThermalTicketText, shareThermalTicketPdf } from '@/lib/thermal/receipt';

interface TaskVoter {
    epicNumber: string;
    fullName: string | null;
    mobileNoPrimary: string | null;
    mobileNoSecondary: string | null;
    age: number | null;
    gender: string | null;
    relationName: string | null;
}

interface TaskWithService extends VoterTask {
    service?: BeneficiaryService;
    voter?: TaskVoter;
}

interface TaskResponse {
    tasks: TaskWithService[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
}

interface CommunityServiceWithAreas extends BeneficiaryService {
    areas: Array<CommunityServiceArea>;
}

interface CommunityServicesResponse {
    services: CommunityServiceWithAreas[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
}

function extractTokenFromQrPayload(payload: string): string | null {
    const raw = (payload ?? '').trim();
    if (!raw) return null;

    try {
        const url = new URL(raw);
        const tokenParam =
            url.searchParams.get('token') ??
            url.searchParams.get('tokenNo') ??
            url.searchParams.get('token_no') ??
            url.searchParams.get('tokenNumber') ??
            url.searchParams.get('token_number');
        if (tokenParam?.trim()) return tokenParam.trim();
    } catch {
        // Not a URL.
    }

    if (/^[A-Za-z0-9-]{2,}$/.test(raw)) return raw;

    return (
        raw.match(/\b[A-Za-z]{1,10}-\d{1,10}\b/)?.[0] ??
        raw.match(/\b\d{1,10}\b/)?.[0] ??
        null
    );
}

function QrTokenScannerDialog({
    open,
    onOpenChange,
    onTokenDetected,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onTokenDetected: (token: string) => void;
}) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const rafRef = useRef<number | null>(null);
    const runningRef = useRef(false);
    const zxingControlsRef = useRef<{ stop: () => void } | null>(null);
    const startSeqRef = useRef(0);
    const retryTimeoutRef = useRef<number | null>(null);
    const stopPromiseRef = useRef<Promise<void> | null>(null);

    useEffect(() => {
        const stopMedia = () => {
            const video = videoRef.current;
            const videoStream = video?.srcObject instanceof MediaStream ? video.srcObject : null;

            const stream = streamRef.current ?? videoStream;
            if (stream) {
                for (const track of stream.getTracks()) track.stop();
            }
            streamRef.current = null;

            if (video) {
                video.pause?.();
                video.srcObject = null;
                // Helps some browsers fully release the camera between modal opens.
                video.load?.();
            }
        };

        const stop = () => {
            const p = (async () => {
                startSeqRef.current += 1;
                runningRef.current = false;
                if (rafRef.current != null) {
                    cancelAnimationFrame(rafRef.current);
                    rafRef.current = null;
                }
                if (retryTimeoutRef.current != null) {
                    window.clearTimeout(retryTimeoutRef.current);
                    retryTimeoutRef.current = null;
                }

                const controls = zxingControlsRef.current;
                zxingControlsRef.current = null;
                try {
                    // ZXing controls.stop() may be async (torch path), ensure it fully releases the camera.
                    await Promise.resolve(controls?.stop());
                } catch {
                    // ignore
                }

                stopMedia();
            })();

            stopPromiseRef.current = p;
            return p;
        };

        const start = async () => {
            if (!open) return;
            if (typeof window === 'undefined') return;
            if (stopPromiseRef.current) {
                await stopPromiseRef.current;
            }

            const mySeq = startSeqRef.current;
            if (!window.isSecureContext) {
                toast({
                    type: 'error',
                    description:
                        'Camera requires HTTPS on mobile. Open this page over HTTPS (or use localhost on the same device).',
                });
                return;
            }
            if (!navigator.mediaDevices?.getUserMedia) {
                toast({ type: 'error', description: 'Camera is not available on this device.' });
                return;
            }

            try {
                const video = videoRef.current;
                if (!video) return;
                if (!open || mySeq !== startSeqRef.current) return;
                // iOS/Safari: make autoplay + inline playback more reliable.
                video.muted = true;
                video.autoplay = true;
                video.playsInline = true;
                video.setAttribute('muted', '');
                video.setAttribute('autoplay', '');
                video.setAttribute('playsinline', '');

                // Prefer native BarcodeDetector when available; fall back to ZXing for iOS/older browsers.
                if ('BarcodeDetector' in window) {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: { ideal: 'environment' } },
                        audio: false,
                    });
                    if (!open || mySeq !== startSeqRef.current) {
                        for (const track of stream.getTracks()) track.stop();
                        return;
                    }
                    streamRef.current = stream;
                    video.srcObject = stream;
                    await video.play();

                    const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
                    runningRef.current = true;

                    const tick = async () => {
                        if (!runningRef.current) return;
                        const v = videoRef.current;
                        if (!v || v.readyState < 2) {
                            rafRef.current = requestAnimationFrame(() => void tick());
                            return;
                        }
                        try {
                            const bitmap = await createImageBitmap(v);
                            const codes = await detector.detect(bitmap);
                            bitmap.close?.();
                            const rawValue = codes?.[0]?.rawValue as string | undefined;
                            if (rawValue) {
                                const token = extractTokenFromQrPayload(rawValue);
                                if (token) {
                                    onTokenDetected(token);
                                    onOpenChange(false);
                                    stop();
                                    return;
                                }
                            }
                        } catch {
                            // keep scanning
                        }
                        rafRef.current = requestAnimationFrame(() => void tick());
                    };

                    rafRef.current = requestAnimationFrame(() => void tick());
                } else {
                    const { BrowserQRCodeReader } = await import('@zxing/browser');
                    const reader = new BrowserQRCodeReader();
                    const controls = await reader.decodeFromVideoDevice(
                        undefined,
                        video,
                        (result, error, c) => {
                            zxingControlsRef.current = c ?? zxingControlsRef.current;
                            const text = result?.getText?.() ?? '';
                            const token = text ? extractTokenFromQrPayload(text) : null;
                            if (token) {
                                onTokenDetected(token);
                                onOpenChange(false);
                                stop();
                            } else if (error) {
                                // ignore not-found / transient errors while scanning
                            }
                        },
                    );
                    zxingControlsRef.current = controls;
                    // ZXing attaches the MediaStream to the video element; capture it so our stop() reliably releases it.
                    if (video.srcObject instanceof MediaStream) {
                        streamRef.current = video.srcObject;
                    }
                    await video.play().catch(() => {
                        // Some browsers require a user gesture; ZXing may still decode even if preview can't autoplay.
                    });
                }
            } catch (error) {
                console.error('QR scanner error:', error);
                const err = error as { name?: string; message?: string } | null;
                const name = err?.name ? ` (${err.name})` : '';
                if (err?.name === 'AbortError' && open) {
                    if (retryTimeoutRef.current == null) {
                        retryTimeoutRef.current = window.setTimeout(() => {
                            retryTimeoutRef.current = null;
                            void start();
                        }, 300);
                    }
                    return;
                }
                toast({
                    type: 'error',
                    description:
                        `Could not access camera${name}. ` +
                        'Please allow camera permission and close any other app/tab using the camera.',
                });
            }
        };

        if (open) void start();
        else void stop();

        return () => {
            void stop();
        };
    }, [open, onOpenChange, onTokenDetected]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Scan QR code</DialogTitle>
                    <DialogDescription>
                        Point your camera at the QR code on the token slip. The token number will be auto-filled.
                    </DialogDescription>
                </DialogHeader>

                <div className="overflow-hidden rounded-lg border bg-black">
                    <video ref={videoRef} className="w-full h-[320px] object-cover" playsInline muted autoPlay />
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function TaskManagement() {
    const { t } = useTranslations();
    const [tasks, setTasks] = useState<TaskWithService[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingCommunityServices, setIsLoadingCommunityServices] = useState(false);
    const [selectedTask, setSelectedTask] = useState<TaskWithService | null>(null);
    const [selectedCommunityService, setSelectedCommunityService] = useState<CommunityServiceWithAreas | null>(null);
    const [showTaskDialog, setShowTaskDialog] = useState(false);
    const [showEscalationDialog, setShowEscalationDialog] = useState(false);
    const [escalationReason, setEscalationReason] = useState('');
    const [escalationPriority, setEscalationPriority] = useState<'high' | 'urgent'>('high');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterPriority, setFilterPriority] = useState<string>('all');
    const [filterServiceType, setFilterServiceType] = useState<string>('all'); // all, individual, community
    const [filterToken, setFilterToken] = useState<string>('');
    const [filterMobile, setFilterMobile] = useState<string>('');
    const [filterVoterId, setFilterVoterId] = useState<string>('');
    const [showQrScanner, setShowQrScanner] = useState(false);
    const [pendingAutoFocusToken, setPendingAutoFocusToken] = useState<string | null>(null);
    const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
    const [newNote, setNewNote] = useState('');
    const [newStatus, setNewStatus] = useState<string>('');

    const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
    const highlightTimeoutRef = useRef<number | null>(null);

    const setItemRef = useCallback((id: string) => {
        return (el: HTMLElement | null) => {
            if (el) itemRefs.current.set(id, el);
            else itemRefs.current.delete(id);
        };
    }, []);

    // Community services state
    const [communityServices, setCommunityServices] = useState<CommunityServiceWithAreas[]>([]);
    const [communityServicesPage, setCommunityServicesPage] = useState(1);
    const [communityServicesTotalPages, setCommunityServicesTotalPages] = useState(1);
    const [communityServicesTotalCount, setCommunityServicesTotalCount] = useState(0);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    const fetchCommunityServices = useCallback(async () => {
        try {
            setIsLoadingCommunityServices(true);
            // Build query parameters
            const params = new URLSearchParams();
            if (filterStatus !== 'all') params.append('status', filterStatus);
            if (filterPriority !== 'all') params.append('priority', filterPriority);
            if (filterToken) params.append('token', filterToken);
            params.append('page', communityServicesPage.toString());
            params.append('limit', pageSize.toString());

            const response = await fetch(`/operator/api/community-services?${params.toString()}`);

            if (!response.ok) {
                throw new Error('Failed to fetch community services');
            }

            const data: CommunityServicesResponse = await response.json();
            setCommunityServices(data.services);
            setCommunityServicesTotalPages(data.totalPages);
            setCommunityServicesTotalCount(data.totalCount);
            // Only update communityServicesPage if it actually changed to prevent unnecessary re-renders
            if (data.currentPage !== communityServicesPage) {
                setCommunityServicesPage(data.currentPage);
            }
        } catch (error) {
            console.error('Error fetching community services:', error);
            toast({
                type: 'error',
                description: 'Failed to fetch community services',
            });
        } finally {
            setIsLoadingCommunityServices(false);
        }
    }, [communityServicesPage, pageSize, filterStatus, filterPriority, filterToken]);

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
            if (filterServiceType === 'individual') params.append('serviceType', 'individual');
            if (filterServiceType === 'community') params.append('serviceType', 'community');
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
            // Only update currentPage if it actually changed to prevent unnecessary re-renders
            if (data.currentPage !== currentPage) {
                setCurrentPage(data.currentPage);
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
            toast({
                type: 'error',
                description: t('taskManagement.messages.fetchFailed'),
            });
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, pageSize, filterStatus, filterPriority, filterToken, filterMobile, filterVoterId, filterServiceType, t]);

    // Separate useEffect for tasks to avoid infinite loops
    useEffect(() => {
        if (filterServiceType === 'all' || filterServiceType === 'individual') {
            fetchTasks();
        } else {
            setTasks([]);
            setTotalCount(0);
            setTotalPages(1);
            setIsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterServiceType, currentPage, pageSize, filterStatus, filterPriority, filterToken, filterMobile, filterVoterId]);

    // Separate useEffect for community services to avoid infinite loops
    useEffect(() => {
        if (filterServiceType === 'all' || filterServiceType === 'community') {
            fetchCommunityServices();
        } else {
            setCommunityServices([]);
            setCommunityServicesTotalCount(0);
            setCommunityServicesTotalPages(1);
            setIsLoadingCommunityServices(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterServiceType, communityServicesPage, pageSize, filterStatus, filterPriority, filterToken]);

    useEffect(() => {
        if (!pendingAutoFocusToken) return;
        const loading =
            (filterServiceType === 'community' && isLoadingCommunityServices) ||
            (filterServiceType === 'individual' && isLoading) ||
            (filterServiceType === 'all' && (isLoading || isLoadingCommunityServices));
        if (loading) return;

        const token = pendingAutoFocusToken;
        const matchTask = tasks.find((t) => (t.service?.token ?? '').toLowerCase() === token.toLowerCase());
        const matchService = communityServices.find((s) => (s.token ?? '').toLowerCase() === token.toLowerCase());
        const matchId = matchTask?.id ?? matchService?.id ?? null;

        if (!matchId) {
            toast({ type: 'error', description: `No item found for token: ${token}` });
            setPendingAutoFocusToken(null);
            return;
        }

        const el = itemRefs.current.get(matchId);
        if (!el) return; // wait for refs to attach

        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof (el as any).focus === 'function') {
            (el as any).focus({ preventScroll: true });
        }

        setHighlightedItemId(matchId);
        if (highlightTimeoutRef.current != null) window.clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = window.setTimeout(() => setHighlightedItemId(null), 2500);

        setPendingAutoFocusToken(null);
    }, [
        pendingAutoFocusToken,
        tasks,
        communityServices,
        isLoading,
        isLoadingCommunityServices,
        filterServiceType,
    ]);

    useEffect(() => {
        return () => {
            if (highlightTimeoutRef.current != null) window.clearTimeout(highlightTimeoutRef.current);
        };
    }, []);

    const handleSearch = () => {
        setCurrentPage(1); // Reset to first page when searching
        fetchTasks();
    };

    const handleClearFilters = () => {
        setFilterStatus('all');
        setFilterPriority('all');
        setFilterServiceType('all');
        setFilterToken('');
        setFilterMobile('');
        setFilterVoterId('');
        setCurrentPage(1);
        setCommunityServicesPage(1);
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

    const handleCommunityServiceStatusUpdate = async (serviceId: string, status: string, notes?: string) => {
        try {
            const response = await fetch(`/operator/api/community-services/${serviceId}`, {
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
                throw new Error('Failed to update community service status');
            }

            toast({
                type: 'success',
                description: t('taskManagement.messages.updateSuccess'),
            });

            fetchCommunityServices();
            setShowTaskDialog(false);
            setNewNote('');
            setNewStatus('');
        } catch (error) {
            console.error('Error updating community service status:', error);
            toast({
                type: 'error',
                description: t('taskManagement.messages.updateFailed'),
            });
        }
    };

    const handleEscalation = async () => {
        const taskId = selectedTask?.id;
        const serviceId = selectedTask?.serviceId || selectedCommunityService?.id;

        if ((!selectedTask && !selectedCommunityService) || !escalationReason.trim()) {
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
                    taskId: taskId || undefined,
                    serviceId: serviceId || undefined,
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
            if (selectedTask) {
                fetchTasks();
            }
            if (selectedCommunityService) {
                fetchCommunityServices();
            }
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

    const shareExistingTicket = async (params: {
        token: string;
        createdAt: Date | string;
        serviceName: string;
        name?: string | null;
        mobile?: string | null;
    }) => {
        const receiptText = buildThermalTicketText({
            token: params.token,
            createdAt: params.createdAt,
            name: params.name || 'Beneficiary',
            mobile: params.mobile,
            serviceName: params.serviceName,
            width: 32,
        });

        const outcome = await shareThermalTicketPdf(
            receiptText,
            `thermal-ticket-${params.token.toLowerCase()}`,
            { headerImageUrl: '/images/ncp_election_symbol.png', qrValue: params.token, paperWidthMm: 88 }
        );

        if (outcome === 'downloaded') {
            toast({
                type: 'success',
                description: 'Ticket PDF downloaded. Share it to your thermal printer app.',
            });
        }
    };


    return (
        <div className="space-y-6">
            <QrTokenScannerDialog
                open={showQrScanner}
                onOpenChange={setShowQrScanner}
                onTokenDetected={(token) => {
                    setFilterToken(token);
                    setPendingAutoFocusToken(token);
                    setCurrentPage(1);
                    setCommunityServicesPage(1);
                }}
            />

            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('taskManagement.title')}</h1>
                <p className="text-muted-foreground mt-1 sm:mt-2">
                    {t('taskManagement.description')}
                </p>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-4 sm:pt-6">
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                            <div>
                                <Label htmlFor="service-type-filter">Service Type</Label>
                                <Select value={filterServiceType} onValueChange={setFilterServiceType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select service type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Services</SelectItem>
                                        <SelectItem value="individual">Individual</SelectItem>
                                        <SelectItem value="community">Community</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

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
                                <div className="flex gap-2">
                                    <Input
                                        id="token-filter"
                                        placeholder={t('taskManagement.filters.enterToken')}
                                        value={filterToken}
                                        onChange={(e) => setFilterToken(e.target.value)}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowQrScanner(true)}
                                        className="shrink-0"
                                        title="Scan QR"
                                    >
                                        <QrCode className="h-4 w-4" />
                                    </Button>
                                </div>
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
                                    {filterServiceType === 'all'
                                        ? `Showing ${tasks.length + communityServices.length} of ${totalCount + communityServicesTotalCount} items`
                                        : filterServiceType === 'community'
                                            ? `Showing ${communityServices.length} of ${communityServicesTotalCount} community services`
                                            : t('taskManagement.filters.showing', { count: tasks.length, total: totalCount })
                                    }
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button onClick={handleSearch} disabled={isLoading} className="w-full sm:w-auto">
                                    {isLoading ? t('taskManagement.actions.searching') : t('taskManagement.actions.search')}
                                </Button>
                                <Button onClick={handleClearFilters} variant="outline" className="w-full sm:w-auto">
                                    {t('taskManagement.actions.clearFilters')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* is Loading */}
            {(() => {
                const shouldShowLoading =
                    (filterServiceType === 'community' && isLoadingCommunityServices) ||
                    (filterServiceType === 'individual' && isLoading) ||
                    (filterServiceType === 'all' && (isLoading || isLoadingCommunityServices));
                return shouldShowLoading;
            })() ? (
                <div className="min-h-[60vh] bg-background flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full size-8 border-b-2 border-gray-900 mx-auto" />
                        <p className="mt-2 text-muted-foreground">{t('taskManagement.loading')}</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-3 pb-10">
                    {/* Tasks Section */}
                    {(filterServiceType === 'all' || filterServiceType === 'individual') && (
                        <div>
                            {tasks.length === 0 ? (
                                <Card>
                                    <CardContent className="pt-4 sm:pt-6">
                                        <div className="text-center py-8">
                                            <p className="text-muted-foreground">{t('taskManagement.noTasks')}</p>
                                            <p className="text-sm text-muted-foreground mt-2">
                                                {t('taskManagement.noTasksHelp')}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="space-y-4">
                                    {tasks.map((task) => (
                                        <div
                                            key={task.id}
                                            ref={setItemRef(task.id)}
                                            tabIndex={-1}
                                            className="outline-none"
                                        >
                                            <Card
                                                className={[
                                                    'hover:shadow-md transition-shadow',
                                                    highlightedItemId === task.id ? 'ring-2 ring-primary ring-offset-2' : '',
                                                ].join(' ')}
                                            >
                                                <CardContent className="pt-4 sm:pt-6">
                                                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                                            <h3 className="text-lg font-semibold">
                                                                {task.service?.serviceName}
                                                            </h3>
                                                            <div className="flex flex-wrap gap-2">
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


                                                        {task.service && (
                                                            <div className="text-sm text-muted-foreground mb-2">
                                                                <strong>{t('taskManagement.service')}</strong> {task.service?.description}
                                                                <Badge variant="outline" className="ml-2">
                                                                    {task.service.serviceType === 'community' ? 'Community' : 'Individual'}
                                                                </Badge>
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

                                                        <div className="text-sm text-muted-foreground flex flex-col sm:flex-row sm:flex-wrap gap-1">
                                                            <span>
                                                                <strong>{t('taskManagement.created')}</strong> {new Date(task.createdAt).toLocaleDateString()}
                                                            </span>
                                                            {task.createdBy && (
                                                                <span><strong>Created by:</strong> {task.createdBy.substring(0, 8)}...</span>
                                                            )}
                                                            {task.updatedAt !== task.createdAt && (
                                                                <span><strong>{t('taskManagement.updated')}</strong> {new Date(task.updatedAt).toLocaleDateString()}</span>
                                                            )}
                                                            {task.updatedBy && (
                                                                <span><strong>Updated by:</strong> {task.updatedBy.substring(0, 8)}...</span>
                                                            )}
                                                        </div>

                                                        {task.notes && (
                                                            <div className="mt-2 p-2 bg-muted rounded text-sm">
                                                                <strong>{t('taskManagement.notes')}</strong> {task.notes}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col sm:flex-row gap-2 lg:ml-4">
                                                        {(() => {
                                                            const service = task.service;
                                                            if (!service?.token) return null;

                                                            return (
                                                                <Button
                                                                    variant="outline"
                                                                    size="default"
                                                                    onClick={() =>
                                                                        shareExistingTicket({
                                                                            token: service.token,
                                                                            createdAt: service.createdAt,
                                                                            serviceName: service.serviceName,
                                                                            name: task.voter?.fullName,
                                                                            mobile: task.voter?.mobileNoPrimary,
                                                                        })
                                                                    }
                                                                    className="w-full sm:w-auto"
                                                                >
                                                                    <Share2 className="mr-2 h-4 w-4" />
                                                                    Reprint Thermal
                                                                </Button>
                                                            );
                                                        })()}
                                                        <Button
                                                            variant="outline"
                                                            size="default"
                                                            onClick={() => {
                                                                setSelectedTask(task);
                                                                setSelectedCommunityService(null);
                                                                setNewStatus(task.status);
                                                                setNewNote('');
                                                                setShowTaskDialog(true);
                                                            }}
                                                            className="w-full sm:w-auto"
                                                        >
                                                            {t('taskManagement.actions.manage')}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="default"
                                                            onClick={() => {
                                                                setSelectedTask(task);
                                                                setShowEscalationDialog(true);
                                                            }}
                                                            className="w-full sm:w-auto"
                                                        >
                                                            {t('taskManagement.actions.escalate')}
                                                        </Button>
                                                    </div>
                                                </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {/* Pagination for Individual Tasks */}
                            {tasks.length > 0 && (filterServiceType === 'all' || filterServiceType === 'individual') && (
                                <div className="mt-4">
                                    <TablePagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        pageSize={pageSize}
                                        totalItems={totalCount}
                                        onPageChange={setCurrentPage}
                                        onPageSizeChange={(size) => {
                                            setPageSize(size);
                                            setCurrentPage(1);
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Services Section */}
                    {(filterServiceType === 'all' || filterServiceType === 'community') && (
                        <div>
                            {communityServices.length === 0 && (filterServiceType === 'community' || (filterServiceType === 'all' && tasks.length === 0)) ? (
                                <Card>
                                    <CardContent className="pt-4 sm:pt-6">
                                        <div className="text-center py-8">
                                            <p className="text-muted-foreground">No services found</p>
                                            <p className="text-sm text-muted-foreground mt-2">
                                                Try adjusting your filters to find services
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div>
                                    {filterServiceType === 'all' && communityServices.length > 0 && (
                                        <div className="mb-4">
                                            <h2 className="text-xl sm:text-2xl font-semibold mb-4">Services</h2>
                                        </div>
                                    )}
                                    <div className="space-y-4">
                                        {communityServices.map((service) => (
                                            <div
                                                key={service.id}
                                                ref={setItemRef(service.id)}
                                                tabIndex={-1}
                                                className="outline-none"
                                            >
                                                <Card
                                                    className={[
                                                        'hover:shadow-md transition-shadow border-l-4 border-l-blue-500',
                                                        highlightedItemId === service.id ? 'ring-2 ring-primary ring-offset-2' : '',
                                                    ].join(' ')}
                                                >
                                                    <CardContent className="pt-4 sm:pt-6">
                                                    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                                                <h3 className="text-lg font-semibold">{service.serviceName}</h3>
                                                                <div className="flex flex-wrap gap-2">
                                                                    <Badge className={getStatusColor(service.status || 'pending')}>
                                                                        {service.status?.replace('_', ' ') || 'pending'}
                                                                    </Badge>
                                                                    <Badge className={getPriorityColor(service.priority || 'medium')}>
                                                                        <div className="flex items-center gap-1">
                                                                            {getPriorityIcon(service.priority || 'medium')}
                                                                            {service.priority || 'medium'}
                                                                        </div>
                                                                    </Badge>
                                                                </div>
                                                            </div>

                                                            {service.description && (
                                                                <p className="text-muted-foreground mb-3">{service.description}</p>
                                                            )}

                                                            {service.token && (
                                                                <div className="text-sm text-muted-foreground mb-3">
                                                                    <strong>{t('taskManagement.token')}</strong> {service.token}
                                                                </div>
                                                            )}

                                                            {service.areas && service.areas.length > 0 && (
                                                                <div className="bg-blue-50 p-3 rounded-lg mb-3">
                                                                    <div className="text-sm font-medium text-blue-900 mb-2">
                                                                        Service Areas
                                                                    </div>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-sm text-blue-700">
                                                                        {service.areas.map((area) => (
                                                                            <div key={`${area.partNo || ''}-${area.wardNo || ''}-${area.acNo || ''}`} className="flex flex-wrap gap-1">
                                                                                {area.partNo && <span><strong>Part:</strong> {area.partNo}</span>}
                                                                                {area.wardNo && <span><strong>Ward:</strong> {area.wardNo}</span>}
                                                                                {area.acNo && <span><strong>AC:</strong> {area.acNo}</span>}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="text-sm text-muted-foreground flex flex-col sm:flex-row sm:flex-wrap gap-1">
                                                                <span>
                                                                    <strong>Created:</strong> {new Date(service.createdAt).toLocaleDateString()}
                                                                </span>
                                                                {service.updatedAt && service.updatedAt !== service.createdAt && (
                                                                    <span><strong>Updated:</strong> {new Date(service.updatedAt).toLocaleDateString()}</span>
                                                                )}
                                                            </div>

                                                            {service.notes && (
                                                                <div className="mt-2 p-2 bg-muted rounded text-sm">
                                                                    <strong>Notes:</strong> {service.notes}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-col sm:flex-row gap-2 lg:ml-4">
                                                            {service.token && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="default"
                                                                    onClick={() =>
                                                                        shareExistingTicket({
                                                                            token: service.token,
                                                                            createdAt: service.createdAt,
                                                                            serviceName: service.serviceName,
                                                                            name: service.serviceName,
                                                                        })
                                                                    }
                                                                    className="w-full sm:w-auto"
                                                                >
                                                                    <Share2 className="mr-2 h-4 w-4" />
                                                                    Reprint Thermal
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="outline"
                                                                size="default"
                                                                onClick={() => {
                                                                    setSelectedCommunityService(service);
                                                                    setSelectedTask(null);
                                                                    setNewStatus(service.status || 'pending');
                                                                    setNewNote('');
                                                                    setShowTaskDialog(true);
                                                                }}
                                                                className="w-full sm:w-auto"
                                                            >
                                                                {t('taskManagement.actions.manage')}
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="default"
                                                                onClick={() => {
                                                                    setSelectedCommunityService(service);
                                                                    setSelectedTask(null);
                                                                    setShowEscalationDialog(true);
                                                                }}
                                                                className="w-full sm:w-auto"
                                                            >
                                                                {t('taskManagement.actions.escalate')}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Pagination for Services */}
                                    {communityServices.length > 0 && (filterServiceType === 'all' || filterServiceType === 'community') && (
                                        <div className="mt-4">
                                            <TablePagination
                                                currentPage={communityServicesPage}
                                                totalPages={communityServicesTotalPages}
                                                pageSize={pageSize}
                                                totalItems={communityServicesTotalCount}
                                                onPageChange={setCommunityServicesPage}
                                                onPageSizeChange={(size) => {
                                                    setPageSize(size);
                                                    setCommunityServicesPage(1);
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Show message if no results at all */}
                    {filterServiceType === 'all' && tasks.length === 0 && communityServices.length === 0 && (
                        <Card>
                            <CardContent className="pt-4 sm:pt-6">
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground">No tasks or services found</p>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Try adjusting your filters
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}


            {/* Task Management Dialog */}
            <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
                <DialogContent className="max-w-[95vw] sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t('taskManagement.dialog.manageTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('taskManagement.dialog.manageDescription')}
                        </DialogDescription>
                    </DialogHeader>

                    {(selectedTask || selectedCommunityService) && (
                        <div className="space-y-4">
                            <div>
                                <Label>{t('taskManagement.dialog.taskType')}</Label>
                                <p className="text-sm text-muted-foreground">
                                    {selectedTask ? selectedTask.taskType : (selectedCommunityService?.serviceName || 'Service')}
                                </p>
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
                                    onClick={() => {
                                        if (selectedTask) {
                                            handleStatusUpdate(selectedTask.id, newStatus || selectedTask.status, newNote);
                                        } else if (selectedCommunityService) {
                                            handleCommunityServiceStatusUpdate(
                                                selectedCommunityService.id,
                                                newStatus || selectedCommunityService.status || 'pending',
                                                newNote
                                            );
                                        }
                                    }}
                                    disabled={!newStatus && !newNote.trim()}
                                    className="w-full"
                                >
                                    {t('taskManagement.dialog.updateTask')}
                                </Button>
                                <Button variant="outline" onClick={() => {
                                    setShowTaskDialog(false);
                                    setSelectedTask(null);
                                    setSelectedCommunityService(null);
                                }} className="w-full sm:w-auto">
                                    {t('common.cancel')}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Escalation Dialog */}
            <Dialog open={showEscalationDialog} onOpenChange={setShowEscalationDialog}>
                <DialogContent className="max-w-[95vw] sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t('taskManagement.dialog.escalationTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('taskManagement.dialog.escalationDescription')}
                        </DialogDescription>
                    </DialogHeader>

                    {(selectedTask || selectedCommunityService) && (
                        <div className="space-y-4">
                            <div>
                                <Label>{t('taskManagement.dialog.task')}</Label>
                                <p className="text-sm text-muted-foreground">
                                    {selectedTask ? selectedTask.taskType : (selectedCommunityService?.serviceName || 'Service')}
                                </p>
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
                                <Button onClick={handleEscalation} disabled={!escalationReason.trim()} className="w-full">
                                    {t('taskManagement.dialog.submitEscalation')}
                                </Button>
                                <Button variant="outline" onClick={() => {
                                    setShowEscalationDialog(false);
                                    setSelectedTask(null);
                                    setSelectedCommunityService(null);
                                }} className="w-full sm:w-auto">
                                    {t('common.cancel')}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

        </div>
    );
}
