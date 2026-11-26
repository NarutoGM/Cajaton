'use client';

import React, { useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  PencilLine,
  ScanLine,
  Upload,
} from 'lucide-react';
import { ClientProfile, OptimizationEvaluation } from '@/lib/types';
import { SAMPLE_CLIENTS } from '@/lib/clients-data';
import { formatSoles } from '@/lib/finance-engine';

interface StepOcrUploadProps {
  client: ClientProfile;
  evaluation: OptimizationEvaluation;
  isScanning: boolean;
  scanStepLabel: string;
  customBusinessName: string;
  customOwnerName: string;
  customSector: string;
  onSelectDossier: (clientId: string) => void;
  onUploadFile: (fileName: string) => void;
  onUpdateExtractedFields: (patch: {
    businessName?: string;
    ownerName?: string;
    sector?: string;
  }) => void;
  onNext: () => void;
}

export default function StepOcrUpload({
  client,
  evaluation,
  isScanning,
  scanStepLabel,
  customBusinessName,
  customOwnerName,
  customSector,
  onSelectDossier,
  onUploadFile,
  onUpdateExtractedFields,
  onNext,
}: StepOcrUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showRawDoc, setShowRawDoc] = useState(false);
  const [showEditFields, setShowEditFields] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file.name);
      e.target.value = '';
    }
  };

  const baseCosts = client.monthlyData.reduce(
    (acc, m) => acc + m.operatingExpenses + m.merchandiseCost + m.existingObligations,
    0
  );
  const avgMonthlyFixed = Math.round(
    client.monthlyData.reduce((acc, m) => acc + m.operatingExpenses, 0) /
      client.monthlyData.length
  );
  const rccObligation = client.monthlyData[0]?.existingObligations ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-[#B91C1C]">Paso 1 de 3</div>
          <h1 className="text-xl font-semibold text-slate-950 mt-0.5">
            Expediente crediticio y extracción OCR
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Selecciona uno de los 3 expedientes PDF de prueba (o sube uno) para extraer automáticamente los datos del cliente.
          </p>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileChange}
            className="hidden"
            id="step-ocr-file-input"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            Subir otro PDF
          </button>
        </div>
      </div>

      {/* 3 Selectable Sample PDF Dossiers */}
      <section aria-label="Expedientes PDF de demostración" className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {SAMPLE_CLIENTS.map((doc) => {
          const isSelected = doc.id === client.id;
          return (
            <button
              key={doc.id}
              type="button"
              onClick={() => onSelectDossier(doc.id)}
              disabled={isScanning}
              aria-pressed={isSelected}
              className={`text-left bg-white rounded-lg p-4 border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B91C1C] ${
                isSelected
                  ? 'border-[#B91C1C] ring-1 ring-[#B91C1C]/25'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-500 truncate">
                  <FileText className="w-3.5 h-3.5 text-[#B91C1C] shrink-0" />
                  <span className="truncate">{doc.dossierFileName}</span>
                </span>
              </div>

              <h2 className="text-sm font-semibold text-slate-900 leading-snug">
                {doc.businessName}
              </h2>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{doc.sector}</p>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">{doc.dossierPages} págs · PDF</span>
                <span
                  className={
                    isSelected ? 'font-semibold text-[#B91C1C]' : 'font-medium text-slate-600'
                  }
                >
                  {isSelected ? 'Cargado por OCR' : 'Cargar con OCR'}
                </span>
              </div>
            </button>
          );
        })}
      </section>

      {/* Scanning feedback bar */}
      {isScanning && (
        <div
          role="status"
          aria-live="polite"
          className="px-4 py-3 rounded-lg bg-slate-900 text-white flex items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2.5">
            <ScanLine className="w-4 h-4 text-red-400 animate-spin" />
            <span className="font-medium">{scanStepLabel}</span>
          </div>
          <span className="font-mono text-[11px] text-slate-300">OCR simulado</span>
        </div>
      )}

      {/* Automatically Extracted Client & Financial Profile */}
      <section
        aria-label="Datos extraídos automáticamente por OCR"
        className="bg-white border border-slate-200 rounded-lg overflow-hidden"
      >
        {/* Extracted Client Identity Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Extraído automáticamente del expediente</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="font-mono text-slate-600">
                Confianza OCR {client.ocrOverallConfidence.toFixed(1)}%
              </span>
            </div>
            <h2 className="text-base font-semibold text-slate-950 mt-1">
              {client.businessName}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Titular: <strong className="font-medium text-slate-700">{client.ownerName}</strong>
              {' · '}RUC <span className="font-mono text-slate-700">{client.ruc}</span>
              {' · '}{client.sector}
              {' · '}{client.agency}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowEditFields((v) => !v)}
            aria-expanded={showEditFields}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-950 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            <PencilLine className="w-3.5 h-3.5" />
            <span>{showEditFields ? 'Cerrar edición' : 'Corregir dato'}</span>
          </button>
        </div>

        {/* Optional Analyst Correction Drawer (collapsed by default) */}
        {showEditFields && (
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="ocr-edit-business"
                className="block text-[11px] font-medium text-slate-600 mb-1"
              >
                Razón social
              </label>
              <input
                id="ocr-edit-business"
                type="text"
                value={customBusinessName}
                onChange={(e) => onUpdateExtractedFields({ businessName: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-[#B91C1C]"
              />
            </div>
            <div>
              <label
                htmlFor="ocr-edit-owner"
                className="block text-[11px] font-medium text-slate-600 mb-1"
              >
                Titular
              </label>
              <input
                id="ocr-edit-owner"
                type="text"
                value={customOwnerName}
                onChange={(e) => onUpdateExtractedFields({ ownerName: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-[#B91C1C]"
              />
            </div>
            <div>
              <label
                htmlFor="ocr-edit-sector"
                className="block text-[11px] font-medium text-slate-600 mb-1"
              >
                Rubro / Sector
              </label>
              <input
                id="ocr-edit-sector"
                type="text"
                value={customSector}
                onChange={(e) => onUpdateExtractedFields({ sector: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-[#B91C1C]"
              />
            </div>
          </div>
        )}

        {/* 4 Key Extracted Financial Figures */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          <div className="p-4">
            <div className="text-xs text-slate-500">Ventas proyectadas (12m)</div>
            <div className="text-lg font-mono tabular-nums font-semibold text-slate-950 mt-1">
              {formatSoles(evaluation.annualProjectedSales)}
            </div>
          </div>
          <div className="p-4">
            <div className="text-xs text-slate-500">Costos y egresos (12m)</div>
            <div className="text-lg font-mono tabular-nums font-semibold text-slate-950 mt-1">
              {formatSoles(baseCosts)}
            </div>
          </div>
          <div className="p-4">
            <div className="text-xs text-slate-500">Gasto operativo fijo</div>
            <div className="text-lg font-mono tabular-nums font-semibold text-slate-950 mt-1">
              {formatSoles(avgMonthlyFixed)}
              <span className="text-xs font-sans font-normal text-slate-500"> /mes</span>
            </div>
          </div>
          <div className="p-4">
            <div className="text-xs text-slate-500">Deuda vigente (RCC)</div>
            <div className="text-lg font-mono tabular-nums font-semibold text-slate-950 mt-1">
              {formatSoles(rccObligation)}
              <span className="text-xs font-sans font-normal text-slate-500"> /mes</span>
            </div>
          </div>
        </div>

        {/* Detected Seasonality Strip */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-slate-500">Campaña de mayores ingresos:</span>
            <div className="text-sm font-semibold text-[#B91C1C] mt-0.5">
              {client.peakMonthsSummary}
            </div>
          </div>
          <div>
            <span className="text-slate-500">Periodos de menor liquidez:</span>
            <div className="text-sm font-semibold text-slate-800 mt-0.5">
              {client.lowMonthsSummary}
            </div>
          </div>
        </div>

        {/* Optional Collapsible PDF Text Preview */}
        <div className="px-5 py-2.5 border-t border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setShowRawDoc((v) => !v)}
            aria-expanded={showRawDoc}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-950"
          >
            {showRawDoc ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            <span>
              {showRawDoc
                ? 'Ocultar extracto del documento PDF'
                : 'Ver extracto leído del documento PDF'}
            </span>
          </button>

          {showRawDoc && (
            <div className="mt-3 space-y-3 font-mono text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded-md p-3.5">
              {client.documentPreviewLines.map((block) => (
                <div key={block.section} className="space-y-1">
                  <div className="font-semibold text-[#991B1B]">{block.section}</div>
                  {block.lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Step Footer */}
      <div className="flex items-center justify-end pt-1">
        <button
          type="button"
          onClick={onNext}
          disabled={isScanning}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#B91C1C] hover:bg-[#991B1B] disabled:opacity-50 rounded-md transition-colors whitespace-nowrap"
        >
          <span>Continuar a Paso 2: Parámetros y Riesgo</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
