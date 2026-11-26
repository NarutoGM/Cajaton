'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import {
  ClientProfile,
  OptimizationEvaluation,
  RiskPolicyParams,
  ScheduleStrategyId,
} from '@/lib/types';
import { formatPercent, formatSoles } from '@/lib/finance-engine';
import CashFlowChart from './CashFlowChart';

export interface DecisionRecord {
  approvedStrategy: ScheduleStrategyId;
  approvedAt: string;
  analystNote: string;
  referenceCode: string;
}

interface StepFinalScheduleProps {
  client: ClientProfile;
  params: RiskPolicyParams;
  evaluation: OptimizationEvaluation;
  selectedStrategy: ScheduleStrategyId;
  onSelectStrategy: (id: ScheduleStrategyId) => void;
  decision: DecisionRecord | null;
  onApproveDecision: (record: DecisionRecord) => void;
  onReopenDecision: () => void;
  onBack: () => void;
  onStartOver: () => void;
}

export default function StepFinalSchedule({
  client,
  params,
  evaluation,
  selectedStrategy,
  onSelectStrategy,
  decision,
  onApproveDecision,
  onReopenDecision,
  onBack,
  onStartOver,
}: StepFinalScheduleProps) {
  const [analystNote, setAnalystNote] = useState('');
  const active = evaluation.schedules[selectedStrategy];

  const handleExportCsv = () => {
    const header = [
      'Mes',
      'Excedente_Estresado',
      'Capital',
      'Interes',
      'Seguro',
      'Cuota_Total',
      'Saldo_Final',
      'RCI_%',
    ].join(',');
    const lines = active.rows.map((r) =>
      [
        r.monthName,
        r.stressedSurplus.toFixed(2),
        r.principal.toFixed(2),
        r.interest.toFixed(2),
        r.insurance.toFixed(2),
        r.totalInstallment.toFixed(2),
        r.closingBalance.toFixed(2),
        r.rciPercent.toFixed(1),
      ].join(',')
    );
    const blob = new Blob([[header, ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cronograma_${active.shortName}_${client.ruc}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApprove = () => {
    const now = new Date().toLocaleString('es-PE', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    onApproveDecision({
      approvedStrategy: selectedStrategy,
      approvedAt: now,
      analystNote:
        analystNote.trim() ||
        `Cronograma ${active.name} validado con RCI pico ${formatPercent(
          active.maxRciPercent
        )} y TEA ${formatPercent(params.teaPercent)}.`,
      referenceCode: `DICT-${client.ruc.slice(-4)}-${params.termMonths}M`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-[#B91C1C]">Paso 3 de 3</div>
          <h1 className="text-xl font-semibold text-slate-950 mt-0.5">
            Alternativas generadas y cronograma final
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Compara los 3 esquemas generados por el motor matemático y elige el cronograma para aprobar.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" />
          Exportar PDF ({active.shortName})
        </button>
      </div>

      {/* 3 Comparative Schedule Alternatives Selector (moved here from Parameters step) */}
      <section aria-label="Alternativas de cronograma generadas" className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {evaluation.orderedSchedules.map((sch) => {
            const isSelected = sch.id === selectedStrategy;
            const isRecommended = sch.id === evaluation.recommendedId;

            const statusMeta =
              sch.policyStatus === 'viable'
                ? { label: 'Cumple política', cls: 'text-emerald-700', Icon: CheckCircle2 }
                : sch.policyStatus === 'observacion'
                  ? { label: 'Con observación', cls: 'text-amber-700', Icon: AlertTriangle }
                  : { label: 'Fuera de política', cls: 'text-red-700', Icon: XCircle };

            const StatusIcon = statusMeta.Icon;

            return (
              <button
                key={sch.id}
                type="button"
                onClick={() => onSelectStrategy(sch.id)}
                aria-pressed={isSelected}
                className={`text-left bg-white rounded-lg p-4 border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B91C1C] ${isSelected
                    ? 'border-[#B91C1C] ring-1 ring-[#B91C1C]/25'
                    : 'border-slate-200 hover:border-slate-300'
                  }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs mb-1">
                  <span
                    className={
                      isRecommended ? 'font-semibold text-[#B91C1C]' : 'text-slate-500'
                    }
                  >
                    {isRecommended ? 'Recomendada' : 'Alternativa'}
                  </span>
                  <span className={`inline-flex items-center gap-1 font-medium ${statusMeta.cls}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {statusMeta.label}
                  </span>
                </div>

                <h2 className="text-base font-semibold text-slate-900">{sch.name}</h2>

                <dl className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="text-slate-500">Cuotas</dt>
                    <dd className="font-mono tabular-nums font-semibold text-slate-900">
                      {sch.id === 'uniforme'
                        ? `${formatSoles(sch.avgInstallment, 0)} fija`
                        : `${formatSoles(sch.minInstallment, 0)} – ${formatSoles(
                          sch.maxInstallment,
                          0
                        )}`}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="text-slate-500">RCI pico estresado</dt>
                    <dd className={`font-mono tabular-nums font-semibold ${statusMeta.cls}`}>
                      {formatPercent(sch.maxRciPercent)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="text-slate-500">Interés total (Caja)</dt>
                    <dd className="font-mono tabular-nums text-slate-800">
                      {formatSoles(sch.totalInterest, 2)}
                    </dd>
                  </div>
                </dl>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-slate-600 bg-slate-100/70 border border-slate-200 rounded-md px-3.5 py-2.5">
          <strong className="text-slate-900">Sustento:</strong> {evaluation.recommendationReason}
        </p>
      </section>

      {/* Visual Chart for Selected Alternative */}
      <CashFlowChart
        activeSchedule={active}
        uniformSchedule={evaluation.schedules.uniforme}
        maxRciPercent={params.maxRciPercent}
        stressHaircutPercent={params.stressHaircutPercent}
      />

      {/* Clean, Scannable Monthly Schedule Table */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Detalle mensual — {active.name}
          </h2>
          <span className="text-xs font-mono tabular-nums text-slate-500">
            {formatSoles(params.loanAmount)} · {params.termMonths} cuotas · TEA {formatPercent(params.teaPercent)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                <th className="py-2.5 px-3.5">Mes</th>
                <th className="py-2.5 px-3.5 text-right">Excedente estresado</th>
                <th className="py-2.5 px-3.5 text-right">Capital</th>
                <th className="py-2.5 px-3.5 text-right">Interés + Seguro</th>
                <th className="py-2.5 px-3.5 text-right">Cuota total</th>
                <th className="py-2.5 px-3.5 text-right">Saldo</th>
                <th className="py-2.5 px-3.5 text-right">RCI %</th>
                <th className="py-2.5 px-3.5">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {active.rows.map((row) => {
                const statusInfo =
                  row.status === 'deficit'
                    ? { label: 'Déficit', cls: 'text-red-700 font-semibold' }
                    : row.status === 'estres'
                      ? { label: 'Sobre límite', cls: 'text-red-700 font-medium' }
                      : row.status === 'ajustado'
                        ? { label: 'Ajustado', cls: 'text-amber-700 font-medium' }
                        : { label: 'Holgado', cls: 'text-emerald-700' };

                return (
                  <tr
                    key={row.period}
                    className={`hover:bg-slate-50/80 ${row.seasonalityTier === 'alto' ? 'bg-red-50/25' : ''
                      }`}
                  >
                    <td className="py-2.5 px-3.5 font-medium text-slate-900 whitespace-nowrap">
                      <span className="font-mono text-slate-400 mr-2">
                        {String(row.period).padStart(2, '0')}
                      </span>
                      {row.monthName}
                      {row.seasonalityTier === 'alto' && (
                        <span className="ml-1.5 text-[10px] font-semibold text-[#B91C1C]">
                          · Pico
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono tabular-nums text-slate-600">
                      {formatSoles(row.stressedSurplus, 0)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono tabular-nums text-slate-800">
                      {formatSoles(row.principal, 2)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono tabular-nums text-slate-600">
                      {formatSoles(row.interest + row.insurance, 2)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono tabular-nums font-semibold text-slate-950">
                      {formatSoles(row.totalInstallment, 2)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono tabular-nums text-slate-500">
                      {formatSoles(row.closingBalance, 2)}
                    </td>
                    <td
                      className={`py-2.5 px-3.5 text-right font-mono tabular-nums font-semibold ${statusInfo.cls}`}
                    >
                      {formatPercent(row.rciPercent)}
                    </td>
                    <td className={`py-2.5 px-3.5 whitespace-nowrap ${statusInfo.cls}`}>
                      {statusInfo.label}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200 font-semibold text-slate-900">
                <td colSpan={2} className="py-3 px-3.5">
                  Total ({active.rows.length} cuotas)
                </td>
                <td className="py-3 px-3.5 text-right font-mono tabular-nums">
                  {formatSoles(active.totalPrincipal, 2)}
                </td>
                <td className="py-3 px-3.5 text-right font-mono tabular-nums">
                  {formatSoles(active.totalInterest + active.totalInsurance, 2)}
                </td>
                <td className="py-3 px-3.5 text-right font-mono tabular-nums text-[#B91C1C]">
                  {formatSoles(active.totalPayment, 2)}
                </td>
                <td className="py-3 px-3.5 text-right font-mono tabular-nums">S/ 0.00</td>
                <td className="py-3 px-3.5 text-right font-mono tabular-nums">
                  Máx {formatPercent(active.maxRciPercent)}
                </td>
                <td className="py-3 px-3.5 text-emerald-700 text-[11px]">VAN OK</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Lightweight Approval Box */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        {decision ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Cronograma aprobado ({decision.referenceCode})</span>
              </div>
              <p className="text-xs text-slate-600">
                {evaluation.schedules[decision.approvedStrategy].name} · {decision.approvedAt} ·{' '}
                {decision.analystNote}
              </p>
            </div>
            <button
              type="button"
              onClick={onReopenDecision}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
            >
              Modificar decisión
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex-1 min-w-[240px]">
              <label
                htmlFor="final-decision-note"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Nota rápida del analista (opcional)
              </label>
              <input
                id="final-decision-note"
                type="text"
                value={analystNote}
                onChange={(e) => setAnalystNote(e.target.value)}
                placeholder="Ej: Aprobado bajo esquema híbrido por estacionalidad de campaña."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#B91C1C] focus:bg-white"
              />
            </div>

            <button
              type="button"
              onClick={handleApprove}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              Aprobar cronograma
            </button>
          </div>
        )}
      </section>

      {/* Step Footer */}
      <div className="flex items-center justify-between gap-3 pt-2 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Paso 2: Parámetros</span>
        </button>

        <button
          type="button"
          onClick={onStartOver}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-950 transition-colors whitespace-nowrap"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Evaluar otro expediente</span>
        </button>
      </div>
    </div>
  );
}
