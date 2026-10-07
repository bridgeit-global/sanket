'use client';

import { FileText } from 'lucide-react';
import type { VoterMaster } from '@/lib/db/schema';
import { ageFromDob, formatDisplayDateIST } from '@/lib/ist-date';
import { cn } from '@/lib/utils';

interface PersonalInformationProps {
    voter: VoterMaster;
}

export function PersonalInformation({ voter }: PersonalInformationProps) {
    const expectedAge = voter.dob ? ageFromDob(voter.dob) : null;
    const ageIncorrect = expectedAge != null && voter.age !== expectedAge;

    return (
        <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                    <p className="text-base font-medium">{voter.fullName}</p>
                </div>
                <div>
                    <label className="text-sm font-medium text-muted-foreground">EPIC Number</label>
                    <p className="text-base font-medium">{voter.epicNumber}</p>
                </div>
                {voter.age != null && (
                    <div
                        className={cn(
                            ageIncorrect && 'rounded-md border border-destructive/40 bg-destructive/10 p-3',
                        )}
                    >
                        <label className="text-sm font-medium text-muted-foreground">Age</label>
                        <p
                            className={cn(
                                'text-base',
                                ageIncorrect && 'font-medium text-destructive',
                            )}
                        >
                            {voter.age}
                        </p>
                        {ageIncorrect ? (
                            <p className="text-sm text-destructive" role="alert">
                                Age is incorrect
                            </p>
                        ) : null}
                    </div>
                )}
                {voter.dob && (
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                        <p className="text-base">
                            {formatDisplayDateIST(voter.dob)}
                        </p>
                    </div>
                )}
                {voter.gender && (
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Gender</label>
                        <p className="text-base">{voter.gender}</p>
                    </div>
                )}
                {voter.relationType && voter.relationName && (
                    <>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Relation Type</label>
                            <p className="text-base">{voter.relationType}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Relation Name</label>
                            <p className="text-base">{voter.relationName}</p>
                        </div>
                    </>
                )}
                {voter.familyGrouping && (
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Family Grouping</label>
                        <p className="text-base">{voter.familyGrouping}</p>
                    </div>
                )}
                {voter.religion && (
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Religion</label>
                        <p className="text-base">{voter.religion}</p>
                    </div>
                )}
                {voter.caste && (
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Caste</label>
                        <p className="text-base">{voter.caste}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
