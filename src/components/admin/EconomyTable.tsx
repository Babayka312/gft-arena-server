import { memo, useMemo, useState } from 'react';

type Column = {
  key: string;
  label: string;
  numeric?: boolean;
};

type Row = Record<string, string | number | boolean | null | undefined>;

type EconomyTableProps = {
  columns: Column[];
  rows: Row[];
  pageSize?: number;
};

export const EconomyTable = memo(function EconomyTable({
  columns,
  rows,
  pageSize = 8,
}: EconomyTableProps) {
  const [sortKey, setSortKey] = useState(columns[0]?.key ?? 'id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? rows.filter((r) => Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(q)))
      : rows;
    const sorted = [...base].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const an = Number(av);
      const bn = Number(bv);
      const result = Number.isFinite(an) && Number.isFinite(bn)
        ? an - bn
        : String(av ?? '').localeCompare(String(bv ?? ''));
      return sortDir === 'asc' ? result : -result;
    });
    return sorted.slice(0, pageSize);
  }, [pageSize, query, rows, sortDir, sortKey]);

  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter..."
        style={{
          borderRadius: '10px',
          border: '1px solid #334155',
          background: '#0f172a',
          color: '#e2e8f0',
          padding: '8px 10px',
          fontSize: '12px',
        }}
      />
      <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid rgba(71,85,105,0.55)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '460px' }}>
          <thead style={{ background: 'rgba(30,41,59,0.92)' }}>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  onClick={() => {
                    if (sortKey === c.key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                    else {
                      setSortKey(c.key);
                      setSortDir('desc');
                    }
                  }}
                  style={{
                    cursor: 'pointer',
                    padding: '8px',
                    textAlign: c.numeric ? 'right' : 'left',
                    fontSize: '11px',
                    color: '#93c5fd',
                    fontWeight: 800,
                    borderBottom: '1px solid rgba(71,85,105,0.55)',
                  }}
                >
                  {c.label} {sortKey === c.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, idx) => (
              <tr key={idx} style={{ background: idx % 2 ? 'rgba(15,23,42,0.9)' : 'rgba(2,6,23,0.88)' }}>
                {columns.map((c) => (
                  <td
                    key={c.key}
                    style={{
                      padding: '8px',
                      textAlign: c.numeric ? 'right' : 'left',
                      fontSize: '12px',
                      color: '#e2e8f0',
                      borderBottom: '1px solid rgba(51,65,85,0.5)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {String(row[c.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={columns.length} style={{ padding: '10px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

