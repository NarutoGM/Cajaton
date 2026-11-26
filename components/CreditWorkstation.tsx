'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Landmark, MessageSquareText, CheckCircle2 } from 'lucide-react';
import { SAMPLE_CLIENTS, createSimulatedUploadProfile } from '@/lib/clients-data';
import { evaluateCreditOptimization, formatSoles } from '@/lib/finance-engine';
import {
  ChatMessage,
  ClientProfile,
  RiskPolicyParams,
  ScheduleStrategyId,
} from '@/lib/types';
import StepOcrUpload from './StepOcrUpload';
import StepRiskParameters from './StepRiskParameters';
import StepFinalSchedule, { DecisionRecord } from './StepFinalSchedule';
import AnalystChatPanel from './AnalystChatPanel';

type WizardStep = 1 | 2 | 3;

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 1, label: '1. Expediente OCR' },
  { id: 2, label: '2. Parámetros' },
  { id: 3, label: '3. Cronograma' },
];

function buildDefaultParams(client: ClientProfile): RiskPolicyParams {
  return {
    loanAmount: client.requestedAmount,
    teaPercent: client.defaultTea,
    termMonths: client.requestedTermMonths,
    insuranceMonthlyPercent: 0.12,
    maxRciPercent: 45,
    stressHaircutPercent: 15,
    minPrincipalFloorPercent: 35,
  };
}

function buildWelcomeMessage(client: ClientProfile): ChatMessage {
  return {
    id: `init-${client.id}`,
    role: 'assistant',
    content: `Expediente OCR de ${client.businessName} procesado (${client.ocrOverallConfidence.toFixed(
      1
    )}% de confianza).\n\nAvanza por los 3 pasos (OCR → Parámetros → Cronograma) y pregúntame en cualquier momento cómo protegemos la rentabilidad de Caja Trujillo o qué pasa si caen las ventas.`,
    timestamp: 'Ahora',
    citations: [`Campaña pico: ${client.peakMonthsSummary}`],
  };
}

