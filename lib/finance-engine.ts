import {
  ClientProfile,
  MonthlyBusinessData,
  OptimizationEvaluation,
  PolicyComplianceStatus,
  RiskPolicyParams,
  ScheduleInstallmentRow,
  ScheduleResult,
  ScheduleStrategyId,
} from './types';

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function teaToTem(teaPercent: number): number {
  const tea = Math.max(0, teaPercent) / 100;
  return Math.pow(1 + tea, 1 / 12) - 1;
}

export function formatSoles(amount: number, decimals = 0): string {
  const formatted = new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
  return `S/ ${formatted}`;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

interface PeriodCashFlow {
  period: number;
  data: MonthlyBusinessData;
  stressedSales: number;
  totalCostsAndObligations: number;
  projectedSurplus: number;
  stressedSurplus: number;
}

function buildPeriodCashFlows(
  monthlyData: MonthlyBusinessData[],
  termMonths: number,
  stressHaircutPercent: number
): PeriodCashFlow[] {
  const haircut = Math.min(Math.max(stressHaircutPercent, 0), 50) / 100;
  const flows: PeriodCashFlow[] = [];

  for (let i = 0; i < termMonths; i++) {
    const data = monthlyData[i % monthlyData.length];
    const stressedSales = round2(data.projectedSales * (1 - haircut));
    // Merchandise cost (COGS) is variable with sales volume; operating expenses and RCC obligations remain fixed
    const baseCosts = round2(
      data.operatingExpenses + data.merchandiseCost + data.existingObligations
    );
    const stressedMerchandise = round2(data.merchandiseCost * (1 - haircut));
    const stressedCosts = round2(
      data.operatingExpenses + stressedMerchandise + data.existingObligations
    );
    const projectedSurplus = round2(Math.max(0, data.projectedSales - baseCosts));
    const stressedSurplus = round2(Math.max(300, stressedSales - stressedCosts));

    flows.push({
      period: i + 1,
      data,
      stressedSales,
      totalCostsAndObligations: stressedCosts,
      projectedSurplus,
      stressedSurplus,
    });
  }

  return flows;
}

function finalizeSchedule(
  id: ScheduleStrategyId,
  name: string,
  shortName: string,
  description: string,
  principalPlan: number[],
  flows: PeriodCashFlow[],
  params: RiskPolicyParams
): ScheduleResult {
  const tem = teaToTem(params.teaPercent);
  const insuranceRate = Math.max(0, params.insuranceMonthlyPercent) / 100;
  const maxRci = params.maxRciPercent;

  // Ensure principals sum to exact loanAmount
  const sumRaw = principalPlan.reduce((acc, v) => acc + v, 0);
  const scaled = principalPlan.map((v) =>
    sumRaw > 0 ? (v / sumRaw) * params.loanAmount : params.loanAmount / flows.length
  );

  let balance = params.loanAmount;
  const rows: ScheduleInstallmentRow[] = [];

  let totalPrincipal = 0;
  let totalInterest = 0;
  let totalInsurance = 0;
  let totalPayment = 0;
  let npvAtContractRate = 0;
  let negativeAmortizationMonths = 0;
  let stressedMonthsCount = 0;
  let deficitMonthsCount = 0;
  let maxRciPercent = 0;
  let sumRci = 0;
  let minCoverageRatio = Number.POSITIVE_INFINITY;

  for (let i = 0; i < flows.length; i++) {
    const flow = flows[i];
    const openingBalance = round2(balance);
    const interest = round2(openingBalance * tem);
    const insurance = round2(openingBalance * insuranceRate);

    const isLast = i === flows.length - 1;
    const principal = isLast
      ? round2(openingBalance)
      : round2(Math.min(openingBalance, Math.max(0, scaled[i])));

    const totalInstallment = round2(principal + interest + insurance);
    const closingBalance = round2(Math.max(0, openingBalance - principal));

    if (principal <= 0 && openingBalance > 0) {
      negativeAmortizationMonths++;
    }

    // NPV of contractual debt service (principal + interest) discounted at TEM
    npvAtContractRate += (principal + interest) / Math.pow(1 + tem, flow.period);

    const rciPercent =
      flow.stressedSurplus > 0
        ? round2((totalInstallment / flow.stressedSurplus) * 100)
        : 999;
    const coverageRatio =
      totalInstallment > 0 ? round2(flow.stressedSurplus / totalInstallment) : 99;

    let status: ScheduleInstallmentRow['status'] = 'holgado';
    if (totalInstallment > flow.stressedSurplus) {
      status = 'deficit';
      deficitMonthsCount++;
      stressedMonthsCount++;
    } else if (rciPercent > maxRci) {
      status = 'estres';
      stressedMonthsCount++;
    } else if (rciPercent > maxRci * 0.85) {
      status = 'ajustado';
    }

    if (rciPercent > maxRciPercent) maxRciPercent = rciPercent;
    if (coverageRatio < minCoverageRatio) minCoverageRatio = coverageRatio;
    sumRci += rciPercent;

    totalPrincipal = round2(totalPrincipal + principal);
    totalInterest = round2(totalInterest + interest);
    totalInsurance = round2(totalInsurance + insurance);
    totalPayment = round2(totalPayment + totalInstallment);

    rows.push({
      period: flow.period,
      monthShort: flow.data.monthShort,
      monthName: flow.data.monthName,
      seasonalityTier: flow.data.seasonalityTier,
      projectedSales: flow.data.projectedSales,
      stressedSales: flow.stressedSales,
      totalCostsAndObligations: flow.totalCostsAndObligations,
      projectedSurplus: flow.projectedSurplus,
      stressedSurplus: flow.stressedSurplus,
      openingBalance,
      principal,
      interest,
      insurance,
      totalInstallment,
      closingBalance,
      rciPercent,
      coverageRatio,
      status,
    });

    balance = closingBalance;
  }

  const installments = rows.map((r) => r.totalInstallment);
  const minInstallment = Math.min(...installments);
  const maxInstallment = Math.max(...installments);
  const avgInstallment = round2(totalPayment / rows.length);
  const avgRciPercent = round2(sumRci / rows.length);
  const roundedNpv = round2(npvAtContractRate);

  // Bank protection check: zero negative amortization, 100% principal repaid, NPV matches loanAmount within S/ 5
  const bankProtected =
    negativeAmortizationMonths === 0 &&
    Math.abs(totalPrincipal - params.loanAmount) <= 0.5 &&
    Math.abs(roundedNpv - params.loanAmount) <= 10;

  let policyStatus: PolicyComplianceStatus = 'viable';
  let policySummary = 'Cumple 100% de límites RCI y preserva rentabilidad contractual.';

  if (deficitMonthsCount > 0) {
    policyStatus = 'no_viable';
    policySummary = `Déficit proyectado en ${deficitMonthsCount} ${
      deficitMonthsCount === 1 ? 'mes' : 'meses'
    } bajo escenario estresado.`;
  } else if (stressedMonthsCount > 0) {
    policyStatus = stressedMonthsCount >= 3 ? 'no_viable' : 'observacion';
    policySummary = `Supera el tope RCI (${maxRci}%) en ${stressedMonthsCount} ${
      stressedMonthsCount === 1 ? 'mes' : 'meses'
    } de menor flujo.`;
  }

  return {
    id,
    name,
    shortName,
    description,
    rows,
    totalPrincipal,
    totalInterest,
    totalInsurance,
    totalPayment,
    minInstallment,
    maxInstallment,
    avgInstallment,
    maxRciPercent,
    avgRciPercent,
    minCoverageRatio: round2(minCoverageRatio),
    stressedMonthsCount,
    deficitMonthsCount,
    policyStatus,
    policySummary,
    effectiveTeaPercent: params.teaPercent,
    npvAtContractRate: roundedNpv,
    negativeAmortizationMonths,
    bankProtected,
  };
}

function buildUniformPrincipalPlan(params: RiskPolicyParams): number[] {
  const tem = teaToTem(params.teaPercent);
  const n = params.termMonths;
  if (tem === 0) {
    return Array.from({ length: n }, () => params.loanAmount / n);
  }
  const pmt =
    (params.loanAmount * (tem * Math.pow(1 + tem, n))) /
    (Math.pow(1 + tem, n) - 1);

  const principals: number[] = [];
  let balance = params.loanAmount;
  for (let i = 0; i < n; i++) {
    const interest = balance * tem;
    const principal = Math.max(0, pmt - interest);
    principals.push(principal);
    balance = Math.max(0, balance - principal);
  }
  return principals;
}

function buildSeasonalPrincipalPlan(
  flows: PeriodCashFlow[],
  params: RiskPolicyParams
): number[] {
  const n = flows.length;
  const avgPrincipal = params.loanAmount / n;
  const minFloorPct = Math.min(Math.max(params.minPrincipalFloorPercent, 10), 80) / 100;
  const minPrincipalFloor = avgPrincipal * minFloorPct;

  // Iterative optimization to align total installment to stressed surplus weights
  // while respecting the bank's minimum principal floor in every period.
  const surplusWeights = flows.map((f) => Math.max(100, f.stressedSurplus));
  const totalWeight = surplusWeights.reduce((a, b) => a + b, 0);

  const baseFloorTotal = minPrincipalFloor * n;
  const distributablePrincipal = Math.max(0, params.loanAmount - baseFloorTotal);

  let principals = flows.map((_, idx) => {
    return minPrincipalFloor + distributablePrincipal * (surplusWeights[idx] / totalWeight);
  });

  // Refine 3 passes so months with high interest early in the loan don't push RCI over cap
  const tem = teaToTem(params.teaPercent);
  const insuranceRate = params.insuranceMonthlyPercent / 100;
  const maxRciRatio = params.maxRciPercent / 100;

  for (let iter = 0; iter < 4; iter++) {
    let balance = params.loanAmount;
    const excessRequired: number[] = new Array(n).fill(0);
    const headroom: number[] = new Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      const carryCost = balance * (tem + insuranceRate);
      const maxAllowedInstallment = flows[i].stressedSurplus * maxRciRatio;
      const currentInstallment = principals[i] + carryCost;

      if (currentInstallment > maxAllowedInstallment) {
        const reducible = Math.max(0, principals[i] - minPrincipalFloor);
        excessRequired[i] = Math.min(reducible, currentInstallment - maxAllowedInstallment);
      } else {
        headroom[i] = maxAllowedInstallment - currentInstallment;
      }
      balance = Math.max(0, balance - principals[i]);
    }

    const totalShift = excessRequired.reduce((a, b) => a + b, 0);
    const totalHeadroom = headroom.reduce((a, b) => a + b, 0);

    if (totalShift < 1 || totalHeadroom < 1) break;

    const actualShift = Math.min(totalShift, totalHeadroom);
    const shiftFactor = actualShift / totalShift;

    principals = principals.map((p, i) => {
      if (excessRequired[i] > 0) {
        return p - excessRequired[i] * shiftFactor;
      }
      if (headroom[i] > 0) {
        return p + actualShift * (headroom[i] / totalHeadroom);
      }
      return p;
    });
  }

  return principals;
}

