'use client';

import React from 'react';
import { ShieldCheck, RotateCcw } from 'lucide-react';
import { RiskPolicyParams, ScheduleResult } from '@/lib/types';
import { formatPercent, formatSoles } from '@/lib/finance-engine';

interface RiskControlPanelProps {
  params: RiskPolicyParams;
  onChange: (next: RiskPolicyParams) => void;
  onReset: () => void;
  activeSchedule: ScheduleResult;
}

const TERM_OPTIONS = [6, 12, 18, 24];

export default function RiskControlPanel({
  params,
  onChange,
  onReset,
  activeSchedule,
}: RiskControlPanelProps) {
  const updateField = <K extends keyof RiskPolicyParams>(
    key: K,
    value: RiskPolicyParams[K]
  ) => {
    onChange({ ...params, [key]: value });
  };

  return (
    <section
      aria-label="Parámetros estandarizados de riesgo y condiciones del crédito"
      className="bg-white border border-slate-200 rounded-lg p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Parámetros estandarizados de riesgo y crédito
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Reglas matemáticas que protegen la rentabilidad de Caja Trujillo y acotan la exposición por liquidez.
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restablecer política
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {/* Column 1: Credit Conditions */}
        <div className="space-y-4">
          <div className="text-xs font-semibold text-slate-700">
            Condiciones del financiamiento
          </div>

          {/* Loan Amount */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label htmlFor="param-loan-amount" className="text-slate-600 font-medium">
                Monto del crédito
              </label>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {formatSoles(params.loanAmount)}
              </span>
            </div>
            <input
              id="param-loan-amount"
              type="range"
              min={6000}
              max={60000}
              step={1000}
              value={params.loanAmount}
              onChange={(e) => updateField('loanAmount', Number(e.target.value))}
              className="w-full accent-[#B91C1C] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-400 mt-0.5">
              <span>S/ 6,000</span>
              <span>S/ 60,000</span>
            </div>
          </div>

          {/* TEA */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label htmlFor="param-tea" className="text-slate-600 font-medium">
                Tasa Efectiva Anual (TEA)
              </label>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {formatPercent(params.teaPercent)}
              </span>
            </div>
            <input
              id="param-tea"
              type="range"
              min={22}
              max={48}
              step={0.5}
              value={params.teaPercent}
              onChange={(e) => updateField('teaPercent', Number(e.target.value))}
              className="w-full accent-[#B91C1C] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-400 mt-0.5">
              <span>22.0%</span>
              <span>48.0%</span>
            </div>
          </div>

          {/* Term selector */}
          <div>
            <span className="block text-xs text-slate-600 font-medium mb-1.5">
              Plazo del cronograma
            </span>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-md">
              {TERM_OPTIONS.map((months) => {
                const active = params.termMonths === months;
                return (
                  <button
                    key={months}
                    type="button"
                    onClick={() => updateField('termMonths', months)}
                    className={`py-1.5 text-xs font-mono tabular-nums font-medium rounded transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {months} meses
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Column 2: Bank Protection & Risk Policy */}
        <div className="space-y-4 md:border-l md:border-slate-100 md:pl-6">
          <div className="text-xs font-semibold text-slate-700">
            Salvaguardas de política crediticia (protección bancaria)
          </div>

          {/* Max RCI */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label htmlFor="param-max-rci" className="text-slate-600 font-medium">
                Tope máximo Cuota / Excedente (RCI)
              </label>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {params.maxRciPercent}%
              </span>
            </div>
            <input
              id="param-max-rci"
              type="range"
              min={30}
              max={65}
              step={5}
              value={params.maxRciPercent}
              onChange={(e) => updateField('maxRciPercent', Number(e.target.value))}
              className="w-full accent-[#B91C1C] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-400 mt-0.5">
              <span>30% (estricto)</span>
              <span>65% (flexible)</span>
            </div>
          </div>

          {/* Stress Haircut */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label htmlFor="param-stress" className="text-slate-600 font-medium">
                Estrés conservador de ingresos
              </label>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                -{params.stressHaircutPercent}%
              </span>
            </div>
            <input
              id="param-stress"
              type="range"
              min={5}
              max={35}
              step={5}
              value={params.stressHaircutPercent}
              onChange={(e) => updateField('stressHaircutPercent', Number(e.target.value))}
              className="w-full accent-[#B91C1C] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-400 mt-0.5">
              <span>-5% base</span>
              <span>-35% estrés severo</span>
            </div>
          </div>

          {/* Min Principal Floor */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label htmlFor="param-floor" className="text-slate-600 font-medium">
                Piso mínimo de amortización en meses bajos
              </label>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {params.minPrincipalFloorPercent}% del capital medio
              </span>
            </div>
            <input
              id="param-floor"
              type="range"
              min={15}
              max={60}
              step={5}
              value={params.minPrincipalFloorPercent}
              onChange={(e) =>
                updateField('minPrincipalFloorPercent', Number(e.target.value))
              }
              className="w-full accent-[#B91C1C] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-400 mt-0.5">
              <span>15% (mayor flexibilidad)</span>
              <span>60% (amortización rápida)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bank Profitability Invariant Verification Strip */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-emerald-800 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>Rentabilidad de Caja Trujillo resguardada ({activeSchedule.shortName})</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600 font-mono tabular-nums">
          <span>TEA contractual: {formatPercent(activeSchedule.effectiveTeaPercent)}</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>VAN validado: {formatSoles(activeSchedule.npvAtContractRate, 2)}</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>Amortización negativa: {activeSchedule.negativeAmortizationMonths} meses</span>
        </div>
      </div>
    </section>
  );
}
