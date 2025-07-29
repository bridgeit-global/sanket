'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

interface BeneficiaryInsightsProps {
  toolName: string;
  data: any;
}

export function BeneficiaryInsights({ toolName, data }: BeneficiaryInsightsProps) {
  console.log('BeneficiaryInsights called with:', { toolName, data });

  if (!data || typeof data !== 'object') {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-semibold text-red-800">Error Loading Beneficiary Data</h3>
        <p className="text-red-600 mt-2">
          Note: Beneficiary tools are only for beneficiary-related queries.
        </p>
      </div>
    );
  }

  switch (toolName) {
    case 'getServices':
      return <ServicesDisplay data={data} />;

    case 'addService':
      return <ServiceAddedDisplay data={data} />;

    case 'addBeneficiary':
      return <BeneficiaryAddedDisplay data={data} />;

    case 'getBeneficiaries':
      return <BeneficiariesDisplay data={data} />;

    case 'updateBeneficiary':
      return <BeneficiaryUpdatedDisplay data={data} />;

    default:
      return (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold">Beneficiary Insights</h3>
          <pre className="mt-2 text-sm text-gray-600 overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      );
  }
}

function ServicesDisplay({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Available Services</span>
            <Badge variant="outline">{data.totalServices} total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-green-700 mb-2">One-to-One Services ({data.oneToOneServices.length})</h4>
              <div className="grid gap-2">
                {data.oneToOneServices.map((service: any) => (
                  <div key={service.id} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="font-medium">{service.name}</div>
                    {service.description && <div className="text-sm text-gray-600">{service.description}</div>}
                    <div className="text-xs text-green-600 mt-1">Category: {service.category}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-blue-700 mb-2">One-to-Many Services ({data.oneToManyServices.length})</h4>
              <div className="grid gap-2">
                {data.oneToManyServices.map((service: any) => (
                  <div key={service.id} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="font-medium">{service.name}</div>
                    {service.description && <div className="text-sm text-gray-600">{service.description}</div>}
                    <div className="text-xs text-blue-600 mt-1">Category: {service.category}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ServiceAddedDisplay({ data }: { data: any }) {
  if (!data.success) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-semibold text-red-800">Failed to Add Service</h3>
        <p className="text-red-600 mt-2">{data.message}</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
      <h3 className="text-lg font-semibold text-green-800">Service Added Successfully</h3>
      <div className="mt-2 space-y-1">
        <p><strong>Name:</strong> {data.service.name}</p>
        <p><strong>Type:</strong> {data.service.type}</p>
        <p><strong>Category:</strong> {data.service.category}</p>
        {data.service.description && <p><strong>Description:</strong> {data.service.description}</p>}
      </div>
    </div>
  );
}

function BeneficiaryAddedDisplay({ data }: { data: any }) {
  if (!data.success) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-semibold text-red-800">Failed to Add Beneficiary</h3>
        <p className="text-red-600 mt-2">{data.message}</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
      <h3 className="text-lg font-semibold text-green-800">Beneficiary Added Successfully</h3>
      <div className="mt-2 space-y-1">
        <p><strong>Service:</strong> {data.service.name}</p>
        <p><strong>Status:</strong> {data.beneficiary.status}</p>
        {data.beneficiary.voterId && <p><strong>Voter ID:</strong> {data.beneficiary.voterId}</p>}
        {data.beneficiary.partNo && <p><strong>Part No:</strong> {data.beneficiary.partNo}</p>}
        {data.beneficiary.notes && <p><strong>Notes:</strong> {data.beneficiary.notes}</p>}
      </div>
    </div>
  );
}

function BeneficiariesDisplay({ data }: { data: any }) {
  if (data.type === 'statistics') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Beneficiary Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{data.stats.totalBeneficiaries}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{data.stats.pendingCount}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{data.stats.completedCount}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{data.stats.oneToOneCount}</div>
              <div className="text-sm text-gray-600">One-to-One</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{data.stats.oneToManyCount}</div>
              <div className="text-sm text-gray-600">One-to-Many</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{data.stats.rejectedCount}</div>
              <div className="text-sm text-gray-600">Rejected</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.type === 'beneficiaries') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            Beneficiaries for {data.searchType} {data.searchValue}
            <Badge variant="outline" className="ml-2">{data.totalBeneficiaries}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.beneficiaries.map((beneficiary: any) => (
              <div key={beneficiary.id} className="p-3 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{beneficiary.serviceName}</div>
                    <div className="text-sm text-gray-600">
                      {beneficiary.voterName ? `Voter: ${beneficiary.voterName} (${beneficiary.voterId})` : `Part: ${beneficiary.partNo}`}
                    </div>
                    {beneficiary.notes && <div className="text-sm text-gray-500 mt-1">{beneficiary.notes}</div>}
                  </div>
                  <Badge 
                    variant={
                      beneficiary.status === 'completed' ? 'default' :
                      beneficiary.status === 'in_progress' ? 'secondary' :
                      beneficiary.status === 'rejected' ? 'destructive' : 'outline'
                    }
                  >
                    {beneficiary.status}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Applied: {new Date(beneficiary.applicationDate).toLocaleDateString()}
                  {beneficiary.completionDate && ` | Completed: ${new Date(beneficiary.completionDate).toLocaleDateString()}`}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 className="text-lg font-semibold text-yellow-800">No Beneficiaries Found</h3>
      <p className="text-yellow-600 mt-2">No beneficiaries found for the specified criteria.</p>
    </div>
  );
}

function BeneficiaryUpdatedDisplay({ data }: { data: any }) {
  if (!data.success) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-semibold text-red-800">Failed to Update Beneficiary</h3>
        <p className="text-red-600 mt-2">{data.message}</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
      <h3 className="text-lg font-semibold text-green-800">Beneficiary Updated Successfully</h3>
      <div className="mt-2 space-y-1">
        <p><strong>Status:</strong> {data.beneficiary.status}</p>
        {data.beneficiary.notes && <p><strong>Notes:</strong> {data.beneficiary.notes}</p>}
        {data.beneficiary.completionDate && <p><strong>Completion Date:</strong> {new Date(data.beneficiary.completionDate).toLocaleDateString()}</p>}
      </div>
    </div>
  );
} 