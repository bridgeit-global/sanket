'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/toast';
import { Upload, FileText } from 'lucide-react';

export function BulkVoteMark() {
  const [electionId, setElectionId] = useState('LS2024');
  const [csvData, setCsvData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvData(text);
    };
    reader.readAsText(file);
  };

  const handleProcessBulk = async () => {
    if (!csvData.trim()) {
      toast.error('Please upload a CSV file or paste CSV data');
      return;
    }

    setIsProcessing(true);
    try {
      // Parse CSV data
      const lines = csvData.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());

      const epicIndex = headers.findIndex(h => h.toLowerCase().includes('epic'));
      const electionIndex = headers.findIndex(h => h.toLowerCase().includes('election'));
      const votedIndex = headers.findIndex(h => h.toLowerCase().includes('voted') || h.toLowerCase().includes('has_voted'));

      if (epicIndex === -1) {
        toast.error('CSV must contain an EPIC number column');
        return;
      }

      const votes = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        return {
          epicNumber: values[epicIndex],
          electionId: electionIndex !== -1 ? values[electionIndex] : electionId,
          hasVoted: votedIndex !== -1 ? values[votedIndex].toLowerCase() === 'true' || values[votedIndex] === '1' : false,
        };
      }).filter(v => v.epicNumber);

      if (votes.length === 0) {
        toast.error('No valid votes found in CSV');
        return;
      }

      const response = await fetch('/api/voting-participation/bulk-mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ votes }),
      });

      if (!response.ok) {
        throw new Error('Failed to process bulk marking');
      }

      const data = await response.json();
      if (data.success) {
        toast.success(`Successfully marked ${data.count} votes`);
        setCsvData('');
      }
    } catch (error) {
      console.error('Error processing bulk marking:', error);
      toast.error('Failed to process bulk marking');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Vote Marking</CardTitle>
        <CardDescription>
          Upload a CSV file or paste CSV data to mark votes in bulk. CSV should have columns: epicNumber, electionId (optional), hasVoted
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="electionId">Default Election</Label>
          <Select value={electionId} onValueChange={setElectionId}>
            <SelectTrigger id="electionId">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LS2024">Lok Sabha 2024</SelectItem>
              <SelectItem value="AE2024">Assembly Election 2024</SelectItem>
              <SelectItem value="LE2024">Local Election 2024</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="file">Upload CSV File</Label>
          <div className="flex items-center gap-2">
            <Input
              id="file"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="flex-1"
            />
            <Upload className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="csvData">Or Paste CSV Data</Label>
          <Textarea
            id="csvData"
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            placeholder="epicNumber,electionId,hasVoted&#10;ABC123,LS2024,true&#10;XYZ789,LS2024,false"
            rows={10}
            className="font-mono text-sm"
          />
        </div>

        <Button
          onClick={handleProcessBulk}
          disabled={!csvData.trim() || isProcessing}
          className="w-full"
        >
          {isProcessing ? 'Processing...' : 'Process Bulk Marking'}
        </Button>

        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm font-semibold mb-2">CSV Format:</p>
          <pre className="text-xs font-mono">
            {`epicNumber,electionId,hasVoted
ABC123,LS2024,true
XYZ789,LS2024,false`}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
