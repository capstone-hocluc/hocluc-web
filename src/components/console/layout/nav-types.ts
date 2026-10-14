import type { ComponentType } from 'react';

export type NavIcon = ComponentType<{ size?: number; className?: string }>;

export interface NavEntry {
  /** Page key handed back to the shell's onNavigate. */
  key: string;
  title: string;
  icon: NavIcon;
  /** Pending count shown at the end of the row. */
  badge?: number;
}

export interface NavSection {
  label: string;
  items: NavEntry[];
}
