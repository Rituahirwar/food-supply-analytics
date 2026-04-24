import React, { useState } from 'react';
import { getRisk, updateRiskThresholds } from '../services/api';
import useFetch from '../hooks/useFetch';
import { Settings, Save } from 'lucide-react';

const AdminPanel = () => {
  const { data: riskData, loading, error } = useFetch(getRisk);
  const [thresholds, setThresholds] = useState({ critical: 300, high: 150, medium: 110 });
  const [saved, setSaved] = useState(false);

  const getRiskLevel = (cpi) => {
    if (cpi > thresholds.critical) return 'CRITICAL';
    if (cpi > thresholds.high) return 'HIGH';
    if (cpi > thresholds.medium) return 'MEDIUM';
    return 'LOW';
  };

  const reclassified = (riskData?.risk_data || []).map(item => ({
    ...item,
    risk_level: getRiskLevel(item.cpi_value),
  }));

  const criticalCount = reclassified.filter(c => c.risk_level === 'CRITICAL').length;
  const highCount = reclassified.filter(c => c.risk_level === 'HIGH').length;
  const totalCountries = riskData?.total_countries || 0;

  const handleSave = async () => {
    await updateRiskThresholds(thresholds);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const riskColorMap = {
    CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    HIGH: { color: '#f43f5e', bg: 'rgba(244,63,94,0.1)' },
    MEDIUM: { color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
    LOW: { color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflowY: 'auto' }}>
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Settings size={20} color="var(--accent-cyan)" />
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Admin Panel</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Configure thresholds and view analytics</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {[
          { label: 'Total Countries', value: totalCountries, color: '#00f0ff' },
          { label: 'Critical Risk', value: criticalCount, color: '#ef4444' },
          { label: 'High Risk', value: highCount, color: '#f43f5e' },
        ].map(card => (
          <div key={card.label} className="glass-panel" style={{ padding: '20px' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>{card.label}</p>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: card.color }}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '0.95rem', marginBottom: '20px', fontWeight: 600 }}>Configure Risk Thresholds</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Drag sliders to reclassify countries in real time. Click Save to persist.
        </p>

        {[
          { key: 'critical', label: 'Critical Threshold (CPI >', color: '#ef4444' },
          { key: 'high', label: 'High Threshold (CPI >', color: '#f43f5e' },
          { key: 'medium', label: 'Medium Threshold (CPI >', color: '#eab308' },
        ].map(({ key, label, color }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: color, flexShrink: 0 }} />
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', width: '220px' }}>
              {label} {thresholds[key]})
            </label>
            <input
              type="range" min="50" max="500" step="10"
              value={thresholds[key]}
              onChange={e => setThresholds({ ...thresholds, [key]: Number(e.target.value) })}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color, width: '40px', textAlign: 'right' }}>
              {thresholds[key]}
            </span>
          </div>
        ))}

        <button onClick={handleSave} style={{
          display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px',
          padding: '10px 24px',
          background: saved ? 'rgba(16,185,129,0.1)' : 'rgba(0,240,255,0.1)',
          border: `1px solid ${saved ? '#10b981' : 'var(--accent-cyan)'}`,
          color: saved ? '#10b981' : 'var(--accent-cyan)',
          borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 600
        }}>
          <Save size={16} />
          {saved ? 'Saved!' : 'Save Thresholds'}
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Detailed Analytics</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Showing {reclassified.filter(c => ['CRITICAL', 'HIGH'].includes(c.risk_level)).length} high risk countries
          </p>
        </div>
        {loading ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading analytics...</div>
        ) : error ? (
          <div style={{ color: '#fca5a5', fontSize: '0.85rem' }}>{error}</div>
        ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
              {['Country', 'CPI Value', 'Risk Level'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reclassified
              .filter(c => ['CRITICAL', 'HIGH'].includes(c.risk_level))
              .sort((a, b) => b.cpi_value - a.cpi_value)
              .map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '10px 16px', fontSize: '0.85rem' }}>{item.country}</td>
                  <td style={{ padding: '10px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {item.cpi_value?.toFixed(2)}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                      color: riskColorMap[item.risk_level]?.color,
                      background: riskColorMap[item.risk_level]?.bg,
                    }}>
                      {item.risk_level}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;