'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Phone, MapPin, Calendar, FileText, Users, Edit, Briefcase, Clock } from 'lucide-react';
import type { VoterWithPartNo, BeneficiaryService, DailyProgramme } from '@/lib/db/schema';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface VoterProfileProps {
  epicNumber: string;
}

interface BeneficiaryServicesData {
  individual: BeneficiaryService[];
  community: BeneficiaryService[];
}

interface DailyProgrammeEvent extends DailyProgramme {
  visitorName: string;
}

interface RelatedVoterData {
  voter: VoterWithPartNo;
  services: BeneficiaryServicesData;
  events: DailyProgrammeEvent[];
}

export function VoterProfile({ epicNumber }: VoterProfileProps) {
  const router = useRouter();
  const [voter, setVoter] = useState<VoterWithPartNo | null>(null);
  const [relatedVoters, setRelatedVoters] = useState<VoterWithPartNo[]>([]);
  const [beneficiaryServices, setBeneficiaryServices] = useState<BeneficiaryServicesData>({ individual: [], community: [] });
  const [dailyProgrammeEvents, setDailyProgrammeEvents] = useState<DailyProgrammeEvent[]>([]);
  const [relatedVotersData, setRelatedVotersData] = useState<RelatedVoterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleBackToProfileUpdate = () => {
    // if (typeof window !== 'undefined' && window.history.length > 1) {
    //   router.back();
    //   return;
    // }

    router.push('/modules/back-office');
  };

  useEffect(() => {
    const fetchVoterProfile = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/voter/${encodeURIComponent(epicNumber)}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Voter not found');
          } else {
            setError('Failed to load voter profile');
          }
          return;
        }

        const data = await response.json();
        if (data.success) {
          setVoter(data.voter);
          setRelatedVoters(data.relatedVoters || []);
          setBeneficiaryServices(data.beneficiaryServices || { individual: [], community: [] });
          setDailyProgrammeEvents(data.dailyProgrammeEvents || []);
          setRelatedVotersData(data.relatedVotersData || []);
        } else {
          setError('Failed to load voter profile');
        }
      } catch (err) {
        console.error('Error fetching voter profile:', err);
        setError('Failed to load voter profile');
      } finally {
        setLoading(false);
      }
    };

    fetchVoterProfile();
  }, [epicNumber]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading voter profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !voter) {
    return (
      <div className="container mx-auto p-6">
        <Button
          variant="ghost"
          onClick={handleBackToProfileUpdate}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">{error || 'Voter not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Button
        variant="ghost"
        onClick={handleBackToProfileUpdate}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      {/* Voter Details */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Voter Profile
              </CardTitle>
              <CardDescription>Complete voter information and details</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/modules/voter/${encodeURIComponent(epicNumber)}/edit`)}
              className="ml-4"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Basic Information
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
              {voter.age && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Age</label>
                  <p className="text-base">{voter.age}</p>
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
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Primary Mobile</label>
                <p className="text-base">{voter.mobileNoPrimary || 'Not set'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Secondary Mobile</label>
                <p className="text-base">{voter.mobileNoSecondary || 'Not set'}</p>
              </div>
            </div>
          </div>

          {/* Location Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {voter.acNo && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">AC Number</label>
                  <p className="text-base">{voter.acNo}</p>
                </div>
              )}
              {voter.wardNo && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Ward Number</label>
                  <p className="text-base">{voter.wardNo}</p>
                </div>
              )}
              {voter.partNo && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Part Number</label>
                  <p className="text-base">{voter.partNo}</p>
                </div>
              )}
              {voter.srNo && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Serial Number</label>
                  <p className="text-base">{voter.srNo}</p>
                </div>
              )}
              {voter.houseNumber && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">House Number</label>
                  <p className="text-base">{voter.houseNumber}</p>
                </div>
              )}
              {voter.pincode && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Pincode</label>
                  <p className="text-base">{voter.pincode}</p>
                </div>
              )}
              {voter.address && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Address</label>
                  <p className="text-base">{voter.address}</p>
                </div>
              )}
              {voter.boothName && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Booth Name</label>
                  <p className="text-base">{voter.boothName}</p>
                </div>
              )}
              {voter.englishBoothAddress && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Booth Address</label>
                  <p className="text-base">{voter.englishBoothAddress}</p>
                </div>
              )}
            </div>
          </div>

          {/* Voting Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Voting Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Voted in 2024</label>
                <p className="text-base">{voter.isVoted2024 ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Related Voters */}
      {relatedVoters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Related Voters
            </CardTitle>
            <CardDescription>
              Voters related by family, relation, or same household
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {relatedVoters.map((relatedVoter) => (
                <Link
                  key={relatedVoter.epicNumber}
                  href={`/modules/voter/${encodeURIComponent(relatedVoter.epicNumber)}`}
                  className="block p-4 border rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-medium text-lg">{relatedVoter.fullName}</p>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {relatedVoter.epicNumber}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-2">
                        {relatedVoter.age && (
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-muted-foreground">Age:</span>
                            <span>{relatedVoter.age}</span>
                          </div>
                        )}
                        {relatedVoter.gender && (
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-muted-foreground">Gender:</span>
                            <span>{relatedVoter.gender}</span>
                          </div>
                        )}
                      </div>
                      {relatedVoter.relationType && relatedVoter.relationName && (
                        <p className="text-sm text-muted-foreground">
                          {relatedVoter.relationType}: {relatedVoter.relationName}
                        </p>
                      )}
                      <div className="text-xs text-muted-foreground mt-2">
                        {relatedVoter.acNo && `AC: ${relatedVoter.acNo}`}
                        {relatedVoter.wardNo && ` | Ward: ${relatedVoter.wardNo}`}
                        {relatedVoter.boothName && ` | Booth: ${relatedVoter.boothName}`}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-sm">
                        <span className="font-medium text-muted-foreground">Primary:</span>
                        <p className="text-sm">{relatedVoter.mobileNoPrimary || 'Not set'}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Beneficiary Services Availed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Beneficiary Services Availed
          </CardTitle>
          <CardDescription>
            Services requested and availed by this voter
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Individual Services */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Individual Services</h3>
            {beneficiaryServices.individual.length > 0 ? (
              <div className="space-y-3">
                {beneficiaryServices.individual.map((service) => (
                  <div key={service.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-base">{service.serviceName}</h4>
                        {service.description && (
                          <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Badge variant={service.status === 'completed' ? 'default' : service.status === 'cancelled' ? 'destructive' : 'secondary'}>
                          {service.status}
                        </Badge>
                        <Badge variant="outline">{service.priority}</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-muted-foreground">Token:</span>
                        <p className="mt-1">{service.token}</p>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">Created:</span>
                        <p className="mt-1">{new Date(service.createdAt).toLocaleDateString()}</p>
                      </div>
                      {service.completedAt && (
                        <div>
                          <span className="font-medium text-muted-foreground">Completed:</span>
                          <p className="mt-1">{new Date(service.completedAt).toLocaleDateString()}</p>
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-muted-foreground">Updated:</span>
                        <p className="mt-1">{new Date(service.updatedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {service.notes && (
                      <div className="mt-2 pt-2 border-t">
                        <span className="font-medium text-sm text-muted-foreground">Notes:</span>
                        <p className="text-sm mt-1">{service.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No individual services found.</p>
            )}
          </div>

          {/* Community-Based Services */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Community-Based Services</h3>
            {beneficiaryServices.community.length > 0 ? (
              <div className="space-y-3">
                {beneficiaryServices.community.map((service) => (
                  <div key={service.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-base">{service.serviceName}</h4>
                        {service.description && (
                          <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Badge variant={service.status === 'completed' ? 'default' : service.status === 'cancelled' ? 'destructive' : 'secondary'}>
                          {service.status}
                        </Badge>
                        <Badge variant="outline">{service.priority}</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-muted-foreground">Token:</span>
                        <p className="mt-1">{service.token}</p>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">Created:</span>
                        <p className="mt-1">{new Date(service.createdAt).toLocaleDateString()}</p>
                      </div>
                      {service.completedAt && (
                        <div>
                          <span className="font-medium text-muted-foreground">Completed:</span>
                          <p className="mt-1">{new Date(service.completedAt).toLocaleDateString()}</p>
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-muted-foreground">Updated:</span>
                        <p className="mt-1">{new Date(service.updatedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {service.notes && (
                      <div className="mt-2 pt-2 border-t">
                        <span className="font-medium text-sm text-muted-foreground">Notes:</span>
                        <p className="text-sm mt-1">{service.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No community-based services found.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Daily Programme Events Attended */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Daily Programme Events Attended
          </CardTitle>
          <CardDescription>
            Events and programmes attended by this voter
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dailyProgrammeEvents.length > 0 ? (
            <div className="space-y-3">
              {dailyProgrammeEvents.map((event) => (
                <div key={event.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-base">{event.title}</h4>
                      {event.remarks && (
                        <p className="text-sm text-muted-foreground mt-1">{event.remarks}</p>
                      )}
                    </div>
                    {event.attended !== null && (
                      <Badge variant={event.attended ? 'default' : 'secondary'}>
                        {event.attended ? 'Attended' : 'Not Attended'}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">Date:</span>
                      <p className="mt-1">{new Date(event.date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Time:</span>
                      <p className="mt-1">{event.startTime}{event.endTime ? ` - ${event.endTime}` : ''}</p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Location:</span>
                      <p className="mt-1">{event.location}</p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Visitor Name:</span>
                      <p className="mt-1">{event.visitorName}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No daily programme events found.</p>
          )}
        </CardContent>
      </Card>

      {/* Related Voters Services and Events */}
      {relatedVotersData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Related Voters Services and Events
            </CardTitle>
            <CardDescription>
              Services and events for related voters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" defaultValue={[]}>
              {relatedVotersData.map((relatedData) => {
                const hasServices = relatedData.services.individual.length > 0 || relatedData.services.community.length > 0;
                const hasEvents = relatedData.events.length > 0;

                if (!hasServices && !hasEvents) {
                  return null;
                }

                return (
                  <AccordionItem key={relatedData.voter.epicNumber} value={relatedData.voter.epicNumber}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{relatedData.voter.fullName}</span>
                        <Badge variant="outline" className="text-xs">
                          {relatedData.voter.epicNumber}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          ({hasServices ? `${relatedData.services.individual.length + relatedData.services.community.length} services` : ''}
                          {hasServices && hasEvents ? ', ' : ''}
                          {hasEvents ? `${relatedData.events.length} events` : ''})
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-6 pt-4">
                        {/* Services for this related voter */}
                        {(relatedData.services.individual.length > 0 || relatedData.services.community.length > 0) && (
                          <div className="space-y-4">
                            {relatedData.services.individual.length > 0 && (
                              <div>
                                <h4 className="font-semibold mb-3 text-sm">Individual Services</h4>
                                <div className="space-y-2">
                                  {relatedData.services.individual.map((service) => (
                                    <div key={service.id} className="border rounded-lg p-3 space-y-2">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <h5 className="font-medium text-sm">{service.serviceName}</h5>
                                          {service.description && (
                                            <p className="text-xs text-muted-foreground mt-1">{service.description}</p>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 ml-4">
                                          <Badge variant={service.status === 'completed' ? 'default' : service.status === 'cancelled' ? 'destructive' : 'secondary'} className="text-xs">
                                            {service.status}
                                          </Badge>
                                        </div>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        Token: {service.token} | Created: {new Date(service.createdAt).toLocaleDateString()}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {relatedData.services.community.length > 0 && (
                              <div>
                                <h4 className="font-semibold mb-3 text-sm">Community-Based Services</h4>
                                <div className="space-y-2">
                                  {relatedData.services.community.map((service) => (
                                    <div key={service.id} className="border rounded-lg p-3 space-y-2">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <h5 className="font-medium text-sm">{service.serviceName}</h5>
                                          {service.description && (
                                            <p className="text-xs text-muted-foreground mt-1">{service.description}</p>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 ml-4">
                                          <Badge variant={service.status === 'completed' ? 'default' : service.status === 'cancelled' ? 'destructive' : 'secondary'} className="text-xs">
                                            {service.status}
                                          </Badge>
                                        </div>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        Token: {service.token} | Created: {new Date(service.createdAt).toLocaleDateString()}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Events for this related voter */}
                        {relatedData.events.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-3 text-sm">Daily Programme Events</h4>
                            <div className="space-y-2">
                              {relatedData.events.map((event) => (
                                <div key={event.id} className="border rounded-lg p-3 space-y-2">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h5 className="font-medium text-sm">{event.title}</h5>
                                      {event.remarks && (
                                        <p className="text-xs text-muted-foreground mt-1">{event.remarks}</p>
                                      )}
                                    </div>
                                    {event.attended !== null && (
                                      <Badge variant={event.attended ? 'default' : 'secondary'} className="text-xs">
                                        {event.attended ? 'Attended' : 'Not Attended'}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(event.date).toLocaleDateString()} | {event.startTime}{event.endTime ? ` - ${event.endTime}` : ''} | {event.location}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

