import React, { useState } from 'react';
import { getRisk } from '../services/api';
import useFetch from '../hooks/useFetch';
import { Search } from 'lucide-react';

const riskColor = { CRITICAL: '#ef4444', HIGH: '#f43f5e', MEDIUM: '#eab308', LOW: '#10b981' };
const riskBg = { CRITICAL: 'rgba(239,68,68,0.1)', HIGH: 'rgba(244,63,94,0.1)', MEDIUM: 'rgba(234,179,8,0.1)', LOW: 'rgba(16,185,129,0.1)' };
const riskOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const RiskAlerts = () => {
  const { data, loading, error } = useFetch(getRisk);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('risk');
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  const filtered = (data?.risk_data || [])
    .filter(c => c.country.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortBy === 'risk' ? riskOrder[a.risk_level] - riskOrder[b.risk_level] : b.cpi_value - a.cpi_value);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const counts = (data?.risk_data || []).reduce((acc, c) => { acc[c.risk_level] = (acc[c.risk_level] || 0) + 1; return acc; }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(level => (
          <div key={level} className="glass-panel" style={{ padding: '16px', borderLeft: `3px solid ${riskColor[level]}` }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{level}</p>
            <p style={{ fontSize: '1.8rem', fontWeight: 700, color: riskColor[level] }}>{counts[level] || 0}</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>countries</p>
          </div>
        ))}
      </div>

      <div className="glass-panel" style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, background: 'rgba(255,255,255,0.04)', padding: '8px 16px', borderRadius: '8px' }}>
          <Search size={16} color="var(--text-secondary)" />
          <input placeholder="Search country..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ background: 'transparent', border: 'none', color: 'white', fontFamily: 'inherit', fontSize: '0.9rem', width: '100%', outline: 'none' }}
          />
        </div>
        {['risk', 'cpi'].map(s => (
          <button key={s} onClick={() => setSortBy(s)} style={{
            padding: '8px 16px', borderRadius: '8px', border: '1px solid',
            borderColor: sortBy === s ? 'var(--accent-cyan)' : 'var(--panel-border)',
            background: sortBy === s ? 'rgba(0,240,255,0.1)' : 'transparent',
            color: sortBy === s ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem'
          }}>Sort by {s === 'risk' ? 'Risk Level' : 'CPI Value'}</button>
        ))}
      </div>

      <div className="glass-panel" style={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-secondary)' }}>Loading...</div>
        ) : error ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#fca5a5' }}>{error}</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
                {['#', 'Country', 'CPI Value', 'Risk Level'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((item, idx) => (
                <tr key={item.country} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{(page - 1) * PER_PAGE + idx + 1}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.9rem', fontWeight: 500 }}>{item.country}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{item.cpi_value?.toFixed(2)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, color: riskColor[item.risk_level], background: riskBg[item.risk_level], border: `1px solid ${riskColor[item.risk_level]}40` }}>
                      {item.risk_level}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', paddingBottom: '8px' }}>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <button key={p} onClick={() => setPage(p)} style={{
            width: '32px', height: '32px', borderRadius: '6px', border: '1px solid',
            borderColor: page === p ? 'var(--accent-cyan)' : 'var(--panel-border)',
            background: page === p ? 'rgba(0,240,255,0.1)' : 'transparent',
            color: page === p ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit'
          }}>{p}</button>
        ))}
      </div>
    </div>
  );
};

export default RiskAlerts;