export default function CreditWorkstation() {
  const [step, setStep] = useState<WizardStep>(1);
  const [clients, setClients] = useState<ClientProfile[]>(SAMPLE_CLIENTS);
  const [activeClientId, setActiveClientId] = useState<string>(SAMPLE_CLIENTS[0].id);

  // Optional OCR manual overrides (collapsed by default in Step 1)
  const [customBusinessName, setCustomBusinessName] = useState<string>(
    SAMPLE_CLIENTS[0].businessName
  );
  const [customOwnerName, setCustomOwnerName] = useState<string>(
    SAMPLE_CLIENTS[0].ownerName
  );
  const [customSector, setCustomSector] = useState<string>(SAMPLE_CLIENTS[0].sector);

  // Simulated OCR scanning animation state
  const [isScanning, setIsScanning] = useState(false);
  const [scanStepLabel, setScanStepLabel] = useState('');

  // Step 2 risk parameters & Step 3 selected strategy
  const [params, setParams] = useState<RiskPolicyParams>(() =>
    buildDefaultParams(SAMPLE_CLIENTS[0])
  );
  const [selectedStrategy, setSelectedStrategy] = useState<ScheduleStrategyId>('hibrida');

  // Step 3 approval state
  const [decisions, setDecisions] = useState<Record<string, DecisionRecord | null>>({});

  // Persistent Right-Hand Chat state
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    buildWelcomeMessage(SAMPLE_CLIENTS[0]),
  ]);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const baseClient = useMemo(
    () => clients.find((c) => c.id === activeClientId) ?? clients[0],
    [clients, activeClientId]
  );

  const effectiveClient: ClientProfile = useMemo(
    () => ({
      ...baseClient,
      businessName: customBusinessName.trim() || baseClient.businessName,
      ownerName: customOwnerName.trim() || baseClient.ownerName,
      sector: customSector.trim() || baseClient.sector,
    }),
    [baseClient, customBusinessName, customOwnerName, customSector]
  );

  const evaluation = useMemo(
    () => evaluateCreditOptimization(effectiveClient, params),
    [effectiveClient, params]
  );

  const currentDecision = decisions[effectiveClient.id] ?? null;

  const loadDossierWithSimulatedOcr = (target: ClientProfile) => {
    setIsScanning(true);
    setScanStepLabel(`1/3 Leyendo ${target.dossierFileName} y validando RUC...`);
    window.setTimeout(() => {
      setScanStepLabel('2/3 Extrayendo ventas, costos de mercadería y obligaciones RCC...');
    }, 260);
    window.setTimeout(() => {
      setScanStepLabel('3/3 Detectando meses pico y calculando capacidad de pago...');
    }, 520);
    window.setTimeout(() => {
      setActiveClientId(target.id);
      setCustomBusinessName(target.businessName);
      setCustomOwnerName(target.ownerName);
      setCustomSector(target.sector);
      const nextParams = buildDefaultParams(target);
      setParams(nextParams);
      const nextEval = evaluateCreditOptimization(target, nextParams);
      setSelectedStrategy(nextEval.recommendedId);
      setMessages([buildWelcomeMessage(target)]);
      setIsScanning(false);
      setScanStepLabel('');
    }, 780);
  };

  const handleSelectSampleDossier = (clientId: string) => {
    const found = clients.find((c) => c.id === clientId);
    if (!found) return;
    loadDossierWithSimulatedOcr(found);
  };

  const handleUploadFile = (fileName: string) => {
    const uploaded = createSimulatedUploadProfile(fileName);
    setClients((prev) => [uploaded, ...prev]);
    loadDossierWithSimulatedOcr(uploaded);
  };

  const handleHeaderCta = () => {
    if (step < 3) {
      setStep((prev) => (prev + 1) as WizardStep);
    } else {
      setStep(1);
    }
  };

  const headerCtaLabel =
    step === 1
      ? 'Ir a Parámetros'
      : step === 2
      ? 'Ver Cronograma'
      : currentDecision
      ? 'Dictamen aprobado'
      : 'Nuevo expediente';

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F7F9] text-slate-900">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 h-14 bg-white border-b border-slate-200 px-3 sm:px-5 lg:px-6 flex items-center justify-between gap-2 sm:gap-6">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#workspace-top"
          onClick={(e) => {
            e.preventDefault();
            setStep(1);
          }}
          className="inline-flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base font-display font-bold tracking-tight text-slate-950 whitespace-nowrap shrink-0"
        >
          <Landmark className="w-4 h-4 text-[#B91C1C] shrink-0" />
          <span>Caja Trujillo · Paga a tu Ritmo</span>
        </a>

        {/* Zone 2: 3 Focused Step Navigation Links */}
        <nav
          aria-label="Pasos del flujo de evaluación"
          className="hidden md:flex items-center gap-7 h-full"
        >
          {STEPS.map((item) => {
            const active = step === item.id;
            const done = step > item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setStep(item.id)}
                className={`relative h-full inline-flex items-center gap-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'text-[#B91C1C] font-semibold'
                    : done
                    ? 'text-slate-800 hover:text-slate-950'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span>{item.label}</span>
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#B91C1C]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleHeaderCta}
            className="px-3 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            {headerCtaLabel}
          </button>
        </div>
      </header>

      {/* Mobile Step Bar (< md) */}
      <div className="md:hidden bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-1.5 overflow-x-auto">
        {STEPS.map((item) => {
          const active = step === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setStep(item.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
                active ? 'bg-[#B91C1C] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Main Split Workstation: 3 Guided Steps (Left) + Persistent Chat (Right) */}
      <div id="workspace-top" className="flex-1 flex min-h-0">
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 lg:overflow-y-auto lg:h-[calc(100vh-3.5rem)]">
          <div className="max-w-[920px] mx-auto space-y-5">
            {/* Quiet 1-line context trail on Steps 2-3 */}
            {step > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 text-xs text-slate-500">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                  <span className="font-semibold text-slate-900 truncate max-w-[260px]">
                    {effectiveClient.businessName}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate max-w-[220px]">{effectiveClient.sector}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-slate-800">
                    {formatSoles(params.loanAmount)}
                  </span>
                </div>
                {currentDecision && (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-medium whitespace-nowrap">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Aprobado
                  </span>
                )}
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
              >
                {step === 1 && (
                  <StepOcrUpload
                    client={effectiveClient}
                    evaluation={evaluation}
                    isScanning={isScanning}
                    scanStepLabel={scanStepLabel}
                    customBusinessName={customBusinessName}
                    customOwnerName={customOwnerName}
                    customSector={customSector}
                    onSelectDossier={handleSelectSampleDossier}
                    onUploadFile={handleUploadFile}
                    onUpdateExtractedFields={(patch) => {
                      if (patch.businessName !== undefined) {
                        setCustomBusinessName(patch.businessName);
                      }
                      if (patch.ownerName !== undefined) {
                        setCustomOwnerName(patch.ownerName);
                      }
                      if (patch.sector !== undefined) {
                        setCustomSector(patch.sector);
                      }
                    }}
                    onNext={() => setStep(2)}
                  />
                )}

                {step === 2 && (
                  <StepRiskParameters
                    params={params}
                    evaluation={evaluation}
                    selectedStrategy={selectedStrategy}
                    onChangeParams={setParams}
                    onResetParams={() => setParams(buildDefaultParams(baseClient))}
                    onBack={() => setStep(1)}
                    onNext={() => setStep(3)}
                  />
                )}

                {step === 3 && (
                  <StepFinalSchedule
                    client={effectiveClient}
                    params={params}
                    evaluation={evaluation}
                    selectedStrategy={selectedStrategy}
                    onSelectStrategy={setSelectedStrategy}
                    decision={currentDecision}
                    onApproveDecision={(record) =>
                      setDecisions((prev) => ({
                        ...prev,
                        [effectiveClient.id]: record,
                      }))
                    }
                    onReopenDecision={() =>
                      setDecisions((prev) => ({
                        ...prev,
                        [effectiveClient.id]: null,
                      }))
                    }
                    onBack={() => setStep(2)}
                    onStartOver={() => setStep(1)}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Persistent Right-Hand LLM Chat Column */}
        <div className="hidden lg:block w-[348px] xl:w-[368px] shrink-0 h-[calc(100vh-3.5rem)] sticky top-14">
          <AnalystChatPanel
            client={effectiveClient}
            params={params}
            evaluation={evaluation}
            selectedStrategy={selectedStrategy}
            messages={messages}
            onAddMessages={(u, a) => setMessages((prev) => [...prev, u, a])}
          />
        </div>
      </div>

      {/* Mobile Chat Toggle Button (< lg) */}
      <button
        type="button"
        onClick={() => setMobileChatOpen(true)}
        aria-label="Abrir asistente de crédito LLM"
        className="lg:hidden fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-lg"
      >
        <MessageSquareText className="w-4 h-4 text-red-400" />
        <span>Asistente LLM</span>
      </button>

      {/* Mobile Chat Drawer */}
      {mobileChatOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end bg-slate-950/40">
          <div className="w-full max-w-sm h-full">
            <AnalystChatPanel
              client={effectiveClient}
              params={params}
              evaluation={evaluation}
              selectedStrategy={selectedStrategy}
              messages={messages}
              onAddMessages={(u, a) => setMessages((prev) => [...prev, u, a])}
              onCloseMobile={() => setMobileChatOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
