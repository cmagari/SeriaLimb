import { MIN_LINKS, MAX_LINKS, ANGLE_MIN, ANGLE_MAX } from './robotState.js';

const HEADER_FIELDS = [
  'index',
  'length_m',
  'linkMass_kg',
  'jointMass_kg',
  'axis',
  'minAngleDeg',
  'maxAngleDeg',
  'angleDeg',
];

export function exportConfigCsv(snapshot) {
  const lines = [
    '# SeriaLimb configuration',
    `# payloadMass=${numStr(snapshot.payloadMass)}`,
    HEADER_FIELDS.join(','),
  ];
  snapshot.links.forEach((l, i) => {
    lines.push([
      i + 1,
      numStr(l.length),
      numStr(l.linkMass),
      numStr(l.jointMass),
      l.axis,
      numStr(l.minAngleDeg ?? ANGLE_MIN),
      numStr(l.maxAngleDeg ?? ANGLE_MAX),
      numStr(l.angleDeg),
    ].join(','));
  });
  return lines.join('\n') + '\n';
}

export function parseConfigCsv(text) {
  if (typeof text !== 'string') throw new Error('CSV text required');
  let payloadMass;
  const rows = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('#')) {
      const meta = line.slice(1).trim();
      const eq = meta.indexOf('=');
      if (eq > 0) {
        const key = meta.slice(0, eq).trim();
        const val = meta.slice(eq + 1).trim();
        if (key === 'payloadMass') {
          const n = Number.parseFloat(val);
          if (Number.isFinite(n) && n >= 0) payloadMass = n;
        }
      }
      continue;
    }
    rows.push(line.split(',').map((c) => c.trim()));
  }

  const headerIdx = rows.findIndex((r) => r[0]?.toLowerCase() === 'index');
  if (headerIdx < 0) throw new Error('Header row with "index" column not found');

  const header = rows[headerIdx].map((h) => h.toLowerCase());
  const col = (name) => header.indexOf(name.toLowerCase());
  const cLength = col('length_m');
  const cLinkM = col('linkMass_kg');
  const cJointM = col('jointMass_kg');
  const cAxis = col('axis');
  const cMin = col('minAngleDeg');
  const cMax = col('maxAngleDeg');
  const cAngle = col('angleDeg');

  const links = [];
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.every((c) => c === '')) continue;
    const link = {};
    assign(link, 'length', row[cLength], parseNumber);
    assign(link, 'linkMass', row[cLinkM], parseNumber);
    assign(link, 'jointMass', row[cJointM], parseNumber);
    assign(link, 'axis', row[cAxis], (s) => (s ? String(s).toLowerCase() : undefined));
    assign(link, 'minAngleDeg', row[cMin], parseNumber);
    assign(link, 'maxAngleDeg', row[cMax], parseNumber);
    assign(link, 'angleDeg', row[cAngle], parseNumber);
    links.push(link);
  }

  if (links.length < MIN_LINKS) throw new Error(`CSV must define at least ${MIN_LINKS} link`);
  const numLinks = Math.min(links.length, MAX_LINKS);
  return { numLinks, links: links.slice(0, numLinks), payloadMass };
}

function assign(obj, field, cell, parser) {
  if (cell === undefined) return;
  const v = parser(cell);
  if (v !== undefined) obj[field] = v;
}

function parseNumber(v) {
  if (v === undefined || v === '') return undefined;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

function numStr(v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '';
  return Number.isInteger(v) ? String(v) : String(+v.toFixed(6));
}
