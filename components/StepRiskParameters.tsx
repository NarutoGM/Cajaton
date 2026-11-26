'use client';

import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import {
  OptimizationEvaluation,
  RiskPolicyParams,
  ScheduleStrategyId,
} from '@/lib/types';
import RiskControlPanel from './RiskControlPanel';

interface StepRiskParametersProps {
  params: RiskPolicyParams;
  evaluation: OptimizationEvaluation;
  selectedStrategy: ScheduleStrategyId;
  onChangeParams: (next: RiskPolicyParams) => void;
  onResetParams: () => void;
  onBack: () => void;
  onNext: () => void;
}

export default function StepRiskParameters({
  params,
  evaluation,
  selectedStrategy,
  onChangeParams,
  onResetParams,
  onBack,
  onNext,
}: StepRiskParametersProps) {
  const activeSchedule = evaluation.schedules[selectedStrategy];

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-medium text-[#B91C1C]">Paso 2 de 3</div>
        <h1 className="text-xl font-semibold text-slate-950 mt-0.5">
          Parámetros del crédito y protección bancaria
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Define monto, tasa, plazo y los límites estandarizados de riesgo que resguardan la rentabilidad de Caja Trujillo.
        </p>
      </div>

      {/* Standardized Credit & Bank Risk Controls Only */}
      <RiskControlPanel
        params={params}
        onChange={onChangeParams}
        onReset={onResetParams}
        activeSchedule={activeSchedule}
      />

      {/* Step Footer */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Paso 1: Expediente OCR</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-md transition-colors whitespace-nowrap"
        >
          <span>Generar alternativas y cronograma</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
