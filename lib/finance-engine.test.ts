import test from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE_CLIENTS } from './clients-data';
import { evaluateCreditOptimization, teaToTem } from './finance-engine';
import { generateAssistantResponse } from './assistant-engine';
import { RiskPolicyParams } from './types';

const defaultParams: RiskPolicyParams = {
  loanAmount: 24000,
  teaPercent: 34.5,
  termMonths: 12,
  insuranceMonthlyPercent: 0.12,
  maxRciPercent: 45,
  stressHaircutPercent: 15,
  minPrincipalFloorPercent: 35,
};

test('teaToTem converts Peruvian TEA accurately to monthly effective rate', () => {
  const tem = teaToTem(34.5);
  const recomposedTea = (Math.pow(1 + tem, 12) - 1) * 100;
  assert.ok(Math.abs(recomposedTea - 34.5) < 1e-6);
});

test('all three schedules amortize 100% of principal with zero negative amortization and preserve bank NPV', () => {
  const client = SAMPLE_CLIENTS[0]; // Libreria Escolar El Saber
  const result = evaluateCreditOptimization(client, defaultParams);

  for (const schedule of result.orderedSchedules) {
    assert.equal(schedule.rows.length, defaultParams.termMonths);
    assert.equal(schedule.negativeAmortizationMonths, 0, `${schedule.id} must not have negative amortization`);
    assert.ok(
      Math.abs(schedule.totalPrincipal - defaultParams.loanAmount) <= 0.1,
      `${schedule.id} totalPrincipal=${schedule.totalPrincipal} must equal loanAmount`
    );
    assert.equal(
      schedule.rows[schedule.rows.length - 1].closingBalance,
      0,
      `${schedule.id} closing balance must reach 0`
    );
    assert.ok(
      Math.abs(schedule.npvAtContractRate - defaultParams.loanAmount) <= 5,
      `${schedule.id} NPV=${schedule.npvAtContractRate} must preserve loan value at contractual TEA`
    );
    assert.equal(schedule.bankProtected, true, `${schedule.id} must preserve bank protection invariants`);
  }
});

test('all three sample clients achieve viable variable schedules while uniform breaches policy in low season', () => {
  for (const client of SAMPLE_CLIENTS) {
    const params: RiskPolicyParams = {
      loanAmount: client.requestedAmount,
      teaPercent: client.defaultTea,
      termMonths: client.requestedTermMonths,
      insuranceMonthlyPercent: 0.12,
      maxRciPercent: 45,
      stressHaircutPercent: 15,
      minPrincipalFloorPercent: 35,
    };
    const result = evaluateCreditOptimization(client, params);
    const { uniforme, estacional, hibrida } = result.schedules;
    const recommended = result.schedules[result.recommendedId];

    assert.ok(
      uniforme.stressedMonthsCount > 0,
      `${client.id}: Uniform schedule should show liquidity stress in moderate/low months`
    );
    assert.ok(
      hibrida.maxRciPercent < uniforme.maxRciPercent,
      `${client.id}: Hybrid maxRci (${hibrida.maxRciPercent}) should be lower than uniform (${uniforme.maxRciPercent})`
    );
    assert.ok(
      estacional.maxRciPercent < uniforme.maxRciPercent,
      `${client.id}: Seasonal maxRci (${estacional.maxRciPercent}) should be lower than uniform (${uniforme.maxRciPercent})`
    );
    assert.notEqual(result.recommendedId, 'uniforme', `${client.id}: Optimizer should recommend variable schedule`);
    assert.equal(
      recommended.policyStatus,
      'viable',
      `${client.id}: Recommended ${recommended.id} should be viable (got ${recommended.policyStatus}, maxRCI=${recommended.maxRciPercent})`
    );
  }
});

test('assistant engine grounds bank profitability and stress-test answers in live numbers', () => {
  const client = SAMPLE_CLIENTS[0];
  const evaluation = evaluateCreditOptimization(client, defaultParams);

  const bankReply = generateAssistantResponse(
    '¿Cómo se asegura que Caja Trujillo no pierda rentabilidad?',
    client,
    defaultParams,
    evaluation,
    'hibrida'
  );
  assert.ok(bankReply.content.includes('34.5%'));
  assert.ok(bankReply.content.includes('24,000'));
  assert.ok(bankReply.citations.length >= 2);

  const stressReply = generateAssistantResponse(
    '¿Qué pasa si los ingresos caen un 25%?',
    client,
    defaultParams,
    evaluation,
    'hibrida'
  );
  assert.ok(stressReply.content.includes('-25%'));
  assert.ok(stressReply.citations.length >= 2);
});
