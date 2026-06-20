/**
 * Weighted lead scoring.
 *
 * Mirrors the algorithm in `server/routes-features.ts` (`calculateLeadScore`) but lets
 * each tenant override the relative weight of every dimension. The raw per-dimension
 * heuristics are unchanged; only the cap of each dimension is moved from its hardcoded
 * default to the tenant's configured weight, and the raw score is rescaled into that cap.
 *
 * DEFAULTS ARE IDENTICAL to the legacy contract:
 *   budget=25, engagement=25, profile=20, urgency=15, behavior=15
 *   hot >= 70, warm >= 40
 * With those defaults this function returns the SAME numbers as `calculateLeadScore`,
 * so it is a drop-in superset and does not break the existing API shape.
 */

export interface LeadScoreWeightsInput {
  budgetWeight?: number | null;
  engagementWeight?: number | null;
  profileWeight?: number | null;
  urgencyWeight?: number | null;
  behaviorWeight?: number | null;
  hotThreshold?: number | null;
  warmThreshold?: number | null;
}

export interface ResolvedLeadScoreWeights {
  budgetWeight: number;
  engagementWeight: number;
  profileWeight: number;
  urgencyWeight: number;
  behaviorWeight: number;
  hotThreshold: number;
  warmThreshold: number;
}

export const DEFAULT_LEAD_SCORE_WEIGHTS: ResolvedLeadScoreWeights = {
  budgetWeight: 25,
  engagementWeight: 25,
  profileWeight: 20,
  urgencyWeight: 15,
  behaviorWeight: 15,
  hotThreshold: 70,
  warmThreshold: 40,
};

/** Native (legacy) maxima the raw heuristics are normalized against. */
const NATIVE_MAX = {
  budget: 25,
  engagement: 25,
  profile: 20,
  urgency: 15,
  behavior: 15,
} as const;

export interface LeadScoreResult {
  totalScore: number;
  budgetScore: number;
  engagementScore: number;
  profileScore: number;
  urgencyScore: number;
  behaviorScore: number;
  temperature: string;
  nextBestAction: string;
  predictedConversion: number;
}

