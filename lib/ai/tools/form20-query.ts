import { tool } from 'ai';
import { z } from 'zod';
import {
  aggregateByWard,
  aggregateRows,
  getAllPartRows,
  getForm20Summary,
  getPartsByPartNos,
  normalizePartNo,
  rankParts,
  resolveCandidateName,
  type Form20PollingStationRow,
} from '@/lib/ai/data/form20-172-2024';
import {
  getBoothWardMap,
  getPartsByWard,
  getWardForPart,
} from '@/lib/ai/data/booth-ward-from-election';

/** Explicit default only for ranking/compare (up to 262 parts). Other actions return all rows. */
const RANKING_DEFAULT_LIMIT = 30;
const RANKING_MAX_LIMIT = 100;

function clampRankingLimit(limit: number | undefined): number {
  return Math.min(Math.max(limit ?? RANKING_DEFAULT_LIMIT, 1), RANKING_MAX_LIMIT);
}

function stationToRow(
  row: Form20PollingStationRow,
  wardNo?: string | null,
): Record<string, string | number | null> {
  return {
    partNo: normalizePartNo(row.pollingStation),
    wardNo: wardNo ?? null,
    ...row.votes,
    totalValidVotes: row.totalValidVotes,
    nota: row.nota,
    totalVotes: row.totalVotes,
    rejectedVotes: row.rejectedVotes,
    tenderedVotes: row.tenderedVotes,
  };
}

function wardAggToRow(agg: ReturnType<typeof aggregateByWard>[number]) {
  return {
    wardNo: agg.wardNo,
    partCount: agg.partCount,
    parts: agg.parts.join(', '),
    ...agg.votes,
    totalValidVotes: agg.totalValidVotes,
    nota: agg.nota,
    totalVotes: agg.totalVotes,
    rejectedVotes: agg.rejectedVotes,
    tenderedVotes: agg.tenderedVotes,
  };
}

/** Returns all rows unless caller already limited (e.g. topParts / compareCandidates). */
function resultsPayload(
  rows: Array<Record<string, string | number | null>>,
  summary: string,
  extra?: Record<string, unknown>,
) {
  return {
    mappingSource: 'ElectionMapping' as const,
    summary,
    answer: summary,
    rowCount: rows.length,
    results: rows,
    truncated: false,
    ...extra,
  };
}

