import 'server-only';

import { supabase } from '@/lib/supabase/server';
import { throwOnSupabaseError } from '@/lib/db/errors';
import { ChatSDKError } from '@/lib/errors';
import { getCalendarYmd } from '@/lib/ist-date';
import { normalizeIndianMobileDigits } from '@/lib/indian-mobile';
import {
  mapVisitorRow,
  mapVisitorServiceRow,
  toSnakeCaseKeys,
} from '@/lib/db/mappers';
import { TABLES, type BeneficiaryService, type Visitor, type VisitorService, type VisitorWithServices } from '@/lib/db/schema';
import { createBeneficiaryService, ensureServiceCatalogEntry, getDailyProgrammeItemById } from '@/lib/db/queries-crud';

const TOKEN_UNIQUE_RETRIES = 5;

function shortProgrammeTokenSegment(programmeUuid: string): string {
  const compact = programmeUuid.replace(/-/g, '');
  return compact.slice(0, 4).toUpperCase();
}

function istDatePrefix(now = new Date()): string {
  const ymd = getCalendarYmd(now);
  const dd = String(ymd.day).padStart(2, '0');
  const mm = String(ymd.month).padStart(2, '0');
  const yy = String(ymd.year).slice(-2);
  return `${dd}${mm}${yy}`;
}

/**
 * Next sequence from the highest existing token matching `likePattern`.
 * `seqStart` is the index where the numeric suffix begins (for parsing).
 */
