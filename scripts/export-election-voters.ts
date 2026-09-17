/**
 * Stream the full voter roll for an election (including religion) to a local CSV.
 *
 * eoffice main DB credentials live in `.env.local.prod` in this repo
 * (project ref dzvothiirlbzozllokry). Staging is `.env.local`.
 *
 * Usage:
 *   npx tsx scripts/export-election-voters.ts --election 172VS2024 --env .env.local.prod
 *   npx tsx scripts/export-election-voters.ts --election 172VS2024 --out tmp/172VS2024.csv
 */
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import dotenv from 'dotenv';
import postgres from 'postgres';

const ELECTION_ID_RE = /^[A-Za-z0-9]+$/;

type CliArgs = {
  election: string;
  envFile: string;
  out: string;
  help: boolean;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    election: '172VS2024',
    envFile: '.env.local.prod',
    out: '',
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token?.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    const hasValue = Boolean(next && !next.startsWith('--'));

    if (key === 'help' || key === 'h') {
      args.help = true;
    } else if (key === 'election' && hasValue) {
      args.election = next;
      i += 1;
    } else if (key === 'env' && hasValue) {
      args.envFile = next;
      i += 1;
    } else if (key === 'out' && hasValue) {
      args.out = path.resolve(next);
      i += 1;
    }
  }

  if (!args.out) {
    args.out = path.resolve(
      `tmp/${args.election}_voters_with_religion.csv`,
    );
  }

  return args;
}

function projectRefFromDbUrl(dbUrl: string): string | null {
  return (
    dbUrl.match(/@db\.([a-z0-9]+)\.supabase\.co/i)?.[1] ??
    dbUrl.match(/\/\/postgres\.([a-z0-9]+):/i)?.[1] ??
    null
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Export ElectionMapping ⨝ VoterMaster (with religion) to CSV.

Options:
  --election  Election id (default: 172VS2024)
  --env       Env file with SUPABASE_DB_URL (default: .env.local.prod = eoffice main)
  --out       Output CSV path (default: tmp/<election>_voters_with_religion.csv)
`);
    return;
  }

  if (!ELECTION_ID_RE.test(args.election)) {
    throw new Error(`Invalid election id: ${args.election}`);
  }

  dotenv.config({ path: args.envFile });
  dotenv.config();

  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    throw new Error(`SUPABASE_DB_URL is not set in ${args.envFile}`);
  }

  const projectRef = projectRefFromDbUrl(dbUrl);
  console.log(`Env file: ${args.envFile}`);
  console.log(`Supabase project: ${projectRef ?? '(unknown)'}`);
  console.log(`Election: ${args.election}`);
  console.log(`Output: ${args.out}`);

  const sql = postgres(dbUrl, {
    max: 1,
    prepare: false,
    idle_timeout: 0,
    connect_timeout: 60,
    ssl: 'require',
    connection: {
      application_name: 'export-election-voters',
      statement_timeout: '0',
    },
  });

  try {
    const [countRow] = await sql<{ n: string }[]>`
      SELECT COUNT(*)::text AS n
      FROM "ElectionMapping" em
      JOIN "VoterMaster" vm ON vm.epic_number = em.epic_number
      WHERE em.election_id = ${args.election}
    `;
    const expected = Number(countRow?.n ?? 0);
    console.log(`Rows to export: ${expected.toLocaleString('en-IN')}`);
    if (expected === 0) {
      throw new Error(`No voters found for election ${args.election}`);
    }

    await mkdir(path.dirname(args.out), { recursive: true });
    const writable = createWriteStream(args.out);
    await new Promise<void>((resolve, reject) => {
      writable.write('\ufeff', (err) => (err ? reject(err) : resolve()));
    });

    const started = Date.now();
    // COPY cannot take bind parameters; election id is validated above.
    const readable = await sql.unsafe(`
      COPY (
        SELECT
          em.election_id,
          vm.epic_number,
          vm.full_name,
          vm.relation_type,
          vm.relation_name,
          vm.family_grouping,
          vm.house_number,
          vm.locality_street,
          vm.town_village,
          vm.address,
          vm.pincode,
          vm.age,
          vm.dob,
          vm.gender,
          vm.religion,
          vm.caste,
          em.booth_no,
          em.sr_no,
          em.has_voted
        FROM "ElectionMapping" em
        JOIN "VoterMaster" vm ON vm.epic_number = em.epic_number
        WHERE em.election_id = '${args.election}'
        ORDER BY em.booth_no NULLS LAST, em.sr_no NULLS LAST, vm.epic_number
      ) TO STDOUT WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
    `).readable();

    await pipeline(readable, writable);
    const elapsedSec = ((Date.now() - started) / 1000).toFixed(1);

    const religionRows = await sql<{ religion: string; n: string }[]>`
      SELECT
        COALESCE(NULLIF(TRIM(vm.religion), ''), 'Blank') AS religion,
        COUNT(*)::text AS n
      FROM "ElectionMapping" em
      JOIN "VoterMaster" vm ON vm.epic_number = em.epic_number
      WHERE em.election_id = ${args.election}
      GROUP BY 1
      ORDER BY COUNT(*) DESC
    `;

    console.log(`Wrote CSV in ${elapsedSec}s`);
    console.log('Religion counts:');
    for (const row of religionRows) {
      console.log(`  ${row.religion}: ${Number(row.n).toLocaleString('en-IN')}`);
    }
    console.log(`Expected data rows: ${expected.toLocaleString('en-IN')}`);
    console.log(`File: ${args.out}`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
