import 'server-only';

import form20Json from '@/ADM/form20-172-anushakti-nagar-2024.json';

export type Form20CandidateVotes = Record<string, number>;

export type Form20PollingStationRow = {
  pollingStation: number;
  votes: Form20CandidateVotes;
  totalValidVotes: number;
  rejectedVotes: number;
  nota: number;
  totalVotes: number;
  tenderedVotes: number;
};

export type Form20Document = {
  documentType: string;
  electionType: string;
  assemblyConstituency: {
    number: number;
    name: string;
    fullName: string;
  };
  place: string;
  totalElectors: number;
  candidates: Array<{ serial: number; name: string }>;
  results: {
    evm: {
      byCandidate: Form20CandidateVotes;
      totalValidVotes: number;
      rejectedVotes: number;
      nota: number;
      totalVotes: number;
      tenderedVotes: number;
    };
    postalBallot: {
      byCandidate: Form20CandidateVotes;
      totalValidVotes: number;
      rejectedVotes: number;
      nota: number;
      totalVotes: number;
      tenderedVotes: number;
    };
    grandTotal: {
      byCandidate: Form20CandidateVotes;
      totalValidVotes: number;
      rejectedVotes: number;
      nota: number;
      totalVotesPolled: number;
      tenderedVotes: number;
    };
  };
  winner: {
    name: string;
    totalVotes: number;
    runnerUp: string;
    runnerUpVotes: number;
    margin: number;
  };
  turnout: {
    votesPolled: number;
    electors: number;
    percentage: number;
  };
  pollingStations: {
    count: number;
    from: number;
    to: number;
    rows: Form20PollingStationRow[];
  };
};

const form20 = form20Json as Form20Document;

/** Normalize part/booth keys so "01" and "1" match. */
export function normalizePartNo(partNo: string | number): string {
  const raw = String(partNo).trim();
  if (!raw) return '';
  const asNum = Number(raw);
  if (Number.isFinite(asNum) && String(asNum) === String(Number.parseInt(raw, 10))) {
    return String(asNum);
  }
  return raw;
}

export function getForm20Document(): Form20Document {
  return form20;
}

export function getForm20Summary() {
  return {
    assemblyConstituency: form20.assemblyConstituency,
    place: form20.place,
    totalElectors: form20.totalElectors,
    candidates: form20.candidates,
    winner: form20.winner,
    turnout: form20.turnout,
    grandTotal: form20.results.grandTotal,
    evm: form20.results.evm,
    postalBallot: form20.results.postalBallot,
    pollingStationCount: form20.pollingStations.count,
  };
}

export function getCandidateNames(): string[] {
  return form20.candidates.map((c) => c.name);
}

export function getAllPartRows(): Form20PollingStationRow[] {
  return form20.pollingStations.rows;
}

const partIndex = new Map<string, Form20PollingStationRow>();
for (const row of form20.pollingStations.rows) {
  partIndex.set(normalizePartNo(row.pollingStation), row);
}

export function getPartRow(partNo: string | number): Form20PollingStationRow | null {
  return partIndex.get(normalizePartNo(partNo)) ?? null;
}

export function getPartsByPartNos(
  partNos: Array<string | number>,
): Form20PollingStationRow[] {
  const seen = new Set<string>();
  const rows: Form20PollingStationRow[] = [];
  for (const partNo of partNos) {
    const key = normalizePartNo(partNo);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const row = partIndex.get(key);
    if (row) rows.push(row);
  }
  return rows;
}

function emptyVotes(): Form20CandidateVotes {
  const votes: Form20CandidateVotes = {};
  for (const name of getCandidateNames()) {
    votes[name] = 0;
  }
  return votes;
}

function addVotes(
  target: Form20CandidateVotes,
  source: Form20CandidateVotes,
): void {
  for (const [name, count] of Object.entries(source)) {
    target[name] = (target[name] ?? 0) + count;
  }
}

export type WardAggregateRow = {
  wardNo: string;
  partCount: number;
  parts: string[];
  votes: Form20CandidateVotes;
  totalValidVotes: number;
  rejectedVotes: number;
  nota: number;
  totalVotes: number;
  tenderedVotes: number;
};

/**
 * Aggregate Form 20 station rows by ward using an ElectionMapping-derived
 * booth→ward map. Parts with no mapping go under ward "Unknown".
 */
