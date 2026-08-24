/**
 * Validator contract — the post-generation gate. V1 ships "none" (human visual
 * validation, the user is the observer), which keeps the backend portable.
 * Later: simulator/device-cloud validators drop in here unchanged.
 */

export interface ValidatorResult {
  ok: boolean;
  details: string[];
}

export interface ValidatorAdapter {
  readonly name: string;
  validate(projectDir: string): Promise<ValidatorResult>;
}
