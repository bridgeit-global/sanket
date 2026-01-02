import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { auth } from '@/app/(auth)/auth';
import {
  createExportJob,
  getExportJobsByUser,
  updateExportJobProgress,
  getVotersForExport,
  getVotersCountForExport,
  hasModuleAccess,
  getVoterMobileNumbersByEpicNumbers,
} from '@/lib/db/queries';
import { format } from 'date-fns';

// GET - List export jobs for current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await hasModuleAccess(session.user.id, 'back-office');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get('limit') || '10');

    const jobs = await getExportJobsByUser(session.user.id, limit);
    return NextResponse.json(jobs);
  } catch (error) {
    console.error('Error fetching export jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch export jobs' },
      { status: 500 }
    );
  }
}

// POST - Create a new export job
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await hasModuleAccess(session.user.id, 'back-office');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { type, format: exportFormat, filters } = body;

    if (!type || !exportFormat) {
      return NextResponse.json(
        { error: 'Missing required fields: type, format' },
        { status: 400 }
      );
    }

    if (!['pdf', 'excel', 'csv'].includes(exportFormat)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be pdf, excel, or csv' },
        { status: 400 }
      );
    }

    // Create the export job
    const job = await createExportJob({
      type,
      format: exportFormat,
      filters,
      createdBy: session.user.id,
    });

    // Start the export process asynchronously (fire and forget)
    processExport(job.id, type, exportFormat, filters).catch((error) => {
      console.error('Export processing error:', error);
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error('Error creating export job:', error);
    return NextResponse.json(
      { error: 'Failed to create export job' },
      { status: 500 }
    );
  }
}

