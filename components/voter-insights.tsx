'use client';

import React from 'react';
import {
  VoterDemographicsChart,
  VoterPartsChart,
  VoterSearchResultsChart,
} from './voter-charts';
import { VoterAgeGroupsWithGenderChart } from './voter-age-groups-chart';

interface VoterInsightsProps {
  toolName: string;
  data: any;
}

export function VoterInsights({ toolName, data }: VoterInsightsProps) {
  console.log('VoterInsights called with:', { toolName, data });

  // Check if this is actually voter data or if it's being misused
  if (!data || typeof data !== 'object') {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-semibold text-red-800">Error Loading Voter Data</h3>
        <p className="text-red-600 mt-2">
          Note: Voter tools are only for voter-related queries. For general information, please use web search.
        </p>
      </div>
    );
  }

  // Check if the data structure looks like voter data
  const hasVoterDataStructure = data.totalVoters !== undefined ||
    data.ageGroups !== undefined ||
    data.parts !== undefined ||
    data.voters !== undefined;

  if (!hasVoterDataStructure) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-800">Incorrect Tool Usage</h3>
        <p className="text-yellow-600 mt-2">
          This query appears to be for general information, not voter data.
          Please use web search for general information about Anushakti Nagar.
        </p>
      </div>
    );
  }

  switch (toolName) {
    case 'getVoterDemographics':
      console.log('Rendering VoterDemographicsChart with data:', data);
      return <VoterDemographicsChart data={data} />;

    case 'getVoterAgeGroupsWithGender':
      return <VoterAgeGroupsWithGenderChart data={data} />;

    case 'getVoterParts':
      return <VoterPartsChart data={data.parts} />;

    case 'searchVoters':
      return <VoterSearchResultsChart data={data} />;

    default:
      return (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold">Voter Insights</h3>
          <pre className="mt-2 text-sm text-gray-600 overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      );
  }
} 