'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Search, User, FileText, CheckCircle, AlertCircle, ArrowLeft, ArrowRight, Plus } from 'lucide-react';
import { toast } from './toast';
import { useTranslations } from '@/hooks/use-translations';

interface Voter {
    id: string;
    part_no: number;
    serial_no: number;
    name: string;
    gender: string;
    age: number;
    family?: string;
    last_name?: string;
    mobile?: string;
    email?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface Service {
    id: string;
    name: string;
    description?: string;
    category: string;
    type: 'one-to-one' | 'one-to-many';
}

interface BeneficiaryService {
    serviceId: string;
    serviceType: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    expectedCompletionDate: string;
    // For one-to-one services
    voterId?: string;
    // For one-to-many services
    partNumbers?: number[];
}

type FormStep = 'service-selection' | 'beneficiary-identification' | 'service-details' | 'confirmation';

export function AddBeneficiaryServiceForm({
    onClose,
    sendMessage
}: {
    onClose: () => void;
    sendMessage: (message: any) => void;
}) {
    const { t } = useTranslations();
    // Helper function to format dates in human-readable format
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Check if it's today or tomorrow for more natural language
        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return 'Tomorrow';
        } else {
            return date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    };

    const [currentStep, setCurrentStep] = useState<FormStep>('service-selection');
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [serviceType, setServiceType] = useState<'one-to-one' | 'one-to-many' | null>(null);

