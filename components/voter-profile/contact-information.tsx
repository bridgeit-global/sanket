'use client';

import { Phone } from 'lucide-react';

interface MobileNumberWithSortOrder {
  mobileNumber: string;
  sortOrder: number;
}

interface ContactInformationProps {
  mobileNumbers: MobileNumberWithSortOrder[];
}

export function ContactInformation({ mobileNumbers }: ContactInformationProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Phone className="h-4 w-4" />
        Contact Information
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mobileNumbers.length > 0 ? (
          mobileNumbers.map((mobile, index) => (
            <div key={mobile.mobileNumber}>
              <label className="text-sm font-medium text-muted-foreground">
                {index === 0 ? 'Primary Mobile' : index === 1 ? 'Secondary Mobile' : `Mobile ${index + 1}`}
              </label>
              <p className="text-base">{mobile.mobileNumber}</p>
            </div>
          ))
        ) : (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Mobile</label>
            <p className="text-base text-muted-foreground">Not set</p>
          </div>
        )}
      </div>
    </div>
  );
}
