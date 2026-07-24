'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/toast';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from '@/components/icons';
import { useTranslations } from '@/hooks/use-translations';
import type { VoterTask, BeneficiaryService } from '@/lib/db/schema';
import { TablePagination } from '@/components/table-pagination';
import { QrCode, Share2, FileText, FileDown, Loader2, Paperclip } from 'lucide-react';
import { isValidIndianMobile, normalizeIndianMobileDigits } from '@/lib/indian-mobile';
import { buildThermalTicketText, shareThermalTicketPdf } from '@/lib/thermal/receipt';
import {
  buildManageSearchParams,
  parseManageFiltersFromSearchParams,
  type ManageFilterState,
} from '@/lib/operator/manage-url-params';

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
    createdByName?: string | null;
    updatedByName?: string | null;
}

interface TaskResponse {
    tasks: TaskWithService[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
}

interface ServiceCatalogOption {
    id: string;
    name: string;
    category: string | null;
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
                        `Could not access camera${name}. Please allow camera permission and close any other app/tab using the camera.`,
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

function formatTaskType(taskType?: string) {
    if (!taskType) return '';
    return taskType
        .split('_')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');
}

export function TaskManagement({
    initialTaskId,
    initialManageState,
}: {
    initialTaskId?: string;
    initialManageState?: Partial<ManageFilterState>;
} = {}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { t } = useTranslations();

    const urlFilters = parseManageFiltersFromSearchParams(searchParams);
    const mergedInitial: ManageFilterState = {
        status: initialManageState?.status ?? urlFilters.status,
        priority: initialManageState?.priority ?? urlFilters.priority,
        serviceName: initialManageState?.serviceName ?? urlFilters.serviceName,
        token: initialManageState?.token ?? urlFilters.token,
        mobile: initialManageState?.mobile ?? urlFilters.mobile,
        voterId: initialManageState?.voterId ?? urlFilters.voterId,
        page: initialManageState?.page ?? urlFilters.page,
        limit: initialManageState?.limit ?? urlFilters.limit,
        taskId: initialManageState?.taskId ?? urlFilters.taskId,
    };

    const [tasks, setTasks] = useState<TaskWithService[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<TaskWithService | null>(null);
    const [showTaskDialog, setShowTaskDialog] = useState(false);
    const [linkedLetters, setLinkedLetters] = useState<
        Array<{
            id: string;
            title: string;
            referenceNo: string;
            letterType: string;
            pdfStoragePath?: string | null;
        }>
    >([]);
    const [downloadingLetterId, setDownloadingLetterId] = useState<string | null>(null);
    const [serviceAttachments, setServiceAttachments] = useState<
        Array<{ id: string; fileName: string; fileUrl: string | null }>
    >([]);
    const [showEscalationDialog, setShowEscalationDialog] = useState(false);
    const [escalationReason, setEscalationReason] = useState('');
    const [escalationPriority, setEscalationPriority] = useState<'high' | 'urgent'>('high');
    const [filterStatus, setFilterStatus] = useState<string>(mergedInitial.status);
    const [filterPriority, setFilterPriority] = useState<string>(mergedInitial.priority);
    const [filterServiceName, setFilterServiceName] = useState<string>(mergedInitial.serviceName || 'all');
    const [filterToken, setFilterToken] = useState<string>(mergedInitial.token);
    const [filterMobile, setFilterMobile] = useState<string>(mergedInitial.mobile);
    const [filterVoterId, setFilterVoterId] = useState<string>(mergedInitial.voterId);
    const [filterTokenInput, setFilterTokenInput] = useState<string>(mergedInitial.token);
    const [filterMobileInput, setFilterMobileInput] = useState<string>(mergedInitial.mobile);
    const [filterVoterIdInput, setFilterVoterIdInput] = useState<string>(mergedInitial.voterId);

    // Load letters + document uploads linked to the selected service when the
    // manage dialog opens.
    useEffect(() => {
        const serviceId = selectedTask?.serviceId;
        if (!showTaskDialog || !serviceId) {
            setLinkedLetters([]);
            setServiceAttachments([]);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const [lettersRes, attachmentsRes] = await Promise.all([
                    fetch(
                        `/api/letters?limit=50&beneficiaryServiceId=${encodeURIComponent(serviceId)}`,
                    ),
                    fetch(
                        `/operator/api/beneficiary-services/${encodeURIComponent(serviceId)}/attachments`,
                    ),
                ]);
                if (cancelled) return;
                if (lettersRes.ok) {
                    const json = await lettersRes.json();
                    setLinkedLetters(json?.letters ?? []);
                } else {
                    setLinkedLetters([]);
                }
                if (attachmentsRes.ok) {
                    const json = await attachmentsRes.json();
                    setServiceAttachments(Array.isArray(json) ? json : []);
                } else {
                    setServiceAttachments([]);
                }
            } catch {
                if (!cancelled) {
                    setLinkedLetters([]);
                    setServiceAttachments([]);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [showTaskDialog, selectedTask?.serviceId]);
    const [serviceCatalog, setServiceCatalog] = useState<ServiceCatalogOption[]>([]);
    const [showQrScanner, setShowQrScanner] = useState(false);
    const [pendingAutoFocusToken, setPendingAutoFocusToken] = useState<string | null>(null);
    const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
    const [newNote, setNewNote] = useState('');
    const [newStatus, setNewStatus] = useState<string>('');

    const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
    const highlightTimeoutRef = useRef<number | null>(null);
    const invalidMobileFilterToastSentRef = useRef(false);

    const setItemRef = useCallback((id: string) => {
        return (el: HTMLElement | null) => {
            if (el) itemRefs.current.set(id, el);
            else itemRefs.current.delete(id);
        };
    }, []);

    const [currentPage, setCurrentPage] = useState(mergedInitial.page);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [pageSize, setPageSize] = useState(mergedInitial.limit);

    const syncManageUrl = useCallback(
        (updates: Partial<ManageFilterState> & { tab?: string }, resetPage = false) => {
            const next: Partial<ManageFilterState> & { tab?: string } = {
                status: updates.status ?? filterStatus,
                priority: updates.priority ?? filterPriority,
                serviceName:
                    updates.serviceName !== undefined
                        ? updates.serviceName
                        : filterServiceName === 'all'
                          ? ''
                          : filterServiceName,
                token: updates.token ?? filterToken,
                mobile: updates.mobile ?? filterMobile,
                voterId: updates.voterId ?? filterVoterId,
                page: resetPage ? 1 : (updates.page ?? currentPage),
                limit: updates.limit ?? pageSize,
                taskId: updates.taskId ?? (searchParams.get('taskId') ?? ''),
                tab: updates.tab ?? searchParams.get('tab') ?? 'manage',
            };
            const params = buildManageSearchParams(next, new URLSearchParams(searchParams.toString()));
            const qs = params.toString();
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        },
        [
            router,
            pathname,
            searchParams,
            filterStatus,
            filterPriority,
            filterServiceName,
            filterToken,
            filterMobile,
            filterVoterId,
            currentPage,
            pageSize,
        ],
    );

    useEffect(() => {
        const loadCatalog = async () => {
            try {
                const res = await fetch('/operator/api/individual-services');
                if (res.ok) {
                    const data = await res.json();
                    setServiceCatalog(
                        (Array.isArray(data) ? data : data.services ?? []).map(
                            (s: { id: string; name: string; category?: string | null }) => ({
                            id: s.id,
                            name: s.name,
                            category: s.category ?? null,
                        })),
                    );
                }
            } catch {
                // ignore
            }
        };
        void loadCatalog();
    }, []);

    const fetchTasks = useCallback(async () => {
        try {
            setIsLoading(true);

            const params = new URLSearchParams();
            if (filterStatus !== 'all') params.append('status', filterStatus);
            if (filterPriority !== 'all') params.append('priority', filterPriority);
            if (filterToken) params.append('token', filterToken);
            if (filterMobile) params.append('mobileNo', filterMobile);
            if (filterVoterId) params.append('voterId', filterVoterId);
            if (filterServiceName && filterServiceName !== 'all') {
                params.append('serviceName', filterServiceName);
            }
            params.append('serviceType', 'individual');
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
    }, [currentPage, pageSize, filterStatus, filterPriority, filterToken, filterMobile, filterVoterId, filterServiceName, t]);

    useEffect(() => {
        fetchTasks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, pageSize, filterStatus, filterPriority, filterToken, filterMobile, filterVoterId, filterServiceName]);

    useEffect(() => {
        if (!pendingAutoFocusToken) return;
        if (isLoading) return;

        const token = pendingAutoFocusToken;
        const matchTask = tasks.find((t) => (t.service?.token ?? '').toLowerCase() === token.toLowerCase());
        const matchId = matchTask?.id ?? null;

        if (!matchId) {
            toast({ type: 'error', description: `No item found for token: ${token}` });
            setPendingAutoFocusToken(null);
            return;
        }

        const el = itemRefs.current.get(matchId);
        if (!el) return;

        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof (el as HTMLElement & { focus?: (opts?: object) => void }).focus === 'function') {
            (el as HTMLElement & { focus: (opts?: object) => void }).focus({ preventScroll: true });
        }

        setHighlightedItemId(matchId);
        if (highlightTimeoutRef.current != null) window.clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = window.setTimeout(() => setHighlightedItemId(null), 2500);

        setPendingAutoFocusToken(null);
    }, [pendingAutoFocusToken, tasks, isLoading]);

    useEffect(() => {
        return () => {
            if (highlightTimeoutRef.current != null) window.clearTimeout(highlightTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        const targetId = initialTaskId ?? mergedInitial.taskId;
        if (!targetId) return;

        let cancelled = false;

        const openDeepLinkedItem = async () => {
            try {
                const response = await fetch(`/operator/api/tasks/${targetId}`);
                if (!response.ok) return;
                const { task } = await response.json();
                if (cancelled || !task) return;

                setSelectedTask(task);
                setNewStatus(task.status);
                setNewNote('');
                setShowTaskDialog(true);
                setHighlightedItemId(task.id);
            } catch (error) {
                console.error('Failed to open notification target:', error);
            }
        };

        void openDeepLinkedItem();

        return () => {
            cancelled = true;
        };
    }, [initialTaskId, mergedInitial.taskId]);

    // Debounce the "typing" inputs before applying filters (prevents frequent fetches while typing).
    useEffect(() => {
        const handle = window.setTimeout(() => {
            const nextToken = filterTokenInput.trim();
            const nextMobileRaw = filterMobileInput.trim();
            const nextVoter = filterVoterIdInput.trim();

            let appliedMobile = '';
            if (nextMobileRaw === '') {
                invalidMobileFilterToastSentRef.current = false;
            } else if (isValidIndianMobile(nextMobileRaw)) {
                appliedMobile = normalizeIndianMobileDigits(nextMobileRaw);
                invalidMobileFilterToastSentRef.current = false;
            } else {
                if (!invalidMobileFilterToastSentRef.current) {
                    toast({
                        type: 'error',
                        description: t('operator.messages.invalidIndianMobile'),
                    });
                    invalidMobileFilterToastSentRef.current = true;
                }
            }

            // Only reset pagination if a debounced filter actually changes.
            const changed =
                nextToken !== filterToken || appliedMobile !== filterMobile || nextVoter !== filterVoterId;
            if (changed) {
                setCurrentPage(1);
                syncManageUrl({
                    token: nextToken,
                    mobile: appliedMobile,
                    voterId: nextVoter,
                    page: 1,
                });
            }

            setFilterToken(nextToken);
            setFilterMobile(appliedMobile);
            setFilterVoterId(nextVoter);
        }, 400);

        return () => window.clearTimeout(handle);
    }, [filterTokenInput, filterMobileInput, filterVoterIdInput, filterToken, filterMobile, filterVoterId, t, syncManageUrl]);

    const handleSearch = () => {
        setCurrentPage(1);
        syncManageUrl({ page: 1 });
        fetchTasks();
    };

    const handleClearFilters = () => {
        setFilterStatus('all');
        setFilterPriority('all');
        setFilterServiceName('all');
        setFilterToken('');
        setFilterMobile('');
        setFilterVoterId('');
        setFilterTokenInput('');
        setFilterMobileInput('');
        setFilterVoterIdInput('');
        invalidMobileFilterToastSentRef.current = false;
        setCurrentPage(1);
        setPageSize(10);
        syncManageUrl({
            status: 'all',
            priority: 'all',
            serviceName: '',
            token: '',
            mobile: '',
            voterId: '',
            page: 1,
            limit: 10,
        });
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

    const handleCommunityServiceStatusUpdate = async (_serviceId: string, _status: string, _notes?: string) => {
        // Community services removed from manage view
    };

    const handleEscalation = async () => {
        const taskId = selectedTask?.id;
        const serviceId = selectedTask?.serviceId;

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
            fetchTasks();
        } catch (error) {
            console.error('Error escalating request:', error);
            toast({
                type: 'error',
                description: t('taskManagement.messages.escalationFailed'),
            });
        }
    };

    const handleDownloadLetter = async (letter: {
        id: string;
        title: string;
        referenceNo: string;
        pdfStoragePath?: string | null;
    }) => {
        setDownloadingLetterId(letter.id);
        try {
            const res = await fetch(`/api/letters/${encodeURIComponent(letter.id)}/pdf`);
            const json = await res.json().catch(() => ({}));
            if (!res.ok || typeof json?.url !== 'string') {
                throw new Error(
                    typeof json?.error === 'string' ? json.error : 'Failed to download letter PDF',
                );
            }
            const anchor = document.createElement('a');
            anchor.href = json.url;
            anchor.rel = 'noopener';
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            toast({
                type: 'success',
                description: t('taskManagement.dialog.downloadLetterSuccess'),
            });
        } catch (error) {
            console.error('Error downloading letter PDF:', error);
            toast({
                type: 'error',
                description: t('taskManagement.dialog.downloadLetterFailed'),
            });
        } finally {
            setDownloadingLetterId(null);
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
                    setFilterTokenInput(token);
                    setPendingAutoFocusToken(token);
                    setCurrentPage(1);
                    syncManageUrl({ token, page: 1 });
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
                                <Label htmlFor="service-name-filter">{t('taskManagement.filters.serviceName')}</Label>
                                <Select
                                    value={filterServiceName}
                                    onValueChange={(value) => {
                                        setFilterServiceName(value);
                                        setCurrentPage(1);
                                        syncManageUrl({
                                            serviceName: value === 'all' ? '' : value,
                                            page: 1,
                                        }, true);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('taskManagement.filters.allServices')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('taskManagement.filters.allServices')}</SelectItem>
                                        {(() => {
                                            const groups = new Map<string, ServiceCatalogOption[]>();
                                            for (const service of serviceCatalog) {
                                                const key = service.category?.trim() || 'Other';
                                                const list = groups.get(key) ?? [];
                                                list.push(service);
                                                groups.set(key, list);
                                            }
                                            return Array.from(groups.entries()).map(([category, services]) => (
                                                <SelectGroup key={category}>
                                                    <SelectLabel>{category}</SelectLabel>
                                                    {services.map((service) => (
                                                        <SelectItem key={service.id} value={service.name}>
                                                            {service.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            ));
                                        })()}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="status-filter">{t('taskManagement.filters.status')}</Label>
                                <Select
                                    value={filterStatus}
                                    onValueChange={(value) => {
                                        setFilterStatus(value);
                                        setCurrentPage(1);
                                        syncManageUrl({ status: value, page: 1 }, true);
                                    }}
                                >
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
                                <Select
                                    value={filterPriority}
                                    onValueChange={(value) => {
                                        setFilterPriority(value);
                                        setCurrentPage(1);
                                        syncManageUrl({ priority: value, page: 1 }, true);
                                    }}
                                >
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
                                        value={filterTokenInput}
                                        onChange={(e) => setFilterTokenInput(e.target.value)}
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
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    autoComplete="tel"
                                    maxLength={13}
                                    placeholder={t('taskManagement.filters.enterMobile')}
                                    value={filterMobileInput}
                                    onChange={(e) => setFilterMobileInput(e.target.value.replace(/\D/g, ''))}
                                    onKeyDown={(e) => {
                                        if (e.ctrlKey || e.metaKey || e.altKey) return;
                                        const allowed = [
                                            'Backspace',
                                            'Delete',
                                            'Tab',
                                            'Enter',
                                            'Escape',
                                            'ArrowLeft',
                                            'ArrowRight',
                                            'ArrowUp',
                                            'ArrowDown',
                                            'Home',
                                            'End',
                                        ];
                                        if (allowed.includes(e.key)) return;
                                        if (/^\d$/.test(e.key)) return;
                                        e.preventDefault();
                                    }}
                                />
                            </div>

                            <div>
                                <Label htmlFor="voter-filter">{t('taskManagement.filters.voterId')}</Label>
                                <Input
                                    id="voter-filter"
                                    placeholder={t('taskManagement.filters.enterVoterId')}
                                    value={filterVoterIdInput}
                                    onChange={(e) => setFilterVoterIdInput(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                <div>
                                    <Label htmlFor="page-size">{t('taskManagement.filters.itemsPerPage')}</Label>
                                    <Select
                                        value={pageSize.toString()}
                                        onValueChange={(value) => {
                                            const size = Number.parseInt(value);
                                            setPageSize(size);
                                            setCurrentPage(1);
                                            syncManageUrl({ limit: size, page: 1 });
                                        }}
                                    >
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
            {isLoading ? (
                <div className="min-h-[60vh] bg-background flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full size-8 border-b-2 border-gray-900 mx-auto" />
                        <p className="mt-2 text-muted-foreground">{t('taskManagement.loading')}</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-3 pb-10">
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
                                                                {(task.createdByName || task.createdBy) && (
                                                                    <span><strong>Created by:</strong> {task.createdByName || task.createdBy}</span>
                                                                )}
                                                                {task.updatedAt !== task.createdAt && (
                                                                    <span><strong>{t('taskManagement.updated')}</strong> {new Date(task.updatedAt).toLocaleDateString()}</span>
                                                                )}
                                                                {(task.updatedByName || task.updatedBy) && (
                                                                    <span><strong>Updated by:</strong> {task.updatedByName || task.updatedBy}</span>
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
                            {tasks.length > 0 && (
                                <div className="mt-4">
                                    <TablePagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        pageSize={pageSize}
                                        totalItems={totalCount}
                                        onPageChange={(page) => {
                                            setCurrentPage(page);
                                            syncManageUrl({ page });
                                        }}
                                        onPageSizeChange={(size) => {
                                            setPageSize(size);
                                            setCurrentPage(1);
                                            syncManageUrl({ limit: size, page: 1 });
                                        }}
                                    />
                                </div>
                            )}
                    </div>
                </div>
            )}


            {/* Task Management Dialog */}
            <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
                <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-xl">
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
                                <p className="text-sm text-muted-foreground">
                                    {formatTaskType(selectedTask.taskType)}
                                </p>
                            </div>

                            {selectedTask.serviceId && (
                                <div className="space-y-3 rounded-md border p-3">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <Label>{t('taskManagement.dialog.letters')}</Label>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="w-full sm:w-auto"
                                            onClick={() =>
                                                router.push(
                                                    `/modules/letter-generation?beneficiaryServiceId=${encodeURIComponent(
                                                        selectedTask.serviceId,
                                                    )}`,
                                                )
                                            }
                                        >
                                            <FileText className="mr-2 size-4" />
                                            {t('taskManagement.dialog.generateLetter')}
                                        </Button>
                                    </div>
                                    {linkedLetters.length > 0 ? (
                                        <ul className="max-h-56 space-y-2 overflow-y-auto sm:max-h-72">
                                            {linkedLetters.map((letter) => (
                                                <li
                                                    key={letter.id}
                                                    className="flex flex-col gap-2 rounded-md border border-border/60 p-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                                                >
                                                    <div className="flex min-w-0 flex-1 items-start gap-2 text-sm">
                                                        <FileText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="break-words font-medium leading-snug">
                                                                {letter.title}
                                                            </p>
                                                            {letter.referenceNo ? (
                                                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                                                    {letter.referenceNo}
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full shrink-0 sm:w-auto"
                                                        disabled={
                                                            downloadingLetterId === letter.id ||
                                                            !letter.pdfStoragePath
                                                        }
                                                        title={
                                                            letter.pdfStoragePath
                                                                ? t('taskManagement.dialog.downloadLetter')
                                                                : t('taskManagement.dialog.downloadLetterUnavailable')
                                                        }
                                                        onClick={() => void handleDownloadLetter(letter)}
                                                    >
                                                        {downloadingLetterId === letter.id ? (
                                                            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                                                        ) : (
                                                            <FileDown className="mr-1.5 size-3.5" />
                                                        )}
                                                        {t('taskManagement.dialog.downloadLetter')}
                                                    </Button>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">
                                            {t('taskManagement.dialog.noLetters')}
                                        </p>
                                    )}
                                    {serviceAttachments.length > 0 && (
                                        <div className="space-y-1 border-t pt-2">
                                            <Label className="text-xs text-muted-foreground">
                                                {t('taskManagement.dialog.documents')}
                                            </Label>
                                            <ul className="space-y-1">
                                                {serviceAttachments.map((att) => (
                                                    <li key={att.id} className="text-sm">
                                                        {att.fileUrl ? (
                                                            <a
                                                                href={att.fileUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-2 text-primary hover:underline"
                                                            >
                                                                <Paperclip className="size-3.5 shrink-0" />
                                                                <span className="truncate">{att.fileName}</span>
                                                            </a>
                                                        ) : (
                                                            <span className="flex items-center gap-2">
                                                                <Paperclip className="size-3.5 shrink-0" />
                                                                <span className="truncate">{att.fileName}</span>
                                                            </span>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

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

                    {selectedTask && (
                        <div className="space-y-4">
                            <div>
                                <Label>{t('taskManagement.dialog.task')}</Label>
                                <p className="text-sm text-muted-foreground">
                                    {selectedTask.taskType}
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
