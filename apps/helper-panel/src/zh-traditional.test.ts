import { describe, expect, it } from 'vitest';

// Characters that exist only in Simplified Chinese. Kept free of characters shared by both scripts
// (默, 邀, 效, 圾, 恢, 里, 后, 余...), which would flag correct Traditional text.
const SIMPLIFIED_ONLY = /[们这个设说体会应过进还开发选择频检点击编辑权务认视么时间对让实为门关见从与样讯网络户账钮态类组规则确统计复报预称内请领删锁测级钟语读动无访问链创团队仅员历启结试调达码资获际现长单张东车马题页线记录产业专华节围处闭阅头将齐广亿优价众传储兴养决况减刚别剂剧办励劳势区医协卖卫厅压县参双变号吗园图圆场坏块坚执扩扫扬扰护担拟拥挂挡挤挥损换据摄摆败敌数断旧显晓暂术机杀杂条来极构标栏树档桥楼欢气汇汉没泽洁浅济浏涂润满滚滤灭灯灵灾烂热爱独环电画畅疗盖盘礼离种积稳穷竞笔签简紧纠红纪约纯纳纸练细终绍经绑绕绘给绝继绩续维综缓缘缩罗罚职联胁脑脚脸荐营蓝虑虽补装览觉触订训议讲许论证评识诉词译该详误课谁谈谢负贡财责货质购贴费赏赛赞赠赶趋跃践踪转轮软轻载较辅输辞边迁运远连迟适递逻遗邮邻释针钱铁销锋错键闪闲闹阳阴阵陆险随隐难韩项顺须顾颜风飞饭馆驱验鱼鸟鸡龙]/;

const sources = import.meta.glob<string>(['./**/*.{json,ts,tsx}', '!**/*.test.{ts,tsx}'],
  { query: '?raw', import: 'default', eager: true });

describe('Chinese copy', () => {
  it('reads every panel catalogue', () => {
    for (const file of ['./helper-dependency-copy.json', './antiscam-simulation-copy.json', './economy-shop-i18n.ts',
      './helper-app-ar-zh.json', './temp-category-create.tsx', './feature-layouts/youtube.json'])
      expect(Object.keys(sources), file).toContain(file);
  });

  it('uses Traditional script (Taiwan) everywhere', () => {
    const hits = Object.entries(sources).flatMap(([file, text]) => text.split('\n')
      .flatMap((line, index) => SIMPLIFIED_ONLY.test(line) ? [`${file}:${index + 1}`] : []));
    expect(hits).toEqual([]);
  });
});