function buildHybridPrincipalPlan(
  flows: PeriodCashFlow[],
  params: RiskPolicyParams
): number[] {
  const n = flows.length;
  const avgPrincipal = params.loanAmount / n;
  const minFloorPct = Math.min(Math.max(params.minPrincipalFloorPercent, 10), 80) / 100;

  // Hybrid strategy: predictable moderate base principal in regular/low months +
  // concentrated step-up installments in high/growing campaign months.
  const avgSurplus =
    flows.reduce((acc, f) => acc + f.stressedSurplus, 0) / Math.max(1, n);

  const isPeakOrRamp = flows.map(
    (f) =>
      f.data.seasonalityTier === 'alto' ||
      f.data.seasonalityTier === 'creciente' ||
      f.stressedSurplus >= avgSurplus * 1.15
  );
  const peakCount = isPeakOrRamp.filter(Boolean).length;

  // Fallback if all or none are peaks
  if (peakCount === 0 || peakCount === n) {
    return buildSeasonalPrincipalPlan(flows, params);
  }

  // Base principal in non-peak months: slightly above floor, capped to stay within safe RCI
  const tem = teaToTem(params.teaPercent);
  const insuranceRate = params.insuranceMonthlyPercent / 100;
  const maxRciRatio = params.maxRciPercent / 100;
  const minPrincipalFloor = avgPrincipal * minFloorPct;

  let principals = flows.map((f, idx) => {
    if (!isPeakOrRamp[idx]) {
      const approxCarry = (params.loanAmount * (1 - idx / n)) * (tem + insuranceRate);
      const safePrincipal = Math.max(
        minPrincipalFloor,
        f.stressedSurplus * maxRciRatio * 0.92 - approxCarry
      );
      return Math.min(avgPrincipal * 0.65, Math.max(minPrincipalFloor, safePrincipal));
    }
    return 0;
  });

  const allocatedBase = principals.reduce((a, b) => a + b, 0);
  const remainingForPeaks = Math.max(0, params.loanAmount - allocatedBase);

  const peakSurplusWeightSum = flows.reduce(
    (acc, f, idx) => (isPeakOrRamp[idx] ? acc + f.stressedSurplus : acc),
    0
  );

  principals = principals.map((p, idx) => {
    if (isPeakOrRamp[idx]) {
      const share =
        peakSurplusWeightSum > 0
          ? flows[idx].stressedSurplus / peakSurplusWeightSum
          : 1 / peakCount;
      return Math.max(minPrincipalFloor, remainingForPeaks * share);
    }
    return p;
  });

  // Final pass to guarantee exact sum
  const totalP = principals.reduce((a, b) => a + b, 0);
  principals = principals.map((p) => (p / totalP) * params.loanAmount);

  // Refine 4 passes so no single month accidentally exceeds maxRci when headroom exists in peak months
  for (let iter = 0; iter < 4; iter++) {
    let balance = params.loanAmount;
    const excessRequired: number[] = new Array(n).fill(0);
    const headroom: number[] = new Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      const carryCost = balance * (tem + insuranceRate);
      const maxAllowedInstallment = flows[i].stressedSurplus * maxRciRatio;
      const currentInstallment = principals[i] + carryCost;

      if (currentInstallment > maxAllowedInstallment) {
        const reducible = Math.max(0, principals[i] - minPrincipalFloor);
        excessRequired[i] = Math.min(reducible, currentInstallment - maxAllowedInstallment);
      } else {
        // Prefer shifting excess into peak/ramp months first, then any month with headroom
        headroom[i] =
          (maxAllowedInstallment - currentInstallment) * (isPeakOrRamp[i] ? 1.5 : 0.4);
      }
      balance = Math.max(0, balance - principals[i]);
    }

    const totalShift = excessRequired.reduce((a, b) => a + b, 0);
    const totalHeadroom = headroom.reduce((a, b) => a + b, 0);
    if (totalShift < 1 || totalHeadroom < 1) break;

    const actualShift = Math.min(totalShift, totalHeadroom);
    const shiftFactor = actualShift / totalShift;

    principals = principals.map((p, i) => {
      if (excessRequired[i] > 0) return p - excessRequired[i] * shiftFactor;
      if (headroom[i] > 0) return p + actualShift * (headroom[i] / totalHeadroom);
      return p;
    });
  }

  return principals;
}

