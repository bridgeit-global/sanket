'use client';

import React from 'react';

interface SqlQueryResultsProps {
  data: {
    query: string;
    rowCount: number;
    columns: string[];
    data: any[];
    hasMore: boolean;
    summary: string;
    error?: string;
    details?: string;
    note?: string;
  };
}

export function SqlQueryResults({ data }: SqlQueryResultsProps) {
  if (data.error) {
    return (
      <div className="space-y-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-semibold text-red-800">SQL Query Error</h3>
        <div className="space-y-2">
          <p className="text-red-600">{data.error}</p>
          {data.details && (
            <p className="text-sm text-red-500">{data.details}</p>
          )}
          {data.note && (
            <p className="text-sm text-red-600 bg-red-100 p-2 rounded">{data.note}</p>
          )}
          <div className="bg-gray-100 p-3 rounded">
            <p className="text-sm font-medium text-gray-700 mb-1">Query:</p>
            <code className="text-sm text-gray-800 break-all">{data.query}</code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg shadow border">
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-semibold text-gray-800">SQL Query Results</h3>
        <div className="text-sm text-gray-500">
          {data.rowCount} row{data.rowCount !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="bg-gray-100 p-3 rounded">
        <p className="text-sm font-medium text-gray-700 mb-1">Query:</p>
        <code className="text-sm text-gray-800 break-all">{data.query}</code>
      </div>

      <div className="text-sm text-gray-600">{data.summary}</div>

      {data.data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                {data.columns.map((column, index) => (
                  <th
                    key={index}
                    className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.data.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50">
                  {data.columns.map((column, colIndex) => (
                    <td
                      key={colIndex}
                      className="px-4 py-2 text-sm text-gray-900 border-b border-gray-100"
                    >
                      {row[column] !== null && row[column] !== undefined
                        ? String(row[column])
                        : 'NULL'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.hasMore && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            ⚠️ Showing first 100 rows. There are more results available.
          </p>
        </div>
      )}

      {data.data.length === 0 && !data.error && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            Query executed successfully but returned no results.
          </p>
        </div>
      )}
    </div>
  );
} 