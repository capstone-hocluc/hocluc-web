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
  /** Stable key: the group's DOM id and its folded state are stored under it. */
  id: string;
  /** Omitted for a group that sits on top without a heading. */
  label?: string;
  items: NavEntry[];
}
