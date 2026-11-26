export type SeasonalityTier = 'alto' | 'creciente' | 'moderado' | 'bajo';

export type ScheduleStrategyId = 'uniforme' | 'estacional' | 'hibrida';

export type PolicyComplianceStatus = 'viable' | 'observacion' | 'no_viable';

export interface MonthlyBusinessData {
  monthIndex: number; // 0..11
  monthShort: string;
  monthName: string;
  historicalSales: number;
  projectedSales: number;
  operatingExpenses: number;
  merchandiseCost: number;
  existingObligations: number;
  seasonalityTier: SeasonalityTier;
  seasonalFactor: number; // e.g. 1.75 for peak, 0.72 for valley
}

export interface OcrExtractedField {
  id: string;
  category: 'identidad' | 'ingresos' | 'egresos' | 'obligaciones' | 'estacionalidad';
  label: string;
  value: string;
  numericValue?: number;
  confidence: number; // 0..100
  sourcePage: string;
  status: 'validado' | 'revisar';
  note?: string;
}

export interface ClientProfile {
  id: string;
  businessName: string;
  ownerName: string;
  ruc: string;
  sector: string;
  agency: string;
  yearsInBusiness: number;
  creditHistoryLabel: string;
  requestedAmount: number;
  requestedTermMonths: number;
  defaultTea: number; // percentage e.g. 34.5
  dossierFileName: string;
  dossierPages: number;
  dossierDate: string;
  ocrOverallConfidence: number;
  ocrSummaryNote: string;
  peakMonthsSummary: string;
  lowMonthsSummary: string;
  ocrFields: OcrExtractedField[];
  monthlyData: MonthlyBusinessData[];
  documentPreviewLines: { section: string; lines: string[] }[];
}

export interface RiskPolicyParams {
  loanAmount: number; // S/
  teaPercent: number; // e.g. 34.5
  termMonths: number; // 6, 12, 18, 24
  insuranceMonthlyPercent: number; // e.g. 0.12 (% on balance)
  maxRciPercent: number; // e.g. 45 (% of stressed net surplus)
  stressHaircutPercent: number; // e.g. 15 (% conservative reduction on projected revenue)
  minPrincipalFloorPercent: number; // e.g. 35 (% of average monthly principal guaranteed every month)
}

export interface ScheduleInstallmentRow {
  period: number; // 1..termMonths
  monthShort: string;
  monthName: string;
  seasonalityTier: SeasonalityTier;
  projectedSales: number;
  stressedSales: number;
  totalCostsAndObligations: number;
  projectedSurplus: number;
  stressedSurplus: number;
  openingBalance: number;
  principal: number;
  interest: number;
  insurance: number;
  totalInstallment: number;
  closingBalance: number;
  rciPercent: number; // installment / stressedSurplus * 100
  coverageRatio: number; // stressedSurplus / installment
  status: 'holgado' | 'ajustado' | 'estres' | 'deficit';
}

export interface ScheduleResult {
  id: ScheduleStrategyId;
  name: string;
  shortName: string;
  description: string;
  rows: ScheduleInstallmentRow[];
  totalPrincipal: number;
  totalInterest: number;
  totalInsurance: number;
  totalPayment: number;
  minInstallment: number;
  maxInstallment: number;
  avgInstallment: number;
  maxRciPercent: number;
  avgRciPercent: number;
  minCoverageRatio: number;
  stressedMonthsCount: number; // rci > maxRciPercent
  deficitMonthsCount: number; // installment > stressedSurplus
  policyStatus: PolicyComplianceStatus;
  policySummary: string;
  effectiveTeaPercent: number; // Contractual yield preserved
  npvAtContractRate: number; // Present value of principal+interest at TEM (equals loanAmount)
  negativeAmortizationMonths: number; // Always 0 by construction
  bankProtected: boolean;
}

export interface OptimizationEvaluation {
  schedules: Record<ScheduleStrategyId, ScheduleResult>;
  orderedSchedules: ScheduleResult[];
  recommendedId: ScheduleStrategyId;
  recommendationReason: string;
  annualProjectedSales: number;
  annualStressedSales: number;
  annualCosts: number;
  annualStressedSurplus: number;
  peakMonths: string[];
  lowMonths: string[];
}

export interface ChatMessage {
  id: string;
  role: 'analyst' | 'assistant';
  content: string;
  timestamp: string;
  citations?: string[];
}
