import { describe, it, expect } from 'vitest';
import { readWorkspaceGuilds, requireWorkspaceGuild } from './workspace';
const me = { id: 'owner', guildId: 'a', expiresAt: '' };
const alpha = { id: 'a', name: 'Alpha', canManage: true };
describe('real workspace identity', () => {
  it('keeps the selected guild even when it is not first', () => {
    const guilds = readWorkspaceGuilds({guilds:[{...alpha,id:'b'},alpha]});
    expect(() => requireWorkspaceGuild(me,guilds)).not.toThrow();
    expect(guilds[1]).toBe(alpha);
  });
  it.each([null, {}, {guilds:null}, {guilds:[null]}, {guilds:[{id:'a'}]}])('rejects malformed lists: %j', result => {
    expect(() => readWorkspaceGuilds(result)).toThrow();
  });
  it.each([{guilds:[]}, {guilds:[{...alpha,id:'b'}]}, {guilds:[{...alpha,canManage:false}]}])('rejects an absent or unauthorized current guild: %j', ({guilds}) => {
    expect(() => requireWorkspaceGuild(me,guilds)).toThrow();
  });
  it('preserves a real server whose actual name contains Demo server', () => {
    const guilds = [{...alpha,name:'Demo server community'}];
    expect(readWorkspaceGuilds({guilds})).toBe(guilds);
    expect(() => requireWorkspaceGuild(me,guilds)).not.toThrow();
  });
});
