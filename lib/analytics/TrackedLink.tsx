"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import type { EventName } from "./events";
import { track } from "./track";

/** next/link that records an event on click. For server components. */
export default function TrackedLink({
  event,
  eventProps,
  gameId,
  onClick,
  ...props
}: ComponentProps<typeof Link> & {
  event: EventName;
  eventProps?: Record<string, unknown>;
  gameId?: string;
}) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        track(event, eventProps, { gameId });
        onClick?.(e);
      }}
    />
  );
}
