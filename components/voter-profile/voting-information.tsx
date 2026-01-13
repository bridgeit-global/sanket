'use client';

import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import type { VotingHistory } from '@/lib/db/schema';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

interface VotingHistoryWithBooth extends VotingHistory {
  boothName: string | null;
  boothAddress: string | null;
  boothNo: string | null;
  srNo: string | null;
}

interface VotingInformationProps {
  epicNumber: string;
}

export function VotingInformation({ epicNumber }: VotingInformationProps) {
  const [votingHistory, setVotingHistory] = useState<VotingHistoryWithBooth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVotingHistory = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/voting-participation/history/${encodeURIComponent(epicNumber)}`);

        if (!response.ok) {
          setError('Failed to load voting history');
          return;
        }

        const data = await response.json();
        if (data.success) {
          setVotingHistory(data.history || []);
        } else {
          setError('Failed to load voting history');
        }
      } catch (err) {
        console.error('Error fetching voting history:', err);
        setError('Failed to load voting history');
      } finally {
        setLoading(false);
      }
    };

    fetchVotingHistory();
  }, [epicNumber]);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Calendar className="h-4 w-4" />
        Voting Information
      </h3>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading voting history...</div>
      ) : error ? (
        <div className="text-sm text-destructive">{error}</div>
      ) : votingHistory.length > 0 ? (
        <Accordion type="multiple">
          {votingHistory.map((record) => (
            <AccordionItem key={record.id} value={String(record.id)}>
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Election: {record.electionId}</span>
                  <Badge variant={record.hasVoted ? 'default' : 'secondary'}>
                    {record.hasVoted ? 'Voted' : 'Not Voted'}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  {record.notes && (
                    <p className="text-sm text-muted-foreground">{record.notes}</p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {record.boothNo && (
                      <div>
                        <span className="font-medium text-muted-foreground">Booth Number</span>
                        <p className="mt-1">{record.boothNo}</p>
                      </div>
                    )}
                    {record.srNo && (
                      <div>
                        <span className="font-medium text-muted-foreground">Serial Number</span>
                        <p className="mt-1">{record.srNo}</p>
                      </div>
                    )}
                    {record.boothName && (
                      <div>
                        <span className="font-medium text-muted-foreground">Booth Name</span>
                        <p className="mt-1">{record.boothName}</p>
                      </div>
                    )}
                    {record.boothAddress && (
                      <div className="md:col-span-2">
                        <span className="font-medium text-muted-foreground">Booth Address</span>
                        <p className="mt-1">{record.boothAddress}</p>
                      </div>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <div className="text-sm text-muted-foreground">No voting history available</div>
      )}
    </div>
  );
}
