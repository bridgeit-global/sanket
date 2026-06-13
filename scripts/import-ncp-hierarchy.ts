/**
 * Import NCP AC 172 hierarchy from NCP_COMPLETE_DIRECTORY.xlsx into CadreNode.
 *
 * Prerequisites: migration 0063 applied; python3 + openpyxl installed.
 * Run: npx tsx scripts/import-ncp-hierarchy.ts
 *
 * Does not set user_id or epic_number — link voters manually in the app.
 */

import { config } from 'dotenv';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import postgres from 'postgres';

config({ path: '.env.local' });

const CONSTITUENCY_ID = '172';
const BASIC_VERTICAL = 'Basic';
const EXCEL_PATH = join(process.cwd(), 'NCP_COMPLETE_DIRECTORY.xlsx');
const BATCH_SIZE = 100;

const PYTHON_PARSER = `
import json, re, sys
import openpyxl

def parse_ward(v):
    if v is None:
        return None
    m = re.match(r"^(\\d+)", str(v).strip())
    return m.group(1) if m else str(v).strip()

def norm_phone(v):
    if v is None:
        return None
    if isinstance(v, float):
        return str(int(v))
    s = str(v).strip()
    if s.endswith(".0"):
        s = s[:-2]
    return s or None

def norm_booth(v):
    if v is None:
        return None
    if isinstance(v, float):
        return str(int(v))
    return str(v).strip()

def cell_str(v):
    if v is None:
        return None
    s = str(v).strip()
    return s if s else None

wb = openpyxl.load_workbook(sys.argv[1], data_only=True)
out = {}

# TALUKA ADHYAKSH
ws = wb["TALUKA ADHYAKSH"]
rows = []
for r in range(2, ws.max_row + 1):
    dept = cell_str(ws.cell(r, 2).value)
    name = cell_str(ws.cell(r, 3).value)
    phone = norm_phone(ws.cell(r, 4).value)
    if dept:
        rows.append({"department": dept, "name": name, "phone": phone})
out["taluka"] = rows

# WARD ADHYAKSH CATEGORY
ws = wb["WARD ADHYAKSH CATEGORY"]
rows = []
for r in range(2, ws.max_row + 1):
    cat = cell_str(ws.cell(r, 1).value)
    sr = ws.cell(r, 2).value
    ward = parse_ward(ws.cell(r, 3).value)
    name = cell_str(ws.cell(r, 4).value)
    phone = norm_phone(ws.cell(r, 5).value)
    if cat and ward:
        rows.append({"category": cat, "sr": sr, "ward": ward, "name": name, "phone": phone})
out["wardCategory"] = rows

# BOOTH ADHYAKSH
ws = wb["BOOTH ADHYAKSH"]
rows = []
for r in range(2, ws.max_row + 1):
    ward = parse_ward(ws.cell(r, 2).value)
    booth = norm_booth(ws.cell(r, 3).value)
    name = cell_str(ws.cell(r, 4).value)
    phone = norm_phone(ws.cell(r, 5).value)
    if ward and booth:
        rows.append({"ward": ward, "booth": booth, "name": name, "phone": phone})
out["boothAdhyaksh"] = rows

# BOOTH ADDRESSES
ws = wb["BOOTH ADDRESSES"]
rows = []
for r in range(2, ws.max_row + 1):
    ward = parse_ward(ws.cell(r, 1).value)
    booth = norm_booth(ws.cell(r, 2).value)
    area = cell_str(ws.cell(r, 4).value)
    addresses = cell_str(ws.cell(r, 5).value)
    if ward and booth:
        rows.append({"ward": ward, "booth": booth, "area": area, "addresses": addresses})
out["boothAddresses"] = rows

def read_committee(sheet):
    ws = wb[sheet]
    rows = []
    for r in range(2, ws.max_row + 1):
        ward = parse_ward(ws.cell(r, 1).value)
        booth = norm_booth(ws.cell(r, 2).value)
        name = cell_str(ws.cell(r, 5).value)
        phone = norm_phone(ws.cell(r, 6).value)
        if ward and booth:
            rows.append({"ward": ward, "booth": booth, "name": name, "phone": phone})
    return rows

out["boothCommitteeMale"] = read_committee("BOOTH COMMITTEE MALE EPIC")
out["boothCommitteeFemale"] = read_committee("BOOTH COMMITTEE FEMALE EPIC")

# WARD COMMITTEE MEMBERS
ws = wb["WARD COMMITTEE MEMBERS"]
rows = []
for r in range(2, ws.max_row + 1):
    ward = parse_ward(ws.cell(r, 1).value)
    name = cell_str(ws.cell(r, 3).value)
    phone = norm_phone(ws.cell(r, 4).value)
    if ward:
        rows.append({"ward": ward, "name": name, "phone": phone})
out["wardCommittee"] = rows

print(json.dumps(out))
`;