    // For one-to-one services
    const [voterId, setVoterId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Voter[]>([]);
    const [selectedVoter, setSelectedVoter] = useState<Voter | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    // For one-to-many services
    const [availableParts, setAvailableParts] = useState<number[]>([]);
    const [isLoadingParts, setIsLoadingParts] = useState(false);

    // Service details
    const [serviceDetails, setServiceDetails] = useState<Partial<BeneficiaryService>>({
        priority: 'medium'
    });

    // Services list
    const [services, setServices] = useState<Service[]>([]);
    const [isLoadingServices, setIsLoadingServices] = useState(false);

    // Service creation
    const [showServiceCreation, setShowServiceCreation] = useState(false);
    const [newService, setNewService] = useState({
        name: '',
        description: '',
        type: 'one-to-one' as 'one-to-one' | 'one-to-many',
        category: ''
    });
    const [isCreatingService, setIsCreatingService] = useState(false);
    const [serviceSearchQuery, setServiceSearchQuery] = useState('');

    // Fetch services and parts when component mounts
    useEffect(() => {
        const fetchServices = async () => {
            setIsLoadingServices(true);
            try {
                const response = await fetch('/api/services');
                const result = await response.json();
                if (result.success) {
                    const allServices = [
                        ...result.data.oneToOneServices,
                        ...result.data.oneToManyServices
                    ];
                    setServices(allServices);
                }
            } catch (error) {
                console.error('Error fetching services:', error);
                toast({ type: 'error', description: 'Failed to load services' });
            } finally {
                setIsLoadingServices(false);
            }
        };

        const fetchParts = async () => {
            setIsLoadingParts(true);
            try {
                const response = await fetch('/api/voters/parts');
                const result = await response.json();
                if (result.success) {
                    setAvailableParts(result.data.partNumbers);
                }
            } catch (error) {
                console.error('Error fetching parts:', error);
                toast({ type: 'error', description: 'Failed to load part numbers' });
            } finally {
                setIsLoadingParts(false);
            }
        };

        fetchServices();
        fetchParts();
    }, []);

    // Debug: Monitor showServiceCreation state changes
    useEffect(() => {
        console.log('showServiceCreation state changed to:', showServiceCreation);
    }, [showServiceCreation]);

    const handleVoterIdSubmit = async () => {
        if (!voterId.trim()) {
            toast({ type: 'error', description: 'Please enter a Voter ID' });
            return;
        }

        setIsSearching(true);

        try {
            const response = await fetch(`/api/voters/search?voterId=${encodeURIComponent(voterId.trim())}`);
            const result = await response.json();

            if (result.success && result.data.length > 0) {
                setSelectedVoter(result.data[0]);
                setCurrentStep('beneficiary-identification');
            } else {
                setCurrentStep('beneficiary-identification');
                toast({ type: 'error', description: 'Voter ID not found. Please search by name or create a new voter registration task.' });
            }
        } catch (error) {
            console.error('Error searching by voter ID:', error);
            toast({ type: 'error', description: 'Failed to search for voter ID. Please try again.' });
        } finally {
            setIsSearching(false);
        }
    };

    const handleNameSearch = async () => {
        if (!searchQuery.trim()) {
            toast({ type: 'error', description: 'Please enter a name to search' });
            return;
        }

        setIsSearching(true);

        try {
            const response = await fetch(`/api/voters/search?name=${encodeURIComponent(searchQuery.trim())}`);
            const result = await response.json();

            if (result.success) {
                setSearchResults(result.data);
                if (result.data.length === 0) {
                    toast({ type: 'error', description: 'No voters found with that name.' });
                }
            } else {
                toast({ type: 'error', description: 'Failed to search for voters. Please try again.' });
            }
        } catch (error) {
            console.error('Error searching by name:', error);
            toast({ type: 'error', description: 'Failed to search for voters. Please try again.' });
        } finally {
            setIsSearching(false);
        }
    };

    const handleVoterSelect = (voter: Voter) => {
        setSelectedVoter(voter);
        setVoterId(voter.id);
        setCurrentStep('beneficiary-identification');
        toast({ type: 'success', description: `Selected voter: ${voter.name}` });
    };

    const handleCreateVoterRegistration = () => {
        const message = `Create a new voter registration task for: ${searchQuery}. This person needs to be registered in the voter database before we can create beneficiary services.`;
        sendMessage({
            role: 'user',
            parts: [{ type: 'text', text: message }],
        });
        onClose();
    };

    const handleServiceSelection = (service: Service) => {
        setSelectedService(service);
        setServiceType(service.type);
        setServiceDetails(prev => ({
            ...prev,
            serviceId: service.id,
            serviceType: service.name
        }));
    };

    const handleCreateNewService = async () => {
        console.log('Creating new service:', newService);

        if (!newService.name.trim() || !newService.category.trim()) {
            toast({ type: 'error', description: 'Please fill in service name and category' });
            return;
        }

        setIsCreatingService(true);
        try {
            console.log('Sending request to /api/services/create');
            const response = await fetch('/api/services/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newService),
            });

            console.log('Response status:', response.status);
            const result = await response.json();
            console.log('Response result:', result);

            if (result.success) {
                // Add the new service to the services list
                const createdService = result.data;
                console.log('Created service:', createdService);
                setServices(prev => [...prev, createdService]);

                // Select the newly created service
                setSelectedService(createdService);
                setServiceType(createdService.type);
                setServiceDetails(prev => ({
                    ...prev,
                    serviceId: createdService.id,
                    serviceType: createdService.name
                }));

                // Hide the service creation form
                setShowServiceCreation(false);

                // Reset the form
                setNewService({
                    name: '',
                    description: '',
                    type: 'one-to-one',
                    category: ''
                });

                toast({ type: 'success', description: t('beneficiaryService.messages.createdSuccess') });
            } else {
                console.error('Service creation failed:', result.error);
                toast({ type: 'error', description: result.error || t('beneficiaryService.messages.createFailed') });
            }
        } catch (error) {
            console.error('Error creating service:', error);
            toast({ type: 'error', description: t('beneficiaryService.messages.createFailed') });
        } finally {
            setIsCreatingService(false);
        }
    };

    const handleServiceDetailsSubmit = () => {
        if (!serviceDetails.serviceId || !serviceDetails.description) {
            toast({ type: 'error', description: 'Please fill in all required fields' });
            return;
        }

        // Validate based on service type
        if (serviceType === 'one-to-one' && !selectedVoter) {
            toast({ type: 'error', description: 'Please select a voter for one-to-one service' });
            return;
        }

        if (serviceType === 'one-to-many' && (!serviceDetails.partNumbers || serviceDetails.partNumbers.length === 0)) {
            toast({ type: 'error', description: 'Please select at least one part number for one-to-many service' });
            return;
        }

        // Debug logging
        console.log('Submitting service details:', serviceDetails);
        console.log('Priority before confirmation:', serviceDetails.priority);

        setCurrentStep('confirmation');
    };

