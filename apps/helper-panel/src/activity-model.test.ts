import { describe,expect,it,vi } from 'vitest';
vi.mock('./i18n',()=>({helperLocale:()=> 'en'}));
import type {ActivityFeedRecord} from './api';
import {activityAction,activityName,activityStatus,mergeActivity,validActivityFeed} from './activity-model';
import {activityCopy,activityText} from './activity-i18n';

const row:ActivityFeedRecord={id:'activity:1',source:'activity',kind:'member_join',user_id:'123',memberName:'Member',actor_id:null,detail:'{}',outcome:'recorded',created_at:10,category:'joins',helper:false};
describe('Recent activity presentation',()=>{
  it('keeps identifiers out of member labels without inventing a name',()=>{
    expect(activityName('123','Readable name')).toBe('Readable name');
    expect(activityName('123')).toBe('Name unavailable');
    expect(activityName('auto')).toBe('Helper');
    expect(activityAction(row)).toBe('Joined');
    expect(activityAction({...row,kind:'helper_command',detail:'{"command":"rank"}'})).toBe('Command /rank');
  });
  it('makes statuses concise without describing simulated actions as real effects',()=>{
    expect(activityStatus({...row,outcome:'shadow_blocked'}).text).toBe('Simulation');
    expect(activityStatus({...row,outcome:'permission_denied'}).text).toBe('Blocked');
    expect(activityStatus({...row,outcome:'failed'}).tone).toBe('danger');
    expect(activityStatus({...row,outcome:'processed'}).text).toBe('Processed');
    expect(activityStatus({...row,outcome:'unknown legacy detail'}).text).toBe('Recorded');
  });
  it('merges pagination and live refresh into one chronological list',()=>{
    const later={...row,id:'case:2',source:'case' as const,created_at:20};
    const changed={...row,memberName:'Updated name'};
    const merged=mergeActivity([row,later],[changed,{...row,id:'audit:1',source:'audit',created_at:20}]);
    expect(merged.map(row=>row.id)).toEqual(['audit:1','case:2','activity:1']);
    expect(merged[2].memberName).toBe('Updated name');
  });
  it('rejects malformed or wrong-guild responses before displaying data',()=>{
    const valid={guildId:'g',events:[row],nextCursor:null};
    expect(validActivityFeed(valid,'g')).toBe(true);
    for(const value of [null,{}, {...valid,guildId:'other'}, {...valid,nextCursor:3}, {...valid,events:[null]}, {...valid,events:[{...row,kind:null}]}]) expect(validActivityFeed(value,'g')).toBe(false);
  });
  it('translates all new interface copy into all ten site languages',()=>{
    for(const key of Object.keys(activityCopy) as (keyof typeof activityCopy)[]) for(const locale of ['en','pt','fr','es','de','tr','ar','zh','ru','ko'] as const) expect(activityText(key,locale)).toBeTruthy();
  });
});