export function aggregateByWard(
  boothToWard: Map<string, string>,
): WardAggregateRow[] {
  const byWard = new Map<string, WardAggregateRow>();

  for (const row of form20.pollingStations.rows) {
    const partKey = normalizePartNo(row.pollingStation);
    const wardNo = boothToWard.get(partKey) ?? 'Unknown';
    let agg = byWard.get(wardNo);
    if (!agg) {
      agg = {
        wardNo,
        partCount: 0,
        parts: [],
        votes: emptyVotes(),
        totalValidVotes: 0,
        rejectedVotes: 0,
        nota: 0,
        totalVotes: 0,
        tenderedVotes: 0,
      };
      byWard.set(wardNo, agg);
    }
    agg.partCount += 1;
    agg.parts.push(partKey);
    addVotes(agg.votes, row.votes);
    agg.totalValidVotes += row.totalValidVotes;
    agg.rejectedVotes += row.rejectedVotes;
    agg.nota += row.nota;
    agg.totalVotes += row.totalVotes;
    agg.tenderedVotes += row.tenderedVotes;
  }

  return Array.from(byWard.values()).sort((a, b) =>
    a.wardNo.localeCompare(b.wardNo, undefined, { numeric: true }),
  );
}

export function aggregateRows(
  rows: Form20PollingStationRow[],
): {
  votes: Form20CandidateVotes;
  totalValidVotes: number;
  rejectedVotes: number;
  nota: number;
  totalVotes: number;
  tenderedVotes: number;
  partCount: number;
} {
  const votes = emptyVotes();
  let totalValidVotes = 0;
  let rejectedVotes = 0;
  let nota = 0;
  let totalVotes = 0;
  let tenderedVotes = 0;
  for (const row of rows) {
    addVotes(votes, row.votes);
    totalValidVotes += row.totalValidVotes;
    rejectedVotes += row.rejectedVotes;
    nota += row.nota;
    totalVotes += row.totalVotes;
    tenderedVotes += row.tenderedVotes;
  }
  return {
    votes,
    totalValidVotes,
    rejectedVotes,
    nota,
    totalVotes,
    tenderedVotes,
    partCount: rows.length,
  };
}

export type TopPartMetric = 'total' | 'candidate' | 'margin';

export type RankedPartRow = Form20PollingStationRow & {
  metricValue: number;
  wardNo?: string;
  leadingCandidate?: string;
  margin?: number;
};

function partMargin(row: Form20PollingStationRow): {
  leadingCandidate: string;
  margin: number;
} {
  const entries = Object.entries(row.votes).sort((a, b) => b[1] - a[1]);
  const [leadName, leadVotes] = entries[0] ?? ['', 0];
  const runnerVotes = entries[1]?.[1] ?? 0;
  return { leadingCandidate: leadName, margin: leadVotes - runnerVotes };
}

export function rankParts(options: {
  metric: TopPartMetric;
  candidate?: string;
  limit?: number;
  ascending?: boolean;
  boothToWard?: Map<string, string>;
}): { rows: RankedPartRow[]; truncated: boolean; total: number } {
  const limit = Math.min(Math.max(options.limit ?? 30, 1), 100);
  const ascending = options.ascending ?? false;

  const ranked: RankedPartRow[] = form20.pollingStations.rows.map((row) => {
    const { leadingCandidate, margin } = partMargin(row);
    let metricValue = row.totalVotes;
    if (options.metric === 'candidate' && options.candidate) {
      metricValue = row.votes[options.candidate] ?? 0;
    } else if (options.metric === 'margin') {
      metricValue = margin;
    }
    const partKey = normalizePartNo(row.pollingStation);
    return {
      ...row,
      metricValue,
      leadingCandidate,
      margin,
      wardNo: options.boothToWard?.get(partKey),
    };
  });

  ranked.sort((a, b) =>
    ascending ? a.metricValue - b.metricValue : b.metricValue - a.metricValue,
  );

  const truncated = ranked.length > limit;
  return {
    rows: ranked.slice(0, limit),
    truncated,
    total: ranked.length,
  };
}

export function resolveCandidateName(query: string): string | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const exact = getCandidateNames().find((n) => n.toLowerCase() === q);
  if (exact) return exact;
  const partial = getCandidateNames().find(
    (n) => n.toLowerCase().includes(q) || q.includes(n.toLowerCase()),
  );
  return partial ?? null;
}