function num(value: number | null | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function resolveLeadScoreWeights(
  weights?: LeadScoreWeightsInput | null,
): ResolvedLeadScoreWeights {
  if (!weights) return { ...DEFAULT_LEAD_SCORE_WEIGHTS };
  return {
    budgetWeight: num(weights.budgetWeight, DEFAULT_LEAD_SCORE_WEIGHTS.budgetWeight),
    engagementWeight: num(weights.engagementWeight, DEFAULT_LEAD_SCORE_WEIGHTS.engagementWeight),
    profileWeight: num(weights.profileWeight, DEFAULT_LEAD_SCORE_WEIGHTS.profileWeight),
    urgencyWeight: num(weights.urgencyWeight, DEFAULT_LEAD_SCORE_WEIGHTS.urgencyWeight),
    behaviorWeight: num(weights.behaviorWeight, DEFAULT_LEAD_SCORE_WEIGHTS.behaviorWeight),
    hotThreshold: num(weights.hotThreshold, DEFAULT_LEAD_SCORE_WEIGHTS.hotThreshold),
    warmThreshold: num(weights.warmThreshold, DEFAULT_LEAD_SCORE_WEIGHTS.warmThreshold),
  };
}

/** Rescale a raw dimension score (0..nativeMax) into (0..weight) and round. */
function rescale(raw: number, nativeMax: number, weight: number): number {
  if (nativeMax <= 0) return 0;
  const clamped = Math.max(0, Math.min(raw, nativeMax));
  if (weight === nativeMax) return Math.round(clamped); // identical-to-legacy fast path
  return Math.round((clamped / nativeMax) * weight);
}

/**
 * Compute a weighted lead score.
 *
 * @param lead         lead row (budget, status, profile fields, updatedAt)
 * @param interactions interaction rows (used for engagement/behavior)
 * @param followUps    follow-up rows (used for behavior)
 * @param weights      tenant weights; omit/undefined for legacy defaults
 */
export function calculateWeightedLeadScore(
  lead: any,
  interactions: any[] = [],
  followUps: any[] = [],
  weights?: LeadScoreWeightsInput | null,
): LeadScoreResult {
  const w = resolveLeadScoreWeights(weights);

  // ---- Raw heuristics (identical to calculateLeadScore in routes-features) ----
  let rawBudget = 0;
  const budget = parseFloat(lead?.budget || "0");
  if (budget >= 1000000) rawBudget = 25;
  else if (budget >= 500000) rawBudget = 20;
  else if (budget >= 200000) rawBudget = 15;
  else if (budget >= 100000) rawBudget = 10;
  else if (budget > 0) rawBudget = 5;

  const recentInteractions = (interactions || []).filter((i) => {
    const daysDiff = (Date.now() - new Date(i.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 30;
  });
  const rawEngagement = Math.min(25, recentInteractions.length * 5);

  let profileFields = 0;
  if (lead?.name) profileFields++;
  if (lead?.email) profileFields++;
  if (lead?.phone) profileFields++;
  if (lead?.budget) profileFields++;
  if (lead?.preferredType) profileFields++;
  if (lead?.preferredCity) profileFields++;
  if (lead?.preferredCategory) profileFields++;
  const rawProfile = Math.round((profileFields / 7) * 20);

  const daysSinceUpdate =
    (Date.now() - new Date(lead?.updatedAt ?? Date.now()).getTime()) / (1000 * 60 * 60 * 24);
  let rawUrgency = 0;
  if (lead?.status === "proposal") rawUrgency = 15;
  else if (lead?.status === "visit") rawUrgency = 12;
  else if (lead?.status === "qualification") rawUrgency = 8;
  else if (lead?.status === "new" && daysSinceUpdate < 1) rawUrgency = 10;
  else if (lead?.status === "new") rawUrgency = 5;

  const pendingFollowUps = (followUps || []).filter((f) => f.status === "pending");
  const completedFollowUps = (followUps || []).filter((f) => f.status === "completed");
  let rawBehavior = 0;
  if (completedFollowUps.length > 0) rawBehavior += 5;
  if (recentInteractions.length > 3) rawBehavior += 5;
  if (pendingFollowUps.length > 0 && pendingFollowUps.length < 3) rawBehavior += 5;

  // ---- Apply tenant weights ----
  const budgetScore = rescale(rawBudget, NATIVE_MAX.budget, w.budgetWeight);
  const engagementScore = rescale(rawEngagement, NATIVE_MAX.engagement, w.engagementWeight);
  const profileScore = rescale(rawProfile, NATIVE_MAX.profile, w.profileWeight);
  const urgencyScore = rescale(rawUrgency, NATIVE_MAX.urgency, w.urgencyWeight);
  const behaviorScore = rescale(rawBehavior, NATIVE_MAX.behavior, w.behaviorWeight);

  const totalScore = budgetScore + engagementScore + profileScore + urgencyScore + behaviorScore;

  let temperature = "cold";
  if (totalScore >= w.hotThreshold) temperature = "hot";
  else if (totalScore >= w.warmThreshold) temperature = "warm";

  let nextBestAction = "Fazer primeiro contato";
  if (lead?.status === "new" && recentInteractions.length === 0) {
    nextBestAction = "Fazer primeiro contato urgente";
  } else if (lead?.status === "qualification") {
    nextBestAction = "Agendar visita";
  } else if (lead?.status === "visit") {
    nextBestAction = "Enviar proposta";
  } else if (lead?.status === "proposal") {
    nextBestAction = "Follow-up de fechamento";
  } else if (daysSinceUpdate > 7) {
    nextBestAction = "Reativar contato";
  }

  const predictedConversion = Math.min(
    0.95,
    (totalScore / 100) * 0.8 + (lead?.status === "proposal" ? 0.2 : 0),
  );

  return {
    totalScore,
    budgetScore,
    engagementScore,
    profileScore,
    urgencyScore,
    behaviorScore,
    temperature,
    nextBestAction,
    predictedConversion,
  };
}
