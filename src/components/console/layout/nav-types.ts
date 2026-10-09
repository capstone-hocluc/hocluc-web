import type { ComponentType } from 'react';

export interface NavEntry {
  /** Page key handed back to the shell's onNavigate. */
  key: string;
  title: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}

export interface NavSection {
  label: string;
  items: NavEntry[];
}
