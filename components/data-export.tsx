'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  FileDown
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
  partNo?: string;
  wardNo?: string;
  acNo?: string;
  gender?: string;
  minAge?: string;
  maxAge?: string;
  hasPhone?: string;
}

export function DataExport() {
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv' | 'pdf'>('excel');
  const [filters, setFilters] = useState<ExportFilters>({});
  const [isExporting, setIsExporting] = useState(false);
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

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
  }, [fetchJobs, jobs.length]);

  // Initial fetch
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleStartExport = async () => {
    setIsExporting(true);
    try {
      // Prepare filters
      const exportFilters: Record<string, unknown> = {};
      if (filters.partNo) exportFilters.partNo = filters.partNo;
      if (filters.wardNo) exportFilters.wardNo = filters.wardNo;
      if (filters.acNo) exportFilters.acNo = filters.acNo;
      if (filters.gender && filters.gender !== 'all') exportFilters.gender = filters.gender;
      if (filters.minAge) exportFilters.minAge = Number.parseInt(filters.minAge);
      if (filters.maxAge) exportFilters.maxAge = Number.parseInt(filters.maxAge);
      if (filters.hasPhone && filters.hasPhone !== 'all') {
        exportFilters.hasPhone = filters.hasPhone === 'yes';
      }

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
    <div className="space-y-6">
      {/* Export Configuration Card */}
      <Card className="border-dashed border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDown className="size-5 text-primary" />
            Export Data
          </CardTitle>
          <CardDescription>
            Export voter data in PDF or Excel format. Large exports run in the background.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Export Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Format</Label>
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
                  <div className="font-medium">Excel</div>
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
                  <div className="font-medium">CSV</div>
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
              <div>
                <Label htmlFor="partNo" className="text-xs text-muted-foreground">Part No</Label>
                <Input
                  id="partNo"
                  placeholder="e.g., 1"
                  value={filters.partNo || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, partNo: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="wardNo" className="text-xs text-muted-foreground">Ward No</Label>
                <Input
                  id="wardNo"
                  placeholder="e.g., 5"
                  value={filters.wardNo || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, wardNo: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="acNo" className="text-xs text-muted-foreground">AC No</Label>
                <Input
                  id="acNo"
                  placeholder="e.g., 123"
                  value={filters.acNo || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, acNo: e.target.value }))}
                />
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
            </div>
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
              onClick={() => setFilters({})}
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
  );
}
