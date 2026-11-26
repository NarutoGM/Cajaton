'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Send, MessageSquareText, X, Sparkles } from 'lucide-react';
import {
  ChatMessage,
  ClientProfile,
  OptimizationEvaluation,
  RiskPolicyParams,
  ScheduleStrategyId,
} from '@/lib/types';
import {
  SUGGESTED_ANALYST_QUESTIONS,
  generateAssistantResponse,
} from '@/lib/assistant-engine';

interface AnalystChatPanelProps {
  client: ClientProfile;
  params: RiskPolicyParams;
  evaluation: OptimizationEvaluation;
  selectedStrategy: ScheduleStrategyId;
  messages: ChatMessage[];
  onAddMessages: (userMsg: ChatMessage, replyMsg: ChatMessage) => void;
  onCloseMobile?: () => void;
}

function getCurrentTimeLabel(): string {
  const now = new Date();
  return now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

export default function AnalystChatPanel({
  client,
  params,
  evaluation,
  selectedStrategy,
  messages,
  onAddMessages,
  onCloseMobile,
}: AnalystChatPanelProps) {
  const [input, setInput] = useState('');
  const [isResponding, setIsResponding] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const msgSeqRef = useRef<number>(1);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, isResponding]);

  const submitQuestion = (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || isResponding) return;

    setInput('');
    setIsResponding(true);

    const userSeq = msgSeqRef.current++;
    const userMsg: ChatMessage = {
      id: `u-${userSeq}`,
      role: 'analyst',
      content: trimmed,
      timestamp: getCurrentTimeLabel(),
    };

    // Short realistic response cadence (< 250ms) grounded strictly in math engine
    window.setTimeout(() => {
      const reply = generateAssistantResponse(
        trimmed,
        client,
        params,
        evaluation,
        selectedStrategy
      );
      const replySeq = msgSeqRef.current++;
      const replyMsg: ChatMessage = {
        id: `a-${replySeq}`,
        role: 'assistant',
        content: reply.content,
        timestamp: getCurrentTimeLabel(),
        citations: reply.citations,
      };
      onAddMessages(userMsg, replyMsg);
      setIsResponding(false);
    }, 180);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitQuestion(input);
  };

  const activeSchedule = evaluation.schedules[selectedStrategy];

  return (
    <aside
      aria-label="Asistente conversacional de evaluación crediticia"
      className="flex flex-col h-full bg-white border-l border-slate-200"
    >
      {/* Chat Header */}
      <div className="px-4 py-3.5 border-b border-slate-200 flex items-start justify-between gap-2 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <MessageSquareText className="w-4 h-4 text-[#B91C1C] shrink-0" />
            <h2 className="text-sm font-semibold text-slate-900 truncate">
              Asistente de Crédito (LLM)
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
            Interpretación sobre datos reales · {activeSchedule.name}
          </p>
        </div>

        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Cerrar asistente de crédito"
            className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Grounded context ribbon (unboxed inline metadata) */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5 shrink-0">
        <span className="font-medium text-slate-800 truncate max-w-[180px]">
          {client.businessName}
        </span>
        <span aria-hidden="true">·</span>
        <span className="font-mono tabular-nums">TEA {params.teaPercent.toFixed(1)}%</span>
        <span aria-hidden="true">·</span>
        <span className="font-mono tabular-nums">RCI ≤ {params.maxRciPercent}%</span>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        data-testid="chat-messages-container"
      >
        {messages.map((msg) => {
          const isAnalyst = msg.role === 'analyst';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isAnalyst ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[92%] rounded-lg px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line ${
                  isAnalyst
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-50 border border-slate-200 text-slate-800'
                }`}
              >
                {msg.content}

                {!isAnalyst && msg.citations && msg.citations.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] font-mono tabular-nums text-slate-500">
                    {msg.citations.map((cit, idx) => (
                      <React.Fragment key={cit}>
                        {idx > 0 && <span aria-hidden="true">·</span>}
                        <span>{cit}</span>
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 font-mono tabular-nums">
                {isAnalyst ? 'Analista' : 'Asistente'} · {msg.timestamp}
              </span>
            </div>
          );
        })}

        {isResponding && (
          <div className="flex items-start">
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs text-slate-500">
              Consultando resultados del motor financiero...
            </div>
          </div>
        )}
      </div>

      {/* Suggested Analyst Queries */}
      <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/70 shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-2">
          <Sparkles className="w-3 h-3 text-[#B91C1C]" />
          <span>Consultas rápidas</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {SUGGESTED_ANALYST_QUESTIONS.slice(0, 2).map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => submitQuestion(q)}
              disabled={isResponding}
              className="text-left text-[11.5px] text-slate-700 hover:text-slate-950 bg-white border border-slate-200 hover:border-slate-300 rounded-md px-2.5 py-1.5 transition-colors leading-snug"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input form */}
      <form
        onSubmit={handleFormSubmit}
        className="p-3 border-t border-slate-200 bg-white flex items-center gap-2 shrink-0"
      >
        <label htmlFor="analyst-chat-input" className="sr-only">
          Consultar al asistente sobre el crédito
        </label>
        <input
          id="analyst-chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ej: ¿Qué pasa si ventas caen 20%?"
          className="flex-1 min-w-0 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#B91C1C] focus:bg-white transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim() || isResponding}
          aria-label="Enviar consulta al asistente"
          className="inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-white bg-[#B91C1C] hover:bg-[#991B1B] disabled:opacity-45 rounded-md transition-colors whitespace-nowrap shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Enviar</span>
        </button>
      </form>
    </aside>
  );
}
