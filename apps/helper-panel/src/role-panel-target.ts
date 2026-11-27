import type { RolePanelRecord } from './api';

export type RolePanelTarget = { action: 'create' } | { action: 'update'; messageId: string } | { action: 'ambiguous' };

// Which Discord message the role panel form controls. With several panels and none known, touch none:
// updating the first one could overwrite a panel created by /rolepanel.
export function rolePanelTarget(panels: RolePanelRecord[], remembered: string | null): RolePanelTarget {
  if (remembered && panels.some(panel => panel.message_id === remembered)) return { action: 'update', messageId: remembered };
  if (panels.length === 0) return { action: 'create' };
  if (panels.length === 1) return { action: 'update', messageId: panels[0].message_id };
  return { action: 'ambiguous' };
}
