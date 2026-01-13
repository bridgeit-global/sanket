'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SingleVoterMark } from '@/components/single-voter-mark';
import { BulkVoteMark } from '@/components/bulk-vote-mark';
import { VotingStatistics } from '@/components/voting-statistics';

export function VotingParticipation() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Voting Participation</h1>
          <p className="text-muted-foreground">
            Mark and track voting participation for elections
          </p>
        </div>
      </div>

      <Tabs defaultValue="single" className="space-y-4">
        <TabsList>
          <TabsTrigger value="single">Single Voter</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Marking</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-4">
          <SingleVoterMark />
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <BulkVoteMark />
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          <VotingStatistics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
