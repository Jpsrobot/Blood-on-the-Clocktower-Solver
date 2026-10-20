import { ROLES, type RoleId } from './roles';

/** Timeline of the actual character ability, not the player's public claim. */
export type AbilityPhaseRule = 'firstNight' | 'everyNight' | 'laterNight' | 'everyDay' | 'any' | 'onDeath' | 'onDeathDay' | 'none';
export type AbilityTiming = { info: AbilityPhaseRule; action: AbilityPhaseRule };

/** All 25 Bad Moon Rising characters are enumerated explicitly. The distinction
 * between waking to act and waking to learn information is intentional. */
export const BMR_ABILITY_TIMING = {
  grandmother: { info: 'firstNight', action: 'none' },
  sailor: { info: 'none', action: 'everyNight' },
  chambermaid: { info: 'everyNight', action: 'none' },
  exorcist: { info: 'none', action: 'laterNight' },
  innkeeper: { info: 'none', action: 'laterNight' },
  gambler: { info: 'none', action: 'laterNight' },
  gossip: { info: 'none', action: 'everyDay' },
  courtier: { info: 'none', action: 'everyNight' },
  professor: { info: 'none', action: 'laterNight' },
  minstrel: { info: 'none', action: 'any' },
  tea_lady: { info: 'none', action: 'any' },
  pacifist: { info: 'none', action: 'any' },
  fool: { info: 'none', action: 'any' },
  goon: { info: 'none', action: 'any' },
  lunatic: { info: 'none', action: 'laterNight' },
  tinker: { info: 'none', action: 'any' },
  moonchild: { info: 'none', action: 'onDeathDay' },
  godfather: { info: 'firstNight', action: 'laterNight' },
  devils_advocate: { info: 'none', action: 'everyNight' },
  assassin: { info: 'none', action: 'laterNight' },
  mastermind: { info: 'none', action: 'any' },
  zombuul: { info: 'none', action: 'laterNight' },
  pukka: { info: 'none', action: 'everyNight' },
  shabaloth: { info: 'none', action: 'laterNight' },
  po: { info: 'none', action: 'laterNight' },
} as const satisfies Record<string, AbilityTiming>;

export type BmrRoleId = keyof typeof BMR_ABILITY_TIMING;
export function isBmrRole(id: RoleId | null | undefined): id is BmrRoleId {
  return !!id && Object.prototype.hasOwnProperty.call(BMR_ABILITY_TIMING, id);
}
export function roleTiming(role: RoleId): AbilityTiming {
  if (isBmrRole(role)) return BMR_ABILITY_TIMING[role];
  const tags = ROLES[role].tags;
  const info = tags.includes('INFO_SOURCE')
    ? tags.includes('FIRST_NIGHT_INFO') ? 'firstNight'
    : tags.includes('DAY_INFORMATION') ? 'everyDay'
    : tags.includes('WAKES_OTHER_NIGHTS') ? 'everyNight' : 'any'
    : 'none';
  const action = tags.includes('DAY_ABILITY') ? 'everyDay'
    : tags.includes('WAKES_FIRST_NIGHT') && tags.includes('WAKES_OTHER_NIGHTS') ? 'everyNight'
    : tags.includes('WAKES_FIRST_NIGHT') ? 'firstNight'
    : tags.includes('WAKES_OTHER_NIGHTS') ? 'laterNight'
    : tags.includes('ON_DEATH') ? 'onDeath'
    : 'any';
  return {info,action};
}
export function phaseOptionsForRule(rule: AbilityPhaseRule, night: number): string[] {
  const nights = Array.from({length: night}, (_, i) => `N${i + 1}`);
  const days = Array.from({length: night}, (_, i) => `D${i + 1}`);
  switch (rule) {
    case 'none': return [];
    case 'firstNight': return night >= 1 ? ['N1'] : [];
    case 'everyNight': return nights;
    case 'laterNight': return nights.slice(1);
    case 'everyDay':
    case 'onDeathDay': return days;
    case 'onDeath':
    case 'any': return Array.from({length: night}, (_, i) => [`N${i+1}`,`D${i+1}`]).flat();
  }
}
export function rolePhaseOptions(role: RoleId, night: number, kind: 'info'|'action'): string[] {
  return phaseOptionsForRule(roleTiming(role)[kind],night);
}
/** A character may have both kinds of night events; don't conflate waking with information. */
export function roleTimingCategories(id: RoleId): ReadonlyArray<'NIGHT_INFORMATION'|'NIGHT_ABILITY'|'DAY_INFORMATION'> {
  const t=roleTiming(id);
  const categories: Array<'NIGHT_INFORMATION'|'NIGHT_ABILITY'|'DAY_INFORMATION'>=[];
  if (['firstNight','everyNight','laterNight'].includes(t.info)) categories.push('NIGHT_INFORMATION');
  if (['firstNight','everyNight','laterNight'].includes(t.action) && !(ROLES[id].tags.includes('INFO_SOURCE') && !isBmrRole(id))) categories.push('NIGHT_ABILITY');
  if (t.info==='everyDay') categories.push('DAY_INFORMATION');
  return categories;
}

