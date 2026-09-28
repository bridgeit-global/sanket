import { describe, it, expect } from 'vitest';
import {
  findBoothBlaForVertical,
  findBoothBlasForVertical,
} from '@/lib/hierarchy/vertical-leaders';
import type { CadreMemberCard } from '@/lib/hierarchy/types';

describe('Booth BLA Multi-Agent Support', () => {
  const verticalId = 'basic-vert-id';
  const wardGeoId = 'ward-144-id';
  const boothNo = '53';
  const blaPositionId = '30a9266d-6c3a-4d76-9a9f-0f6763c8c644';

  const agent1: CadreMemberCard = {
    id: '7c5d5b41-b765-4a74-8961-2c18659b0e64',
    personName: 'Nazir Dagadu Mulani',
    personPhone: '9876543210',
    personEmail: null,
    photoUrl: null,
    userId: null,
    epicNumber: 'NCT2893600',
    notes: null,
    isActive: true,
    constituencyId: '172',
    verticals: [{ id: verticalId, name: 'Basic', isPrimary: true, sortOrder: 1 }],
    posts: [
      {
        id: '6e603cd6-7e03-4644-9536-f1a063721660',
        positionId: blaPositionId,
        positionName: 'BLA (Booth Level Agent)',
        positionSortOrder: 1,
        positionLevelKey: 'booth_bla',
        positionLevelName: 'BLA',
        positionLevelSortOrder: 6,
        verticalId,
        verticalName: 'Basic',
        talukaId: null,
        talukaName: null,
        wardGeoId,
        wardGeoName: 'Ward 144',
        electionId: null,
        boothNo: '53',
        label: null,
        isPrimary: true,
        sortOrder: 1,
      },
    ],
    linkedUser: null,
    linkedVoter: null,
    whatsappPhone: null,
  };

  const agent2: CadreMemberCard = {
    id: 'addc5a1d-4385-4786-a8a9-3cf3813cad2d',
    personName: 'Sanjiva Krushnarao Kulkarni',
    personPhone: '9876543211',
    personEmail: null,
    photoUrl: null,
    userId: null,
    epicNumber: 'NCT0092491',
    notes: null,
    isActive: true,
    constituencyId: '172',
    verticals: [{ id: verticalId, name: 'Basic', isPrimary: true, sortOrder: 1 }],
    posts: [
      {
        id: 'a436c3c5-9898-4bee-9d5d-239c6cd4d5a5',
        positionId: blaPositionId,
        positionName: 'BLA (Booth Level Agent)',
        positionSortOrder: 1,
        positionLevelKey: 'booth_bla',
        positionLevelName: 'BLA',
        positionLevelSortOrder: 6,
        verticalId,
        verticalName: 'Basic',
        talukaId: null,
        talukaName: null,
        wardGeoId,
        wardGeoName: 'Ward 144',
        electionId: null,
        boothNo: '53',
        label: null,
        isPrimary: true,
        sortOrder: 2,
      },
    ],
    linkedUser: null,
    linkedVoter: null,
    whatsappPhone: null,
  };

  const members = [agent1, agent2];

  it('findBoothBlasForVertical returns all assigned BLA agents for Booth 53', () => {
    const blas = findBoothBlasForVertical(members, wardGeoId, boothNo, verticalId);
    expect(blas).toHaveLength(2);
    expect(blas[0].id).toBe(agent1.id);
    expect(blas[0].personName).toBe('Nazir Dagadu Mulani');
    expect(blas[1].id).toBe(agent2.id);
    expect(blas[1].personName).toBe('Sanjiva Krushnarao Kulkarni');
  });

  it('findBoothBlaForVertical returns the primary/first BLA agent for backwards compatibility', () => {
    const bla = findBoothBlaForVertical(members, wardGeoId, boothNo, verticalId);
    expect(bla).not.toBeNull();
    expect(bla?.id).toBe(agent1.id);
    expect(bla?.personName).toBe('Nazir Dagadu Mulani');
  });

  it('findBoothBlasForVertical handles leading-zero booth numbers correctly', () => {
    const blas = findBoothBlasForVertical(members, wardGeoId, '053', verticalId);
    expect(blas).toHaveLength(2);
  });

  it('returns empty array when no BLA agents are assigned', () => {
    const blas = findBoothBlasForVertical(members, wardGeoId, '99', verticalId);
    expect(blas).toHaveLength(0);
  });
});
