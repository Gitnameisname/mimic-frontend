"use client";

/**
 * 경량 SVG 라인 차트 (Phase 14-12)
 *
 * Recharts 등 외부 라이브러리를 추가하지 않기 위한 자체 구현.
 * - 다중 시리즈 지원
 * - 빈 데이터 → "데이터 수집 중" 안내
 * - hover 시 십자선 + 포인트별 툴팁
 * - 시간축 레이블은 사용자 로컬 시간대 (toLocaleTimeString)
 * - aria-label 로 차트 의미 전달
 */

import { useMemo, useState } from "react";

export interface LineSeries {
  key: string;
  label: string;
  color: string; // tailwind 색상 hex (예: '#22c55e')
  values: number[];
}

interface LineChartProps {
  timestamps: string[]; // ISO 문자열 (X축)
  series: LineSeries[];
  unit?: string;
  height?: number;
  ariaLabel: string;
  emptyMessage?: string;
}

export function LineChart({
  timestamps,
  series,
  unit = "",
  height = 220,
  ariaLabel,
  emptyMessage = "데이터 수집 중...",
}: LineChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // 데이터 유효성: 모든 시리즈 값이 0이면 빈 데이터로 간주
  const isEmpty = useMemo(() => {
    if (timestamps.length === 0) return true;
    return series.every((s) => s.values.every((v) => v === 0 || v == null));
  }, [timestamps, series]);

  const padding = { top: 16, right: 16, bottom: 28, left: 44 };
  const width = 600; // viewBox 폭 — ResponsiveContainer로 100% 늘림
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  // 최대값 (Y축 스케일)
  const maxValue = useMemo(() => {
    let max = 0;
    for (const s of series) {
      for (const v of s.values) {
        if (v > max) max = v;
      }
    }
    // 깔끔한 단위로 올림
    if (max === 0) return 10;
    const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
    return Math.ceil(max / magnitude) * magnitude;
  }, [series]);

  function xAt(i: number): number {
    if (timestamps.length <= 1) return padding.left + innerW / 2;
    return padding.left + (i / (timestamps.length - 1)) * innerW;
  }

  function yAt(value: number): number {
    if (maxValue === 0) return padding.top + innerH;
    return padding.top + innerH - (value / maxValue) * innerH;
  }

  function pathFor(values: number[]): string {
    return values
      .map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(2)} ${yAt(v).toFixed(2)}`)
      .join(" ");
  }

  // X축 레이블 — 4~6개만 표시
  const labelStep = Math.max(1, Math.ceil(timestamps.length / 6));
  const xTicks = timestamps
    .map((ts, i) => ({ ts, i }))
    .filter((t) => t.i % labelStep === 0 || t.i === timestamps.length - 1);

  // Y축 4단계 눈금
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((r) => Math.round(maxValue * r));

  if (isEmpty) {
    return (
      <div
        role="img"
        aria-label={`${ariaLabel} (데이터 없음)`}
        className="w-full flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200 text-gray-400 text-sm"
        style={{ height }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={ariaLabel}
        onMouseLeave={() => setHoverIdx(null)}
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const localX = ((e.clientX - rect.left) / rect.width) * width;
          const idx = Math.round(
            ((localX - padding.left) / innerW) * (timestamps.length - 1),
          );
          if (idx >= 0 && idx < timestamps.length) setHoverIdx(idx);
        }}
      >
        {/* Y축 그리드 + 눈금 */}
        {yTicks.map((t, i) => {
          const y = yAt(t);
          return (
            <g key={i}>
              <line
                x1={padding.left}
                x2={padding.left + innerW}
                y1={y}
                y2={y}
                stroke="#e5e7eb"
                strokeDasharray={i === 0 ? "0" : "2 2"}
              />
              <text
                x={padding.left - 6}
                y={y + 3}
                fontSize="10"
                textAnchor="end"
                fill="#9ca3af"
              >
                {t}
                {unit}
              </text>
            </g>
          );
        })}

        {/* X축 레이블 */}
        {xTicks.map(({ ts, i }) => {
          const x = xAt(i);
          const d = new Date(ts);
          const lbl = d.toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
          return (
            <text
              key={i}
              x={x}
              y={height - 8}
              fontSize="10"
              textAnchor="middle"
              fill="#9ca3af"
            >
              {lbl}
            </text>
          );
        })}

        {/* 라인 + 포인트 */}
        {series.map((s) => (
          <g key={s.key}>
            <path
              d={pathFor(s.values)}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {s.values.map((v, i) => (
              <circle
                key={i}
                cx={xAt(i)}
                cy={yAt(v)}
                r={hoverIdx === i ? 3.5 : 1.5}
                fill={s.color}
                opacity={hoverIdx === i ? 1 : 0.7}
              />
            ))}
          </g>
        ))}

        {/* 호버 시 십자선 */}
        {hoverIdx !== null && (
          <line
            x1={xAt(hoverIdx)}
            x2={xAt(hoverIdx)}
            y1={padding.top}
            y2={padding.top + innerH}
            stroke="#9ca3af"
            strokeDasharray="3 3"
          />
        )}
      </svg>

      {/* 범례 */}
      <div className="flex items-center gap-4 flex-wrap text-xs text-gray-600 mt-2">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-0.5 rounded"
              style={{ backgroundColor: s.color }}
              aria-hidden="true"
            />
            {s.label}
          </div>
        ))}
      </div>

      {/* 호버 툴팁 */}
      {hoverIdx !== null && timestamps[hoverIdx] && (
        <div
          className="mt-2 text-xs bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 inline-block shadow-sm"
          role="status"
          aria-live="polite"
        >
          <div className="text-gray-500">
            {new Date(timestamps[hoverIdx]).toLocaleString("ko-KR", {
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          {series.map((s) => (
            <div key={s.key} className="font-mono">
              <span style={{ color: s.color }}>●</span> {s.label}:{" "}
              <span className="font-semibold text-gray-900">
                {s.values[hoverIdx]}
                {unit}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
