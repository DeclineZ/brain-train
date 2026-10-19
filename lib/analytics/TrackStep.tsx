"use client";

import { useEffect } from "react";
import type { StepId } from "./events";
import { trackStep } from "./track";

/** Logs step_viewed once on mount. Lets server components record a step. */
export default function TrackStep({
  stepId,
  gameId,
  props,
}: {
  stepId: StepId;
  gameId?: string;
  props?: Record<string, unknown>;
}) {
  useEffect(() => {
    trackStep(stepId, props, { gameId });
    // Props are a one-time snapshot of the step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId, gameId]);
  return null;
}
