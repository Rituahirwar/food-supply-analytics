import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine
} from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, AlertCircle, Download } from 'lucide-react';
import { getPrediction as fetchPrediction } from '../services/api';
import jsPDF from 'jspdf';

const COMMODITIES = [
  { key: 'food_price_index', label: 'Food Index', color: '#00f0ff' },
  { key: 'cereals', label: 'Cereals', color: '#eab308' },
  { key: 'oils', label: 'Oils', color: '#60a5fa' },
  { key: 'meat', label: 'Meat', color: '#f97316' },
  { key: 'dairy', label: 'Dairy', color: '#a3e635' },
  { key: 'sugar', label: 'Sugar', color: '#f472b6' },
];

const TIME_RANGES = [
  { label: '1Y', months: 12 },
  { label: '3Y', months: 36 },
  { label: '5Y', months: 60 },
  { label: 'All', months: 9999 },
];

const tooltipStyle = {
  background: 'rgba(18,24,38,0.97)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: 'white',
  fontSize: '11px',
};

const Predictions = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeLines, setActiveLines] = useState(
    Object.fromEntries(COMMODITIES.map(c => [c.key, true]))
  );
  const [timeRange, setTimeRange] = useState('3Y');
  const [compareA, setCompareA] = useState('cereals');
  const [compareB, setCompareB] = useState('oils');

  useEffect(() => {
    let cancelled = false;

    const loadPredictions = async () => {
      try {
        const res = await fetchPrediction();
        if (cancelled) return;

        if (res?.current_prices) {
          setData(res);
          setError('');
          return;
        }

        setError('Service temporarily unavailable. Please try again later.');
      } catch (err) {
        if (!cancelled) {
          setError('Service temporarily unavailable. Please try again later.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPredictions();

    return () => {
      cancelled = true;
    };
  }, []);

  const generatePDF = () => {
    if (!data) return;
    const doc = new jsPDF();
    const currentPrices = data.current_prices || {};
    const predictions = data.predictions || [];

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Food Supply Chain', 20, 22);
    doc.text('Disruption Analyzer — Prediction Report', 20, 32);

    doc.setDrawColor(0, 240, 255);
    doc.setLineWidth(0.5);
    doc.line(20, 38, 190, 38);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 46);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Current Food Price Index', 20, 58);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    const currentIndex = currentPrices.food_price_index ?? 'N/A';
    doc.text(`Overall Food Price Index: ${currentIndex}`, 28, 66);
    doc.setTextColor(80, 80, 80);
    doc.text(`Cereals: ${currentPrices.cereals ?? 'N/A'}   Oils: ${currentPrices.oils ?? 'N/A'}   Meat: ${currentPrices.meat ?? 'N/A'}`, 28, 74);
    doc.text(`Dairy: ${currentPrices.dairy ?? 'N/A'}   Sugar: ${currentPrices.sugar ?? 'N/A'}`, 28, 82);

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Risk Classification', 20, 96);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const riskLevel = currentIndex > 300 ? 'CRITICAL' : currentIndex > 150 ? 'HIGH' : currentIndex > 110 ? 'MEDIUM' : 'LOW';
    doc.text(`Based on current Food Price Index of ${currentIndex}, risk level is: ${riskLevel}`, 28, 104);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('6-Month Price Forecast', 20, 118);

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Month', 28, 128);
    doc.text('Food Index', 80, 128);
    doc.text('Cereals', 115, 128);
    doc.text('Oils', 145, 128);
    doc.text('Meat', 165, 128);

    doc.setDrawColor(200, 200, 200);
    doc.line(20, 131, 190, 131);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    predictions.forEach((p, i) => {
      const y = 139 + i * 10;
      doc.text(String(p.month || 'N/A'), 28, y);
      doc.text(String(p.food_price_index ?? 'N/A'), 80, y);
      doc.text(String(p.cereals ?? 'N/A'), 115, y);
      doc.text(String(p.oils ?? 'N/A'), 145, y);
      doc.text(String(p.meat ?? 'N/A'), 165, y);
    });

    const lastY = 139 + predictions.length * 10 + 14;
    doc.setDrawColor(0, 240, 255);
    doc.line(20, lastY - 4, 190, lastY - 4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Interpretation', 20, lastY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);

    const firstPrice = predictions[0]?.food_price_index;
    const lastPrice = predictions[predictions.length - 1]?.food_price_index;
    let interpretation = 'Price trend analysis unavailable.';
    if (firstPrice && lastPrice) {
      const pctChange = (((lastPrice - firstPrice) / firstPrice) * 100).toFixed(1);
      const direction = pctChange > 0 ? 'rise' : 'fall';
      interpretation = `Food Price Index is projected to ${direction} by ${Math.abs(pctChange)}% over the next 6 months.`;
      if (Math.abs(pctChange) > 10) {
        interpretation += ' This indicates significant price volatility and potential supply disruption risk.';
      } else {
        interpretation += ' Prices are expected to remain relatively stable.';
      }
    }

    const lines = doc.splitTextToSize(interpretation, 160);
    doc.text(lines, 20, lastY + 14);

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Generated by Food Supply Chain Disruption Analyzer', 20, 285);
    doc.text('Data sources: FAO Food Price Indices, Consumer Price Index', 20, 291);

    doc.save(`prediction-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
      Loading predictions...
    </div>
  );

  if (!data || !data.current_prices) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
      {error || 'Service temporarily unavailable. Please try again later.'}
    </div>
  );

  const currentPrices = data.current_prices || {};
  const prevPrices = data.prev_prices || {};
  const predictions = data.predictions || [];
  const rangeMonths = TIME_RANGES.find(t => t.label === timeRange)?.months || 36;
  const historical = (data.historical || []).slice(-rangeMonths);

  const anomalies = [];
  predictions.forEach((p, i) => {
    if (i === 0) return;
    COMMODITIES.forEach(({ key, label }) => {
      const prev = predictions[i - 1][key];
      const curr = p[key];
      if (prev && curr) {
        const pct = ((curr - prev) / prev) * 100;
        if (Math.abs(pct) >= 8) {
          anomalies.push({
            month: p.month,
            commodity: label,
            change: pct,
            severity: Math.abs(pct) >= 12 ? 'CRITICAL' : 'WARNING',
          });
        }
      }
    });
    if (p.food_price_index > 150) {
      anomalies.push({
        month: p.month,
        commodity: 'Food Index',
        change: null,
        severity: 'CRITICAL',
        note: `Food Price Index exceeds 150 (value: ${p.food_price_index})`,
      });
    }
  });

  const toggleLine = (key) => {
    setActiveLines(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getCompareData = (key) => {
    const hist = historical.map(h => ({ date: h.date?.slice(0, 7), value: h[key] }));
    const pred = predictions.map(p => ({ date: p.month?.slice(0, 7), value: p[key], predicted: true }));
    return [...hist, ...pred];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflowY: 'auto', paddingRight: '4px' }}>

      {/* Section 1 — Snapshot Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
        {COMMODITIES.map(({ key, label, color }) => {
          const curr = currentPrices[key];
          const prev = prevPrices[key];
          const diff = curr && prev ? curr - prev : 0;
          const up = diff >= 0;
          return (
            <div key={key} className="glass-panel" style={{ padding: '14px', borderTop: `2px solid ${color}` }}>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '6px', letterSpacing: '0.5px' }}>
                {label.toUpperCase()}
              </p>
              <p style={{ fontSize: '1.4rem', fontWeight: 700, color }}>{curr ?? '—'}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                {up
                  ? <TrendingUp size={12} color="#ef4444" />
                  : <TrendingDown size={12} color="#10b981" />
                }
                <span style={{ fontSize: '0.7rem', color: up ? '#ef4444' : '#10b981' }}>
                  {diff > 0 ? '+' : ''}{diff.toFixed(1)} vs prev
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Section 2 — 6 Month Forecast */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600 }}>6 Month Price Forecast (LSTM)</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={generatePDF}
              style={{
                background: 'rgba(0,240,255,0.1)', border: '1px solid rgba(0,240,255,0.3)',
                color: 'var(--accent-cyan)', padding: '6px 14px', borderRadius: '6px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '0.8rem', fontFamily: 'inherit'
              }}
            >
              <Download size={14} /> Download PDF
            </button>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {COMMODITIES.map(({ key, label, color }) => (
                <button
                  key={key}
                  onClick={() => toggleLine(key)}
                  style={{
                    padding: '4px 10px', borderRadius: '12px', fontSize: '0.72rem',
                    border: `1px solid ${activeLines[key] ? color : 'var(--panel-border)'}`,
                    background: activeLines[key] ? `${color}15` : 'transparent',
                    color: activeLines[key] ? color : 'var(--text-secondary)',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={predictions}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false}
              tickFormatter={v => v?.slice(0, 7)} />
            <YAxis stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={v => `Month: ${v}`} />
            {COMMODITIES.map(({ key, label, color }) =>
              activeLines[key] ? (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={label}
                  stroke={color}
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  dot={{ r: 3, fill: color }}
                  activeDot={{ r: 5 }}
                />
              ) : null
            )}
          </LineChart>
        </ResponsiveContainer>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
          Dashed lines indicate predicted values. Food Price Index uses LSTM model. Other commodities use linear trend projection.
        </p>
      </div>

      {/* Section 3 — Historical Trend */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Historical Price Trend</h3>
          <div style={{ display: 'flex', gap: '6px' }}>
            {TIME_RANGES.map(t => (
              <button
                key={t.label}
                onClick={() => setTimeRange(t.label)}
                style={{
                  padding: '4px 12px', borderRadius: '6px', fontSize: '0.75rem',
                  border: '1px solid',
                  borderColor: timeRange === t.label ? 'var(--accent-cyan)' : 'var(--panel-border)',
                  background: timeRange === t.label ? 'rgba(0,240,255,0.1)' : 'transparent',
                  color: timeRange === t.label ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={historical}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="var(--text-secondary)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => v?.slice(0, 7)}
              interval={Math.max(1, Math.floor(historical.length / 8))}
            />
            <YAxis stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <ReferenceLine
              x="2022-02-01"
              stroke="#ef4444"
              strokeDasharray="4 3"
              strokeWidth={2}
              label={{ value: 'Ukraine War', fill: '#ef4444', fontSize: 10, position: 'top' }}
            />
            <ReferenceLine
              x="2020-03-01"
              stroke="#f97316"
              strokeDasharray="4 3"
              strokeWidth={2}
              label={{ value: 'COVID-19', fill: '#f97316', fontSize: 10, position: 'top' }}
            />
            {COMMODITIES.map(({ key, label, color }) =>
              activeLines[key] ? (
                <Line key={key} type="monotone" dataKey={key} name={label}
                  stroke={color} strokeWidth={1.5} dot={false} />
              ) : null
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Section 4 — Anomaly Detection */}
      {anomalies.length > 0 && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '14px' }}>
            Anomaly Detection — {anomalies.length} Flag{anomalies.length > 1 ? 's' : ''} Detected
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {anomalies.map((a, i) => (
              <div key={i} style={{
                padding: '12px 16px', borderRadius: '8px',
                borderLeft: `3px solid ${a.severity === 'CRITICAL' ? '#ef4444' : '#eab308'}`,
                background: a.severity === 'CRITICAL' ? 'rgba(239,68,68,0.07)' : 'rgba(234,179,8,0.07)',
                display: 'flex', alignItems: 'center', gap: '12px',
              }}>
                {a.severity === 'CRITICAL'
                  ? <AlertTriangle size={16} color="#ef4444" />
                  : <AlertCircle size={16} color="#eab308" />
                }
                <div>
                  <p style={{ fontSize: '0.82rem', fontWeight: 600, color: a.severity === 'CRITICAL' ? '#ef4444' : '#eab308' }}>
                    {a.severity} — {a.commodity}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {a.note || `${a.change > 0 ? 'Spike' : 'Drop'} of ${Math.abs(a.change).toFixed(1)}% predicted in ${a.month}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 5 — Commodity Comparison */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '16px' }}>Commodity Comparison</h3>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          {[
            { val: compareA, setter: setCompareA, label: 'Commodity A' },
            { val: compareB, setter: setCompareB, label: 'Commodity B' }
          ].map(({ val, setter, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{label}:</span>
              <select
                value={val}
                onChange={e => setter(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--panel-border)',
                  color: 'white', padding: '6px 12px', borderRadius: '6px',
                  fontFamily: 'inherit', fontSize: '0.82rem', cursor: 'pointer',
                }}
              >
                {COMMODITIES.map(c => (
                  <option key={c.key} value={c.key} style={{ background: '#121826' }}>{c.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {[compareA, compareB].map((key) => {
            const comm = COMMODITIES.find(c => c.key === key);
            const chartData = getCompareData(key);
            return (
              <div key={key}>
                <p style={{ fontSize: '0.75rem', color: comm?.color, fontWeight: 600, marginBottom: '8px', letterSpacing: '0.5px' }}>
                  {comm?.label.toUpperCase()} — HISTORICAL + FORECAST
                </p>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="var(--text-secondary)"
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                      interval={Math.max(1, Math.floor(chartData.length / 6))}
                    />
                    <YAxis stroke="var(--text-secondary)" fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      name={comm?.label}
                      stroke={comm?.color}
                      fill={`${comm?.color}15`}
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default Predictions;

