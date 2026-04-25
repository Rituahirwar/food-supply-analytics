import React, { useState, useRef } from 'react';
import { getPredictionHistory, getLoginHistory } from '../services/api';
import useFetch from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { ChevronDown, ChevronUp, Download, History, LogIn } from 'lucide-react';
import jsPDF from 'jspdf';

const PredictionHistory = ({ inline = false }) => {
  const { isAuthenticated } = useAuth();
  const { data: predData, loading: predLoading } = useFetch(getPredictionHistory);
  const { data: loginData, loading: loginLoading } = useFetch(getLoginHistory);
  const [expanded, setExpanded] = useState(null);
  const [activeTab, setActiveTab] = useState('predictions');
  const reportRef = useRef();

  const generatePDF = async (item) => {
    const doc = new jsPDF();

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
    doc.text(`Requested At: ${new Date(item.requested_at).toLocaleString()}`, 20, 54);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Current Food Price Index', 20, 66);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    const currentIndex = item.current_prices?.food_price_index ?? item.current_price ?? 'N/A';
    const cereals = item.current_prices?.cereals ?? 'N/A';
    const oils = item.current_prices?.oils ?? 'N/A';
    const meat = item.current_prices?.meat ?? 'N/A';
    const dairy = item.current_prices?.dairy ?? 'N/A';
    const sugar = item.current_prices?.sugar ?? 'N/A';

    doc.text(`Overall Food Price Index: ${currentIndex}`, 28, 74);
    doc.setTextColor(80, 80, 80);
    if (cereals !== 'N/A') doc.text(`Cereals: ${cereals}   Oils: ${oils}   Meat: ${meat}`, 28, 82);
    if (dairy !== 'N/A') doc.text(`Dairy: ${dairy}   Sugar: ${sugar}`, 28, 90);

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Risk Classification', 20, 104);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const riskLevel = currentIndex > 300 ? 'CRITICAL' : currentIndex > 150 ? 'HIGH' : currentIndex > 110 ? 'MEDIUM' : 'LOW';
    doc.text(`Based on current Food Price Index of ${currentIndex}, risk level is: ${riskLevel}`, 28, 112);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('6-Month Price Forecast', 20, 126);

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Month', 28, 136);
    doc.text('Food Index', 80, 136);
    doc.text('Cereals', 115, 136);
    doc.text('Oils', 145, 136);
    doc.text('Meat', 165, 136);

    doc.setDrawColor(200, 200, 200);
    doc.line(20, 139, 190, 139);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    (item.predictions || []).forEach((p, i) => {
      const y = 147 + i * 10;
      const month = p.month || p.date || 'N/A';
      const fpi = p.food_price_index ?? p.predicted_price ?? 'N/A';
      const cer = p.cereals ?? 'N/A';
      const oil = p.oils ?? 'N/A';
      const mea = p.meat ?? 'N/A';
      doc.text(String(month), 28, y);
      doc.text(String(fpi), 80, y);
      doc.text(String(cer), 115, y);
      doc.text(String(oil), 145, y);
      doc.text(String(mea), 165, y);
    });

    const lastY = 147 + (item.predictions?.length || 6) * 10 + 14;
    doc.setDrawColor(0, 240, 255);
    doc.line(20, lastY - 4, 190, lastY - 4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Interpretation', 20, lastY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);

    const firstPrice = item.predictions?.[0]?.food_price_index ?? item.predictions?.[0]?.predicted_price;
    const lastPrice = item.predictions?.[item.predictions.length - 1]?.food_price_index ?? item.predictions?.[item.predictions.length - 1]?.predicted_price;
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

  if (!isAuthenticated && !inline) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px' }}>
      <h2 style={{ color: 'var(--text-primary)' }}>Login Required</h2>
      <p style={{ color: 'var(--text-secondary)' }}>Please login to view your history.</p>
    </div>
  );

  const renderPredictions = () => {
    if (predLoading) return <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '16px' }}>Loading history...</div>;
    if (!predData || predData.length === 0) return <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: inline ? '8px' : '40px', textAlign: 'center' }}>No prediction history yet. Go to Dashboard and fetch a prediction first.</div>;

    return predData.map((item, idx) => (
        <div key={idx} className="glass-panel" style={{ overflow: 'hidden' }}>

          <div
            style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => setExpanded(expanded === idx ? null : idx)}
          >
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Requested</p>
                <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{new Date(item.requested_at).toLocaleString()}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Price Index</p>
                <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--accent-cyan)' }}>
                  {item.current_prices?.food_price_index ?? item.current_price ?? 'N/A'}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Months</p>
                <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{item.predictions?.length || 0}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={(e) => { e.stopPropagation(); generatePDF(item); }}
                style={{
                  background: 'rgba(0,240,255,0.1)', border: '1px solid rgba(0,240,255,0.3)',
                  color: 'var(--accent-cyan)', padding: '6px 12px', borderRadius: '6px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                  fontSize: '0.75rem', fontFamily: 'inherit'
                }}
              >
                <Download size={12} /> PDF
              </button>
              {expanded === idx
                ? <ChevronUp size={16} color="var(--text-secondary)" />
                : <ChevronDown size={16} color="var(--text-secondary)" />
              }
            </div>
          </div>

          {expanded === idx && (
            <div style={{ padding: '0 20px 16px', borderTop: '1px solid var(--panel-border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px' }}>
                <thead>
                  <tr>
                    {['Month', 'Food Index', 'Cereals', 'Oils', 'Meat', 'Dairy', 'Sugar'].map(h => (
                      <th key={h} style={{ padding: '8px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(item.predictions || []).map((p, i) => (
                    <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '8px', fontSize: '0.82rem' }}>{p.month}</td>
                      <td style={{ padding: '8px', fontSize: '0.82rem', color: '#00f0ff' }}>{p.food_price_index ?? p.predicted_price ?? 'N/A'}</td>
                      <td style={{ padding: '8px', fontSize: '0.82rem', color: '#eab308' }}>{p.cereals ?? 'N/A'}</td>
                      <td style={{ padding: '8px', fontSize: '0.82rem', color: '#60a5fa' }}>{p.oils ?? 'N/A'}</td>
                      <td style={{ padding: '8px', fontSize: '0.82rem', color: '#f97316' }}>{p.meat ?? 'N/A'}</td>
                      <td style={{ padding: '8px', fontSize: '0.82rem', color: '#a3e635' }}>{p.dairy ?? 'N/A'}</td>
                      <td style={{ padding: '8px', fontSize: '0.82rem', color: '#f472b6' }}>{p.sugar ?? 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      ));
  };

  const renderLogins = () => {
    if (loginLoading) return <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '16px' }}>Loading login history...</div>;
    if (!loginData || loginData.length === 0) return <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '40px', textAlign: 'center' }}>No login history available.</div>;

    return (
      <div className="glass-panel" style={{ padding: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Login Date & Time</th>
              <th style={{ padding: '8px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Account Email</th>
            </tr>
          </thead>
          <tbody>
            {loginData.map((log, i) => (
              <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '12px 8px', fontSize: '0.85rem' }}>{new Date(log.logged_in_at).toLocaleString()}</td>
                <td style={{ padding: '12px 8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{log.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (inline) {
    return (
      <div ref={reportRef} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {renderPredictions()}
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('predictions')}
          style={{
            background: 'none', border: 'none', color: activeTab === 'predictions' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            borderBottom: activeTab === 'predictions' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
            paddingBottom: '4px', marginBottom: '-13px'
          }}
        >
          <History size={16} /> Prediction History
        </button>
        <button
          onClick={() => setActiveTab('logins')}
          style={{
            background: 'none', border: 'none', color: activeTab === 'logins' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            borderBottom: activeTab === 'logins' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
            paddingBottom: '4px', marginBottom: '-13px'
          }}
        >
          <LogIn size={16} /> Login History
        </button>
      </div>

      <div ref={reportRef} style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
        {activeTab === 'predictions' ? renderPredictions() : renderLogins()}
      </div>
    </div>
  );
};

export default PredictionHistory;