// Process export job in background
async function processExport(
  jobId: string,
  type: string,
  exportFormat: string,
  filters?: Record<string, unknown>
) {
  try {
    // Update status to processing
    await updateExportJobProgress({
      id: jobId,
      status: 'processing',
      progress: 0,
    });

    // Get total count for progress tracking
    const totalRecords = await getVotersCountForExport(filters as any);
    await updateExportJobProgress({
      id: jobId,
      totalRecords,
      progress: 5,
    });

    // Fetch data
    const voters = await getVotersForExport(filters as any);
    await updateExportJobProgress({
      id: jobId,
      progress: 20,
      processedRecords: 0,
    });

    // Fetch all mobile numbers from VoterMobileNumber table
    const epicNumbers = voters.map(v => v.epicNumber);
    const mobileNumbersMap = await getVoterMobileNumbersByEpicNumbers(epicNumbers);

    // Check if mobile columns are selected
    const selectedColumns = (filters?.selectedColumns as string[]) || [];
    const hasMobileColumn = selectedColumns.length === 0 ||
      selectedColumns.includes('mobileNumber') ||
      selectedColumns.includes('mobileSortOrder');

    // Expand rows for each phone number if mobile columns are selected
    let exportData: any[];
    if (hasMobileColumn) {
      exportData = [];
      for (const voter of voters) {
        const mobileNumbers = mobileNumbersMap.get(voter.epicNumber) || [];
        if (mobileNumbers.length === 0) {
          // No phone numbers - add single row with empty mobile fields
          exportData.push({
            ...voter,
            mobileNumber: '',
            mobileSortOrder: null,
          });
        } else {
          // Add one row per phone number
          for (const mobile of mobileNumbers) {
            exportData.push({
              ...voter,
              mobileNumber: mobile.mobileNumber,
              mobileSortOrder: mobile.sortOrder,
            });
          }
        }
      }
    } else {
      // No mobile columns selected - keep original data
      exportData = voters.map(voter => ({
        ...voter,
        mobileNumber: '',
        mobileSortOrder: null,
      }));
    }

    await updateExportJobProgress({
      id: jobId,
      progress: 30,
      processedRecords: 0,
    });

    let fileContent: Buffer | string;
    let fileName: string;
    let contentType: string;

    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');

    // Use selectedColumns already defined above, convert empty array to undefined for default behavior
    const columnsToExport = selectedColumns.length > 0 ? selectedColumns : undefined;

    if (exportFormat === 'csv') {
      // Generate CSV
      fileContent = generateCSV(exportData, columnsToExport);
      fileName = `voters_export_${timestamp}.csv`;
      contentType = 'text/csv';
    } else if (exportFormat === 'excel') {
      // Generate Excel-compatible CSV (with BOM for UTF-8)
      const csvContent = generateCSV(exportData, columnsToExport);
      // Add BOM for Excel UTF-8 compatibility
      fileContent = `\ufeff${csvContent}`;
      fileName = `voters_export_${timestamp}.csv`;
      contentType = 'text/csv; charset=utf-8';
    } else {
      // Generate HTML for PDF-like export
      fileContent = generateHTMLReport(exportData, filters, columnsToExport);
      fileName = `voters_export_${timestamp}.html`;
      contentType = 'text/html';
    }

    await updateExportJobProgress({
      id: jobId,
      progress: 70,
      processedRecords: exportData.length,
    });

    // Upload to Vercel Blob
    const blob = await put(`exports/${fileName}`, fileContent, {
      access: 'public',
      contentType,
    });

    // Calculate file size
    const contentBuffer = typeof fileContent === 'string'
      ? Buffer.from(fileContent, 'utf-8')
      : fileContent;
    const fileSizeKb = Math.round(contentBuffer.length / 1024);

    // Update job as completed
    await updateExportJobProgress({
      id: jobId,
      status: 'completed',
      progress: 100,
      processedRecords: exportData.length,
      fileUrl: blob.url,
      fileName,
      fileSizeKb,
    });
  } catch (error) {
    console.error('Export processing failed:', error);
    await updateExportJobProgress({
      id: jobId,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Column mapping for export
const COLUMN_MAP: Record<string, { header: string; getValue: (voter: any) => string }> = {
  epicNumber: { header: 'EPIC Number', getValue: (v) => v.epicNumber || '' },
  fullName: { header: 'Full Name', getValue: (v) => v.fullName || '' },
  relationType: { header: 'Relation Type', getValue: (v) => v.relationType || '' },
  relationName: { header: 'Relation Name', getValue: (v) => v.relationName || '' },
  age: { header: 'Age', getValue: (v) => v.age?.toString() || '' },
  gender: { header: 'Gender', getValue: (v) => v.gender || '' },
  mobileNumber: { header: 'Mobile Number', getValue: (v) => v.mobileNumber || '' },
  mobileSortOrder: { header: 'Mobile Sort Order', getValue: (v) => v.mobileSortOrder?.toString() || '' },
  houseNumber: { header: 'House Number', getValue: (v) => v.houseNumber || '' },
  address: { header: 'Address', getValue: (v) => v.address || '' },
  pincode: { header: 'Pincode', getValue: (v) => v.pincode || '' },
  acNo: { header: 'AC No', getValue: (v) => v.acNo || '' },
  wardNo: { header: 'Ward No', getValue: (v) => v.wardNo || '' },
  partNo: { header: 'Part No', getValue: (v) => v.partNo || '' },
  boothName: { header: 'Booth Name', getValue: (v) => v.boothName || '' },
  religion: { header: 'Religion', getValue: (v) => v.religion || '' },
  isVoted2024: { header: 'Voted 2024', getValue: (v) => v.isVoted2024 ? 'Yes' : 'No' },
};

// Default columns (all columns)
const DEFAULT_COLUMNS = Object.keys(COLUMN_MAP);

function generateCSV(voters: any[], selectedColumns?: string[]): string {
  const columnsToExport = selectedColumns && selectedColumns.length > 0
    ? selectedColumns.filter(col => COLUMN_MAP[col])
    : DEFAULT_COLUMNS;

  const headers = columnsToExport.map(col => COLUMN_MAP[col].header);
  const rows = voters.map((voter) =>
    columnsToExport.map(col => COLUMN_MAP[col].getValue(voter))
  );

  const csvRows = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ),
  ];

  return csvRows.join('\n');
}

function generateHTMLReport(voters: any[], filters?: Record<string, unknown>, selectedColumns?: string[]): string {
  const filterDesc = filters
    ? Object.entries(filters)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')
    : 'All Records';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Voter Export Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', system-ui, sans-serif; 
      line-height: 1.5; 
      color: #1a1a1a;
      background: #f8fafc;
      padding: 2rem;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    .header { 
      background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
      color: white; 
      padding: 2rem; 
      border-radius: 12px;
      margin-bottom: 2rem;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }
    .header h1 { font-size: 1.75rem; font-weight: 600; margin-bottom: 0.5rem; }
    .header .meta { opacity: 0.9; font-size: 0.875rem; }
    .summary { 
      display: grid; 
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
      gap: 1rem; 
      margin-bottom: 2rem; 
    }
    .summary-card { 
      background: white; 
      padding: 1.5rem; 
      border-radius: 10px;
      box-shadow: 0 1px 3px rgb(0 0 0 / 0.1);
    }
    .summary-card .label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    .summary-card .value { font-size: 1.5rem; font-weight: 700; color: #1e3a5f; }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      background: white;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgb(0 0 0 / 0.1);
    }
    th { 
      background: #f1f5f9; 
      font-weight: 600; 
      text-align: left; 
      padding: 1rem;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #475569;
      border-bottom: 2px solid #e2e8f0;
    }
    td { 
      padding: 0.875rem 1rem; 
      border-bottom: 1px solid #f1f5f9;
      font-size: 0.875rem;
    }
    tr:hover { background: #f8fafc; }
    tr:last-child td { border-bottom: none; }
    .badge { 
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .badge-m { background: #dbeafe; color: #1e40af; }
    .badge-f { background: #fce7f3; color: #9d174d; }
    .badge-voted { background: #dcfce7; color: #166534; }
    .badge-not-voted { background: #fee2e2; color: #991b1b; }
    @media print {
      body { background: white; padding: 0; }
      .header { 
        background: #1e3a5f !important; 
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Voter Export Report</h1>
      <div class="meta">Generated on ${format(new Date(), 'PPpp')} | Filters: ${filterDesc}</div>
    </div>
    
    <div class="summary">
      <div class="summary-card">
        <div class="label">Total Records</div>
        <div class="value">${voters.length.toLocaleString()}</div>
      </div>
      <div class="summary-card">
        <div class="label">Male</div>
        <div class="value">${voters.filter(v => v.gender === 'M').length.toLocaleString()}</div>
      </div>
      <div class="summary-card">
        <div class="label">Female</div>
        <div class="value">${voters.filter(v => v.gender === 'F').length.toLocaleString()}</div>
      </div>
      <div class="summary-card">
        <div class="label">With Phone</div>
        <div class="value">${voters.filter(v => v.mobileNumber).length.toLocaleString()}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          ${(() => {
      const columnsToExport = selectedColumns && selectedColumns.length > 0
        ? selectedColumns.filter(col => COLUMN_MAP[col])
        : DEFAULT_COLUMNS;
      return columnsToExport.map(col => `<th>${COLUMN_MAP[col].header}</th>`).join('');
    })()}
        </tr>
      </thead>
      <tbody>
        ${voters.map((voter, idx) => {
      const columnsToExport = selectedColumns && selectedColumns.length > 0
        ? selectedColumns.filter(col => COLUMN_MAP[col])
        : DEFAULT_COLUMNS;

      const cells = columnsToExport.map(col => {
        const value = COLUMN_MAP[col].getValue(voter);
        // Format special columns
        if (col === 'epicNumber') {
          return `<td><code>${value || '-'}</code></td>`;
        }
        if (col === 'fullName') {
          return `<td><strong>${value || '-'}</strong></td>`;
        }
        if (col === 'gender') {
          return `<td><span class="badge badge-${(value || '').toLowerCase()}">${value || '-'}</span></td>`;
        }
        if (col === 'isVoted2024') {
          const isVoted = voter.isVoted2024;
          return `<td><span class="badge ${isVoted ? 'badge-voted' : 'badge-not-voted'}">${isVoted ? 'Yes' : 'No'}</span></td>`;
        }
        return `<td>${value || '-'}</td>`;
      }).join('');

      return `<tr><td>${idx + 1}</td>${cells}</tr>`;
    }).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`;
}
