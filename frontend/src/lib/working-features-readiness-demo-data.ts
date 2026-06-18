export type WorkingFeaturesReadinessRecord = {
  steps: string[];
};

export function getWorkingFeaturesReadinessDemo(): WorkingFeaturesReadinessRecord {
  return {
    steps: [
      "workingFeaturesReadiness.implStep1",
      "workingFeaturesReadiness.implStep2",
      "workingFeaturesReadiness.implStep3",
      "workingFeaturesReadiness.implStep4",
    ],
  };
}
