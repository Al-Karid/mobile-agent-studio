import type { ValidatorAdapter } from "@/contracts/validator";
import { noneValidator } from "./none";

/**
 * Validator registry. V1 ships "none" (human). Future adapters (simulator,
 * device-cloud, agent-device) register here — the pipeline is unchanged.
 */
const validators: Record<string, ValidatorAdapter> = {
  none: noneValidator,
};

export function getValidator(name: string): ValidatorAdapter {
  const v = validators[name];
  if (!v) {
    throw new Error(`Unknown validator "${name}". Available: ${Object.keys(validators).join(", ")}`);
  }
  return v;
}

export function listValidators(): string[] {
  return Object.keys(validators);
}
