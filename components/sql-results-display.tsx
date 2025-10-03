'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface SQLResult {
    query: string;
    description?: string;
    answer: string;
    rowCount: number;
    results: any[];
    sql?: string;
    error?: string;
}

interface SQLResultsDisplayProps {
    result: SQLResult;
}

export function SQLResultsDisplay({ result }: SQLResultsDisplayProps) {
    if (result.error) {
        return (
            <Card className="border-red-200 bg-red-50">
                <CardHeader>
                    <CardTitle className="text-red-800 flex items-center gap-2">
                        <span className="text-red-500">⚠️</span>
                        SQL Query Error
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-red-700">{result.answer}</p>
                    {result.sql && (
                        <div className="mt-4">
                            <p className="text-sm text-red-600 font-medium">Query:</p>
                            <code className="block mt-1 p-2 bg-red-100 text-red-800 rounded text-sm">
                                {result.sql}
                            </code>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    }

    const formatValue = (value: any) => {
        if (value === null || value === undefined) return 'N/A';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (typeof value === 'number') return value.toLocaleString();
        return String(value);
    };

    const getColumnKeys = (results: any[]) => {
        if (!results || results.length === 0) return [];
        return Object.keys(results[0]);
    };

    const columnKeys = getColumnKeys(result.results);

    return (
        <div className="space-y-4">
            {/* Summary Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <span className="text-blue-500">📊</span>
                        Query Results
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                        <Badge variant="outline" className="text-blue-600">
                            {result.rowCount} rows found
                        </Badge>
                        {result.description && (
                            <span className="text-sm text-gray-600">{result.description}</span>
                        )}
                    </div>

                    <p className="text-gray-700">{result.answer}</p>

                    {result.sql && (
                        <div className="mt-4">
                            <details className="group">
                                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                                    View SQL Query
                                </summary>
                                <code className="block mt-2 p-3 bg-gray-100 text-gray-800 rounded text-sm overflow-x-auto">
                                    {result.sql}
                                </code>
                            </details>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Results Table */}
            {result.results && result.results.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <span className="text-green-500">📋</span>
                            Data Results
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-200 rounded-lg">
                                <thead>
                                    <tr className="bg-gray-50">
                                        {columnKeys.map((key) => (
                                            <th
                                                key={key}
                                                className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700 capitalize"
                                            >
                                                {key.replace(/([A-Z])/g, ' $1').trim()}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.results.map((row, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            {columnKeys.map((key) => (
                                                <td
                                                    key={key}
                                                    className="border border-gray-200 px-4 py-2 text-sm text-gray-600"
                                                >
                                                    {formatValue(row[key])}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {result.rowCount > result.results.length && (
                            <div className="mt-3 text-sm text-gray-500 text-center">
                                Showing first {result.results.length} of {result.rowCount} rows
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* No Results */}
            {result.results && result.results.length === 0 && (
                <Card>
                    <CardContent className="text-center py-8">
                        <div className="text-gray-400 text-4xl mb-2">📭</div>
                        <p className="text-gray-600">No results found</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// Helper component for displaying statistics in a nice format
export function SQLStatsDisplay({ result }: { result: SQLResult }) {
    if (result.error || !result.results || result.results.length === 0) {
        return null;
    }

    const stats = result.results.reduce((acc, row) => {
        Object.keys(row).forEach(key => {
            if (typeof row[key] === 'number') {
                if (!acc[key]) {
                    acc[key] = { sum: 0, count: 0, min: Infinity, max: -Infinity };
                }
                acc[key].sum += row[key];
                acc[key].count += 1;
                acc[key].min = Math.min(acc[key].min, row[key]);
                acc[key].max = Math.max(acc[key].max, row[key]);
            }
        });
        return acc;
    }, {} as Record<string, { sum: number; count: number; min: number; max: number }>);

    const numericColumns = Object.keys(stats);

    if (numericColumns.length === 0) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span className="text-purple-500">📈</span>
                    Statistics Summary
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {numericColumns.map((column) => {
                        const stat = stats[column];
                        const avg = stat.sum / stat.count;

                        return (
                            <div key={column} className="p-3 bg-gray-50 rounded-lg">
                                <h4 className="font-medium text-gray-800 capitalize mb-2">
                                    {column.replace(/([A-Z])/g, ' $1').trim()}
                                </h4>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Total:</span>
                                        <span className="font-medium">{stat.sum.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Average:</span>
                                        <span className="font-medium">{avg.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Min:</span>
                                        <span className="font-medium">{stat.min.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Max:</span>
                                        <span className="font-medium">{stat.max.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
