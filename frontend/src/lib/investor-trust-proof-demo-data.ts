export type InvestorTrustProofRecord = {
  architecture_layers: string[];
  matrix_rows: string[];
  recruiter_notes: string[];
  risks: string[];
};
export function getInvestorTrustProofDemo(): InvestorTrustProofRecord {
  return {
    architecture_layers: ["investorTrustProof.architectureLead"],
    matrix_rows: ["investorTrustProof.matrixLead"],
    recruiter_notes: ["investorTrustProof.recruiterLead"],
    risks: ["investorTrustProof.riskPersistence", "investorTrustProof.riskEmail", "investorTrustProof.riskKyc", "investorTrustProof.riskDelete"],
  };
}