export const form20QueryTool = tool({
  description: `Query 2024 Anushakti Nagar (AC 172) Form 20 assembly election results: actual candidate vote counts by polling station (part/booth 1–262) and by ward.

IMPORTANT:
- Use this tool for Form 20 / candidate vote shares / margins / booth or ward vote totals. Do NOT use sqlQuery for Form 20 — vote counts are not in Postgres.
- Part number = booth number = Form 20 pollingStation.
- Ward geography comes from ElectionMapping + BMC election ids (e.g. 140BMC2026 → ward 140), NOT from CommunityServiceArea.
- ElectionMapping.has_voted is turnout participation only, not candidate votes.

Actions:
- summary: constituency winner, turnout, grand totals by candidate
- byPart: votes for one or more part numbers
- byWard: aggregate votes by ward (all wards or one ward)
- partsInWard: list parts in a ward with per-part candidate votes
- topParts: rank parts by total votes, a candidate's votes, or margin (default limit 30, max 100)
- compareCandidates: head-to-head between two candidates by part or by ward (default limit 30, max 100)
Other actions (summary, byPart, byWard, partsInWard) return all matching rows with no row cap.`,
  inputSchema: z.object({
    action: z
      .enum([
        'summary',
        'byPart',
        'byWard',
        'partsInWard',
        'topParts',
        'compareCandidates',
      ])
      .describe('Which Form 20 query to run'),
    partNos: z
      .array(z.union([z.string(), z.number()]))
      .optional()
      .describe('Part/booth numbers for byPart'),
    wardNo: z
      .string()
      .optional()
      .describe('Ward number for byWard / partsInWard (e.g. "140")'),
    candidate: z
      .string()
      .optional()
      .describe('Candidate name (partial ok) for topParts metric=candidate'),
    candidateA: z
      .string()
      .optional()
      .describe('First candidate for compareCandidates'),
    candidateB: z
      .string()
      .optional()
      .describe('Second candidate for compareCandidates'),
    groupBy: z
      .enum(['part', 'ward'])
      .optional()
      .describe('Grouping for compareCandidates (default part)'),
    metric: z
      .enum(['total', 'candidate', 'margin'])
      .optional()
      .describe('Ranking metric for topParts (default total)'),
    limit: z
      .number()
      .optional()
      .describe(
        'Only for topParts / compareCandidates: max rows to return (default 30, max 100). Other actions return all matching rows.',
      ),
    ascending: z
      .boolean()
      .optional()
      .describe('If true, return lowest values first for topParts'),
  }),
  execute: async (input) => {
    try {
      const mapResult = await getBoothWardMap();
      const boothToWard = mapResult.boothToWard;

      switch (input.action) {
        case 'summary': {
          const s = getForm20Summary();
          const byCandidateRows = Object.entries(
            s.grandTotal.byCandidate,
          ).map(([candidate, votes]) => ({ candidate, votes }));
          byCandidateRows.sort((a, b) => b.votes - a.votes);
          return resultsPayload(
            byCandidateRows,
            `Form 20 AC ${s.assemblyConstituency.fullName}: winner ${s.winner.name} (${s.winner.totalVotes}) beat ${s.winner.runnerUp} (${s.winner.runnerUpVotes}) by ${s.winner.margin}. Turnout ${s.turnout.percentage}% (${s.turnout.votesPolled}/${s.turnout.electors}). ${s.pollingStationCount} polling stations.`,
            {
              winner: s.winner,
              turnout: s.turnout,
              grandTotal: s.grandTotal,
              candidates: s.candidates,
              partElectionId: mapResult.partElectionId,
            },
          );
        }

        case 'byPart': {
          if (!input.partNos?.length) {
            return {
              error: 'byPart requires partNos',
              answer: 'Provide one or more partNos (polling station numbers).',
              results: [],
              rowCount: 0,
            };
          }
          const rows = getPartsByPartNos(input.partNos);
          const table = rows.map((r) =>
            stationToRow(r, boothToWard.get(normalizePartNo(r.pollingStation))),
          );
          const missing = input.partNos
            .map(normalizePartNo)
            .filter((p) => p && !rows.some((r) => normalizePartNo(r.pollingStation) === p));
          const totals = aggregateRows(rows);
          return resultsPayload(
            table,
            `Form 20 votes for part(s) ${rows.map((r) => r.pollingStation).join(', ')}. Combined totalVotes=${totals.totalVotes}.`,
            {
              totals,
              missingParts: missing.length ? missing : undefined,
            },
          );
        }

        case 'byWard': {
          const wards = aggregateByWard(boothToWard);
          const filtered = input.wardNo
            ? wards.filter((w) => w.wardNo === String(input.wardNo).trim())
            : wards;
          if (input.wardNo && filtered.length === 0) {
            return {
              error: `No Form 20 parts mapped to ward ${input.wardNo}`,
              answer: `No booth→ward mapping found for ward ${input.wardNo}. Ward comes from ElectionMapping BMC election ids.`,
              results: [],
              rowCount: 0,
              mappingSource: 'ElectionMapping',
            };
          }
          return resultsPayload(
            filtered.map(wardAggToRow),
            input.wardNo
              ? `Form 20 ward ${input.wardNo}: ${filtered[0].partCount} parts, totalVotes=${filtered[0].totalVotes}.`
              : `Form 20 votes aggregated by ward (${filtered.length} wards). Mapping from ElectionMapping.`,
          );
        }

        case 'partsInWard': {
          if (!input.wardNo) {
            return {
              error: 'partsInWard requires wardNo',
              answer: 'Provide wardNo (e.g. "140").',
              results: [],
              rowCount: 0,
            };
          }
          const parts = await getPartsByWard(input.wardNo);
          const rows = getPartsByPartNos(parts);
          const table = rows.map((r) =>
            stationToRow(r, String(input.wardNo).trim()),
          );
          const totals = aggregateRows(rows);
          return resultsPayload(
            table,
            `Ward ${input.wardNo}: ${rows.length} parts with Form 20 votes. Combined totalVotes=${totals.totalVotes}.`,
            { totals, parts },
          );
        }

        case 'topParts': {
          const metric = input.metric ?? 'total';
          let candidate: string | undefined;
          if (metric === 'candidate') {
            if (!input.candidate) {
              return {
                error: 'topParts with metric=candidate requires candidate',
                answer: 'Provide candidate name.',
                results: [],
                rowCount: 0,
              };
            }
            const resolved = resolveCandidateName(input.candidate);
            if (!resolved) {
              return {
                error: `Unknown candidate: ${input.candidate}`,
                answer: `Could not match candidate "${input.candidate}" to Form 20 names.`,
                results: [],
                rowCount: 0,
              };
            }
            candidate = resolved;
          }
          const ranked = rankParts({
            metric,
            candidate,
            limit: input.limit,
            ascending: input.ascending,
            boothToWard,
          });
          const table = ranked.rows.map((r) => ({
            partNo: normalizePartNo(r.pollingStation),
            wardNo: r.wardNo ?? null,
            metricValue: r.metricValue,
            leadingCandidate: r.leadingCandidate ?? null,
            margin: r.margin ?? null,
            ...r.votes,
            totalVotes: r.totalVotes,
          }));
          return resultsPayload(
            table,
            `Top parts by ${metric}${candidate ? ` (${candidate})` : ''}. Showing ${table.length} of ${ranked.total}.`,
            {
              truncated: ranked.truncated,
              rowCount: ranked.total,
              note: ranked.truncated
                ? `Showing first ${table.length} of ${ranked.total} rows.`
                : undefined,
              metric,
              candidate,
            },
          );
        }

        case 'compareCandidates': {
          if (!input.candidateA || !input.candidateB) {
            return {
              error: 'compareCandidates requires candidateA and candidateB',
              answer: 'Provide candidateA and candidateB names.',
              results: [],
              rowCount: 0,
            };
          }
          const a = resolveCandidateName(input.candidateA);
          const b = resolveCandidateName(input.candidateB);
          if (!a || !b) {
            return {
              error: 'Could not resolve one or both candidates',
              answer: `Resolved A=${a ?? 'null'}, B=${b ?? 'null'}.`,
              results: [],
              rowCount: 0,
            };
          }
          const groupBy = input.groupBy ?? 'part';
          const limit = clampRankingLimit(input.limit);

          if (groupBy === 'ward') {
            const wards = aggregateByWard(boothToWard);
            const table = wards
              .map((w) => {
                const va = w.votes[a] ?? 0;
                const vb = w.votes[b] ?? 0;
                return {
                  wardNo: w.wardNo,
                  partCount: w.partCount,
                  [a]: va,
                  [b]: vb,
                  margin: va - vb,
                  leader: va === vb ? 'tie' : va > vb ? a : b,
                  totalVotes: w.totalVotes,
                };
              })
              .sort(
                (x, y) =>
                  Math.abs(y.margin as number) - Math.abs(x.margin as number),
              );
            const limited = table.slice(0, limit);
            const truncated = table.length > limited.length;
            return resultsPayload(
              limited,
              `Head-to-head ${a} vs ${b} by ward. Showing ${limited.length} of ${table.length} wards.`,
              {
                candidateA: a,
                candidateB: b,
                groupBy: 'ward',
                rowCount: table.length,
                truncated,
                note: truncated
                  ? `Showing first ${limited.length} of ${table.length} rows.`
                  : undefined,
              },
            );
          }

          const table = getAllPartRows()
            .map((r) => {
              const va = r.votes[a] ?? 0;
              const vb = r.votes[b] ?? 0;
              const partKey = normalizePartNo(r.pollingStation);
              return {
                partNo: partKey,
                wardNo: boothToWard.get(partKey) ?? null,
                [a]: va,
                [b]: vb,
                margin: va - vb,
                leader: va === vb ? 'tie' : va > vb ? a : b,
                totalVotes: r.totalVotes,
              };
            })
            .sort(
              (x, y) =>
                Math.abs(y.margin as number) - Math.abs(x.margin as number),
            );
          const limited = table.slice(0, limit);
          const truncated = table.length > limited.length;
          return resultsPayload(
            limited,
            `Head-to-head ${a} vs ${b} by part. Showing ${limited.length} of ${table.length} parts.`,
            {
              candidateA: a,
              candidateB: b,
              groupBy: 'part',
              rowCount: table.length,
              truncated,
              note: truncated
                ? `Showing first ${limited.length} of ${table.length} rows.`
                : undefined,
            },
          );
        }

        default:
          return {
            error: 'Unknown action',
            answer: 'Unknown Form 20 action.',
            results: [],
            rowCount: 0,
          };
      }
    } catch (error) {
      console.error('form20Query error:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        answer: 'Failed to query Form 20 data.',
        results: [],
        rowCount: 0,
      };
    }
  },
});

/** Convenience for prompts / debugging */
export async function lookupWardForPart(partNo: string | number) {
  return getWardForPart(partNo);
}
