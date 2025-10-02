'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

interface VoterInsightsProps {
  data: {
    query: string;
    analysisType: string;
    summary: string;
    totalVoters?: number;
    voters?: Array<{
      epicNumber: string;
      fullName: string;
      age?: number;
      gender?: string;
      partNo?: string;
      wardNo?: string;
      acNo?: string;
      boothName?: string;
      isVoted2024?: boolean;
      englishBoothAddress?: string;
    }>;
    demographics?: {
      totalVoters: number;
      maleCount: number;
      femaleCount: number;
      otherGenderCount: number;
      averageAge: number;
      ageGroups: Array<{ range: string; count: number }>;
    };
    votingStats?: {
      totalVoters: number;
      voted2024: number;
      notVoted2024: number;
      votingRate: string;
    };
    geographicDistribution?: Record<string, number>;
    boothDistribution?: Record<string, { count: number; address: string }>;
    statistics?: {
      totalVoters: number;
      votingRate: string;
      genderDistribution: { male: number; female: number; other: number };
      averageAge: number;
      ageGroups: Array<{ range: string; count: number }>;
    };
    error?: string;
    location?: string;
    boothInfo?: {
      voters: any[];
      address: string;
    };
    totalBooths?: number;
    filters?: {
      gender?: string;
      ageRange?: string;
    };
  };
}

export function VoterInsights({ data }: VoterInsightsProps) {
  if (data.error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800">Analysis Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{data.error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 Voter Analysis Results
            <Badge variant="secondary">{data.analysisType.replace('_', ' ').toUpperCase()}</Badge>
          </CardTitle>
          <CardDescription>{data.query}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-medium text-primary">{data.summary}</p>
        </CardContent>
      </Card>

      {/* Demographics */}
      {data.demographics && (
        <Card>
          <CardHeader>
            <CardTitle>👥 Demographics Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{data.demographics.totalVoters}</div>
                <div className="text-sm text-muted-foreground">Total Voters</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{data.demographics.maleCount}</div>
                <div className="text-sm text-muted-foreground">Male</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-pink-600">{data.demographics.femaleCount}</div>
                <div className="text-sm text-muted-foreground">Female</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{data.demographics.averageAge}</div>
                <div className="text-sm text-muted-foreground">Avg Age</div>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold mb-2">Age Groups Distribution</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {data.demographics.ageGroups.map((group) => (
                  <div key={group.range} className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm">{group.range}</span>
                    <Badge variant="outline">{group.count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voting Statistics */}
      {data.votingStats && (
        <Card>
          <CardHeader>
            <CardTitle>🗳️ 2024 Voting Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{data.votingStats.totalVoters}</div>
                <div className="text-sm text-muted-foreground">Total Voters</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{data.votingStats.voted2024}</div>
                <div className="text-sm text-muted-foreground">Voted</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{data.votingStats.notVoted2024}</div>
                <div className="text-sm text-muted-foreground">Not Voted</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{data.votingStats.votingRate}</div>
                <div className="text-sm text-muted-foreground">Voting Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* General Statistics */}
      {data.statistics && (
        <Card>
          <CardHeader>
            <CardTitle>📈 Constituency Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{data.statistics.totalVoters}</div>
                <div className="text-sm text-muted-foreground">Total Voters</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{data.statistics.votingRate}</div>
                <div className="text-sm text-muted-foreground">Voting Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{data.statistics.averageAge}</div>
                <div className="text-sm text-muted-foreground">Avg Age</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{data.statistics.genderDistribution.male + data.statistics.genderDistribution.female}</div>
                <div className="text-sm text-muted-foreground">Male + Female</div>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold mb-2">Gender Distribution</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded">
                  <div className="text-xl font-bold text-blue-600">{data.statistics.genderDistribution.male}</div>
                  <div className="text-sm text-blue-800">Male</div>
                </div>
                <div className="text-center p-3 bg-pink-50 rounded">
                  <div className="text-xl font-bold text-pink-600">{data.statistics.genderDistribution.female}</div>
                  <div className="text-sm text-pink-800">Female</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded">
                  <div className="text-xl font-bold text-purple-600">{data.statistics.genderDistribution.other}</div>
                  <div className="text-sm text-purple-800">Other</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Geographic Distribution */}
      {data.geographicDistribution && (
        <Card>
          <CardHeader>
            <CardTitle>🗺️ Geographic Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(data.geographicDistribution).map(([ac, count]) => (
                <div key={ac} className="flex justify-between items-center p-3 bg-muted rounded">
                  <span className="font-medium">AC {ac}</span>
                  <Badge variant="secondary">{count} voters</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Booth Distribution */}
      {data.boothDistribution && (
        <Card>
          <CardHeader>
            <CardTitle>🏛️ Polling Booth Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(data.boothDistribution).slice(0, 10).map(([booth, info]) => (
                <div key={booth} className="p-3 border rounded">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium">{booth}</span>
                    <Badge variant="outline">{info.count} voters</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{info.address}</p>
                </div>
              ))}
              {Object.keys(data.boothDistribution).length > 10 && (
                <p className="text-sm text-muted-foreground text-center">
                  ... and {Object.keys(data.boothDistribution).length - 10} more booths
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voter List */}
      {data.voters && data.voters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>👤 Voter Details {data.totalVoters && `(${data.totalVoters} total)`}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.voters.map((voter) => (
                <div key={voter.epicNumber} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold">{voter.fullName}</h4>
                      <p className="text-sm text-muted-foreground">EPIC: {voter.epicNumber}</p>
                    </div>
                    <div className="flex gap-2">
                      {voter.isVoted2024 && <Badge variant="default" className="bg-green-100 text-green-800">Voted 2024</Badge>}
                      {voter.gender && <Badge variant="outline">{voter.gender}</Badge>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    {voter.age && <div><span className="text-muted-foreground">Age:</span> {voter.age}</div>}
                    {voter.partNo && <div><span className="text-muted-foreground">Part:</span> {voter.partNo}</div>}
                    {voter.wardNo && <div><span className="text-muted-foreground">Ward:</span> {voter.wardNo}</div>}
                    {voter.acNo && <div><span className="text-muted-foreground">AC:</span> {voter.acNo}</div>}
                  </div>
                  {voter.boothName && (
                    <div className="mt-2 text-sm">
                      <span className="text-muted-foreground">Booth:</span> {voter.boothName}
                    </div>
                  )}
                </div>
              ))}
              {data.totalVoters && data.totalVoters > data.voters.length && (
                <p className="text-sm text-muted-foreground text-center">
                  Showing first {data.voters.length} of {data.totalVoters} voters
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}