type TalukaRow = { department: string; name: string | null; phone: string | null };
type WardRow = {
  category: string;
  sr: number | string | null;
  ward: string;
  name: string | null;
  phone: string | null;
};
type BoothRow = { ward: string; booth: string; name: string | null; phone: string | null };
type AddressRow = {
  ward: string;
  booth: string;
  area: string | null;
  addresses: string | null;
};
type CommitteeRow = { ward: string; booth: string; name: string | null; phone: string | null };
type WardCommitteeRow = { ward: string; name: string | null; phone: string | null };

type ExcelData = {
  taluka: TalukaRow[];
  wardCategory: WardRow[];
  boothAdhyaksh: BoothRow[];
  boothAddresses: AddressRow[];
  boothCommitteeMale: CommitteeRow[];
  boothCommitteeFemale: CommitteeRow[];
  wardCommittee: WardCommitteeRow[];
};

type NodeInsert = {
  parentId: string | null;
  verticalId: string;
  positionId: string;
  constituencyId: string;
  wardGeoId: string | null;
  electionId: string | null;
  boothNo: string | null;
  personName: string | null;
  personPhone: string | null;
  notes: string | null;
  isVacant: boolean;
};

function normalizeVerticalName(raw: string): string {
  const t = raw.trim();
  if (t === 'Student') return 'Students';
  if (t === 'Minorty') return 'Minority';
  return t;
}

function normalizePhone(raw: string | null): string | null {
  if (!raw) return null;
  const first = raw.split(/[/,;]/)[0]?.trim() ?? raw.trim();
  return first.slice(0, 20) || null;
}

function parseExcel(): ExcelData {
  const stdout = execFileSync('python3', ['-c', PYTHON_PARSER, EXCEL_PATH], {
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024,
  });
  return JSON.parse(stdout) as ExcelData;
}

function boothKey(ward: string, booth: string): string {
  return `${ward}:${booth}`;
}

function wardKey(vertical: string, ward: string): string {
  return `${vertical}:${ward}`;
}

function wardSamajikKey(vertical: string, ward: string, sr: number | string | null): string {
  return `${vertical}:${ward}:${sr ?? ''}`;
}

