import { describe, expect, it } from 'vitest';
import type { RolePanelRecord } from './api';
import { rolePanelTarget } from './role-panel-target';

const panel = (message_id: string): RolePanelRecord => ({ message_id });

describe('role panel target', () => {
  it('updates the remembered panel among several', () => {
    expect(rolePanelTarget([panel('100'), panel('200'), panel('300')], '200')).toEqual({ action: 'update', messageId: '200' });
  });
  it('creates a panel when none exists', () => {
    expect(rolePanelTarget([], null)).toEqual({ action: 'create' });
  });
  it('updates the only panel when none is remembered', () => {
    expect(rolePanelTarget([panel('100')], null)).toEqual({ action: 'update', messageId: '100' });
  });
  it('updates the only panel when the remembered one was replaced', () => {
    // Repairing a panel republishes the message under a new id.
    expect(rolePanelTarget([panel('101')], '100')).toEqual({ action: 'update', messageId: '101' });
  });
  it('touches no panel when several exist and none is remembered', () => {
    expect(rolePanelTarget([panel('100'), panel('200')], null)).toEqual({ action: 'ambiguous' });
  });
  it('touches no panel when the remembered one is not among several', () => {
    expect(rolePanelTarget([panel('100'), panel('200')], '300')).toEqual({ action: 'ambiguous' });
  });
});
