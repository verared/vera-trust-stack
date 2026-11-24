// Compatibility re-export: APW attestation verification lives in L1 (apw-resolver).
export {
  ATTESTATION_TYP,
  ATTESTATION_IAT_WINDOW_SECONDS,
  sameIssuer,
  verifyAttestation,
} from "@verared/apw/did-apw";
export type {
  AttestationSource,
  AttestationVal,
  AttestationClaims,
  AttestationFailure,
  AttestationExpectations,
  VerifyAttestationResult,
} from "@verared/apw/did-apw";
