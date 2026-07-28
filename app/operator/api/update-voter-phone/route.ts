import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
    getVoterByEpicNumber,
    updateVoter,
    updateVoterMobileNumber,
} from '@/lib/db/queries';
import { isValidIndianMobile, normalizeIndianMobileDigits } from '@/lib/indian-mobile';

function getMaxDobDate(): string {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().split('T')[0];
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        const modules = (session?.user?.modules as string[]) || [];
        if (!session?.user || !modules.includes('operator')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { epicNumber, mobileNoPrimary, mobileNoSecondary, dob } = await request.json();

        if (!epicNumber || typeof epicNumber !== 'string') {
            return NextResponse.json({ error: 'EPIC Number is required' }, { status: 400 });
        }

        if (!mobileNoPrimary || typeof mobileNoPrimary !== 'string') {
            return NextResponse.json({ error: 'Primary mobile number is required' }, { status: 400 });
        }

        if (!isValidIndianMobile(mobileNoPrimary)) {
            return NextResponse.json(
                { error: 'Enter a valid 10-digit Indian mobile number' },
                { status: 400 },
            );
        }

        if (
            mobileNoSecondary !== undefined &&
            mobileNoSecondary !== null &&
            String(mobileNoSecondary).trim() !== '' &&
            !isValidIndianMobile(String(mobileNoSecondary))
        ) {
            return NextResponse.json(
                { error: 'Enter a valid 10-digit Indian mobile number for secondary' },
                { status: 400 },
            );
        }

        const voters = await getVoterByEpicNumber(epicNumber);
        if (voters.length === 0) {
            return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
        }

        const existingVoter = voters[0];
        const hasExistingDob = Boolean(existingVoter.dob?.trim());
        const normalizedDob =
            typeof dob === 'string' && dob.trim() ? dob.trim() : undefined;

        // Only fill DOB when the voter currently has none. Never overwrite an existing DOB.
        if (!hasExistingDob && normalizedDob) {
            const maxDobDate = getMaxDobDate();
            if (normalizedDob > maxDobDate) {
                return NextResponse.json(
                    { error: 'Voter must be at least 18 years old' },
                    { status: 400 },
                );
            }
        }

        const primaryDigits = normalizeIndianMobileDigits(mobileNoPrimary);
        const secondaryDigits =
            mobileNoSecondary !== undefined &&
            mobileNoSecondary !== null &&
            String(mobileNoSecondary).trim() !== ''
                ? normalizeIndianMobileDigits(String(mobileNoSecondary))
                : undefined;

        let updatedVoter = await updateVoterMobileNumber(
            epicNumber,
            primaryDigits,
            secondaryDigits,
            session.user.id,
            'beneficiary_management'
        );

        if (!updatedVoter) {
            return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
        }

        if (!hasExistingDob && normalizedDob) {
            const voterWithDob = await updateVoter(
                epicNumber,
                { dob: normalizedDob },
                session.user.id,
                'beneficiary_management',
            );
            if (voterWithDob) {
                updatedVoter = voterWithDob;
            } else {
                updatedVoter = { ...updatedVoter, dob: normalizedDob };
            }
        }

        return NextResponse.json(updatedVoter);
    } catch (error) {
        console.error('Error updating voter phone number:', error);
        return NextResponse.json(
            { error: 'Failed to update voter phone number' },
            { status: 500 }
        );
    }
}
