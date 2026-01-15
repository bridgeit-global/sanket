'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { TrendingUp, Users, Target, Repeat } from 'lucide-react';

interface VotingPatterns {
  byElection: Array<{
    electionId: string;
    year: number;
    electionType: string;
    totalVoters: number;
    voted: number;
    turnout: number;
  }>;
  byReligion: Array<{
    religion: string | null;
    totalVoters: number;
    avgTurnout: number;
    totalElections: number;
  }>;
  byCaste: Array<{
    caste: string | null;
    totalVoters: number;
    avgTurnout: number;
    totalElections: number;
  }>;
  repeatVoters: {
    totalVoters: number;
    alwaysVoted: number;
    neverVoted: number;
    sometimesVoted: number;
  };
}

interface VotingPatternsInfographicsProps {
  electionId: string;
  partNo?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function VotingPatternsInfographics({
  electionId,
  partNo,
}: VotingPatternsInfographicsProps) {
  const [patterns, setPatterns] = useState<VotingPatterns | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchPatterns = async () => {
      if (!electionId) return;
      
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ electionId });
        if (partNo) params.append('partNo', partNo);

        const response = await fetch(`/api/voting-participation/patterns?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch patterns');
        }

        const data = await response.json();
        if (data.success) {
          setPatterns(data.patterns);
        }
      } catch (error) {
        console.error('Error fetching voting patterns:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatterns();
  }, [electionId, partNo]);

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">Loading patterns...</div>
    );
  }

  if (!patterns || patterns.byElection.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No voting history available for analysis
      </div>
    );
  }

  // Prepare data for charts
  const turnoutTrendData = patterns.byElection.map((e) => ({
    year: e.year,
    turnout: Math.round(e.turnout * 100) / 100,
    election: `${e.electionType} ${e.year}`,
  }));

  const religionData = patterns.byReligion
    .slice(0, 10)
    .map((r) => ({
      name: r.religion || 'Unknown',
      turnout: Math.round(r.avgTurnout * 100) / 100,
      voters: r.totalVoters,
    }));

  const casteData = patterns.byCaste
    .slice(0, 10)
    .map((c) => ({
      name: c.caste || 'Unknown',
      turnout: Math.round(c.avgTurnout * 100) / 100,
      voters: c.totalVoters,
    }));

  const repeatVotersData = [
    { name: 'Always Voted', value: patterns.repeatVoters.alwaysVoted, color: '#00C49F' },
    { name: 'Sometimes Voted', value: patterns.repeatVoters.sometimesVoted, color: '#FFBB28' },
    { name: 'Never Voted', value: patterns.repeatVoters.neverVoted, color: '#FF8042' },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Elections</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patterns.byElection.length}</div>
            <p className="text-xs text-muted-foreground">
              Historical elections analyzed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Turnout</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(
                (patterns.byElection.reduce((sum, e) => sum + e.turnout, 0) /
                  patterns.byElection.length) *
                  100
              ) / 100}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              Across all elections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Religious Groups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patterns.byReligion.length}</div>
            <p className="text-xs text-muted-foreground">
              Different religions tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Always Voted</CardTitle>
            <Repeat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {patterns.repeatVoters.alwaysVoted}
            </div>
            <p className="text-xs text-muted-foreground">
              {patterns.repeatVoters.totalVoters > 0
                ? Math.round(
                    (patterns.repeatVoters.alwaysVoted /
                      patterns.repeatVoters.totalVoters) *
                      100
                  )
                : 0}
              % of voters
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Turnout Trend Chart */}
      {turnoutTrendData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Voting Turnout Trend</CardTitle>
            <CardDescription>
              Historical voting participation across previous elections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={turnoutTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis domain={[0, 100]} />
                <Tooltip
                  formatter={(value: number | undefined) => value !== undefined ? `${value.toFixed(2)}%` : '0%'}
                  labelFormatter={(label) => `Year: ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="turnout"
                  stroke="#0088FE"
                  strokeWidth={2}
                  name="Turnout %"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Religion Analysis */}
        {religionData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Participation by Religion</CardTitle>
              <CardDescription>Average turnout by religious groups</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={religionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip
                    formatter={(value: number | undefined) => value !== undefined ? `${value.toFixed(2)}%` : '0%'}
                  />
                  <Legend />
                  <Bar dataKey="turnout" fill="#8884d8" name="Avg Turnout %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Caste Analysis */}
        {casteData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Participation by Caste</CardTitle>
              <CardDescription>Average turnout by caste groups</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={casteData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip
                    formatter={(value: number | undefined) => value !== undefined ? `${value.toFixed(2)}%` : '0%'}
                  />
                  <Legend />
                  <Bar dataKey="turnout" fill="#82ca9d" name="Avg Turnout %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Repeat Voters */}
      {repeatVotersData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Voter Participation Patterns</CardTitle>
            <CardDescription>
              Classification of voters based on historical participation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={repeatVotersData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${percent !== undefined ? (percent * 100).toFixed(0) : 0}%`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {repeatVotersData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>

              <div className="space-y-4 flex flex-col justify-center">
                {repeatVotersData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{item.value}</div>
                      <div className="text-xs text-muted-foreground">
                        {patterns.repeatVoters.totalVoters > 0
                          ? Math.round(
                              (item.value / patterns.repeatVoters.totalVoters) * 100
                            )
                          : 0}
                        %
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}