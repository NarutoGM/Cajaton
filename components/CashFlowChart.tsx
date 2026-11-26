'use client';

import React, { useState } from 'react';
import { ScheduleResult } from '@/lib/types';
import { formatPercent, formatSoles } from '@/lib/finance-engine';

interface CashFlowChartProps {
  activeSchedule: ScheduleResult;
  uniformSchedule: ScheduleResult;
  maxRciPercent: number;
  stressHaircutPercent: number;
}

export default function CashFlowChart({
  activeSchedule,
  uniformSchedule,
  maxRciPercent,
  stressHaircutPercent,
}: CashFlowChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const rows = activeSchedule.rows;
  const uniformRows = uniformSchedule.rows;

  const width = 760;
  const height = 285;
  const padTop = 20;
  const padRight = 18;
  const padBottom = 38;
  const padLeft = 64;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxDataVal = Math.max(
    ...rows.map((r) => Math.max(r.projectedSurplus, r.totalInstallment)),
    ...uniformRows.map((r) => r.totalInstallment),
    1000
  );
  // Nice rounded ceiling for Y axis
  const yCeiling = Math.ceil((maxDataVal * 1.12) / 1000) * 1000;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(yCeiling * f));

  const n = rows.length;
  const slotW = plotW / Math.max(1, n);
  const barW = Math.min(28, Math.max(10, slotW * 0.46));

  const xCenter = (idx: number) => padLeft + slotW * idx + slotW / 2;
  const yPos = (val: number) => padTop + plotH - (Math.max(0, val) / yCeiling) * plotH;

  const projectedLinePath = rows
    .map((r, i) => `${i === 0 ? 'M' : 'L'} ${xCenter(i).toFixed(1)} ${yPos(r.projectedSurplus).toFixed(1)}`)
    .join(' ');

  const stressedLinePath = rows
    .map((r, i) => `${i === 0 ? 'M' : 'L'} ${xCenter(i).toFixed(1)} ${yPos(r.stressedSurplus).toFixed(1)}`)
    .join(' ');

  const rciCapLinePath = rows
    .map(
      (r, i) =>
        `${i === 0 ? 'M' : 'L'} ${xCenter(i).toFixed(1)} ${yPos(
          r.stressedSurplus * (maxRciPercent / 100)
        ).toFixed(1)}`
    )
    .join(' ');

  // Uncertainty band polygon between projectedSurplus and stressedSurplus
  const bandPoints = [
    ...rows.map((r, i) => `${xCenter(i).toFixed(1)},${yPos(r.projectedSurplus).toFixed(1)}`),
    ...[...rows]
      .reverse()
      .map((r, revI) => {
        const i = rows.length - 1 - revI;
        return `${xCenter(i).toFixed(1)},${yPos(r.stressedSurplus).toFixed(1)}`;
      }),
  ].join(' ');

  const activeHover = hoveredIdx !== null ? rows[hoveredIdx] : null;
  const uniformHover = hoveredIdx !== null ? uniformRows[hoveredIdx] : null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Flujo disponible proyectado frente a cuotas ({activeSchedule.name})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Banda conservadora con recorte de estrés -{stressHaircutPercent}% · Tope de política RCI {maxRciPercent}%
          </p>
        </div>

        {/* Clean legend with unboxed typography */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2.5 h-2.5 bg-[#B91C1C] rounded-xs inline-block" />
            Cuota {activeSchedule.shortName}
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-3 h-0.5 bg-slate-900 inline-block" />
            Excedente estresado
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-amber-600 inline-block" />
            Tope RCI ({maxRciPercent}%)
          </span>
          {activeSchedule.id !== 'uniforme' && (
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2.5 h-0.5 bg-slate-400 inline-block" />
              Referencia Uniforme
            </span>
          )}
        </div>
      </div>

      {/* Live readout strip so data is immediately inspectable even without hovering */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-2 border-b border-slate-100 text-xs">
        {activeHover && uniformHover ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-slate-700">
            <span className="font-semibold text-slate-900">
              Periodo {activeHover.period} ({activeHover.monthName})
            </span>
            <span className="font-mono tabular-nums">
              Excedente estresado: <strong className="text-slate-900">{formatSoles(activeHover.stressedSurplus)}</strong>
            </span>
            <span className="font-mono tabular-nums">
              Cuota {activeSchedule.shortName}:{' '}
              <strong className="text-[#B91C1C]">{formatSoles(activeHover.totalInstallment, 2)}</strong>
            </span>
            {activeSchedule.id !== 'uniforme' && (
              <span className="font-mono tabular-nums text-slate-500">
                Uniforme: {formatSoles(uniformHover.totalInstallment, 2)}
              </span>
            )}
            <span className="font-mono tabular-nums">
              RCI:{' '}
              <strong
                className={
                  activeHover.status === 'deficit' || activeHover.status === 'estres'
                    ? 'text-red-700'
                    : activeHover.status === 'ajustado'
                    ? 'text-amber-700'
                    : 'text-emerald-700'
                }
              >
                {formatPercent(activeHover.rciPercent)}
              </strong>
            </span>
          </div>
        ) : (
          <p className="text-slate-500">
            Pase el cursor sobre cualquier mes para inspeccionar el desglose de excedente, cuota y cobertura RCI.
          </p>
        )}
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[560px] select-none"
          role="img"
          aria-label={`Gráfico comparativo de flujo disponible proyectado y cuotas del esquema ${activeSchedule.name}`}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {/* Horizontal grid lines and Y labels */}
          {yTicks.map((tickVal) => {
            const y = yPos(tickVal);
            return (
              <g key={tickVal}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeWidth={1}
                />
                <text
                  x={padLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-slate-500 text-[10px] font-mono tabular-nums"
                >
                  {tickVal === 0 ? 'S/ 0' : `S/ ${(tickVal / 1000).toFixed(tickVal % 1000 === 0 ? 0 : 1)}k`}
                </text>
              </g>
            );
          })}

          {/* Peak-season subtle vertical column tint */}
          {rows.map((r, i) =>
            r.seasonalityTier === 'alto' ? (
              <rect
                key={`peak-${r.period}`}
                x={padLeft + slotW * i + 2}
                y={padTop}
                width={Math.max(4, slotW - 4)}
                height={plotH}
                fill="#FEF2F2"
                opacity={0.75}
              />
            ) : null
          )}

          {/* Hover vertical highlight */}
          {hoveredIdx !== null && (
            <rect
              x={padLeft + slotW * hoveredIdx}
              y={padTop}
              width={slotW}
              height={plotH}
              fill="#F1F5F9"
              opacity={0.8}
            />
          )}

          {/* Uncertainty band between projected surplus and conservative stressed surplus */}
          <polygon points={bandPoints} fill="#94A3B8" opacity={0.14} />

          {/* Installment bars */}
          {rows.map((r, i) => {
            const cx = xCenter(i);
            const barTop = yPos(r.totalInstallment);
            const barH = Math.max(2, padTop + plotH - barTop);
            const isOverPolicy = r.status === 'estres' || r.status === 'deficit';
            const fill = isOverPolicy ? '#EF4444' : '#991B1B';

            const uniformY = uniformRows[i] ? yPos(uniformRows[i].totalInstallment) : null;

            return (
              <g key={`bar-${r.period}`}>
                <rect
                  x={cx - barW / 2}
                  y={barTop}
                  width={barW}
                  height={barH}
                  rx={2}
                  fill={fill}
                  opacity={hoveredIdx === null || hoveredIdx === i ? 0.92 : 0.5}
                />

                {/* Uniform reference tick mark when viewing non-uniform schedules */}
                {activeSchedule.id !== 'uniforme' && uniformY !== null && (
                  <line
                    x1={cx - barW / 2 - 4}
                    x2={cx + barW / 2 + 4}
                    y1={uniformY}
                    y2={uniformY}
                    stroke="#64748B"
                    strokeWidth={1.75}
                  />
                )}

                {/* Period X label */}
                <text
                  x={cx}
                  y={height - 16}
                  textAnchor="middle"
                  className={`text-[10px] font-medium ${
                    r.seasonalityTier === 'alto' ? 'fill-[#991B1B] font-semibold' : 'fill-slate-600'
                  }`}
                >
                  {n <= 12 ? r.monthShort : `M${r.period}`}
                </text>
                {r.seasonalityTier === 'alto' && n <= 12 && (
                  <text
                    x={cx}
                    y={height - 4}
                    textAnchor="middle"
                    className="fill-[#B91C1C] text-[8.5px]"
                  >
                    Pico
                  </text>
                )}

                {/* Invisible interactive hit target */}
                <rect
                  x={padLeft + slotW * i}
                  y={padTop}
                  width={slotW}
                  height={plotH + padBottom}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(i)}
                />
              </g>
            );
          })}

          {/* Projected base surplus (subtle line) */}
          <path
            d={projectedLinePath}
            fill="none"
            stroke="#94A3B8"
            strokeWidth={1.5}
            strokeDasharray="3 3"
          />

          {/* Stressed disposable surplus (main dark line) */}
          <path
            d={stressedLinePath}
            fill="none"
            stroke="#0F172A"
            strokeWidth={2}
          />

          {/* Policy RCI Cap line (amber dashed) */}
          <path
            d={rciCapLinePath}
            fill="none"
            stroke="#D97706"
            strokeWidth={1.75}
            strokeDasharray="5 3"
          />

          {/* Data dots on stressed surplus line for active hover */}
          {hoveredIdx !== null && rows[hoveredIdx] && (
            <circle
              cx={xCenter(hoveredIdx)}
              cy={yPos(rows[hoveredIdx].stressedSurplus)}
              r={4}
              fill="#0F172A"
              stroke="#FFFFFF"
              strokeWidth={1.5}
            />
          )}
        </svg>
      </div>
    </div>
  );
}
