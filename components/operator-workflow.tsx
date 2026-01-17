'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/toast';
import { BeneficiaryServiceForm } from '@/components/beneficiary-service-form';
import { PhoneUpdateForm } from '@/components/phone-update-form';
import { TaskManagement } from '@/components/task-management';
import { useTranslations } from '@/hooks/use-translations';
import { Printer } from 'lucide-react';
import { format, parseISO, addDays } from 'date-fns';
import type { VoterWithPartNo, BeneficiaryService, DailyProgramme } from '@/lib/db/schema';

export function BeneficiaryManagement() {
    const { t } = useTranslations();
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<VoterWithPartNo[]>([]);
    const [selectedVoter, setSelectedVoter] = useState<VoterWithPartNo | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchType, setSearchType] = useState<'voterId' | 'phone' | 'details'>('details');
    const [lastSearchType, setLastSearchType] = useState<'voterId' | 'phone' | 'details' | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    // Detailed search parameters
    const [name, setName] = useState('');
    const [gender, setGender] = useState('');
    const [age, setAge] = useState<number>(25);
    const [ageRange, setAgeRange] = useState<number>(5);
    const [showBeneficiaryService, setShowBeneficiaryService] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [showPhoneUpdate, setShowPhoneUpdate] = useState(false);
    const [serviceData, setServiceData] = useState<any>(null);
    const [createdService, setCreatedService] = useState<BeneficiaryService | null>(null);
    const [workflowStep, setWorkflowStep] = useState<'search' | 'phoneUpdate' | 'service' | 'confirmation' | 'completed' | 'tasks'>('search');
    const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');
    
    // Visitor form state
    const [showVisitorForm, setShowVisitorForm] = useState(false);
    const [visitorFormData, setVisitorFormData] = useState({
        name: '',
        contactNumber: '',
        aadharNumber: '',
        purpose: '',
        programmeEventId: '',
        visitDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    });
    const [isSubmittingVisitor, setIsSubmittingVisitor] = useState(false);
    const [programmeEvents, setProgrammeEvents] = useState<DailyProgramme[]>([]);

    // Helper function to format date only
    const formatDateOnly = (date: string | Date): string => {
        try {
            const dateObj = typeof date === 'string' ? parseISO(date) : date;
            return format(dateObj, 'dd MMM yyyy');
        } catch (error) {
            return String(date);
        }
    };

    // Load programme events when visitor form is shown
    useEffect(() => {
        if (showVisitorForm) {
            loadProgrammeEvents();
        }
    }, [showVisitorForm]);

    const loadProgrammeEvents = async () => {
        try {
            const today = format(new Date(), 'yyyy-MM-dd');
            const pastDate = format(addDays(new Date(), -7), 'yyyy-MM-dd');
            const response = await fetch(
                `/api/daily-programme?startDate=${pastDate}&endDate=${today}`,
            );
            if (response.ok) {
                const data = await response.json();
                setProgrammeEvents(data);
            }
        } catch (error) {
            console.error('Error loading programme events:', error);
        }
    };

    // Helper function to clear search state when switching tabs
    const clearSearchStateIfNeeded = () => {
        if (searchTerm || searchResults.length > 0 || hasSearched || isSearching) {
            setSearchTerm('');
            setSearchResults([]);
            setHasSearched(false);
            setIsSearching(false);
            setLastSearchType(null);
        }
    };

    // Handler for search type changes - clears input and voter data
    const handleSearchTypeChange = (newSearchType: 'voterId' | 'phone' | 'details') => {
        setSearchType(newSearchType);
        // Clear search input and any selected voter data
        setSearchTerm('');
        setName('');
        setGender('');
        setAge(25);
        setAgeRange(5);
        setSearchResults([]);
        setHasSearched(false);
        setIsSearching(false);
        setLastSearchType(null);
        setSelectedVoter(null);
    };

    const handleSearch = async () => {
        if (searchType === 'details') {
            if (!name.trim() && (!gender || gender === 'any') && age === undefined) {
                toast({
                    type: 'error',
                    description: t('operator.messages.pleaseProvideCriteria'),
                });
                return;
            }
        } else {
            if (!searchTerm.trim()) {
                toast({
                    type: 'error',
                    description: t('operator.messages.pleaseEnterVoterId'),
                });
                return;
            }
        }

        setIsSearching(true);
        setHasSearched(true);
        try {
            const response = await fetch('/operator/api/search-voter', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    searchTerm: searchTerm.trim(),
                    searchType: searchType,
                    name: searchType === 'details' ? name.trim() : undefined,
                    gender: searchType === 'details' ? (gender === 'any' ? undefined : gender) : undefined,
                    age: searchType === 'details' ? age : undefined,
                    ageRange: searchType === 'details' ? ageRange : undefined,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to search voters');
            }

            const data = await response.json();
            setSearchResults(data.voters || []);
            setLastSearchType(data.searchType || searchType);

            if (data.voters.length === 0) {
                const searchTypeText = data.searchType === 'voterId' ? t('operator.search.types.voterId') :
                    data.searchType === 'phone' ? t('operator.search.types.phone') : t('backOffice.detailsType');
                toast({
                    type: 'error',
                    description: t('operator.messages.noVotersFound', { type: searchTypeText }),
                });
            } else {
                const searchTypeText = data.searchType === 'voterId' ? t('operator.search.types.voterId') :
                    data.searchType === 'phone' ? t('operator.search.types.phone') : t('backOffice.detailsType');
                toast({
                    type: 'success',
                    description: t('operator.messages.votersFound', { count: data.voters.length, type: searchTypeText }),
                });
            }
        } catch (error) {
            toast({
                type: 'error',
                description: t('operator.messages.failedToSearch'),
            });
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectVoter = (voter: VoterWithPartNo) => {
        setSelectedVoter(voter);
        setSearchResults([]);
        setSearchTerm('');

        // Always show phone update form to allow updating phone numbers even if they exist
        setShowPhoneUpdate(true);
        clearSearchStateIfNeeded();
        setWorkflowStep('phoneUpdate');
    };

    const handlePhoneUpdate = async (phoneData: { mobileNoPrimary: string; mobileNoSecondary?: string }) => {
        if (!selectedVoter) return;

        try {
            const response = await fetch('/operator/api/update-voter-phone', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    epicNumber: selectedVoter.epicNumber,
                    ...phoneData,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update phone number');
            }

            const updatedVoter = await response.json();
            setSelectedVoter(updatedVoter);
            setShowPhoneUpdate(false);
            setShowBeneficiaryService(true);
            setWorkflowStep('service');
            toast({
                type: 'success',
                description: t('operator.messages.phoneUpdatedSuccess'),
            });
        } catch (error) {
            console.error('Error updating phone number:', error);
            toast({
                type: 'error',
                description: t('operator.messages.phoneUpdateFailed'),
            });
        }
    };

    const handleSkipPhoneUpdate = () => {
        setShowPhoneUpdate(false);
        setShowBeneficiaryService(true);
        setWorkflowStep('service');
    };

    const handleServiceDataReady = (data: any) => {
        setServiceData(data);
        setShowBeneficiaryService(false);
        setShowConfirmation(true);
        clearSearchStateIfNeeded();
        setWorkflowStep('confirmation');
    };

    const handleConfirmService = async () => {
        if (!serviceData || !selectedVoter) {
            toast({
                type: 'error',
                description: t('operator.messages.serviceDataMissing'),
            });
            return;
        }

        try {
            const response = await fetch('/operator/api/create-beneficiary-service', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...serviceData,
                    voterId: selectedVoter.epicNumber,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create beneficiary service');
            }

            const result = await response.json();
            setCreatedService(result.service);
            setShowConfirmation(false);
            clearSearchStateIfNeeded();
            setWorkflowStep('completed');
            toast({
                type: 'success',
                description: t('operator.messages.serviceCreatedSuccess'),
            });
        } catch (error) {
            console.error('Error creating service:', error);
            toast({
                type: 'error',
                description: t('operator.messages.serviceCreateFailed'),
            });
        }
    };

    const handleStartNew = () => {
        setSelectedVoter(null);
        setSearchResults([]);
        setSearchTerm('');
        setHasSearched(false);
        setIsSearching(false);
        setShowBeneficiaryService(false);
        setShowConfirmation(false);
        setShowPhoneUpdate(false);
        setServiceData(null);
        setCreatedService(null);
        setShowVisitorForm(false);
        setVisitorFormData({
            name: '',
            contactNumber: '',
            aadharNumber: '',
            purpose: '',
            programmeEventId: '',
            visitDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        });
        setWorkflowStep('search');
    };

    const handleAddAsVisitor = () => {
        setShowVisitorForm(true);
    };

    const handleVisitorFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!visitorFormData.name.trim() || !visitorFormData.contactNumber.trim() || !visitorFormData.aadharNumber.trim() || !visitorFormData.purpose.trim()) {
            toast({
                type: 'error',
                description: 'Please fill in all required fields',
            });
            return;
        }

        setIsSubmittingVisitor(true);
        try {
            const response = await fetch('/api/visitors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: visitorFormData.name,
                    contactNumber: visitorFormData.contactNumber,
                    aadharNumber: visitorFormData.aadharNumber,
                    purpose: visitorFormData.purpose,
                    programmeEventId: visitorFormData.programmeEventId && visitorFormData.programmeEventId !== 'none' ? visitorFormData.programmeEventId : null,
                    visitDate: new Date(visitorFormData.visitDate).toISOString(),
                }),
            });

            if (response.ok) {
                toast({
                    type: 'success',
                    description: t('operator.search.visitorCreatedSuccess'),
                });
                setShowVisitorForm(false);
                setVisitorFormData({
                    name: '',
                    contactNumber: '',
                    aadharNumber: '',
                    purpose: '',
                    programmeEventId: '',
                    visitDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
                });
                setHasSearched(false);
                setSearchTerm('');
                setName('');
                setGender('');
                setAge(25);
                setAgeRange(5);
            } else {
                const error = await response.json();
                toast({
                    type: 'error',
                    description: error.error || 'Failed to add visitor',
                });
            }
        } catch (error) {
            console.error('Error adding visitor:', error);
            toast({
                type: 'error',
                description: 'Failed to add visitor. Please try again.',
            });
        } finally {
            setIsSubmittingVisitor(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleCancel = () => {
        setShowBeneficiaryService(false);
        setShowConfirmation(false);
        setShowPhoneUpdate(false);
        setServiceData(null);
        setWorkflowStep('search');
    };

    return (
        <div className="space-y-6">
            {/* Header with Sign Out */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <SidebarToggle />
                    <div>
                        <h1 className="text-3xl font-bold">{t('operator.dashboard.title')}</h1>
                        <p className="text-muted-foreground mt-2">
                            {t('operator.dashboard.subtitle')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-muted p-1 rounded-lg">
                <Button
                    variant={activeTab === 'create' ? 'default' : 'ghost'}
                    onClick={() => {
                        setActiveTab('create');
                        setWorkflowStep('search');
                    }}
                    className="flex-1 text-sm sm:text-base"
                >
                    <span className="hidden sm:inline">{t('operator.tabs.createService')}</span>
                    <span className="sm:hidden">{t('operator.tabs.create')}</span>
                </Button>
                <Button
                    variant={activeTab === 'manage' ? 'default' : 'ghost'}
                    onClick={() => {
                        setActiveTab('manage');
                        setWorkflowStep('tasks');
                    }}
                    className="flex-1 text-sm sm:text-base"
                >
                    <span className="hidden sm:inline">{t('operator.tabs.manageTasks')}</span>
                    <span className="sm:hidden">{t('operator.tabs.manage')}</span>
                </Button>
            </div>

            {/* Task Management Section */}
            {activeTab === 'manage' && (
                <TaskManagement />
            )}

            {/* Workflow Progress Indicator */}
            {activeTab === 'create' && workflowStep !== 'search' && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="hidden sm:flex items-center space-x-4">
                            <div className={`flex items-center space-x-2 ${workflowStep === 'phoneUpdate' ? 'text-blue-600' : workflowStep === 'service' || workflowStep === 'confirmation' || workflowStep === 'completed' ? 'text-green-600' : 'text-gray-500'}`}>
                                <div className={`size-6 rounded-full flex items-center justify-center text-sm font-medium ${workflowStep === 'phoneUpdate' ? 'bg-blue-100 text-blue-600' : workflowStep === 'service' || workflowStep === 'confirmation' || workflowStep === 'completed' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                    1
                                </div>
                                <span className="text-sm font-medium">{t('operator.workflow.phoneUpdate')}</span>
                            </div>
                            <div className="flex-1 h-px bg-gray-200" />
                            <div className={`flex items-center space-x-2 ${workflowStep === 'service' ? 'text-blue-600' : workflowStep === 'confirmation' || workflowStep === 'completed' ? 'text-green-600' : 'text-gray-500'}`}>
                                <div className={`size-6 rounded-full flex items-center justify-center text-sm font-medium ${workflowStep === 'service' ? 'bg-blue-100 text-blue-600' : workflowStep === 'confirmation' || workflowStep === 'completed' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                    2
                                </div>
                                <span className="text-sm font-medium">{t('operator.workflow.serviceDetails')}</span>
                            </div>
                            <div className="flex-1 h-px bg-gray-200" />
                            <div className={`flex items-center space-x-2 ${workflowStep === 'confirmation' ? 'text-blue-600' : workflowStep === 'completed' ? 'text-green-600' : 'text-gray-500'}`}>
                                <div className={`size-6 rounded-full flex items-center justify-center text-sm font-medium ${workflowStep === 'confirmation' ? 'bg-blue-100 text-blue-600' : workflowStep === 'completed' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                    3
                                </div>
                                <span className="text-sm font-medium">{t('operator.workflow.confirmation')}</span>
                            </div>
                            <div className="flex-1 h-px bg-gray-200" />
                            <div className={`flex items-center space-x-2 ${workflowStep === 'completed' ? 'text-green-600' : 'text-gray-500'}`}>
                                <div className={`size-6 rounded-full flex items-center justify-center text-sm font-medium ${workflowStep === 'completed' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                    4
                                </div>
                                <span className="text-sm font-medium">{t('operator.workflow.tokenGenerated')}</span>
                            </div>
                        </div>

                        {/* Mobile Progress Indicator */}
                        <div className="sm:hidden space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span>{t('operator.workflow.step', { current: workflowStep === 'phoneUpdate' ? '1' : workflowStep === 'service' ? '2' : workflowStep === 'confirmation' ? '3' : '4', total: '4' })}</span>
                                <span className="text-muted-foreground">
                                    {workflowStep === 'phoneUpdate' ? t('operator.workflow.phoneUpdate') :
                                        workflowStep === 'service' ? t('operator.workflow.serviceDetails') :
                                            workflowStep === 'confirmation' ? t('operator.workflow.confirmation') : t('operator.workflow.tokenGenerated')}
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{
                                        width: `${workflowStep === 'phoneUpdate' ? 25 :
                                            workflowStep === 'service' ? 50 :
                                                workflowStep === 'confirmation' ? 75 : 100}%`
                                    }}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Create Service Workflow */}
            {activeTab === 'create' && (
                <>
                    {/* Phone Update Form */}
                    {showPhoneUpdate && selectedVoter && (
                        <PhoneUpdateForm
                            voter={selectedVoter}
                            onPhoneUpdate={handlePhoneUpdate}
                            onSkip={handleSkipPhoneUpdate}
                            onCancel={handleCancel}
                        />
                    )}

                    {/* Beneficiary Service Form */}
                    {showBeneficiaryService && selectedVoter && (
                        <BeneficiaryServiceForm
                            voter={selectedVoter}
                            onServiceCreated={() => { }} // Not used in confirmation flow
                            onServiceDataReady={handleServiceDataReady}
                            onCancel={handleCancel}
                        />
                    )}

                    {/* Confirmation Step */}
                    {showConfirmation && selectedVoter && serviceData && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('operator.confirmation.title')}</CardTitle>
                                <CardDescription>
                                    {t('operator.confirmation.description')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Voter Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">{t('operator.confirmation.voterInfo')}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                                        <div>
                                            <Label className="text-sm font-medium">Name</Label>
                                            <p>{selectedVoter.fullName}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium">EPIC Number</Label>
                                            <p>{selectedVoter.epicNumber}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium">Mobile Primary</Label>
                                            <p>{selectedVoter.mobileNoPrimary || 'Not set'}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium">Mobile Secondary</Label>
                                            <p>{selectedVoter.mobileNoSecondary || 'Not set'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Service Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">{t('operator.confirmation.serviceDetails')}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                                        <div>
                                            <Label className="text-sm font-medium">{t('operator.confirmation.serviceType')}</Label>
                                            <p className="capitalize">{serviceData.serviceType}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium">{t('operator.confirmation.serviceName')}</Label>
                                            <p>{serviceData.serviceName}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium">{t('operator.confirmation.priority')}</Label>
                                            <p className="capitalize">{serviceData.priority || 'Medium'}</p>
                                        </div>
                                        {serviceData.description && (
                                            <div className="md:col-span-2">
                                                <Label className="text-sm font-medium">{t('operator.confirmation.description')}</Label>
                                                <p>{serviceData.description}</p>
                                            </div>
                                        )}
                                        {serviceData.notes && (
                                            <div className="md:col-span-2">
                                                <Label className="text-sm font-medium">{t('operator.confirmation.notes')}</Label>
                                                <p>{serviceData.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-4">
                                    <Button onClick={handleConfirmService} className="flex-1">
                                        {t('operator.confirmation.confirmButton')}
                                    </Button>
                                    <Button variant="outline" onClick={handleCancel}>
                                        {t('common.cancel')}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Completion Step */}
                    {workflowStep === 'completed' && createdService && (
                        <Card className="service-completion-print">
                            <CardHeader>
                                <CardTitle className="text-green-600">{t('operator.completion.title')}</CardTitle>
                                <CardDescription>
                                    {t('operator.completion.description')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Token Display */}
                                <div className="text-center space-y-4 token-display">
                                    <div className="p-6 bg-green-50 border-2 border-green-200 rounded-lg">
                                        <Label className="text-sm font-medium text-green-800">{t('operator.completion.referenceToken')}</Label>
                                        <p className="text-2xl font-bold text-green-900 mt-2">{createdService.token}</p>
                                        <p className="text-sm text-green-700 mt-2">
                                            {t('operator.completion.saveToken')}
                                        </p>
                                    </div>
                                </div>

                                {/* Service Summary */}
                                <div className="space-y-4 service-summary">
                                    <h3 className="text-lg font-semibold">{t('operator.completion.serviceSummary')}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg summary-grid">
                                        <div className="summary-item">
                                            <Label className="text-sm font-medium">{t('operator.completion.serviceId')}</Label>
                                            <p className="font-mono text-sm">{createdService.id}</p>
                                        </div>
                                        <div className="summary-item">
                                            <Label className="text-sm font-medium">{t('operator.completion.token')}</Label>
                                            <p className="font-mono text-sm">{createdService.token}</p>
                                        </div>
                                        <div className="summary-item">
                                            <Label className="text-sm font-medium">{t('operator.confirmation.serviceType')}</Label>
                                            <p className="capitalize">{createdService.serviceType}</p>
                                        </div>
                                        <div className="summary-item">
                                            <Label className="text-sm font-medium">{t('operator.confirmation.serviceName')}</Label>
                                            <p>{createdService.serviceName}</p>
                                        </div>
                                        <div className="summary-item">
                                            <Label className="text-sm font-medium">{t('operator.completion.status')}</Label>
                                            <p className="capitalize">{createdService.status}</p>
                                        </div>
                                        <div className="summary-item">
                                            <Label className="text-sm font-medium">{t('operator.confirmation.priority')}</Label>
                                            <p className="capitalize">{createdService.priority}</p>
                                        </div>
                                        <div className="summary-item">
                                            <Label className="text-sm font-medium">{t('operator.completion.createdAt')}</Label>
                                            <p>{new Date(createdService.createdAt).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-4 no-print">
                                    <Button onClick={handleStartNew} className="flex-1">
                                        {t('operator.completion.createAnother')}
                                    </Button>
                                    <Button onClick={handlePrint} variant="outline" className="flex-1">
                                        <Printer className="mr-2 h-4 w-4" />
                                        {t('operator.completion.print')}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Search Section */}
                    {workflowStep === 'search' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('operator.search.title')}</CardTitle>
                                <CardDescription className="text-sm">
                                    {t('operator.search.description')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {/* Search Type Selection */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                            <input
                                                type="radio"
                                                id="details"
                                                name="searchType"
                                                value="details"
                                                checked={searchType === 'details'}
                                                onChange={(e) => handleSearchTypeChange(e.target.value as 'voterId' | 'phone' | 'details')}
                                                className="size-4"
                                            />
                                            <Label htmlFor="details" className="text-sm font-medium cursor-pointer flex-1">
                                                {t('operator.search.types.detailed')}
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                            <input
                                                type="radio"
                                                id="phone"
                                                name="searchType"
                                                value="phone"
                                                checked={searchType === 'phone'}
                                                onChange={(e) => handleSearchTypeChange(e.target.value as 'voterId' | 'phone' | 'details')}
                                                className="size-4"
                                            />
                                            <Label htmlFor="phone" className="text-sm font-medium cursor-pointer flex-1">
                                                {t('operator.search.types.phone')}
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                            <input
                                                type="radio"
                                                id="voterId"
                                                name="searchType"
                                                value="voterId"
                                                checked={searchType === 'voterId'}
                                                onChange={(e) => handleSearchTypeChange(e.target.value as 'voterId' | 'phone' | 'details')}
                                                className="size-4"
                                            />
                                            <Label htmlFor="voterId" className="text-sm font-medium cursor-pointer flex-1">
                                                {t('operator.search.types.voterId')}
                                            </Label>
                                        </div>
                                    </div>

                                    {/* Search Input */}
                                    {searchType === 'details' ? (
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <Label htmlFor="name">{t('backOffice.nameOptional')}</Label>
                                                    <Input
                                                        id="name"
                                                        value={name}
                                                        onChange={(e) => setName(e.target.value)}
                                                        placeholder={t('operator.search.namePlaceholder')}
                                                        type="text"
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="gender">{t('backOffice.genderOptional')}</Label>
                                                    <Select value={gender} onValueChange={setGender}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={t('backOffice.selectGender')} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="any">{t('backOffice.anyGender')}</SelectItem>
                                                            <SelectItem value="M">{t('backOffice.male')}</SelectItem>
                                                            <SelectItem value="F">{t('backOffice.female')}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div>
                                                    <Label htmlFor="age">{t('backOffice.ageYears')}</Label>
                                                    <Input
                                                        id="age"
                                                        type="number"
                                                        min={18}
                                                        max={100}
                                                        value={age}
                                                        onChange={(e) => setAge(Number.parseInt(e.target.value) || 25)}
                                                        placeholder={t('backOffice.enterAge')}
                                                        className="w-full"
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="ageRange">{t('backOffice.ageRange', { range: ageRange })}</Label>
                                                    <Slider
                                                        id="ageRange"
                                                        min={0}
                                                        max={20}
                                                        step={1}
                                                        value={[ageRange]}
                                                        onValueChange={(value: number[]) => setAgeRange(value[0])}
                                                        className="w-full"
                                                    />
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {t('backOffice.searchRange', { min: age - ageRange, max: age + ageRange })}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <Button onClick={handleSearch} disabled={isSearching} className="flex-1">
                                                    {isSearching ? t('operator.search.searching') : t('common.search')}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        setName('');
                                                        setGender('');
                                                        setAge(25);
                                                        setAgeRange(5);
                                                        setSearchResults([]);
                                                        setLastSearchType(null);
                                                        setHasSearched(false);
                                                        setIsSearching(false);
                                                    }}
                                                    className="px-4"
                                                >
                                                    {t('backOffice.clear')}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div>
                                                <Label htmlFor="search">
                                                    {searchType === 'voterId' ? t('backOffice.voterIdEpicNumber') : t('operator.search.types.phone')}
                                                </Label>
                                                <div className="relative">
                                                    <Input
                                                        id="search"
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        placeholder={
                                                            searchType === 'voterId'
                                                                ? t('operator.search.voterIdPlaceholder')
                                                                : t('operator.search.phonePlaceholder')
                                                        }
                                                        type={searchType === 'phone' ? 'tel' : 'text'}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                                        className="pr-10"
                                                    />
                                                    {searchTerm && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSearchTerm('');
                                                                setSearchResults([]);
                                                                setLastSearchType(null);
                                                                setHasSearched(false);
                                                                setIsSearching(false);
                                                            }}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                            aria-label="Clear search"
                                                        >
                                                            <svg
                                                                width="16"
                                                                height="16"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="2"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            >
                                                                <path d="M18 6 6 18" />
                                                                <path d="m6 6 12 12" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button onClick={handleSearch} disabled={isSearching} className="flex-1">
                                                    {isSearching ? t('operator.search.searching') : t('common.search')}
                                                </Button>
                                                {searchTerm && (
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => {
                                                            setSearchTerm('');
                                                            setSearchResults([]);
                                                            setLastSearchType(null);
                                                            setHasSearched(false);
                                                            setIsSearching(false);
                                                        }}
                                                        className="px-4"
                                                    >
                                                        Clear
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Search Results */}
                                {searchResults.length > 0 && (
                                    <div className="mt-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                                            <h3 className="text-lg font-semibold">{t('backOffice.searchResults')}</h3>
                                            {lastSearchType && (
                                                <span className="text-sm text-muted-foreground">
                                                    {t('operator.search.foundBy', { type: lastSearchType === 'voterId' ? t('backOffice.voterIdType') :
                                                        lastSearchType === 'phone' ? t('operator.search.types.phone') : t('backOffice.detailsType') })}
                                                </span>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            {searchResults.map((voter) => (
                                                <button
                                                    key={voter.epicNumber}
                                                    type="button"
                                                    className="w-full p-4 border rounded-lg hover:bg-muted cursor-pointer text-left transition-colors"
                                                    onClick={() => handleSelectVoter(voter)}
                                                >
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex-1">
                                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                                                <div className="flex flex-col">
                                                                    <p className="font-medium text-lg">{voter.fullName}</p>
                                                                    {voter.relationName && voter.relationType && (
                                                                        <p className="text-sm text-muted-foreground">
                                                                            {voter.relationType}: {voter.relationName}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded w-fit">
                                                                    {voter.epicNumber}
                                                                </span>
                                                            </div>

                                                            {/* Key Details */}
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-2">
                                                                <div className="flex items-center gap-1">
                                                                    <span className="font-medium text-muted-foreground">{t('backOffice.age')}:</span>
                                                                    <span>{voter.age || 'N/A'}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <span className="font-medium text-muted-foreground">{t('backOffice.gender')}:</span>
                                                                    <span>{voter.gender || 'N/A'}</span>
                                                                </div>
                                                            </div>

                                                            {/* Additional Info */}
                                                            <div className="text-xs text-muted-foreground">
                                                                {voter.acNo && `AC: ${voter.acNo}`}
                                                                {voter.wardNo && ` | Ward: ${voter.wardNo}`}
                                                                {voter.boothName && ` | Booth: ${voter.boothName}`}
                                                            </div>
                                                        </div>

                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Loading State */}
                                {isSearching && (
                                    <div className="mt-4 p-6 border border-muted-foreground/25 rounded-lg bg-muted/10">
                                        <div className="flex items-center justify-center gap-3">
                                            <div className="animate-spin rounded-full size-5 border-b-2 border-primary" />
                                            <p className="text-sm text-muted-foreground">
                                                {t('backOffice.searchingVoters')}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* No Results Message */}
                                {hasSearched && !isSearching && searchResults.length === 0 && !showVisitorForm && (
                                    <div className="mt-4 p-4 border border-muted-foreground/25 rounded-lg bg-muted/20">
                                        <div className="flex items-center gap-3">
                                            <div className="text-muted-foreground">
                                                <svg
                                                    className="size-5"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                    />
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-muted-foreground">
                                                    {t('operator.search.noResults')}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {t('operator.search.noResultsHelp')}
                                                </p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                onClick={handleAddAsVisitor}
                                                className="ml-auto"
                                            >
                                                {t('operator.search.addAsVisitor')}
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Visitor Form */}
                                {showVisitorForm && (
                                    <Card className="mt-4">
                                        <CardHeader>
                                            <CardTitle>{t('operator.search.visitorFormTitle')}</CardTitle>
                                            <CardDescription>
                                                Add visitor information for the person who could not be found in the voter database
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <form onSubmit={handleVisitorFormSubmit} className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="visitorName">
                                                            {t('visitorManagement.name')} <span className="text-destructive">*</span>
                                                        </Label>
                                                        <Input
                                                            id="visitorName"
                                                            value={visitorFormData.name}
                                                            onChange={(e) => setVisitorFormData({ ...visitorFormData, name: e.target.value })}
                                                            placeholder={t('visitorManagement.enterVisitorName')}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="visitorContact">
                                                            {t('visitorManagement.contactNumber')} <span className="text-destructive">*</span>
                                                        </Label>
                                                        <Input
                                                            id="visitorContact"
                                                            type="tel"
                                                            value={visitorFormData.contactNumber}
                                                            onChange={(e) => setVisitorFormData({ ...visitorFormData, contactNumber: e.target.value })}
                                                            placeholder={t('visitorManagement.enterContactNumber')}
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="visitorAadhar">
                                                        Aadhar Number <span className="text-destructive">*</span>
                                                    </Label>
                                                    <Input
                                                        id="visitorAadhar"
                                                        type="text"
                                                        maxLength={12}
                                                        value={visitorFormData.aadharNumber}
                                                        onChange={(e) => {
                                                            const value = e.target.value.replace(/\D/g, ''); // Only allow digits
                                                            setVisitorFormData({ ...visitorFormData, aadharNumber: value });
                                                        }}
                                                        placeholder="Enter 12-digit Aadhar number"
                                                        required
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="visitorPurpose">
                                                        {t('visitorManagement.purposeOfVisit')} <span className="text-destructive">*</span>
                                                    </Label>
                                                    <Textarea
                                                        id="visitorPurpose"
                                                        value={visitorFormData.purpose}
                                                        onChange={(e) => setVisitorFormData({ ...visitorFormData, purpose: e.target.value })}
                                                        placeholder={t('visitorManagement.enterPurposeOfVisit')}
                                                        rows={3}
                                                        required
                                                    />
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="programmeEventId">Link to Programme Event (Optional)</Label>
                                                        <Select
                                                            value={visitorFormData.programmeEventId || 'none'}
                                                            onValueChange={(value) => {
                                                                const selectedEventId = value === 'none' ? '' : value;
                                                                const selectedEvent = programmeEvents.find(e => e.id === selectedEventId);
                                                                const updatedForm = { ...visitorFormData, programmeEventId: selectedEventId };
                                                                
                                                                // Auto-fill date and time from event if selected
                                                                if (selectedEvent?.date && selectedEvent?.startTime) {
                                                                    const eventDate = typeof selectedEvent.date === 'string'
                                                                        ? parseISO(selectedEvent.date)
                                                                        : new Date(selectedEvent.date);
                                                                    const [hours, minutes] = selectedEvent.startTime.split(':');
                                                                    eventDate.setHours(Number.parseInt(hours, 10), Number.parseInt(minutes, 10), 0, 0);
                                                                    updatedForm.visitDate = format(eventDate, "yyyy-MM-dd'T'HH:mm");
                                                                }
                                                                setVisitorFormData(updatedForm);
                                                            }}
                                                        >
                                                            <SelectTrigger id="programmeEventId">
                                                                <SelectValue placeholder="Select programme event" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="none">No event selected</SelectItem>
                                                                {programmeEvents.map((event) => (
                                                                    <SelectItem key={event.id} value={event.id}>
                                                                        {formatDateOnly(event.date)} - {event.title}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="visitorDate">
                                                            {t('visitorManagement.visitDate')} <span className="text-destructive">*</span>
                                                        </Label>
                                                        {(() => {
                                                            const hasEvent = !!(visitorFormData.programmeEventId && visitorFormData.programmeEventId !== 'none');
                                                            return (
                                                                <Input
                                                                    id="visitorDate"
                                                                    type="datetime-local"
                                                                    value={visitorFormData.visitDate}
                                                                    onChange={(e) => setVisitorFormData({ ...visitorFormData, visitDate: e.target.value })}
                                                                    disabled={hasEvent}
                                                                    required
                                                                    className={hasEvent ? 'bg-muted' : ''}
                                                                />
                                                            );
                                                        })()}
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    <Button
                                                        type="submit"
                                                        disabled={isSubmittingVisitor}
                                                        className="flex-1"
                                                    >
                                                        {isSubmittingVisitor ? t('common.loading') : t('visitorManagement.submit')}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setShowVisitorForm(false);
                                                            setVisitorFormData({
                                                                name: '',
                                                                contactNumber: '',
                                                                aadharNumber: '',
                                                                purpose: '',
                                                                programmeEventId: '',
                                                                visitDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
                                                            });
                                                        }}
                                                    >
                                                        {t('common.cancel')}
                                                    </Button>
                                                </div>
                                            </form>
                                        </CardContent>
                                    </Card>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
