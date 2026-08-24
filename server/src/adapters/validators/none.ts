import type { ValidatorAdapter, ValidatorResult } from "@/contracts/validator";

/**
 * Human validation — the V1 default. The generated app is handed to the user,
 * who validates visually in Expo Go. Deliberately no simulator/device automation
 * in V1 (keeps the backend portable; the user is the observer).
 */
export const noneValidator: ValidatorAdapter = {
  name: "none",

  async validate(): Promise<ValidatorResult> {
    return {
      ok: true,
      details: ["human validation — the user validates visually in Expo Go"],
    };
  },
};