    const handleFinalSubmit = async () => {
        if (!selectedService || !serviceDetails.description) {
            toast({ type: 'error', description: 'Missing required information' });
            return;
        }

        // Validate based on service type
        if (serviceType === 'one-to-one' && !selectedVoter) {
            toast({ type: 'error', description: 'Please select a voter for one-to-one service' });
            return;
        }

        if (serviceType === 'one-to-many' && (!serviceDetails.partNumbers || serviceDetails.partNumbers.length === 0)) {
            toast({ type: 'error', description: 'Please select at least one part number for one-to-many service' });
            return;
        }

        try {
            const response = await fetch('/api/beneficiary/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    serviceId: serviceDetails.serviceId,
                    description: serviceDetails.description,
                    priority: serviceDetails.priority,
                    expectedCompletionDate: serviceDetails.expectedCompletionDate,
                    voterId: serviceType === 'one-to-one' ? selectedVoter?.id : undefined,
                    partNumbers: serviceType === 'one-to-many' ? serviceDetails.partNumbers : undefined,
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast({ type: 'success', description: result.message });
                onClose();
            } else {
                toast({ type: 'error', description: result.error || t('beneficiaryService.messages.createFailed') });
            }
        } catch (error) {
            console.error('Error creating beneficiary:', error);
            toast({ type: 'error', description: t('beneficiaryService.messages.createFailed') });
        }
    };

    const goBack = () => {
        switch (currentStep) {
            case 'beneficiary-identification':
                setCurrentStep('service-selection');
                setSelectedVoter(null);
                setVoterId('');
                setServiceDetails(prev => ({ ...prev, partNumbers: [] }));
                break;
            case 'service-details':
                setCurrentStep('beneficiary-identification');
                break;
            case 'confirmation':
                setCurrentStep('service-details');
                break;
            default:
                onClose();
        }
    };

