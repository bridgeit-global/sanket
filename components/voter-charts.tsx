'use client';

import React from 'react';

interface VoterDemographics {
  totalVoters: number;
  maleCount: number;
  femaleCount: number;
  otherCount: number;
  avgAge: number;
  minAge: number;
  maxAge: number;
  ageGroups: Array<{
    ageGroup: string;
    count: number;
  }>;
}

interface VoterAgeGroups {
  ageGroups: Array<{
    ageGroup: string;
    count: number;
  }>;
  totalVoters: number;
}

interface VoterParts {
  part_no: number;
  voterCount: number;
  maleCount: number;
  femaleCount: number;
  avgAge: number;
}

interface VoterSearchResults {
  totalResults: number;
  voters: Array<{
    id: string;
    name: string;
    part_no: number;
    serial_no: number;
    age: number;
    gender: string;
    family: string | null;
    last_name: string | null;
    mobile: string | null;
    email: string | null;
  }>;
  genderBreakdown: Record<string, number>;
  ageGroups: Record<string, number>;
  ageGroupsWithGender?: Record<string, { maleCount: number; femaleCount: number; totalCount: number }>;
}

export function VoterDemographicsChart({ data }: { data: VoterDemographics }) {
  const genderDistribution = {
    male: data.maleCount,
    female: data.femaleCount,
    other: data.otherCount,
  };

  const totalGender = genderDistribution.male + genderDistribution.female + genderDistribution.other;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Voter Demographics</h3>

      {/* Gender Distribution */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-700 dark:text-gray-300">Gender Distribution</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Male</span>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{genderDistribution.male.toLocaleString()}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${(genderDistribution.male / data.totalVoters) * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Female</span>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{genderDistribution.female.toLocaleString()}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-pink-600 h-2 rounded-full"
              style={{ width: `${(genderDistribution.female / data.totalVoters) * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Other</span>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{genderDistribution.other.toLocaleString()}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full"
              style={{ width: `${(genderDistribution.other / data.totalVoters) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Age Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{Math.round(data.avgAge)}</div>
          <div className="text-sm text-blue-700 dark:text-blue-300">Average Age</div>
        </div>
        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="text-xl font-bold text-green-600 dark:text-green-400">{data.minAge}</div>
          <div className="text-sm text-green-700 dark:text-green-300">Min Age</div>
        </div>
        <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <div className="text-xl font-bold text-orange-600 dark:text-orange-400">{data.maxAge}</div>
          <div className="text-sm text-orange-700 dark:text-orange-300">Max Age</div>
        </div>
      </div>

      {/* Total Voters */}
      <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="text-xl font-bold text-gray-800 dark:text-gray-200">{data.totalVoters.toLocaleString()}</div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Total Voters</div>
      </div>

      {/* Age Groups */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-700 dark:text-gray-300">Age Group Distribution</h4>
        {data.ageGroups.map((group) => (
          <div key={group.ageGroup} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">{group.ageGroup}</span>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{group.count.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${(group.count / data.totalVoters) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function VoterAgeGroupsChart({ data }: { data: VoterAgeGroups }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Age Group Distribution</h3>

      <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
        <div className="text-xl font-bold text-green-600 dark:text-green-400">{data.totalVoters.toLocaleString()}</div>
        <div className="text-sm text-green-700 dark:text-green-300">Total Voters</div>
      </div>

      <div className="space-y-3">
        {data.ageGroups.map((group) => (
          <div key={group.ageGroup} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">{group.ageGroup}</span>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{group.count.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${(group.count / data.totalVoters) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function VoterPartsChart({ data }: { data: VoterParts[] }) {
  const maxVoterCount = Math.max(...data.map(part => part.voterCount));

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Voter Analysis by Parts</h3>

      <div className="space-y-4">
        {data.map((part) => (
          <div key={part.part_no} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Part {part.part_no}</span>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Voters</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{part.voterCount.toLocaleString()}</span>
              </div>
            </div>

            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${(part.voterCount / maxVoterCount) * 100}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="font-medium text-blue-600 dark:text-blue-400">{part.maleCount}</div>
                <div className="text-gray-500 dark:text-gray-400">Male</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-pink-600 dark:text-pink-400">{part.femaleCount}</div>
                <div className="text-gray-500 dark:text-gray-400">Female</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-gray-600 dark:text-gray-400">{Math.round(part.avgAge)}</div>
                <div className="text-gray-500 dark:text-gray-400">Avg Age</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{data.reduce((sum, part) => sum + part.voterCount, 0).toLocaleString()}</div>
        <div className="text-sm text-blue-700 dark:text-blue-300">Total Voters Across All Parts</div>
      </div>
    </div>
  );
}

export function VoterSearchResultsChart({ data }: { data: VoterSearchResults }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Search Results</h3>

      <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{data.totalResults.toLocaleString()}</div>
        <div className="text-sm text-blue-700 dark:text-blue-300">Total Voters Found</div>
      </div>

      {/* Age Groups with Gender Bifurcation */}
      {data.ageGroupsWithGender && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-700 dark:text-gray-300">Age Group Distribution by Gender</h4>
          <div className="space-y-3">
            {Object.entries(data.ageGroupsWithGender)
              .sort(([a], [b]) => {
                const order = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
                return order.indexOf(a) - order.indexOf(b);
              })
              .map(([ageGroup, counts]) => (
                <div key={ageGroup} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{ageGroup}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{counts.totalCount.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex gap-2 h-4">
                    {/* Male Bar */}
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${counts.maleCount > 0 ? (counts.maleCount / counts.totalCount) * 100 : 0}%` }}
                      />
                    </div>
                    
                    {/* Female Bar */}
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-pink-600 rounded-full"
                        style={{ width: `${counts.femaleCount > 0 ? (counts.femaleCount / counts.totalCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Gender Breakdown */}
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <div className="size-3 bg-blue-600 rounded-full"></div>
                      <span>Male: {counts.maleCount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="size-3 bg-pink-600 rounded-full"></div>
                      <span>Female: {counts.femaleCount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Voter List */}
      <div className="space-y-3">
        {data.voters.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-700 dark:text-gray-300">Sample Voters ({data.totalResults.toLocaleString()} total)</h4>
            <div className="space-y-2 mt-2">
              {data.voters.map((voter) => (
                <div key={voter.id} className="text-sm p-2 bg-white dark:bg-gray-800 rounded border-l-4 border-blue-500">
                  <div className="font-medium text-gray-800 dark:text-gray-200">{voter.name}</div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Part {voter.part_no}, Serial {voter.serial_no} • {voter.age} years • {voter.gender === 'M' ? 'Male' : voter.gender === 'F' ? 'Female' : voter.gender === 'O' ? 'Other' : voter.gender}
                  </div>
                  {(voter.mobile || voter.email) && (
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {voter.mobile && <span>📱 {voter.mobile}</span>}
                      {voter.mobile && voter.email && <span> • </span>}
                      {voter.email && <span>📧 {voter.email}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 