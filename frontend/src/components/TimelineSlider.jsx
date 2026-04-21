export default function TimelineSlider({ labels, selectedIndex, onChange }) {
  return (
    <div className="timeline-slider">
      <div className="timeline-labels">
        {labels.map((label, index) => (
          <span key={label + index} className={index === selectedIndex ? 'timeline-label active' : 'timeline-label'}>
            {label}
          </span>
        ))}
      </div>
      <input
        type="range"
        min="0"
        max={Math.max(labels.length - 1, 0)}
        step="1"
        value={selectedIndex}
        onChange={(event) => onChange(Number(event.target.value))}
        className="timeline-range"
        aria-label="Forecast timeline"
      />
    </div>
  );
}