async function nextTokenSequence({
  table,
  likePattern,
  seqStart,
  errorMessage,
}: {
  table: string;
  likePattern: string;
  seqStart: number;
  errorMessage: string;
}): Promise<number> {
  const { data, error } = await supabase
    .from(table)
    .select('token')
    .like('token', likePattern)
    .order('token', { ascending: false })
    .limit(1)
    .maybeSingle();
  throwOnSupabaseError(error, errorMessage);

  if (!data?.token) return 1;
  const seqPart = String(data.token).slice(seqStart);
  const parsed = Number.parseInt(seqPart, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed + 1;
}

async function generateVisitorToken(programmeId?: string | null): Promise<string> {
  const datePrefix = istDatePrefix();
  const trimmedProgrammeId = programmeId?.trim() || '';
  const prefix = trimmedProgrammeId
    ? `${datePrefix}-${shortProgrammeTokenSegment(trimmedProgrammeId)}-V-`
    : `${datePrefix}-V-`;

  const nextNumber = await nextTokenSequence({
    table: TABLES.visitor,
    likePattern: `${prefix}%`,
    seqStart: prefix.length,
    errorMessage: 'Failed to resolve next visitor token',
  });
  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}

export async function createVisitor({
  name,
  mobileNumber,
  voterId,
  location,
  programmeId,
  createdBy,
}: {
  name: string;
  mobileNumber: string;
  voterId?: string | null;
  location?: string | null;
  programmeId?: string | null;
  createdBy: string;
}): Promise<Visitor> {
  try {
    const trimmedProgramme = programmeId?.trim() || null;
    if (trimmedProgramme) {
      const programme = await getDailyProgrammeItemById(trimmedProgramme);
      if (!programme) {
        throw new ChatSDKError('bad_request:database', 'Programme not found');
      }
    }

    const mobile = normalizeIndianMobileDigits(mobileNumber);
    for (let attempt = 0; attempt < TOKEN_UNIQUE_RETRIES; attempt += 1) {
      const now = new Date().toISOString();
      const token = await generateVisitorToken(trimmedProgramme);
      const { data, error } = await supabase
        .from(TABLES.visitor)
        .insert(
          toSnakeCaseKeys({
            name: name.trim(),
            mobileNumber: mobile,
            voterId: voterId?.trim().toUpperCase() || null,
            token,
            location: location?.trim() || null,
            programmeId: trimmedProgramme,
            createdBy,
            createdAt: now,
            updatedAt: now,
          }),
        )
        .select('*')
        .single();

      if (!error) return mapVisitorRow(data);
      // Concurrent creates can race on the same next token.
      if (error.code === '23505' && attempt < TOKEN_UNIQUE_RETRIES - 1) continue;
      throwOnSupabaseError(error, 'Failed to create visitor');
    }
    throw new ChatSDKError('bad_request:database', 'Failed to create visitor');
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to create visitor');
  }
}

export async function findOrCreateVisitor({
  name,
  mobileNumber,
  voterId,
  location,
  programmeId,
  createdBy,
}: {
  name: string;
  mobileNumber: string;
  voterId?: string | null;
  location?: string | null;
  programmeId?: string | null;
  createdBy: string;
}): Promise<Visitor> {
  try {
    const mobile = normalizeIndianMobileDigits(mobileNumber);
    const trimmedVoter = voterId?.trim().toUpperCase() || null;
    const trimmedLocation = location?.trim() || null;
    const trimmedProgramme = programmeId?.trim() || null;

    if (trimmedProgramme) {
      const programme = await getDailyProgrammeItemById(trimmedProgramme);
      if (!programme) {
        throw new ChatSDKError('bad_request:database', 'Programme not found');
      }
    }

    /**
     * Reuse only for same visitor + same IST day + same event (programme).
     * Different day or different event → mint a new visit token.
     */
    async function reuseExistingVisitor(existing: Visitor): Promise<Visitor> {
      const now = new Date().toISOString();
      const { data: updated, error: updateError } = await supabase
        .from(TABLES.visitor)
        .update(
          toSnakeCaseKeys({
            name: name.trim(),
            mobileNumber: mobile,
            voterId: trimmedVoter ?? existing.voterId,
            location: trimmedLocation ?? existing.location,
            // Keep original programme + visit token for this day/event.
            updatedAt: now,
          }),
        )
        .eq('id', existing.id)
        .select('*')
        .single();

      throwOnSupabaseError(updateError, 'Failed to update visitor');
      return mapVisitorRow(updated);
    }

    // Same visitor + same IST day + same event → reuse token; else mint new.
    // Day scope uses token DDMMYY prefix (authoritative IST), not created_at bounds.
    const todayTokenPrefix = istDatePrefix();

    function baseSameDayEventQuery() {
      let query = supabase
        .from(TABLES.visitor)
        .select('*')
        .like('token', `${todayTokenPrefix}%`);
      if (trimmedProgramme) {
        query = query.eq('programme_id', trimmedProgramme);
      } else {
        query = query.is('programme_id', null);
      }
      return query;
    }

    if (trimmedVoter) {
      const { data, error } = await baseSameDayEventQuery()
        .eq('voter_id', trimmedVoter)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      throwOnSupabaseError(error, 'Failed to find visitor by voter id for day/event');
      if (data) {
        return reuseExistingVisitor(mapVisitorRow(data));
      }
    }

    const { data: byMobile, error: mobileError } = await baseSameDayEventQuery()
      .eq('mobile_number', mobile)
      .ilike('name', name.trim())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    throwOnSupabaseError(mobileError, 'Failed to find visitor by mobile for day/event');
    if (byMobile) {
      return reuseExistingVisitor(mapVisitorRow(byMobile));
    }

    return createVisitor({
      name,
      mobileNumber: mobile,
      voterId: trimmedVoter,
      location: trimmedLocation,
      programmeId: trimmedProgramme,
      createdBy,
    });
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to find or create visitor');
  }
}

export async function createVisitorService({
  visitorId,
  serviceName,
  programmeId,
  description,
  notes,
  createdBy,
}: {
  visitorId: string;
  serviceName: string;
  programmeId?: string | null;
  description?: string | null;
  notes?: string | null;
  createdBy: string;
}): Promise<{ visitorService: VisitorService; beneficiaryService: BeneficiaryService }> {
  try {
    const visitor = await getVisitorById(visitorId);
    if (!visitor) {
      throw new ChatSDKError('not_found:database', 'Visitor not found');
    }

    const trimmedProgramme = programmeId?.trim() || null;
    if (trimmedProgramme) {
      const programme = await getDailyProgrammeItemById(trimmedProgramme);
      if (!programme) {
        throw new ChatSDKError('bad_request:database', 'Programme not found');
      }
    }

    await ensureServiceCatalogEntry(serviceName);

    // Reuse the visit token — no separate service/beneficiary token.
    const token = visitor.token;
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from(TABLES.visitorService)
      .insert(
        toSnakeCaseKeys({
          visitorId,
          serviceName: serviceName.trim(),
          programmeId: trimmedProgramme,
          token,
          description: description?.trim() || null,
          notes: notes?.trim() || null,
          status: 'pending',
          createdBy,
          createdAt: now,
          updatedAt: now,
        }),
      )
      .select('*')
      .single();
    throwOnSupabaseError(error, 'Failed to create visitor service');
    const visitorServiceId = mapVisitorServiceRow(data).id;

    // Immediately create the linked BeneficiaryService (operator manage queue).
    return convertVisitorServiceToBeneficiary({
      visitorServiceId,
      requestedBy: createdBy,
    });
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to create visitor service');
  }
}

export async function getVisitorById(id: string): Promise<Visitor | null> {
  try {
    const { data, error } = await supabase
      .from(TABLES.visitor)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to get visitor');
    return data ? mapVisitorRow(data) : null;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get visitor');
  }
}

export async function getVisitorServices(visitorId: string): Promise<VisitorService[]> {
  try {
    const { data, error } = await supabase
      .from(TABLES.visitorService)
      .select('*')
      .eq('visitor_id', visitorId)
      .order('created_at', { ascending: false });
    throwOnSupabaseError(error, 'Failed to get visitor services');
    return (data ?? []).map(mapVisitorServiceRow);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get visitor services');
  }
}

export async function getVisitorWithServices(id: string): Promise<VisitorWithServices | null> {
  const visitor = await getVisitorById(id);
  if (!visitor) return null;
  const services = await getVisitorServices(id);
  return { ...visitor, services };
}

export async function getVisitorServiceById(id: string): Promise<VisitorService | null> {
  try {
    const { data, error } = await supabase
      .from(TABLES.visitorService)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to get visitor service');
    return data ? mapVisitorServiceRow(data) : null;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get visitor service');
  }
}

export type ListVisitorsFilters = {
  search?: string;
  name?: string;
  mobile?: string;
  voterId?: string;
  token?: string;
  serviceName?: string;
  status?: string;
  programmeId?: string;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  limit?: number;
  offset?: number;
};

export async function listVisitors({
  search,
  name,
  mobile,
  voterId,
  token,
  serviceName,
  status,
  programmeId,
  createdFrom,
  createdTo,
  page,
  limit = 50,
  offset,
}: ListVisitorsFilters = {}): Promise<{
  visitors: VisitorWithServices[];
  total: number;
  totalPages: number;
  currentPage: number;
}> {
  try {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const currentPage =
      page != null && Number.isFinite(page) && page >= 1
        ? Math.floor(page)
        : Math.floor(Math.max(offset ?? 0, 0) / safeLimit) + 1;
    const safeOffset =
      page != null && Number.isFinite(page) && page >= 1
        ? (currentPage - 1) * safeLimit
        : Math.max(offset ?? 0, 0);

    const trimmedSearch = search?.trim() || '';
    const trimmedName = name?.trim() || '';
    const trimmedToken = token?.trim() || '';
    const trimmedServiceName = serviceName?.trim() || '';
    const trimmedStatus = status?.trim() || '';
    const trimmedProgrammeId = programmeId?.trim() || '';
    const trimmedVoterId = voterId?.trim().toUpperCase() || '';
    const trimmedMobileRaw = mobile?.trim() || '';
    const trimmedMobile = trimmedMobileRaw
      ? normalizeIndianMobileDigits(trimmedMobileRaw)
      : '';
    const createdFromVal =
      createdFrom && /^\d{4}-\d{2}-\d{2}$/.test(createdFrom.trim())
        ? createdFrom.trim()
        : '';
    const createdToVal =
      createdTo && /^\d{4}-\d{2}-\d{2}$/.test(createdTo.trim())
        ? createdTo.trim()
        : '';

    const hasServiceFilters = Boolean(trimmedStatus || trimmedServiceName);

    let visitorIdsFromServices: string[] | null = null;
    if (hasServiceFilters) {
      let serviceQuery = supabase.from(TABLES.visitorService).select('visitor_id');

      if (trimmedStatus) {
        serviceQuery = serviceQuery.eq('status', trimmedStatus);
      }
      if (trimmedServiceName) {
        serviceQuery = serviceQuery.eq('service_name', trimmedServiceName);
      }

      const { data: serviceRows, error: serviceError } = await serviceQuery;
      throwOnSupabaseError(serviceError, 'Failed to filter visitor services');

      visitorIdsFromServices = Array.from(
        new Set((serviceRows ?? []).map((row) => String(row.visitor_id)).filter(Boolean)),
      );

      if (visitorIdsFromServices.length === 0) {
        return {
          visitors: [],
          total: 0,
          totalPages: 0,
          currentPage,
        };
      }
    }

    // Token may match visit token on Visitor or service token on VisitorService.
    let visitorIdsFromToken: string[] | null = null;
    if (trimmedToken) {
      const [{ data: visitorTokenRows, error: visitorTokenError }, { data: serviceTokenRows, error: serviceTokenError }] =
        await Promise.all([
          supabase.from(TABLES.visitor).select('id').ilike('token', `%${trimmedToken}%`),
          supabase.from(TABLES.visitorService).select('visitor_id').ilike('token', `%${trimmedToken}%`),
        ]);
      throwOnSupabaseError(visitorTokenError, 'Failed to filter visitors by visit token');
      throwOnSupabaseError(serviceTokenError, 'Failed to filter visitors by service token');

      visitorIdsFromToken = Array.from(
        new Set([
          ...(visitorTokenRows ?? []).map((row) => String(row.id)).filter(Boolean),
          ...(serviceTokenRows ?? []).map((row) => String(row.visitor_id)).filter(Boolean),
        ]),
      );

      if (visitorIdsFromToken.length === 0) {
        return {
          visitors: [],
          total: 0,
          totalPages: 0,
          currentPage,
        };
      }
    }

    let query = supabase
      .from(TABLES.visitor)
      .select('*', { count: 'exact' });

    if (visitorIdsFromServices) {
      query = query.in('id', visitorIdsFromServices);
    }
    if (visitorIdsFromToken) {
      query = query.in('id', visitorIdsFromToken);
    }

    if (trimmedMobile) {
      query = query.eq('mobile_number', trimmedMobile);
    }
    if (trimmedVoterId) {
      query = query.eq('voter_id', trimmedVoterId);
    }
    if (trimmedName) {
      query = query.ilike('name', `%${trimmedName}%`);
    }
    if (trimmedProgrammeId) {
      query = query.eq('programme_id', trimmedProgrammeId);
    }
    if (createdFromVal) {
      query = query.gte('created_at', `${createdFromVal}T00:00:00+05:30`);
    }
    if (createdToVal) {
      query = query.lte('created_at', `${createdToVal}T23:59:59.999+05:30`);
    }

    // Legacy single search box (kept for compatibility)
    if (trimmedSearch && !trimmedName && !trimmedMobile && !trimmedVoterId) {
      const mobileFromSearch = normalizeIndianMobileDigits(trimmedSearch);
      if (/^\d{10}$/.test(mobileFromSearch)) {
        query = query.eq('mobile_number', mobileFromSearch);
      } else if (/^[A-Z]{3}\d{7}$/i.test(trimmedSearch)) {
        query = query.eq('voter_id', trimmedSearch.toUpperCase());
      } else {
        query = query.or(
          `name.ilike.%${trimmedSearch}%,voter_id.ilike.%${trimmedSearch}%,mobile_number.ilike.%${trimmedSearch}%,token.ilike.%${trimmedSearch}%`,
        );
      }
    }

    // Apply sort after filters so latest visitors stay on top.
    query = query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(safeOffset, safeOffset + safeLimit - 1);

    const { data, error, count } = await query;
    throwOnSupabaseError(error, 'Failed to list visitors');

    const total = count ?? 0;
    const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);
    const visitors = (data ?? []).map(mapVisitorRow);
    if (visitors.length === 0) {
      return { visitors: [], total, totalPages, currentPage };
    }

    const ids = visitors.map((v) => v.id);
    const { data: servicesData, error: servicesError } = await supabase
      .from(TABLES.visitorService)
      .select('*')
      .in('visitor_id', ids)
      .order('created_at', { ascending: false });
    throwOnSupabaseError(servicesError, 'Failed to list visitor services');

    const servicesByVisitor = new Map<string, VisitorService[]>();
    for (const row of servicesData ?? []) {
      const service = mapVisitorServiceRow(row);
      const list = servicesByVisitor.get(service.visitorId) ?? [];
      list.push(service);
      servicesByVisitor.set(service.visitorId, list);
    }

    return {
      visitors: visitors.map((v) => ({
        ...v,
        services: servicesByVisitor.get(v.id) ?? [],
      })),
      total,
      totalPages,
      currentPage,
    };
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to list visitors');
  }
}

