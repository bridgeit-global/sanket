'use client';

import React from 'react';

interface AgeGroupData {
  ageGroup: string;
  maleCount: number;
  femaleCount: number;
  totalCount: number;
}

interface VoterAgeGroupsWithGender {
  ageGroups: AgeGroupData[];
  totalVoters: number;
  totalMale: number;
  totalFemale: number;
}

export function VoterAgeGroupsWithGenderChart({ data }: { data: VoterAgeGroupsWithGender }) {
  const maxCount = Math.max(...data.ageGroups.map(group => Math.max(group.maleCount, group.femaleCount)));

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Age Group Distribution by Gender</h3>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{data.totalVoters.toLocaleString()}</div>
          <div className="text-sm text-blue-700 dark:text-blue-300">Total Voters</div>
        </div>
        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{data.totalMale.toLocaleString()}</div>
          <div className="text-sm text-blue-700 dark:text-blue-300">Male</div>
        </div>
        <div className="text-center p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
          <div className="text-xl font-bold text-pink-600 dark:text-pink-400">{data.totalFemale.toLocaleString()}</div>
          <div className="text-sm text-pink-700 dark:text-pink-300">Female</div>
        </div>
      </div>

      {/* Age Groups Chart */}
      <div className="space-y-4">
        {data.ageGroups.map((group) => (
          <div key={group.ageGroup} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{group.ageGroup}</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">{group.totalCount.toLocaleString()}</span>
            </div>

            <div className="flex gap-2 h-6">
              {/* Male Bar */}
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full"
                  style={{ width: `${(group.maleCount / maxCount) * 100}%` }}
                />
              </div>

              {/* Female Bar */}
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-pink-600 rounded-full"
                  style={{ width: `${(group.femaleCount / maxCount) * 100}%` }}
                />
              </div>
            </div>

            {/* Gender Breakdown */}
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <div className="size-3 bg-blue-600 rounded-full" />
                <span>Male: {group.maleCount.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="size-3 bg-pink-600 rounded-full" />
                <span>Female: {group.femaleCount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="size-4 bg-blue-600 rounded-full" />
          <span className="text-gray-700 dark:text-gray-300">Male</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 bg-pink-600 rounded-full" />
          <span className="text-gray-700 dark:text-gray-300">Female</span>
        </div>
      </div>
    </div>
  );
} 