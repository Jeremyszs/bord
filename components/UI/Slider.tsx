import React from 'react';

interface SliderProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  className?: string;
}

export default function Slider({ value, min, max, onChange, className = '' }: SliderProps) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`w-full h-2 rounded-lg appearance-none cursor-pointer transition-all ${className}`}
      style={{
        backgroundColor: 'var(--border-subtle)',
      }}
    />
  );
}