export async function convertVisitorServiceToBeneficiary({
  visitorServiceId,
  requestedBy,
}: {
  visitorServiceId: string;
  requestedBy: string;
}): Promise<{ visitorService: VisitorService; beneficiaryService: BeneficiaryService }> {
  try {
    const visitorService = await getVisitorServiceById(visitorServiceId);
    if (!visitorService) {
      throw new ChatSDKError('not_found:database', 'Visitor service not found');
    }
    if (visitorService.status === 'converted' || visitorService.beneficiaryServiceId) {
      throw new ChatSDKError('bad_request:database', 'Visitor service already converted');
    }

    const visitor = await getVisitorById(visitorService.visitorId);
    if (!visitor) {
      throw new ChatSDKError('not_found:database', 'Visitor not found');
    }

    const beneficiaryService = await createBeneficiaryService({
      serviceType: 'individual',
      serviceName: visitorService.serviceName,
      description: visitorService.description ?? undefined,
      notes: visitorService.notes ?? undefined,
      requestedBy,
      voterId: visitor.voterId ?? undefined,
      programmeId: visitorService.programmeId ?? undefined,
      // Carry the visit token — do not mint a separate beneficiary token.
      token: visitor.token,
    });

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from(TABLES.visitorService)
      .update({
        status: 'converted',
        beneficiary_service_id: beneficiaryService.id,
        converted_at: now,
        updated_at: now,
      })
      .eq('id', visitorServiceId)
      .select('*')
      .single();
    throwOnSupabaseError(error, 'Failed to mark visitor service converted');

    return {
      visitorService: mapVisitorServiceRow(data),
      beneficiaryService,
    };
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to convert visitor service to beneficiary',
    );
  }
}