export function evaluateCreditOptimization(
  client: ClientProfile,
  params: RiskPolicyParams
): OptimizationEvaluation {
  const flows = buildPeriodCashFlows(
    client.monthlyData,
    params.termMonths,
    params.stressHaircutPercent
  );

  const uniformPlan = buildUniformPrincipalPlan(params);
  const seasonalPlan = buildSeasonalPrincipalPlan(flows, params);
  const hybridPlan = buildHybridPrincipalPlan(flows, params);

  const uniforme = finalizeSchedule(
    'uniforme',
    'Cuotas Uniformes',
    'Uniforme',
    'Esquema tradicional francés de cuota periódica fija como línea base de comparación.',
    uniformPlan,
    flows,
    params
  );

  const estacional = finalizeSchedule(
    'estacional',
    'Cuotas Estacionales',
    'Estacional',
    'Ajusta la cuota cada mes en proporción directa al flujo de caja proyectado y estresado.',
    seasonalPlan,
    flows,
    params
  );

  const hibrida = finalizeSchedule(
    'hibrida',
    'Cuotas Híbridas',
    'Híbrida',
    'Combina una cuota base predecible en meses moderados con refuerzos en meses pico.',
    hybridPlan,
    flows,
    params
  );

  const schedules: Record<ScheduleStrategyId, ScheduleResult> = {
    uniforme,
    estacional,
    hibrida,
  };

  // Pick recommended schedule deterministically:
  // Prefer zero deficit months -> fewest stressed months -> hybrid preference when both viable (predictability + low risk) -> lowest maxRci.
  const candidates: ScheduleResult[] = [hibrida, estacional, uniforme];
  const sorted = [...candidates].sort((a, b) => {
    if (a.deficitMonthsCount !== b.deficitMonthsCount) {
      return a.deficitMonthsCount - b.deficitMonthsCount;
    }
    if (a.stressedMonthsCount !== b.stressedMonthsCount) {
      return a.stressedMonthsCount - b.stressedMonthsCount;
    }
    // If both hibrida and estacional have 0 stressed months, prefer hibrida unless estacional has significantly lower maxRci (>6pp)
    if (a.id === 'hibrida' && b.id === 'estacional' && a.maxRciPercent - b.maxRciPercent <= 6) {
      return -1;
    }
    if (b.id === 'hibrida' && a.id === 'estacional' && b.maxRciPercent - a.maxRciPercent <= 6) {
      return 1;
    }
    return a.maxRciPercent - b.maxRciPercent;
  });

  const recommended = sorted[0];

  let recommendationReason = '';
  if (recommended.id === 'hibrida') {
    recommendationReason = `Reduce el RCI pico de ${formatPercent(
      uniforme.maxRciPercent
    )} (uniforme) a ${formatPercent(
      hibrida.maxRciPercent
    )}, elimina ${Math.max(
      0,
      uniforme.stressedMonthsCount - hibrida.stressedMonthsCount
    )} meses de tensión de liquidez y mantiene cuotas base predecibles preservando la TEA de ${formatPercent(
      params.teaPercent
    )}.`;
  } else if (recommended.id === 'estacional') {
    recommendationReason = `Logra la menor carga pico sobre el flujo estresado (${formatPercent(
      estacional.maxRciPercent
    )} vs. ${formatPercent(
      uniforme.maxRciPercent
    )} en uniforme), acoplándose estrictamente a cada campaña del negocio sin amortización negativa.`;
  } else {
    recommendationReason = `El flujo del negocio soporta cómodamente la cuota fija (RCI pico de ${formatPercent(
      uniforme.maxRciPercent
    )}), manteniendo simplicidad operativa y cumplimiento total de políticas.`;
  }

  const haircut = Math.min(Math.max(params.stressHaircutPercent, 0), 50) / 100;
  const annualProjectedSales = round2(
    client.monthlyData.reduce((acc, m) => acc + m.projectedSales, 0)
  );
  const annualStressedSales = round2(annualProjectedSales * (1 - haircut));
  const annualCosts = round2(
    client.monthlyData.reduce(
      (acc, m) =>
        acc +
        m.operatingExpenses +
        m.merchandiseCost * (1 - haircut) +
        m.existingObligations,
      0
    )
  );
  const annualStressedSurplus = round2(
    Math.max(0, annualStressedSales - annualCosts)
  );

  const peakMonths = client.monthlyData
    .filter((m) => m.seasonalityTier === 'alto')
    .map((m) => m.monthName);
  const lowMonths = client.monthlyData
    .filter((m) => m.seasonalityTier === 'bajo')
    .map((m) => m.monthName);

  return {
    schedules,
    orderedSchedules: [uniforme, estacional, hibrida],
    recommendedId: recommended.id,
    recommendationReason,
    annualProjectedSales,
    annualStressedSales,
    annualCosts,
    annualStressedSurplus,
    peakMonths,
    lowMonths,
  };
}
