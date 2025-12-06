'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ModulePageHeader } from '@/components/module-page-header';
import { useTranslations } from '@/hooks/use-translations';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/toast';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Trash2,
  FileDown,
  ChevronDown,
  Search
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ExportJob {
  id: string;
  type: string;
  format: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalRecords: number | null;
  processedRecords: number | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSizeKb: number | null;
  filters: Record<string, unknown> | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface ExportFilters {
  partNo?: string[];
  wardNo?: string[];
  gender?: string;
  minAge?: string;
  maxAge?: string;
  hasPhone?: string;
  religion?: string;
  isVoted2024?: string;
  selectedColumns?: string[];
}

// Available columns for export
const AVAILABLE_COLUMNS = [
  { key: 'epicNumber', label: 'EPIC Number' },
  { key: 'fullName', label: 'Full Name' },
  { key: 'relationType', label: 'Relation Type' },
  { key: 'relationName', label: 'Relation Name' },
  { key: 'age', label: 'Age' },
  { key: 'gender', label: 'Gender' },
  { key: 'mobileNoPrimary', label: 'Mobile (Primary)' },
  { key: 'mobileNoSecondary', label: 'Mobile (Secondary)' },
  { key: 'houseNumber', label: 'House Number' },
  { key: 'address', label: 'Address' },
  { key: 'pincode', label: 'Pincode' },
  { key: 'acNo', label: 'AC No' },
  { key: 'wardNo', label: 'Ward No' },
  { key: 'partNo', label: 'Part No' },
  { key: 'boothName', label: 'Booth Name' },
  { key: 'religion', label: 'Religion' },
  { key: 'isVoted2024', label: 'Voted 2024' },
] as const;

// Default selected columns (all columns)
const DEFAULT_COLUMNS = AVAILABLE_COLUMNS.map(col => col.key);

export function DataExport() {
  const { t } = useTranslations();
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv' | 'pdf'>('excel');
  const [filters, setFilters] = useState<ExportFilters>({});
  const [isExporting, setIsExporting] = useState(false);
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [wardNumbers, setWardNumbers] = useState<string[]>([]);
  const [partsByWard, setPartsByWard] = useState<Record<string, string[]>>({});
  const [allPartNumbers, setAllPartNumbers] = useState<string[]>([]);
  const [religions, setReligions] = useState<string[]>([]);
  const [loadingWards, setLoadingWards] = useState(true);
  const [loadingParts, setLoadingParts] = useState(false);
  const [loadingReligions, setLoadingReligions] = useState(true);
  const [processedWards, setProcessedWards] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(DEFAULT_COLUMNS);

  // Filter wards and parts based on search term
  const filteredWardNumbers = useMemo(() => {
    if (!searchTerm.trim()) return wardNumbers;
    const term = searchTerm.toLowerCase().trim()
      .replace(/^ward\s*/i, '') // Remove "ward" prefix if present
      .replace(/\s+/g, ''); // Remove all spaces
    if (!term) return wardNumbers;
    return wardNumbers.filter(wardNo => {
      const normalizedWard = wardNo.toLowerCase().replace(/\s+/g, '');
      return normalizedWard.includes(term) ||
        `ward${normalizedWard}`.includes(term);
    });
  }, [wardNumbers, searchTerm]);

  const filteredPartNumbers = useMemo(() => {
    if (!searchTerm.trim()) return allPartNumbers;
    const term = searchTerm.toLowerCase().trim()
      .replace(/^part\s*/i, '') // Remove "part" prefix if present
      .replace(/\s+/g, ''); // Remove all spaces
    if (!term) return allPartNumbers;
    return allPartNumbers.filter(partNo => {
      const normalizedPart = partNo.toLowerCase().replace(/\s+/g, '');
      return normalizedPart.includes(term) ||
        `part${normalizedPart}`.includes(term);
    });
  }, [allPartNumbers, searchTerm]);

  // Fetch export jobs
  const fetchJobs = useCallback(async () => {
    try {
      const response = await fetch('/api/export?limit=10');
      if (response.ok) {
        const data = await response.json();
        setJobs(data);
      }
    } catch (error) {
      console.error('Error fetching export jobs:', error);
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  // Poll for job updates when there are active jobs
  useEffect(() => {
    fetchJobs();

    const hasActiveJobs = jobs.some(
      job => job.status === 'pending' || job.status === 'processing'
    );

    if (hasActiveJobs) {
      const interval = setInterval(fetchJobs, 2000);
      return () => clearInterval(interval);
    }
  }, [fetchJobs, jobs]);

  // Initial fetch
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Fetch all ward numbers
  useEffect(() => {
    const fetchWardNumbers = async () => {
      try {
        setLoadingWards(true);
        const response = await fetch('/api/voters/wards');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.wardNumbers) {
            setWardNumbers(data.data.wardNumbers);
          }
        }
      } catch (error) {
        console.error('Error fetching ward numbers:', error);
      } finally {
        setLoadingWards(false);
      }
    };
    fetchWardNumbers();
  }, []);

  // Fetch all part numbers on mount
  useEffect(() => {
    const fetchAllParts = async () => {
      try {
        setLoadingParts(true);
        // Fetch all parts from the parts-by-wards endpoint (works without ward filter)
        const response = await fetch('/api/voters/parts-by-wards');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setPartsByWard(data.data.partsByWard || {});
            setAllPartNumbers(data.data.allParts || []);
          }
        }
      } catch (error) {
        console.error('Error fetching all part numbers:', error);
      } finally {
        setLoadingParts(false);
      }
    };
    fetchAllParts();
  }, []);

  // Fetch part numbers when ward numbers are selected (for updating partsByWard)
  useEffect(() => {
    const fetchPartsByWards = async () => {
      if (!filters.wardNo || filters.wardNo.length === 0) {
        // Don't clear partsByWard or allPartNumbers - keep them available
        setProcessedWards(new Set());
        return;
      }
      try {
        setLoadingParts(true);
        const wardParams = filters.wardNo.map(w => `wardNo=${encodeURIComponent(w)}`).join('&');
        const response = await fetch(`/api/voters/parts-by-wards?${wardParams}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            const newPartsByWard = data.data.partsByWard || {};
            setPartsByWard(newPartsByWard);

            // Only auto-select parts for newly selected wards (not already processed)
            const currentParts = filters.partNo || [];
            const newParts: string[] = [];
            const newlySelectedWards = filters.wardNo.filter(ward => !processedWards.has(ward));

            newlySelectedWards.forEach(ward => {
              const wardParts = newPartsByWard[ward] || [];
              wardParts.forEach((part: string) => {
                if (!currentParts.includes(part)) {
                  newParts.push(part);
                }
              });
            });

            // Update processed wards
            if (newlySelectedWards.length > 0) {
              setProcessedWards(prev => {
                const newSet = new Set(prev);
                newlySelectedWards.forEach(ward => newSet.add(ward));
                return newSet;
              });
            }

            // Only add new parts if there are newly selected wards
            if (newParts.length > 0) {
              setFilters(prev => ({
                ...prev,
                partNo: [...currentParts, ...newParts]
              }));
            }
          }
        }
      } catch (error) {
        console.error('Error fetching part numbers by wards:', error);
      } finally {
        setLoadingParts(false);
      }
    };
    fetchPartsByWards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.wardNo]);

  // Fetch religions
  useEffect(() => {
    const fetchReligions = async () => {
      try {
        setLoadingReligions(true);
        const response = await fetch('/api/voters/religions');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.religions) {
            setReligions(data.data.religions);
          }
        }
      } catch (error) {
        console.error('Error fetching religions:', error);
      } finally {
        setLoadingReligions(false);
      }
    };
    fetchReligions();
  }, []);

  const handleStartExport = async () => {
    setIsExporting(true);
    try {
      // Prepare filters
      const exportFilters: Record<string, unknown> = {};
      if (filters.partNo && filters.partNo.length > 0) exportFilters.partNo = filters.partNo;
      if (filters.wardNo && filters.wardNo.length > 0) exportFilters.wardNo = filters.wardNo;
      if (filters.gender && filters.gender !== 'all') exportFilters.gender = filters.gender;
      if (filters.minAge) exportFilters.minAge = Number.parseInt(filters.minAge);
      if (filters.maxAge) exportFilters.maxAge = Number.parseInt(filters.maxAge);
      if (filters.hasPhone && filters.hasPhone !== 'all') {
        exportFilters.hasPhone = filters.hasPhone === 'yes';
      }
      if (filters.religion && filters.religion !== 'all') exportFilters.religion = filters.religion;
      if (filters.isVoted2024 && filters.isVoted2024 !== 'all') {
        exportFilters.isVoted2024 = filters.isVoted2024 === 'yes';
      }
      // Include selected columns (or all if none selected)
      exportFilters.selectedColumns = selectedColumns.length > 0 ? selectedColumns : DEFAULT_COLUMNS;

      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'voters',
          format: exportFormat,
          filters: exportFilters,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start export');
      }

      const job = await response.json();
      setJobs(prev => [job, ...prev]);
      toast({
        type: 'success',
        description: 'Export started! You can track progress below.',
      });
    } catch (error) {
      toast({
        type: 'error',
        description: 'Failed to start export. Please try again.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/export/${jobId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete export');
      }

      setJobs(prev => prev.filter(job => job.id !== jobId));
      toast({
        type: 'success',
        description: 'Export deleted successfully.',
      });
    } catch (error) {
      toast({
        type: 'error',
        description: 'Failed to delete export.',
      });
    }
  };

  const getStatusIcon = (status: ExportJob['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="size-4 text-amber-500" />;
      case 'processing':
        return <Loader2 className="size-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="size-4 text-emerald-500" />;
      case 'failed':
        return <XCircle className="size-4 text-red-500" />;
    }
  };

  const getStatusText = (status: ExportJob['status']) => {
    switch (status) {
      case 'pending':
        return 'Queued';
      case 'processing':
        return 'Processing';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf':
        return <FileText className="size-4" />;
      case 'excel':
      case 'csv':
        return <FileSpreadsheet className="size-4" />;
      default:
        return <FileDown className="size-4" />;
    }
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <ModulePageHeader
        title={t('dataExport.title')}
        description={t('dataExport.description')}
      />
      <div className="space-y-6">
        {/* Export Configuration Card */}
        <Card className="border-dashed border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileDown className="size-5 text-primary" />
              {t('dataExport.title')}
            </CardTitle>
            <CardDescription>
              {t('dataExport.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Export Format Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t('dataExport.exportFormat')}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setExportFormat('excel')}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${exportFormat === 'excel'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-muted hover:border-muted-foreground/30 hover:bg-muted/50'
                    }`}
                >
                  <FileSpreadsheet className={`size-6 ${exportFormat === 'excel' ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                  <div className="text-left">
                    <div className="font-medium">{t('dataExport.excel')}</div>
                    <div className="text-xs text-muted-foreground">CSV format, Excel compatible</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat('csv')}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${exportFormat === 'csv'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-muted hover:border-muted-foreground/30 hover:bg-muted/50'
                    }`}
                >
                  <FileText className={`size-6 ${exportFormat === 'csv' ? 'text-blue-600' : 'text-muted-foreground'}`} />
                  <div className="text-left">
                    <div className="font-medium">{t('dataExport.csv')}</div>
                    <div className="text-xs text-muted-foreground">Plain CSV format</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat('pdf')}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${exportFormat === 'pdf'
                    ? 'border-rose-500 bg-rose-50 text-rose-700'
                    : 'border-muted hover:border-muted-foreground/30 hover:bg-muted/50'
                    }`}
                >
                  <FileText className={`size-6 ${exportFormat === 'pdf' ? 'text-rose-600' : 'text-muted-foreground'}`} />
                  <div className="text-left">
                    <div className="font-medium">PDF Report</div>
                    <div className="text-xs text-muted-foreground">Printable HTML report</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Filters (Optional)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="wardPartNo" className="text-xs text-muted-foreground">Ward No / Part No</Label>
                  <DropdownMenu onOpenChange={(open) => {
                    if (!open) {
                      setSearchTerm('');
                    }
                  }}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between h-10"
                        disabled={loadingWards}
                      >
                        <span className="truncate">
                          {loadingWards
                            ? "Loading..."
                            : (filters.wardNo && filters.wardNo.length > 0) || (filters.partNo && filters.partNo.length > 0)
                              ? `${filters.wardNo?.length || 0} ward(s), ${filters.partNo?.length || 0} part(s)`
                              : "Select Ward No / Part No"}
                        </span>
                        <ChevronDown className="size-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto">
                      <div className="p-2 space-y-4">
                        {/* Search Input */}
                        <div className="px-2">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input
                              placeholder="Search ward or part number..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-8 h-9"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>

                        {/* Ward No Section */}
                        <div>
                          <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">Ward No</div>
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {filteredWardNumbers.length > 0 ? (
                              filteredWardNumbers.map((wardNo) => {
                                const wardParts = partsByWard[wardNo] || [];
                                const allWardPartsSelected = wardParts.length > 0 && wardParts.every(part => filters.partNo?.includes(part));
                                const someWardPartsSelected = wardParts.some(part => filters.partNo?.includes(part));

                                return (
                                  <div key={wardNo} className="space-y-1">
                                    <div className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-accent">
                                      <Checkbox
                                        checked={filters.wardNo?.includes(wardNo) || false}
                                        onChange={(e) => {
                                          const currentWards = filters.wardNo || [];
                                          const currentParts = filters.partNo || [];

                                          if (e.target.checked) {
                                            // Add ward - parts will be auto-selected by useEffect
                                            setFilters(prev => ({
                                              ...prev,
                                              wardNo: [...currentWards, wardNo]
                                            }));
                                          } else {
                                            // Remove ward and all its parts
                                            const newWards = currentWards.filter(w => w !== wardNo);
                                            const newParts = currentParts.filter(p => !wardParts.includes(p));

                                            // Remove from processed wards so it can be re-processed if selected again
                                            setProcessedWards(prev => {
                                              const newSet = new Set(prev);
                                              newSet.delete(wardNo);
                                              return newSet;
                                            });

                                            setFilters(prev => ({
                                              ...prev,
                                              wardNo: newWards,
                                              partNo: newParts
                                            }));
                                          }
                                        }}
                                      />
                                      <span className="text-sm font-medium">Ward {wardNo}</span>
                                      {wardParts.length > 0 && (
                                        <span className="text-xs text-muted-foreground ml-auto">
                                          ({wardParts.length} parts)
                                        </span>
                                      )}
                                    </div>

                                    {/* Part No sub-items for this ward */}
                                    {filters.wardNo?.includes(wardNo) && wardParts.length > 0 && (
                                      <div className="ml-6 space-y-1 border-l-2 border-muted pl-3">
                                        {wardParts.map((partNo) => (
                                          <div
                                            key={partNo}
                                            className="flex items-center space-x-2 cursor-pointer p-1.5 rounded hover:bg-accent/50"
                                          >
                                            <Checkbox
                                              checked={filters.partNo?.includes(partNo) || false}
                                              onChange={(e) => {
                                                const currentParts = filters.partNo || [];
                                                if (e.target.checked) {
                                                  setFilters(prev => ({
                                                    ...prev,
                                                    partNo: [...currentParts, partNo]
                                                  }));
                                                } else {
                                                  // If unchecking a part, also uncheck the ward if all parts are now unchecked
                                                  const newParts = currentParts.filter(p => p !== partNo);
                                                  const remainingWardParts = wardParts.filter(p => newParts.includes(p));

                                                  setFilters(prev => ({
                                                    ...prev,
                                                    partNo: newParts,
                                                    wardNo: remainingWardParts.length === 0
                                                      ? (prev.wardNo || []).filter(w => w !== wardNo)
                                                      : prev.wardNo
                                                  }));
                                                }
                                              }}
                                            />
                                            <span className="text-xs">Part {partNo}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-xs text-muted-foreground p-2">
                                {searchTerm ? 'No wards found' : 'No wards available'}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Part No Section - Independent Selection */}
                        <div className="border-t pt-4">
                          <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">Part No</div>
                          {loadingParts ? (
                            <div className="text-xs text-muted-foreground p-2">Loading parts...</div>
                          ) : (
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                              {filteredPartNumbers.length > 0 ? (
                                filteredPartNumbers.map((partNo) => {
                                  const isSelected = filters.partNo?.includes(partNo) || false;
                                  // Find which ward this part belongs to (if any)
                                  const wardForPart = Object.keys(partsByWard).find(ward =>
                                    partsByWard[ward]?.includes(partNo)
                                  );

                                  return (
                                    <div
                                      key={partNo}
                                      className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-accent"
                                    >
                                      <Checkbox
                                        checked={isSelected}
                                        onChange={(e) => {
                                          const currentParts = filters.partNo || [];
                                          if (e.target.checked) {
                                            setFilters(prev => ({
                                              ...prev,
                                              partNo: [...currentParts, partNo]
                                            }));
                                          } else {
                                            const newParts = currentParts.filter(p => p !== partNo);
                                            setFilters(prev => ({
                                              ...prev,
                                              partNo: newParts
                                            }));
                                          }
                                        }}
                                      />
                                      <span className="text-sm">Part {partNo}</span>
                                      {wardForPart && (
                                        <span className="text-xs text-muted-foreground ml-auto">
                                          (Ward {wardForPart})
                                        </span>
                                      )}
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="text-xs text-muted-foreground p-2">
                                  {searchTerm ? 'No parts found' : 'No parts available'}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {(filters.wardNo && filters.wardNo.length > 0) || (filters.partNo && filters.partNo.length > 0) ? (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {filters.wardNo?.map((wardNo) => (
                        <Badge key={wardNo} variant="default" className="text-xs">
                          Ward {wardNo}
                        </Badge>
                      ))}
                      {filters.partNo?.map((partNo) => (
                        <Badge key={partNo} variant="secondary" className="text-xs">
                          Part {partNo}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="gender" className="text-xs text-muted-foreground">Gender</Label>
                  <Select
                    value={filters.gender || 'all'}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, gender: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="M">Male</SelectItem>
                      <SelectItem value="F">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="religion" className="text-xs text-muted-foreground">Religion</Label>
                  <Select
                    value={filters.religion || 'all'}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, religion: value }))}
                    disabled={loadingReligions}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingReligions ? "Loading..." : "All"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {religions.map((religion) => (
                        <SelectItem key={religion} value={religion}>
                          {religion}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="minAge" className="text-xs text-muted-foreground">Min Age</Label>
                  <Input
                    id="minAge"
                    type="number"
                    placeholder="18"
                    min={18}
                    max={120}
                    value={filters.minAge || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, minAge: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="maxAge" className="text-xs text-muted-foreground">Max Age</Label>
                  <Input
                    id="maxAge"
                    type="number"
                    placeholder="100"
                    min={18}
                    max={120}
                    value={filters.maxAge || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxAge: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="hasPhone" className="text-xs text-muted-foreground">Phone Available</Label>
                  <Select
                    value={filters.hasPhone || 'all'}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, hasPhone: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="yes">With Phone</SelectItem>
                      <SelectItem value="no">Without Phone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="isVoted2024" className="text-xs text-muted-foreground">Is Voted 2024</Label>
                  <Select
                    value={filters.isVoted2024 || 'all'}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, isVoted2024: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="yes">Voted</SelectItem>
                      <SelectItem value="no">Not Voted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Column Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Select Columns to Export</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between h-10"
                  >
                    <span className="truncate">
                      {selectedColumns.length === DEFAULT_COLUMNS.length
                        ? 'All Columns Selected'
                        : `${selectedColumns.length} of ${DEFAULT_COLUMNS.length} columns selected`}
                    </span>
                    <ChevronDown className="size-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto">
                  <div className="p-2 space-y-2">
                    <div className="flex items-center justify-between px-2 pb-2 border-b">
                      <span className="text-xs font-semibold text-muted-foreground">Columns</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedColumns(DEFAULT_COLUMNS)}
                          className="text-xs text-primary hover:underline"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedColumns([])}
                          className="text-xs text-primary hover:underline"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {AVAILABLE_COLUMNS.map((column) => {
                        const isSelected = selectedColumns.includes(column.key);
                        return (
                          <div
                            key={column.key}
                            className="flex items-center space-x-2 p-2 rounded hover:bg-accent"
                          >
                            <Checkbox
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedColumns(prev => [...prev, column.key]);
                                } else {
                                  setSelectedColumns(prev => prev.filter(key => key !== column.key));
                                }
                              }}
                            />
                            <label
                              htmlFor={`column-${column.key}`}
                              className="text-sm cursor-pointer flex-1"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedColumns(prev => prev.filter(key => key !== column.key));
                                } else {
                                  setSelectedColumns(prev => [...prev, column.key]);
                                }
                              }}
                            >
                              {column.label}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              {selectedColumns.length > 0 && selectedColumns.length < DEFAULT_COLUMNS.length && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedColumns.map((colKey) => {
                    const column = AVAILABLE_COLUMNS.find(c => c.key === colKey);
                    return column ? (
                      <Badge key={colKey} variant="secondary" className="text-xs">
                        {column.label}
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            {/* Start Export Button */}
            <div className="flex items-center gap-4">
              <Button
                onClick={handleStartExport}
                disabled={isExporting}
                size="lg"
                className="gap-2"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Starting Export...
                  </>
                ) : (
                  <>
                    <Download className="size-4" />
                    Start Export
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilters({});
                  setSelectedColumns(DEFAULT_COLUMNS);
                }}
                className="text-muted-foreground"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Export Jobs History */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Export History</CardTitle>
                <CardDescription>Your recent export jobs and their status</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchJobs}
                disabled={loadingJobs}
                className="gap-2"
              >
                <RefreshCw className={`size-4 ${loadingJobs ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingJobs && jobs.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="size-5 animate-spin mr-2" />
                Loading export history...
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileDown className="size-12 mx-auto mb-3 opacity-30" />
                <p>No exports yet. Start your first export above!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                  >
                    {/* Format Icon */}
                    <div className={`p-2.5 rounded-lg ${job.format === 'pdf'
                      ? 'bg-rose-100 text-rose-600'
                      : job.format === 'excel'
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-blue-100 text-blue-600'
                      }`}>
                      {getFormatIcon(job.format)}
                    </div>

                    {/* Job Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {job.fileName || `${job.type}_export.${job.format}`}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase">
                          {job.format}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          {getStatusIcon(job.status)}
                          {getStatusText(job.status)}
                          {job.status === 'processing' && job.progress > 0 && (
                            <span className="ml-1">({job.progress}%)</span>
                          )}
                        </span>
                        {job.totalRecords && (
                          <span>• {job.totalRecords.toLocaleString()} records</span>
                        )}
                        {job.fileSizeKb && (
                          <span>• {job.fileSizeKb} KB</span>
                        )}
                        <span>• {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</span>
                      </div>

                      {/* Progress Bar */}
                      {(job.status === 'processing' || job.status === 'pending') && (
                        <div className="mt-2">
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-500 ease-out"
                              style={{ width: `${job.progress || 0}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Error Message */}
                      {job.status === 'failed' && job.errorMessage && (
                        <p className="text-sm text-red-500 mt-1">{job.errorMessage}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {job.status === 'completed' && job.fileUrl && (
                        <Button
                          variant="default"
                          size="sm"
                          asChild
                          className="gap-1.5"
                        >
                          <a href={job.fileUrl} target="_blank" rel="noopener noreferrer" download>
                            <Download className="size-4" />
                            Download
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteJob(job.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