    const renderServiceSelection = () => (

        showServiceCreation ? (
            <div onClick={(e) => e.stopPropagation()}>
                <Card className="p-4 border-dashed">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Create New Service</CardTitle>
                        <CardDescription>
                            Add a new service type that doesn&apos;t exist in the system
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="serviceName">Service Name *</Label>
                                <Input
                                    id="serviceName"
                                    placeholder="Enter service name"
                                    value={newService.name}
                                    onChange={(e) => {
                                        e.preventDefault();
                                        console.log('Service name changed to:', e.target.value);
                                        setNewService(prev => ({ ...prev, name: e.target.value }));
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                        }
                                    }}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="serviceCategory">Category *</Label>
                                <Input
                                    id="serviceCategory"
                                    placeholder="e.g., Healthcare, Education, etc."
                                    value={newService.category}
                                    onChange={(e) => {
                                        e.preventDefault();
                                        console.log('Service category changed to:', e.target.value);
                                        setNewService(prev => ({ ...prev, category: e.target.value }));
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                        }
                                    }}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="serviceDescription">Description</Label>
                            <textarea
                                id="serviceDescription"
                                placeholder="Describe what this service provides..."
                                className="w-full p-2 border rounded-md bg-background min-h-[80px] resize-none"
                                value={newService.description}
                                onChange={(e) => setNewService(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Service Type *</Label>
                            <div className="flex gap-3">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="serviceType"
                                        value="one-to-one"
                                        checked={newService.type === 'one-to-one'}
                                        onChange={(e) => {
                                            console.log('Service type changed to:', e.target.value);
                                            setNewService(prev => ({ ...prev, type: e.target.value as 'one-to-one' | 'one-to-many' }));
                                        }}
                                        className="rounded"
                                    />
                                    <span className="text-sm">Individual Service (one-to-one)</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="serviceType"
                                        value="one-to-many"
                                        checked={newService.type === 'one-to-many'}
                                        onChange={(e) => {
                                            console.log('Service type changed to:', e.target.value);
                                            setNewService(prev => ({ ...prev, type: e.target.value as 'one-to-one' | 'one-to-many' }));
                                        }}
                                        className="rounded"
                                    />
                                    <span className="text-sm">Public Works (one-to-many)</span>
                                </label>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => {
                                    console.log('Create Service button clicked');
                                    console.log('Current newService state:', newService);
                                    handleCreateNewService();
                                }}
                                disabled={isCreatingService || !newService.name.trim() || !newService.category.trim()}
                            >
                                {isCreatingService ? t('beneficiaryService.form.submitting') : t('beneficiaryService.form.submit')}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowServiceCreation(false);
                                    setNewService({
                                        name: '',
                                        description: '',
                                        type: 'one-to-one',
                                        category: ''
                                    });
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        ) :
            <Card className="w-full max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="size-5" />
                        Select Service Type
                    </CardTitle>
                    <CardDescription>
                        Choose an existing service or create a new one if none match your request.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Service Search */}
                    <div className="space-y-2">
                        <Label className="text-base font-medium">Search Services</Label>
                        <Input
                            placeholder="Search for services by name or category..."
                            value={serviceSearchQuery}
                            onChange={(e) => setServiceSearchQuery(e.target.value)}
                            className="w-full"
                        />
                    </div>

                    {/* Services Section */}
                    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-lg font-semibold text-foreground">Available Services</Label>
                                <div className="text-sm text-muted-foreground mt-1">
                                    {services.length} service{services.length !== 1 ? 's' : ''} available
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('Add New Service button clicked');
                                    setShowServiceCreation(true);
                                }}
                            >
                                <Plus className="size-4 mr-2" />
                                Add New Service
                            </Button>
                        </div>

                        {isLoadingServices ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <div className="animate-spin rounded-full size-8 border-b-2 border-primary mx-auto mb-2" />
                                Loading services...
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {services
                                    .filter(service =>
                                        service.name.toLowerCase().includes(serviceSearchQuery.toLowerCase()) ||
                                        service.category.toLowerCase().includes(serviceSearchQuery.toLowerCase()) ||
                                        service.description?.toLowerCase().includes(serviceSearchQuery.toLowerCase())
                                    )
                                    .map((service) => (
                                        <Card
                                            key={service.id}
                                            className={`p-4 cursor-pointer transition-all duration-200 border-2 relative ${selectedService?.id === service.id
                                                ? 'border-primary bg-primary/5 shadow-md'
                                                : 'border-border hover:border-primary/50 hover:bg-accent/50 hover:shadow-sm'
                                                }`}
                                            onClick={() => handleServiceSelection(service)}
                                        >
                                            {selectedService?.id === service.id && (
                                                <div className="absolute -top-2 -right-2 size-6 bg-primary rounded-full flex items-center justify-center">
                                                    <CheckCircle className="size-4 text-primary-foreground" />
                                                </div>
                                            )}
                                            <div className="space-y-3">
                                                <div className="font-bold text-lg text-foreground leading-tight">{service.name}</div>
                                                <div className="text-sm text-muted-foreground leading-relaxed">
                                                    {service.description || 'No description'}
                                                </div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Badge variant={service.type === 'one-to-one' ? 'default' : 'secondary'} className="text-xs">
                                                        {service.type === 'one-to-one' ? 'Individual' : 'Public Works'}
                                                    </Badge>
                                                    <Badge variant="outline" className="text-xs">
                                                        {service.category}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                            </div>
                        )}

                        {services.filter(service =>
                            service.name.toLowerCase().includes(serviceSearchQuery.toLowerCase()) ||
                            service.category.toLowerCase().includes(serviceSearchQuery.toLowerCase()) ||
                            service.description?.toLowerCase().includes(serviceSearchQuery.toLowerCase())
                        ).length === 0 && !isLoadingServices && (
                                <div className="text-center py-8 text-muted-foreground">
                                    <FileText className="size-12 mx-auto mb-3 opacity-50" />
                                    <div className="font-medium">No services found</div>
                                    <div className="text-sm">Try a different search term or create a new service</div>
                                </div>
                            )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-between">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => setCurrentStep('beneficiary-identification')}
                            disabled={!selectedService}
                        >
                            Continue
                            <ArrowRight className="size-4 ml-2" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
    );

    const renderBeneficiaryIdentification = () => (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <User className="size-5" />
                    Identify Beneficiaries
                </CardTitle>
                <CardDescription>
                    {serviceType === 'one-to-one'
                        ? 'Enter Voter ID or search by name to identify the individual beneficiary for this service.'
                        : 'Select part numbers to identify the areas/communities where this public works service will be implemented.'
                    }
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {serviceType === 'one-to-one' && (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="voterId">Voter ID</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="voterId"
                                    placeholder="Enter Voter ID (e.g., V001234567)"
                                    value={voterId}
                                    onChange={(e) => setVoterId(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleVoterIdSubmit()}
                                />
                                <Button
                                    onClick={handleVoterIdSubmit}
                                    disabled={isSearching || !voterId.trim()}
                                >
                                    {isSearching ? 'Searching...' : 'Search'}
                                </Button>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">Or</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="searchQuery">Search by Name</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="searchQuery"
                                    placeholder="Enter beneficiary name"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleNameSearch()}
                                />
                                <Button
                                    onClick={handleNameSearch}
                                    disabled={isSearching || !searchQuery.trim()}
                                >
                                    {isSearching ? 'Searching...' : 'Search'}
                                </Button>
                            </div>
                        </div>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div className="space-y-2">
                                <Label>Search Results</Label>
                                <div className="space-y-2">
                                    {searchResults.map((voter) => (
                                        <Card
                                            key={voter.id}
                                            className="p-3 cursor-pointer hover:bg-accent transition-colors"
                                            onClick={() => handleVoterSelect(voter)}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-medium">{voter.name}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        Voter ID: {voter.id} • Age: {voter.age} • {voter.gender}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Part: {voter.part_no} • Serial: {voter.serial_no}
                                                    </div>
                                                </div>
                                                <Badge variant="secondary">Select</Badge>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Create Voter Registration Option */}
                        {searchQuery && searchResults.length === 0 && !isSearching && (
                            <Card className="p-4 border-dashed">
                                <div className="text-center space-y-2">
                                    <AlertCircle className="size-8 mx-auto text-muted-foreground" />
                                    <div className="font-medium">No voters found</div>
                                    <div className="text-sm text-muted-foreground">
                                        Would you like to create a voter registration task for this person?
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={handleCreateVoterRegistration}
                                        className="mt-2"
                                    >
                                        Create Voter Registration Task
                                    </Button>
                                </div>
                            </Card>
                        )}

                        {/* Selected Voter Display */}
                        {selectedVoter && (
                            <Card className="p-4 border-2 border-primary bg-primary/5">
                                <div className="space-y-2">
                                    <div className="font-medium text-primary">Selected Voter</div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div><span className="font-medium">Name:</span> {selectedVoter.name}</div>
                                        <div><span className="font-medium">Voter ID:</span> {selectedVoter.id}</div>
                                        <div><span className="font-medium">Age:</span> {selectedVoter.age}</div>
                                        <div><span className="font-medium">Gender:</span> {selectedVoter.gender}</div>
                                        <div><span className="font-medium">Part:</span> {selectedVoter.part_no}</div>
                                        <div><span className="font-medium">Serial:</span> {selectedVoter.serial_no}</div>
                                    </div>
                                </div>
                            </Card>
                        )}
                    </>
                )}

                {serviceType === 'one-to-many' && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Select Part Numbers *</Label>
                            <div className="text-sm text-muted-foreground">
                                Select the part numbers where this public works service will be implemented
                            </div>
                            {isLoadingParts ? (
                                <div className="text-center py-4 text-muted-foreground">Loading parts...</div>
                            ) : (
                                <div className="grid grid-cols-3 gap-3 max-h-40 overflow-y-auto p-2 border rounded-md">
                                    {availableParts.map((partNo) => (
                                        <label key={partNo} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-accent/50">
                                            <input
                                                type="checkbox"
                                                checked={serviceDetails.partNumbers?.includes(partNo) || false}
                                                onChange={(e) => {
                                                    const currentParts = serviceDetails.partNumbers || [];
                                                    if (e.target.checked) {
                                                        setServiceDetails(prev => ({
                                                            ...prev,
                                                            partNumbers: [...currentParts, partNo]
                                                        }));
                                                    } else {
                                                        setServiceDetails(prev => ({
                                                            ...prev,
                                                            partNumbers: currentParts.filter(p => p !== partNo)
                                                        }));
                                                    }
                                                }}
                                                className="rounded"
                                            />
                                            <span className="text-sm font-medium">Part {partNo}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Selected Parts Display */}
                        {serviceDetails.partNumbers && serviceDetails.partNumbers.length > 0 && (
                            <Card className="p-4 border-2 border-primary bg-primary/5">
                                <div className="space-y-2">
                                    <div className="font-medium text-primary">Selected Parts</div>
                                    <div className="flex flex-wrap gap-2">
                                        {serviceDetails.partNumbers.map((partNo) => (
                                            <Badge key={partNo} variant="default">
                                                Part {partNo}
                                            </Badge>
                                        ))}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Total: {serviceDetails.partNumbers.length} part(s) selected
                                    </div>
                                </div>
                            </Card>
                        )}
                    </div>
                )}





                <div className="flex justify-end">
                    <Button variant="outline" onClick={goBack}>
                        <ArrowLeft className="size-4 mr-2" />
                        Back
                    </Button>
                    <Button
                        onClick={() => setCurrentStep('service-details')}
                        disabled={
                            (serviceType === 'one-to-one' && !selectedVoter) ||
                            (serviceType === 'one-to-many' && (!serviceDetails.partNumbers || serviceDetails.partNumbers.length === 0))
                        }
                    >
                        Continue
                        <ArrowRight className="size-4 ml-2" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );

    const renderServiceDetails = () => (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="size-5" />
                    {t('operator.confirmation.serviceDetails')}
                </CardTitle>
                <CardDescription>
                    Provide details about the beneficiary service request
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Service Summary from Step 1 */}
                {selectedService && (
                    <div className="space-y-3 p-4 border rounded-lg bg-primary/5">
                        <div className="font-medium text-sm text-primary">Selected Service</div>
                        <div className="space-y-2">
                            <div className="text-sm">
                                <span className="font-medium">Service:</span> {selectedService.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                                <span className="font-medium">Category:</span> {selectedService.category}
                            </div>
                            {selectedService.description && (
                                <div className="text-sm text-muted-foreground">
                                    <span className="font-medium">Description:</span> {selectedService.description}
                                </div>
                            )}
                            <div className="text-sm text-muted-foreground">
                                <span className="font-medium">Type:</span>
                                <Badge variant={selectedService.type === 'one-to-one' ? 'default' : 'secondary'} className="ml-2 text-xs">
                                    {selectedService.type === 'one-to-one' ? 'Individual Service' : 'Public Works'}
                                </Badge>
                            </div>
                        </div>
                    </div>
                )}

                {/* Beneficiary Summary */}
                <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                    <div className="font-medium text-sm">Selected Beneficiaries</div>
                    {serviceType === 'one-to-one' && selectedVoter && (
                        <div className="text-sm text-muted-foreground">
                            <span className="font-medium">Individual:</span> {selectedVoter.name} ({selectedVoter.id})
                        </div>
                    )}
                    {serviceType === 'one-to-many' && serviceDetails.partNumbers && serviceDetails.partNumbers.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                            <span className="font-medium">Parts:</span> {serviceDetails.partNumbers.join(', ')} ({serviceDetails.partNumbers.length} part(s))
                        </div>
                    )}
                </div>

                {/* Service Description */}
                <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <textarea
                        id="description"
                        placeholder="Describe the service needed..."
                        className="w-full p-2 border rounded-md bg-background min-h-[100px] resize-none"
                        value={serviceDetails.description || ''}
                        onChange={(e) => setServiceDetails(prev => ({ ...prev, description: e.target.value }))}
                    />
                </div>

                {/* Priority and Completion Date */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="priority">Priority</Label>
                        <select
                            id="priority"
                            className="w-full p-2 border rounded-md bg-background"
                            value={serviceDetails.priority || 'medium'}
                            onChange={(e) => {
                                console.log('Priority changed to:', e.target.value);
                                setServiceDetails(prev => ({ ...prev, priority: e.target.value as any }));
                            }}
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="expectedDate">Expected Completion</Label>
                        <Input
                            id="expectedDate"
                            type="date"
                            value={serviceDetails.expectedCompletionDate || ''}
                            onChange={(e) => setServiceDetails(prev => ({ ...prev, expectedCompletionDate: e.target.value }))}
                        />
                    </div>
                </div>

                <div className="flex justify-between">
                    <Button variant="outline" onClick={goBack}>
                        <ArrowLeft className="size-4 mr-2" />
                        Back
                    </Button>
                    <Button
                        onClick={() => setCurrentStep('confirmation')}
                        disabled={!serviceDetails.description}
                    >
                        Continue
                        <ArrowRight className="size-4 ml-2" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );

    const renderConfirmation = () => {
        // Debug logging
        console.log('Service Details in Confirmation:', serviceDetails);
        console.log('Priority value:', serviceDetails.priority);

        return (
            <Card className="w-full max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="size-5 text-green-600" />
                        Confirm Service Request
                    </CardTitle>
                    <CardDescription>
                        Please review the details before submitting
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="font-medium">Service:</span> {serviceDetails.serviceType}
                            </div>
                            <div>
                                <span className="font-medium">Service ID:</span> {serviceDetails.serviceId}
                            </div>
                            {serviceType === 'one-to-one' ? (
                                <>
                                    <div>
                                        <span className="font-medium">Voter:</span> {selectedVoter?.name}
                                    </div>
                                    <div>
                                        <span className="font-medium">Voter ID:</span> {selectedVoter?.id}
                                    </div>
                                </>
                            ) : (
                                <div className="col-span-2">
                                    <span className="font-medium">Part Numbers:</span>
                                    <span className="ml-1 font-normal">
                                        {serviceDetails.partNumbers?.join(', ') || 'None selected'}
                                    </span>
                                </div>
                            )}
                            <div>
                                <span className="font-medium">Priority:</span>
                                <span className="ml-1 font-normal">
                                    {serviceDetails.priority ? serviceDetails.priority.charAt(0).toUpperCase() + serviceDetails.priority.slice(1) : 'Medium'}
                                </span>
                            </div>
                            <div className="col-span-2">
                                <span className="font-medium">Description:</span>
                                <div className="mt-1 text-muted-foreground">{serviceDetails.description}</div>
                            </div>
                            {serviceDetails.expectedCompletionDate && (
                                <div>
                                    <span className="font-medium">Expected Completion:</span>
                                    <span className="ml-1 font-normal">
                                        {formatDate(serviceDetails.expectedCompletionDate)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-between">
                        <Button variant="outline" onClick={goBack}>
                            <ArrowLeft className="size-4 mr-2" />
                            Back
                        </Button>
                        <Button onClick={handleFinalSubmit} className="bg-green-600 hover:bg-green-700">
                            Submit Service Request
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    };

    const renderCurrentStep = () => {
        switch (currentStep) {
            case 'service-selection':
                return renderServiceSelection();
            case 'beneficiary-identification':
                return renderBeneficiaryIdentification();
            case 'service-details':
                return renderServiceDetails();
            case 'confirmation':
                return renderConfirmation();
            default:
                return renderServiceSelection();
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    console.log('Background clicked, closing form');
                    onClose();
                }
            }}
        >
            <div className="w-full max-w-4xl">
                {renderCurrentStep()}
            </div>
        </div>
    );
} 