/** The Chambermaid sees ability wake-ups, NOT merely characters with a night
 * effect. Passive roles, Gossip and Moonchild do not wake in this sense.
 * "maybe" includes once-per-game roles, Godfather/Zombuul conditional wakes,
 * Goon interactions and effects that may prevent a Demon's wake-up.
 * Deliberately conservative: an unknown wake is never counted as a guaranteed one.
 */
export type BmrWakePossibility = 'yes' | 'no' | 'maybe';
export function bmrWakePossibility(role: RoleId, night: number, exorcistOnScript = false): BmrWakePossibility {
  if (!isBmrRole(role)) return 'maybe';
  if (['minstrel','tea_lady','pacifist','fool','tinker','moonchild','gossip','mastermind'].includes(role)) return 'no';
  if (night === 1 && ['exorcist','innkeeper','gambler','professor','assassin','zombuul','shabaloth','po'].includes(role)) return 'no';
  if (role === 'grandmother' || role === 'godfather') return night === 1 ? 'yes' : role === 'grandmother' ? 'no' : 'maybe';
  if (role === 'goon' || role === 'courtier' || role === 'assassin' || role === 'professor' || role === 'zombuul') return 'maybe';
  if (exorcistOnScript && night > 1 && ROLES[role].type === 'demon') return 'maybe';
  // Lunatic wakes because it believes itself to be a Demon, whether or not
  // that Demon ability is real. The conditional first wake is still a wake.
  return 'yes';
}
export function chambermaidWakeCountRange(roles: [RoleId,RoleId], night: number, exorcistOnScript = false): [number,number] {
  const possible=roles.map(r=>bmrWakePossibility(r,night,exorcistOnScript));
  const min=possible.filter(v=>v==='yes').length;
  const max=possible.filter(v=>v!=='no').length;
  return [min,max];
}

/** Display-only guidance for effects that do NOT involve choosing a nightly
 * action. These are never treated as mechanically confirmed without events. */
export const BMR_PASSIVE_EXPLANATIONS: Partial<Record<BmrRoleId,string>> = {
  grandmother: '初夜に善陣営の人と役職を知ります。その人がデーモンに殺されると祖母も死亡します。保護や酔い・毒の可能性は別に検討してください。',
  minstrel: '手下が処刑で死亡すると、旅人を除く他のプレイヤー全員が翌夕方まで酔います。能力が実際に働いたかは状況に依存します。',
  tea_lady: '生存する両隣がともに善陣営なら、その2人は死亡しません。隣人の死亡や移動で効果は変わります。',
  pacifist: '善陣営が処刑されたとき、ストーリーテラーの判断で死亡を防ぐ場合があります。自動的に生存扱いにはしません。',
  fool: '最初に死亡するはずの時、その死亡を防ぎます。実際に死亡しなかった事実は処刑・死亡の記録で確認してください。',
  goon: '夜に最初に自分を能力で選んだプレイヤーは夕方まで酔い、自分はその人の陣営になります。自分からは毎夜対象を選びません。',
  tinker: '生存中、ストーリーテラーの判断でいつでも死亡し得ます。特別な夜の選択はありません。',
  mastermind: 'デーモンが処刑で死亡すると、1日だけゲームが続きます。翌日に誰かが処刑されると、処刑された人の陣営が敗北します。',
};

