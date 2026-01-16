'use client';

import { MapPin } from 'lucide-react';
import type { VoterMaster } from '@/lib/db/schema';

interface LocationInformationProps {
  voter: VoterMaster;
}

export function LocationInformation({ voter }: LocationInformationProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        Location Information
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {voter.houseNumber && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">House Number</label>
            <p className="text-base">{voter.houseNumber}</p>
          </div>
        )}
        {voter.address && (
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-muted-foreground">Address</label>
            <p className="text-base">{voter.address}</p>
          </div>
        )}
        {voter.pincode && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Pincode</label>
            <p className="text-base">{voter.pincode}</p>
          </div>
        )}
      </div>
    </div>
  );
}
