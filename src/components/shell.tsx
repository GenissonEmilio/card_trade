'use client';
import { ExploreShell } from './explore-shell';

/** The same navigation and brand system wraps every application route. */
export function Shell({ children }: { children: React.ReactNode }) {
  return <ExploreShell>{children}</ExploreShell>;
}