/** Bad Moon Rising player-directed actions. Exorcist retains its existing fully
 * featured action recorder. Passive abilities are tracked by public events. */
export const BMR_ACTION_SPECS = {
  sailor: { min: 1, max: 1, role: false, once: false, label: '選んだ生存者', help: '本人か対象のどちらかが酔います。誰が酔うかは語り手が決めます。' },
  innkeeper: { min: 2, max: 2, role: false, once: false, label: '今夜守る2人', help: '2人は今夜死亡せず、そのうち1人が翌夕方まで酔います。' },
  gambler: { min: 1, max: 1, role: true, once: false, label: '役職を推測する人', help: '推測が外れていれば自身が死亡します。死亡の結果は死亡記録でも入力してください。' },
  gossip: { min: 0, max: 0, role: false, once: false, label: '公の発言', help: '昼の発言が真実なら、夜に誰かが死亡します。発言と死亡は別々に記録します。' },
  courtier: { min: 0, max: 0, role: true, once: true, label: '3夜3日にわたり酔わせる役職', help: '指定した役職の能力を3夜3日にわたり酔わせます。1ゲーム1回。' },
  professor: { min: 1, max: 1, role: false, once: true, label: '復活させる死亡者', help: '対象が町人なら復活します。復活結果は別途復活記録にも入力します。1ゲーム1回。' },
  lunatic: { min: 1, max: 1, role: false, once: false, label: 'デーモンだと思って選んだ人', help: '本物のデーモンは狂人と狂人が選んだ対象を知ります。' },
  moonchild: { min: 1, max: 1, role: false, once: true, label: '死亡時に公開で選ぶ生存者', help: '死亡を知らされた時に選びます。対象が善陣営なら今夜死亡します。' },
  godfather: { min: 1, max: 1, role: false, once: false, label: '今夜殺す人', help: '前日の昼にアウトサイダーが死亡した時のみ発動します。' },
  devils_advocate: { min: 1, max: 1, role: false, once: false, label: '処刑から守る人', help: '前の夜と同じ人は選べません。選んだ人は翌日処刑されても死亡しません。' },
  assassin: { min: 1, max: 1, role: false, once: true, label: '暗殺する人', help: '1ゲーム1回。対象は他の死亡防止能力にかかわらず死亡します。死亡を別途記録してください。' },
  zombuul: { min: 1, max: 1, role: false, once: false, label: '前日に誰も死亡していない場合の対象', help: '前日誰かが死亡していた場合、今夜は選べません。死んだふりの記録は死亡欄を使います。' },
  pukka: { min: 1, max: 1, role: false, once: false, label: '今夜毒を与える人', help: '毒は今夜から有効です。前夜の毒対象は今夜死亡します。' },
  shabaloth: { min: 2, max: 2, role: false, once: false, label: '今夜狙う2人', help: '2人を狙います。前夜の死亡者が復活する可能性があります。' },
  po: { min: 0, max: 3, role: false, once: false, label: '今夜の犠牲者（0人ならためる）', help: '殺害しない夜の次は3人まで選べます。通常は1人。' },
} as const;
export type BmrRecordedActionRoleId = keyof typeof BMR_ACTION_SPECS;
export function isBmrRecordedActionRole(role: RoleId | null | undefined): role is BmrRecordedActionRoleId {
  return !!role && Object.prototype.hasOwnProperty.call(BMR_ACTION_SPECS, role);
}
export function bmrActionCanBeRecorded(role: BmrRecordedActionRoleId,when: string, currentNight: number): boolean {
  return rolePhaseOptions(role, currentNight, 'action').includes(when);
}
