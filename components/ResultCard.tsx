import React from 'react';
import { Ruler, Info, Download } from 'lucide-react';
import { AnalysisResult } from '../types';

interface ResultCardProps {
  result: AnalysisResult | null;
  image: string | null;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result, image }) => {
  if (!result || !image) return null;

  const garmentTypeLabel = result.clothingType === 'SHIRT' ? '상의' : '하의';

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden shadow-xl backdrop-blur-sm animate-fade-in-up flex flex-col h-full">
      <div className="p-4 border-b border-slate-700 bg-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
            <Ruler size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{garmentTypeLabel} 분석 결과</h2>
            <p className="text-xs text-slate-400">기준: {result.rulerLengthCm}cm 줄자</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        
        {/* Visual Measurement Overlay */}
        <div className="relative w-full rounded-lg overflow-hidden border border-slate-700 bg-white/5 group">
          <img 
            src={image} 
            alt="Analyzed Garment" 
            className="w-full h-auto block"
          />
          <svg 
            viewBox="0 0 1000 1000" 
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            <defs>
              <filter id="text-shadow" x="-10%" y="-10%" width="120%" height="120%">
                <feFlood floodColor="#000000" floodOpacity="0.15" result="flood"/>
                <feComposite in="flood" in2="SourceGraphic" operator="in" result="shadow"/>
                <feOffset dx="0" dy="1" result="offsetShadow"/>
                <feMerge>
                   <feMergeNode in="offsetShadow"/>
                   <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              
              {/* Measurement Arrowhead (Blue) */}
              <marker 
                id="arrow-blue" 
                viewBox="0 0 10 10" 
                refX="9" refY="5"
                markerWidth="5" 
                markerHeight="5" 
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb" />
              </marker>

              {/* Ruler Arrowhead (Green) */}
              <marker 
                id="arrow-green" 
                viewBox="0 0 10 10" 
                refX="9" refY="5"
                markerWidth="5" 
                markerHeight="5" 
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
              </marker>
            </defs>

            {/* 1. Ruler Reference Line (Green) */}
            <g>
              {/* White Background Line for contrast */}
              <line 
                x1={result.rulerStart.x} y1={result.rulerStart.y} 
                x2={result.rulerEnd.x} y2={result.rulerEnd.y} 
                stroke="white" strokeWidth="8" strokeOpacity="0.8" strokeLinecap="round"
              />
              {/* Dashed Line */}
              <line 
                x1={result.rulerStart.x} y1={result.rulerStart.y} 
                x2={result.rulerEnd.x} y2={result.rulerEnd.y} 
                stroke="#10b981" strokeWidth="3" strokeDasharray="6,4" strokeLinecap="round"
                markerStart="url(#arrow-green)" markerEnd="url(#arrow-green)"
              />
              
              {/* Ruler Label */}
              <g transform={`translate(${(result.rulerStart.x + result.rulerEnd.x) / 2}, ${(result.rulerStart.y + result.rulerEnd.y) / 2})`}>
                 <rect 
                    x="-70" y="-14" width="140" height="28" rx="8"
                    fill="#ffffff" stroke="#10b981" strokeWidth="1.5"
                    filter="url(#text-shadow)"
                  />
                  <text 
                    x="0" y="5" textAnchor="middle" 
                    fill="#10b981" fontSize="14" fontWeight="bold" fontFamily="sans-serif"
                  >
                    기준 줄자 ({result.rulerLengthCm}cm)
                  </text>
              </g>
            </g>
            
            {/* 2. Measurements (Blue) */}
            {result.measurements.map((m, idx) => (
              <g key={idx}>
                {/* Contrast Outline */}
                <line 
                  x1={m.start.x} y1={m.start.y} 
                  x2={m.end.x} y2={m.end.y} 
                  stroke="white" strokeWidth="7" strokeOpacity="0.7" strokeLinecap="round"
                />
                
                {/* Main Measurement Line */}
                <line 
                  x1={m.start.x} y1={m.start.y} 
                  x2={m.end.x} y2={m.end.y} 
                  stroke="#2563eb" strokeWidth="3.5" strokeLinecap="round"
                  markerStart="url(#arrow-blue)" markerEnd="url(#arrow-blue)"
                />
                
                {/* Endpoints dots */}
                <circle cx={m.start.x} cy={m.start.y} r="4" fill="#2563eb" stroke="white" strokeWidth="1.5" />
                <circle cx={m.end.x} cy={m.end.y} r="4" fill="#2563eb" stroke="white" strokeWidth="1.5" />
                
                {/* Floating Label: White Box, Blue Text */}
                <g transform={`translate(${(m.start.x + m.end.x) / 2}, ${(m.start.y + m.end.y) / 2})`}>
                  {/* Background Badge */}
                  <rect 
                    x="-90" y="-16" width="180" height="32" rx="8"
                    fill="#ffffff" stroke="#2563eb" strokeWidth="1.5"
                    filter="url(#text-shadow)"
                  />
                  {/* Text */}
                  <text 
                    x="0" y="5" textAnchor="middle" 
                    fill="#2563eb" fontSize="15" fontWeight="bold" fontFamily="sans-serif"
                  >
                    {m.label}: {m.value}
                  </text>
                </g>
              </g>
            ))}
          </svg>
        </div>

        {/* Text Table */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border border-slate-700 shadow-md">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800 text-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">측정 부위</th>
                  <th className="px-4 py-3 font-semibold text-right">길이</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700 bg-slate-900/50">
                {result.measurements.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-slate-300 font-medium">{m.label}</td>
                    <td className="px-4 py-3 text-blue-400 font-mono font-bold text-right tracking-wide">{m.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <Info className="text-blue-400 shrink-0" size={18} />
          <p className="text-xs text-blue-200/80">
            초록색 점선은 <strong>{result.rulerLengthCm}cm 기준 줄자</strong>입니다. 모든 치수는 이를 기준으로 계산되었습니다.
          </p>
        </div>
      </div>
    </div>
  );
};