async function main() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is not defined in .env.local');
  }

  console.log('📖 Parsing Excel...');
  const data = parseExcel();

  const sql = postgres(process.env.SUPABASE_DB_URL, { max: 1 });

  try {
    const [verticals, positions, geoUnits, elections] = await Promise.all([
      sql<{ id: string; name: string }[]>`SELECT id, name FROM "CadreVertical"`,
      sql<{ id: string; key: string }[]>`
        SELECT p.id, l.key
        FROM "CadrePosition" p
        JOIN "CadrePositionLevel" l ON l.id = p.level_id
      `,
      sql<{ id: string; name: string }[]>`SELECT id, name FROM "CadreGeographicUnit" WHERE type = 'ward'`,
      sql<{ election_id: string }[]>`
        SELECT election_id FROM "ElectionMaster"
        WHERE constituency_type = 'assembly' AND constituency_id = ${CONSTITUENCY_ID}
        ORDER BY year DESC
        LIMIT 1
      `,
    ]);

    const verticalByName = new Map(verticals.map((v) => [v.name, v.id]));
    const positionByKey = new Map(positions.map((p) => [p.key, p.id]));
    const wardGeoByNumber = new Map(
      geoUnits.map((g) => {
        const m = g.name.match(/(\d+)/);
        return [m?.[1] ?? g.name, g.id];
      }),
    );
    const electionId = elections[0]?.election_id ?? null;

    const missingVerticals = new Set<string>();
    const resolveVertical = (name: string): string | null => {
      const normalized = normalizeVerticalName(name);
      const id = verticalByName.get(normalized);
      if (!id) missingVerticals.add(normalized);
      return id ?? null;
    };

    const posTaluka = positionByKey.get('taluka');
    const posWard = positionByKey.get('ward');
    const posBooth = positionByKey.get('booth');
    const posBoothCommittee = positionByKey.get('booth_committee');
    const posWardCommittee = positionByKey.get('ward_committee');
    const basicVerticalId = verticalByName.get(BASIC_VERTICAL);

    if (!posTaluka || !posWard || !posBooth || !posBoothCommittee || !posWardCommittee) {
      throw new Error('Missing position levels — run migration 0063 first');
    }
    if (!basicVerticalId) {
      throw new Error('Missing Basic vertical — run migration 0063 first');
    }

    console.log('🗑️  Clearing existing CadreNode rows...');
    await sql`DELETE FROM "CadreNode"`;

    const talukaNodeId = new Map<string, string>();
    const wardNodeId = new Map<string, string>();
    const boothNodeId = new Map<string, string>();

    let inserted = 0;
    const warnings: string[] = [];

    async function insertBatch(rows: NodeInsert[]): Promise<string[]> {
      if (rows.length === 0) return [];
      const ids: string[] = [];
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const chunk = rows.slice(i, i + BATCH_SIZE);
        const result = await sql<{ id: string }[]>`
          INSERT INTO "CadreNode" ${sql(
            chunk.map((r) => ({
              parent_id: r.parentId,
              vertical_id: r.verticalId,
              position_id: r.positionId,
              constituency_id: r.constituencyId,
              ward_geo_id: r.wardGeoId,
              election_id: r.electionId,
              booth_no: r.boothNo,
              person_name: r.personName,
              person_phone: r.personPhone,
              notes: r.notes,
              is_vacant: r.isVacant,
              is_active: true,
            })),
          )}
          RETURNING id
        `;
        ids.push(...result.map((r) => r.id));
        inserted += chunk.length;
      }
      return ids;
    }

    // Taluka nodes
    console.log('📥 Importing taluka adhyaksh...');
    const talukaInserts: NodeInsert[] = [];
    const talukaOrder: string[] = [];
    for (const row of data.taluka) {
      const verticalId = resolveVertical(row.department);
      if (!verticalId) continue;
      talukaOrder.push(normalizeVerticalName(row.department));
      talukaInserts.push({
        parentId: null,
        verticalId,
        positionId: posTaluka,
        constituencyId: CONSTITUENCY_ID,
        wardGeoId: null,
        electionId: null,
        boothNo: null,
        personName: row.name,
        personPhone: normalizePhone(row.phone),
        notes: null,
        isVacant: !row.name,
      });
    }
    const talukaIds = await insertBatch(talukaInserts);
    talukaOrder.forEach((name, i) => talukaNodeId.set(name, talukaIds[i]));

    // Ward category nodes
    console.log('📥 Importing ward adhyaksh...');
    const wardInserts: NodeInsert[] = [];
    const wardOrder: string[] = [];
    for (const row of data.wardCategory) {
      const verticalName = normalizeVerticalName(row.category);
      const verticalId = resolveVertical(row.category);
      const parentId = talukaNodeId.get(verticalName) ?? null;
      const wardGeoId = wardGeoByNumber.get(row.ward) ?? null;
      if (!verticalId) continue;
      if (!parentId) {
        warnings.push(`No taluka parent for ward row: ${verticalName} ward ${row.ward}`);
        continue;
      }
      const isSamajik = verticalName === 'Samajik Nyay Vibhag';
      const key = isSamajik
        ? wardSamajikKey(verticalName, row.ward, row.sr)
        : wardKey(verticalName, row.ward);
      wardOrder.push(key);
      wardInserts.push({
        parentId,
        verticalId,
        positionId: posWard,
        constituencyId: CONSTITUENCY_ID,
        wardGeoId,
        electionId: null,
        boothNo: null,
        personName: row.name,
        personPhone: normalizePhone(row.phone),
        notes: null,
        isVacant: !row.name,
      });
    }
    const wardIds = await insertBatch(wardInserts);
    wardOrder.forEach((key, i) => wardNodeId.set(key, wardIds[i]));

    // Booth adhyaksh (Basic vertical only)
    console.log('📥 Importing booth adhyaksh...');
    const boothInserts: NodeInsert[] = [];
    const boothOrder: string[] = [];
    for (const row of data.boothAdhyaksh) {
      const parentId = wardNodeId.get(wardKey(BASIC_VERTICAL, row.ward)) ?? null;
      const wardGeoId = wardGeoByNumber.get(row.ward) ?? null;
      if (!parentId) {
        warnings.push(`No ward Basic parent for booth ${row.ward}-${row.booth}`);
        continue;
      }
      const key = boothKey(row.ward, row.booth);
      boothOrder.push(key);
      boothInserts.push({
        parentId,
        verticalId: basicVerticalId,
        positionId: posBooth,
        constituencyId: CONSTITUENCY_ID,
        wardGeoId,
        electionId,
        boothNo: row.booth,
        personName: row.name,
        personPhone: normalizePhone(row.phone),
        notes: null,
        isVacant: !row.name,
      });
    }
    const boothIds = await insertBatch(boothInserts);
    boothOrder.forEach((key, i) => boothNodeId.set(key, boothIds[i]));

    // Booth address notes
    console.log('📥 Updating booth addresses...');
    for (const row of data.boothAddresses) {
      const id = boothNodeId.get(boothKey(row.ward, row.booth));
      if (!id) continue;
      const parts = [row.area, row.addresses].filter(Boolean);
      if (parts.length === 0) continue;
      await sql`
        UPDATE "CadreNode"
        SET notes = ${parts.join('\n\n')}, updated_at = now()
        WHERE id = ${id}::uuid
      `;
    }

    // Booth committee (male + female)
    console.log('📥 Importing booth committee members...');
    const committeeRows = [...data.boothCommitteeMale, ...data.boothCommitteeFemale];
    const committeeInserts: NodeInsert[] = [];
    for (const row of committeeRows) {
      const parentId = boothNodeId.get(boothKey(row.ward, row.booth)) ?? null;
      const wardGeoId = wardGeoByNumber.get(row.ward) ?? null;
      if (!parentId) {
        warnings.push(`No booth parent for committee ${row.ward}-${row.booth}: ${row.name}`);
        continue;
      }
      committeeInserts.push({
        parentId,
        verticalId: basicVerticalId,
        positionId: posBoothCommittee,
        constituencyId: CONSTITUENCY_ID,
        wardGeoId,
        electionId,
        boothNo: row.booth,
        personName: row.name,
        personPhone: normalizePhone(row.phone),
        notes: null,
        isVacant: !row.name,
      });
    }
    await insertBatch(committeeInserts);

    // Ward committee members (Basic)
    console.log('📥 Importing ward committee members...');
    const wardCommitteeInserts: NodeInsert[] = [];
    for (const row of data.wardCommittee) {
      const parentId = wardNodeId.get(wardKey(BASIC_VERTICAL, row.ward)) ?? null;
      const wardGeoId = wardGeoByNumber.get(row.ward) ?? null;
      if (!parentId) {
        warnings.push(`No ward Basic parent for committee member ward ${row.ward}: ${row.name}`);
        continue;
      }
      wardCommitteeInserts.push({
        parentId,
        verticalId: basicVerticalId,
        positionId: posWardCommittee,
        constituencyId: CONSTITUENCY_ID,
        wardGeoId,
        electionId: null,
        boothNo: null,
        personName: row.name,
        personPhone: normalizePhone(row.phone),
        notes: null,
        isVacant: !row.name,
      });
    }
    await insertBatch(wardCommitteeInserts);

    console.log('\n✅ Import complete');
    console.log(`   Total nodes inserted: ${inserted}`);
    console.log(`   Taluka: ${data.taluka.length}`);
    console.log(`   Ward: ${data.wardCategory.length}`);
    console.log(`   Booth adhyaksh: ${data.boothAdhyaksh.length}`);
    console.log(`   Booth committee: ${committeeRows.length}`);
    console.log(`   Ward committee: ${data.wardCommittee.length}`);
    if (missingVerticals.size > 0) {
      console.warn(`   Skipped unknown verticals: ${[...missingVerticals].join(', ')}`);
    }
    if (warnings.length > 0) {
      console.warn(`   ${warnings.length} warnings (first 10):`);
      warnings.slice(0, 10).forEach((w) => console.warn(`     - ${w}`));
    }
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error('❌ Import failed:', err);
  process.exit(1);
});
