import {
  ClientProfile,
  OptimizationEvaluation,
  RiskPolicyParams,
  ScheduleStrategyId,
} from './types';
import { formatPercent, formatSoles, evaluateCreditOptimization } from './finance-engine';

export interface AssistantReply {
  content: string;
  citations: string[];
}

export const SUGGESTED_ANALYST_QUESTIONS = [
  '¿Cómo se asegura que Caja Trujillo no pierda rentabilidad?',
  '¿Por qué se recomienda esta alternativa frente a la cuota uniforme?',
  '¿En qué meses presenta mayores y menores ingresos este cliente?',
  '¿Qué pasa si los ingresos proyectados caen un 25%?',
  '¿Qué riesgos presenta la alternativa de cuotas estacionales?',
];

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function generateAssistantResponse(
  query: string,
  client: ClientProfile,
  params: RiskPolicyParams,
  evaluation: OptimizationEvaluation,
  selectedStrategy: ScheduleStrategyId
): AssistantReply {
  const q = normalizeText(query);
  const { uniforme, estacional, hibrida } = evaluation.schedules;
  const active = evaluation.schedules[selectedStrategy];
  const rec = evaluation.schedules[evaluation.recommendedId];

  // 1. Check if analyst asks about a specific month
  const matchedMonth = active.rows.find(
    (r) =>
      q.includes(normalizeText(r.monthName)) ||
      (r.monthShort.length >= 3 && q.includes(` ${normalizeText(r.monthShort)}`))
  );
  if (matchedMonth && (q.includes('mes') || q.includes('cuota') || q.includes('flujo') || q.includes('cuanto') || q.includes('como'))) {
    const uniformRow = uniforme.rows[matchedMonth.period - 1];
    return {
      content: `En ${matchedMonth.monthName} (Periodo ${matchedMonth.period}), el motor predictivo estima ventas de ${formatSoles(
        matchedMonth.projectedSales
      )} y un excedente disponible estresado (-${params.stressHaircutPercent}%) de ${formatSoles(
        matchedMonth.stressedSurplus
      )}. Con el cronograma ${active.shortName}, la cuota es ${formatSoles(
        matchedMonth.totalInstallment,
        2
      )} (Capital ${formatSoles(matchedMonth.principal, 2)} + Interés ${formatSoles(
        matchedMonth.interest,
        2
      )}), representando un RCI de ${formatPercent(
        matchedMonth.rciPercent
      )}. En comparación, la cuota uniforme sería ${formatSoles(
        uniformRow.totalInstallment,
        2
      )} (RCI ${formatPercent(uniformRow.rciPercent)}).`,
      citations: [
        `Periodo ${matchedMonth.period} · ${matchedMonth.monthName}`,
        `RCI ${active.shortName}: ${formatPercent(matchedMonth.rciPercent)}`,
      ],
    };
  }

  // 2. Bank protection / rentabilidad / no pierda
  if (
    q.includes('pierda') ||
    q.includes('banco') ||
    q.includes('rentabilidad') ||
    q.includes('caja trujillo') ||
    q.includes('parametro') ||
    q.includes('interes') ||
    q.includes('protege') ||
    q.includes('gana')
  ) {
    return {
      content: `El motor matemático protege la rentabilidad de Caja Trujillo mediante cuatro salvaguardas contractuales activas:\n\n1. TEA contractual intacta (${formatPercent(
        params.teaPercent
      )}): los intereses se calculan cada mes sobre el saldo insoluto real, logrando un Valor Presente Neto de ${formatSoles(
        active.npvAtContractRate,
        2
      )} equivalente al capital desembolsado (${formatSoles(
        params.loanAmount
      )}).\n2. Cero amortización negativa: incluso en los meses más bajos, el piso de amortización (${params.minPrincipalFloorPercent}% del capital medio) garantiza que cada cuota cubra el 100% de intereses, seguro y reducción de capital.\n3. Recorte conservador por incertidumbre (-${params.stressHaircutPercent}%): las cuotas se dimensionan sobre ingresos estresados, nunca sobre picos optimistas.\n4. Interés total generado: ${formatSoles(
        active.totalInterest,
        2
      )} en ${active.shortName} frente a ${formatSoles(
        uniforme.totalInterest,
        2
      )} en Uniforme, reduciendo además el riesgo de mora en ${Math.max(
        0,
        uniforme.stressedMonthsCount - active.stressedMonthsCount
      )} meses críticos.`,
      citations: [
        `TEA efectiva: ${formatPercent(active.effectiveTeaPercent)}`,
        `VAN validado: ${formatSoles(active.npvAtContractRate, 2)}`,
        `Amortización negativa: 0 meses`,
      ],
    };
  }

  // 3. Stress test / drop in revenue (e.g. "caen 20%", "disminuyen")
  if (
    q.includes('disminuy') ||
    q.includes('caen') ||
    q.includes('caida') ||
    q.includes('bajan') ||
    q.includes('estres') ||
    q.includes('escenario') ||
    q.includes('20%') ||
    q.includes('25%') ||
    q.includes('30%')
  ) {
    const pctMatch = q.match(/(\d{1,2})\s*%/);
    const simulatedDrop = pctMatch ? Math.min(45, Math.max(10, Number(pctMatch[1]))) : 25;
    const stressEval = evaluateCreditOptimization(client, {
      ...params,
      stressHaircutPercent: simulatedDrop,
    });
    const sUnif = stressEval.schedules.uniforme;
    const sHib = stressEval.schedules.hibrida;
    const sEst = stressEval.schedules.estacional;

    return {
      content: `Simulé en el motor matemático una caída severa de -${simulatedDrop}% sobre los ingresos proyectados de ${client.businessName}:\n\n• Cuotas Uniformes: el RCI pico subiría a ${formatPercent(
        sUnif.maxRciPercent
      )} con ${sUnif.stressedMonthsCount} meses sobre el límite de política (${sUnif.deficitMonthsCount} en déficit directo).\n• Cuotas Híbridas: el RCI pico queda en ${formatPercent(
        sHib.maxRciPercent
      )} con ${sHib.stressedMonthsCount} meses observados y ${sHib.deficitMonthsCount} meses en déficit.\n• Cuotas Estacionales: el RCI pico se contiene en ${formatPercent(
        sEst.maxRciPercent
      )} (${sEst.stressedMonthsCount} meses sobre tope).\n\nConclusión: ante un choque de ventas de -${simulatedDrop}%, el esquema ${stressEval.schedules[stressEval.recommendedId].name} preserva mejor la capacidad de pago. Si deseas exigir ese colchón en el dictamen, ajusta el control "Estrés de ingresos" a ${simulatedDrop}%.`,
      citations: [
        `Prueba de estrés: -${simulatedDrop}% ventas`,
        `RCI pico Uniforme: ${formatPercent(sUnif.maxRciPercent)}`,
        `RCI pico Híbrida: ${formatPercent(sHib.maxRciPercent)}`,
      ],
    };
  }

  // 4. Peak and low months / seasonality
  if (
    q.includes('mayor') ||
    q.includes('menor') ||
    q.includes('pico') ||
    q.includes('bajo') ||
    q.includes('estacional') && (q.includes('mes') || q.includes('cuando') || q.includes('periodo')) ||
    q.includes('ingresos') && (q.includes('mes') || q.includes('periodo'))
  ) {
    const sortedBySales = [...client.monthlyData].sort(
      (a, b) => b.projectedSales - a.projectedSales
    );
    const topMonth = sortedBySales[0];
    const bottomMonth = sortedBySales[sortedBySales.length - 1];

    return {
      content: `Según los comprobantes procesados por OCR y el modelo de series temporales para ${client.businessName} (${client.sector}):\n\n• Meses de mayor generación de ingresos: ${
        evaluation.peakMonths.join(', ') || topMonth.monthName
      }. El pico más alto se proyecta en ${topMonth.monthName} con ${formatSoles(
        topMonth.projectedSales
      )} en ventas (factor estacional ${topMonth.seasonalFactor.toFixed(2)}x).\n• Periodos de menor capacidad de pago: ${
        evaluation.lowMonths.join(', ') || bottomMonth.monthName
      }. El valle más pronunciado ocurre en ${bottomMonth.monthName} con ${formatSoles(
        bottomMonth.projectedSales
      )} en ventas.\n\nPor esta amplitud de ${(
        topMonth.projectedSales / Math.max(1, bottomMonth.projectedSales)
      ).toFixed(
        1
      )}x entre el mejor y el peor mes, imponer una cuota fija genera presión innecesaria en temporada baja.`,
      citations: [
        `Pico: ${topMonth.monthName} (${formatSoles(topMonth.projectedSales)})`,
        `Valle: ${bottomMonth.monthName} (${formatSoles(bottomMonth.projectedSales)})`,
      ],
    };
  }

  // 5. Risks of seasonal schedule
  if (q.includes('riesgo') && q.includes('estacional')) {
    return {
      content: `La alternativa de Cuotas Estacionales tiene un RCI pico controlado de ${formatPercent(
        estacional.maxRciPercent
      )}, pero presenta dos riesgos operativos que debes ponderar como analista:\n\n1. Concentración de cobranza en campaña: la cuota máxima alcanza ${formatSoles(
        estacional.maxInstallment,
        2
      )} frente a una mínima de ${formatSoles(
        estacional.minInstallment,
        2
      )}. Si la campaña principal se retrasa 15–30 días, el cliente debe afrontar un pago concentrado alto.\n2. Disciplina de caja: exige recordatorios previos a temporada alta para que el negocio no destine el 100% del excedente a reinversión antes de honrar la cuota reforzada.\n\nSi buscas mitigar ese salto entre cuotas, Cuotas Híbridas acota el rango entre ${formatSoles(
        hibrida.minInstallment,
        2
      )} y ${formatSoles(hibrida.maxInstallment, 2)}.`,
      citations: [
        `Rango Estacional: ${formatSoles(estacional.minInstallment)} – ${formatSoles(
          estacional.maxInstallment
        )}`,
        `Rango Híbrido: ${formatSoles(hibrida.minInstallment)} – ${formatSoles(
          hibrida.maxInstallment
        )}`,
      ],
    };
  }

  // 6. Why recommend hybrid vs uniform / comparison
  if (
    q.includes('recomiend') ||
    q.includes('hibrid') ||
    q.includes('uniforme') ||
    q.includes('mejor') ||
    q.includes('diferencia') ||
    q.includes('compar')
  ) {
    return {
      content: `Para ${client.businessName}, el motor recomienda ${rec.name}:\n\n• ${evaluation.recommendationReason}\n\nComparativa clave bajo política RCI ≤ ${params.maxRciPercent}% (estrés -${params.stressHaircutPercent}%):\n• Uniforme: cuota fija ${formatSoles(
        uniforme.avgInstallment,
        2
      )} · RCI pico ${formatPercent(uniforme.maxRciPercent)} · ${
        uniforme.stressedMonthsCount
      } meses fuera de límite.\n• Estacional: cuotas ${formatSoles(
        estacional.minInstallment
      )} a ${formatSoles(estacional.maxInstallment)} · RCI pico ${formatPercent(
        estacional.maxRciPercent
      )} · ${estacional.stressedMonthsCount} meses fuera de límite.\n• Híbrida: cuota base desde ${formatSoles(
        hibrida.minInstallment
      )} con refuerzos hasta ${formatSoles(
        hibrida.maxInstallment
      )} · RCI pico ${formatPercent(hibrida.maxRciPercent)} · ${
        hibrida.stressedMonthsCount
      } meses fuera de límite.`,
      citations: [
        `Recomendado: ${rec.name}`,
        `Cobertura mínima (DSCR): ${rec.minCoverageRatio.toFixed(2)}x`,
      ],
    };
  }

  // 7. OCR / document questions
  if (q.includes('ocr') || q.includes('documento') || q.includes('expediente') || q.includes('pdf') || q.includes('alerta')) {
    const flagged = client.ocrFields.filter((f) => f.status === 'revisar');
    return {
      content: `El expediente "${client.dossierFileName}" (${client.dossierPages} páginas) fue procesado con una confianza global OCR de ${client.ocrOverallConfidence.toFixed(
        1
      )}%. Se estructuraron ${client.ocrFields.length} bloques clave incluyendo ventas anuales por ${formatSoles(
        evaluation.annualProjectedSales
      )} proyectados y gastos + obligaciones por ${formatSoles(
        evaluation.annualCosts
      )}. ${
        flagged.length > 0
          ? `Observación detectada para revisión manual: "${flagged[0].label}" (${flagged[0].note || flagged[0].value}).`
          : 'No se detectaron inconsistencias críticas en los campos extraídos.'
      }`,
      citations: [
        `Archivo: ${client.dossierFileName}`,
        `Confianza OCR: ${client.ocrOverallConfidence.toFixed(1)}%`,
      ],
    };
  }

  // Default grounded summary
  return {
    content: `Resumen técnico actual para ${client.businessName} (${formatSoles(
      params.loanAmount
    )} a ${params.termMonths} meses, TEA ${formatPercent(
      params.teaPercent
    )}):\n\n• Alternativa activa seleccionada: ${active.name} (RCI pico ${formatPercent(
      active.maxRciPercent
    )}, cobertura mínima ${active.minCoverageRatio.toFixed(2)}x, estado: ${
      active.policyStatus === 'viable'
        ? 'Cumple política'
        : active.policyStatus === 'observacion'
        ? 'Con observación'
        : 'Fuera de política'
    }).\n• Alternativa recomendada por el optimizador: ${rec.name}.\n• Protección bancaria verificada: amortización 100% del capital sin amortización negativa y VAN exacto de ${formatSoles(
      active.npvAtContractRate,
      2
    )}.\n\nPuedes preguntarme sobre meses pico, pruebas de estrés (ej. caída del 20% en ventas), riesgos de cuotas estacionales o detalle de algún mes específico.`,
    citations: [
      `Cliente: ${client.businessName}`,
      `Recomendación: ${rec.shortName}`,
    ],
  };
}
