'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Voter } from '@/lib/db/schema';

interface PhoneUpdateFormProps {
    voter: Voter;
    onPhoneUpdate: (phoneData: { mobileNoPrimary: string; mobileNoSecondary?: string }) => void;
    onSkip: () => void;
    onCancel: () => void;
}

export function PhoneUpdateForm({ voter, onPhoneUpdate, onSkip, onCancel }: PhoneUpdateFormProps) {
    const [mobileNoPrimary, setMobileNoPrimary] = useState(voter.mobileNoPrimary || '');
    const [mobileNoSecondary, setMobileNoSecondary] = useState(voter.mobileNoSecondary || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!mobileNoPrimary.trim()) {
            return;
        }

        setIsSubmitting(true);
        try {
            await onPhoneUpdate({
                mobileNoPrimary: mobileNoPrimary.trim(),
                mobileNoSecondary: mobileNoSecondary.trim() || undefined,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSkip = () => {
        onSkip();
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Update Phone Number</CardTitle>
                <CardDescription>
                    The selected voter does not have a primary phone number. Please update the contact information before proceeding to service creation.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Voter Information Display */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Voter Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                            <div>
                                <Label className="text-sm font-medium">Name</Label>
                                <p className="text-sm">{voter.fullName}</p>
                            </div>
                            <div>
                                <Label className="text-sm font-medium">EPIC Number</Label>
                                <p className="text-sm font-mono">{voter.epicNumber}</p>
                            </div>
                            <div>
                                <Label className="text-sm font-medium">Age</Label>
                                <p className="text-sm">{voter.age || 'N/A'}</p>
                            </div>
                            <div>
                                <Label className="text-sm font-medium">Gender</Label>
                                <p className="text-sm">{voter.gender || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Phone Number Input Fields */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Contact Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="mobileNoPrimary">
                                    Primary Mobile Number <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="mobileNoPrimary"
                                    type="tel"
                                    value={mobileNoPrimary}
                                    onChange={(e) => setMobileNoPrimary(e.target.value)}
                                    placeholder="Enter primary mobile number"
                                    required
                                    className="font-mono"
                                />
                                <p className="text-xs text-muted-foreground">
                                    This is the main contact number for the voter
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mobileNoSecondary">
                                    Secondary Mobile Number
                                </Label>
                                <Input
                                    id="mobileNoSecondary"
                                    type="tel"
                                    value={mobileNoSecondary}
                                    onChange={(e) => setMobileNoSecondary(e.target.value)}
                                    placeholder="Enter secondary mobile number (optional)"
                                    className="font-mono"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Optional alternative contact number
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                        <Button
                            type="submit"
                            disabled={isSubmitting || !mobileNoPrimary.trim()}
                            className="flex-1"
                        >
                            {isSubmitting ? 'Updating...' : 'Update Phone Number'}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleSkip}
                            disabled={isSubmitting}
                        >
                            Skip & Continue
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
