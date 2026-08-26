export type StudyStage = "not_started" | "revising" | "revised" | "test_ready";

const stageScore: Record<StudyStage, number> = {
  not_started: 0,
  revising: 1,
  revised: 2,
  test_ready: 3,
};

export function getMockTotal(physics: number, chemistry: number, mathematics: number) {
  return physics + chemistry + mathematics;
}

export function getMasteryPercent(stages: StudyStage[]) {
  if (stages.length === 0) return 0;
  const earned = stages.reduce((total, stage) => total + stageScore[stage], 0);
  return Math.round((earned / (stages.length * 3)) * 100);
}

export function getNextStage(stage: StudyStage): StudyStage {
  const order: StudyStage[] = ["not_started", "revising", "revised", "test_ready"];
  return order[(order.indexOf(stage) + 1) % order.length];
}
