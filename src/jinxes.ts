/** Djinn jinxes that involve two characters supported by this app.
 * References: The Pandemonium Institute's /resources/data/jinxes.json (2026-10-14).
 * Pairs are script-level public rules: neither character needs to be in play.
 * `engine` means the named exception has a modeled path; `manual` means
 * a Storyteller judgement or currently unsupported branch is shown, not inferred.
 * Keep all IDs / implementation flags English and render only Japanese descriptions.
 */
import { ROLES, type RoleId } from './roles';
import { JINX_VICTORY_PAIR_SET } from './engine/jinxVictory';

export type JinxSupport = 'engine' | 'victory' | 'manual';
export type Jinx = { id: string; a: RoleId; b: RoleId; description: string; support: JinxSupport };
const pairs: Array<readonly [RoleId, RoleId, string, JinxSupport]> = [
  ['alchemist','boffin','錬金術師がボフィン能力を得た場合、デーモンの取得能力は知らされません。','manual'],
  ['alchemist','marionette','錬金術師がマリオネット能力を得た場合、その能力は働かず、本物のマリオネットが参加します。','manual'],
  ['alchemist','mastermind','錬金術師がマスターマインド能力を得た場合、その能力は働かず、マスターマインド本人は参加しません。','manual'],
  ['alchemist','organ_grinder','錬金術師がオルガングラインダー能力を得る場合、本物も参加し、両方が健康なら両方酔います。','manual'],
  ['alchemist','spy','錬金術師がスパイ能力を得た場合はその能力を持たず、本物のスパイが参加。処刑後にスパイを公に当てた場合、デーモンはその夜スパイを選びます。','manual'],
  ['alchemist','summoner','錬金術師が召喚師能力を得た場合、デーモン役職だけを選び対象は語り手が選びます。発動前に錬金術師が死ぬと悪勝利です。初期デーモンはいません。','manual'],
  ['alchemist','widow','錬金術師がウィドウ能力を得た場合はその能力を持たず、本物のウィドウが参加。処刑後に公に当てればデーモンはその夜ウィドウを選びます。','manual'],
  ['alchemist','wraith','錬金術師がレイス能力を得た場合はその能力を持たず、本物のレイスが参加。処刑後に公に当てればデーモンはその夜レイスを選びます。','manual'],
  ['al_hadikhia','mastermind','アルハディキアが処刑され、マスターマインドが生存中なら、その夜善3人が生死を選び、全員生存を選ぶと悪勝利、それ以外は善勝利です。','manual'],
  ['al_hadikhia','princess','姫が最初の昼に自ら指名した人を処刑した場合、その夜アルハディキアによる死亡は発生しません。','engine'],
  ['boffin','drunk','ボフィンはデーモンに酔っ払いの能力を与えられません。','engine'],
  ['boffin','goon','デーモンがグーン能力を得ても、その能力によって善陣営には変わりません。','manual'],
  ['boffin','village_idiot','余ったトークンがあれば、デーモンに村の愚者の能力を与えられます。','engine'],
  ['bounty_hunter','kazali','カザリが賞金稼ぎを手下に変えた場合、追加の悪の町人は生まれません。','manual'],
  ['bounty_hunter','philosopher','哲学者が賞金稼ぎ能力を得た場合、町人1人が悪になることがあります。','manual'],
  ['butler','organ_grinder','投票時に全員の目が閉じていても、執事の票は主人も投票した場合だけ有効です。','manual'],
  ['cannibal','butler','人食いが執事能力を得た場合、その能力であることを知らされます。','manual'],
  ['cannibal','juggler','初日のジャグラーが処刑で死亡した場合、生存する人食いはその夜正解数を知ります。','manual'],
  ['cannibal','princess','人食いが姫を指名・処刑して死亡させた場合、その夜デーモンは殺しません。','manual'],
  ['cerenovus','goblin','セレノヴスはプレイヤーをゴブリンだと狂わせることができます。','manual'],
  ['legion','engineer','レギオンが作られたら悪全員がレギオンになります。レギオンが参加中なら技師は最初にその事実を知るだけで能力を持ちません。','manual'],
  ['legion','minstrel','レギオンがその日の処刑で死んだ場合もレギオンの能力は残りますが、吟遊詩人はそれを知らされることがあります。','manual'],
  ['legion','preacher','説教者がレギオンを選んでもレギオンの能力は残りますが、説教者は対象がレギオンだと知ることがあります。','engine'],
  ['legion','summoner','召喚師がレギオンを召喚した場合、悪の全員がレギオンになります。','manual'],
  ['leviathan','banshee','夜にリヴァイアサンが異なる生存善を選び、選ばれたバンシーは死亡し能力を得ます。','manual'],
  ['leviathan','exorcist','リヴァイアサンが祓魔師の選んだ人を指名・処刑した場合、善勝利です。','manual'],
  ['leviathan','farmer','夜にリヴァイアサンが異なる生存善を選び、選ばれた農夫は死なずに能力を使います。','manual'],
  ['leviathan','grandmother','リヴァイアサンのゲームで孫が処刑死すると悪勝利です。','manual'],
  ['leviathan','innkeeper','リヴァイアサンが宿屋主人に守られた人を指名・処刑した場合、善勝利です。','manual'],
  ['leviathan','king','リヴァイアサンのゲームでは、死者が1人でもいれば王は毎夜、生存役職を知ります。','engine'],
  ['leviathan','mayor','5日目にリヴァイアサンと市長が生存し、処刑が行われなかった場合、善勝利です。','manual'],
  ['leviathan','monk','リヴァイアサンが修道士の守る人を指名・処刑した場合、善勝利です。','manual'],
  ['leviathan','pit_hag','リヴァイアサンは5日目を過ぎてからゲームに登場できません。','manual'],
  ['leviathan','ravenkeeper','夜にリヴァイアサンが毎夜異なる生存者を選び、選ばれたカラス使いは死なずに能力を使います。','manual'],
  ['leviathan','sage','夜にリヴァイアサンが毎夜異なる生存善を選び、選ばれた賢者は死なずに能力を使います。','manual'],
  ['leviathan','soldier','リヴァイアサンが兵士を指名・処刑した場合、善勝利です。','manual'],
  ['lil_monsta','magician','魔術師が生存している場合、語り手がリルモンスターを預かる手下を選びます。','manual'],
  ['lil_monsta','poppy_grower','ポピーグロワーが生存中は、手下を順番に起こし、誰かがリルモンスターを預かると決めるまで続けます。','manual'],
  ['lil_monsta','psychopath','リルモンスターを預かっているサイコパスは処刑で死亡します。','manual'],
  ['lil_monsta','scarlet_woman','リルモンスターが5人以上生存中に死んだ場合、紅蓮の女が残りのゲーム中リルモンスターを預かります。','manual'],
  ['lleech','mastermind','マスターマインド生存中にリーチの宿主が処刑で死亡したら、リーチは生存しますが能力を失います。','engine'],
  ['lleech','slayer','スレイヤーがリーチの宿主を撃った場合、宿主は死亡します。','engine'],
  ['magician','legion','魔術師が参加する場合、レギオンは複数組に分かれて善のプレイヤーを知ります。魔術師の位置は知らされません。','manual'],
  ['magician','marionette','魔術師が生存中、デーモンは隣のどちらがマリオネットか分かりません。','manual'],
  ['magician','spy','スパイのグリモア確認時、デーモンと魔術師の役職トークンは隠されます。','manual'],
  ['magician','widow','ウィドウのグリモア確認時、デーモンと魔術師の役職トークンは隠されます。','manual'],
  ['magician','wraith','処刑後、生存する魔術師はレイスの位置を公に当てられます。正解ならデーモンはその夜レイスを選びます。','manual'],
  ['marionette','balloonist','マリオネットが気球乗りだと思っている場合、準備時にアウトサイダーが1人追加された可能性があります。','engine'],
  ['marionette','huntsman','マリオネットが猟師だと思っている場合、準備時に乙女が追加されています。','engine'],
  ['marionette','kazali','カザリのゲームでマリオネットがいる場合、デーモン決定後に隣人として配置します。','engine'],
  ['marionette','lil_monsta','リルモンスターのゲームでマリオネットがいる場合、デーモン決定後に隣人として配置します。','manual'],
  ['marionette','summoner','召喚師のゲームでマリオネットがいる場合、デーモン決定後に隣人として配置します。','manual'],
  ['mastermind','vigormortis','能力のあるマスターマインドはヴィゴールモーティスが死亡しても能力を維持します。','manual'],
  ['mathematician','chambermaid','メイドは数学者がその夜起きるかどうかを検出できます。','manual'],
  ['mathematician','drunk','数学者は酔っ払いの能力が誤った結果を出した場合も数えます。','manual'],
  ['mathematician','lunatic','数学者はルナティックと本物のデーモンが異なる対象を攻撃した場合も数えます。','manual'],
  ['mathematician','marionette','数学者はマリオネットの偽情報・能力不発を数えます。','manual'],
  ['pit_hag','damsel','ピットハグが乙女を作る場合、変化するプレイヤーは語り手が選びます。','manual'],
  ['pit_hag','goon','ピットハグで悪のグーンを作っても、グーン自身の能力で善には戻りません。','manual'],
  ['pit_hag','village_idiot','余剰トークンがあれば、ピットハグは村の愚者を追加できます。その際、酔った村の愚者が変わることがあります。','manual'],
  ['recluse','sage','隠者は賢者に対してデーモンとして判定されることがあります。','engine'],
  ['riot','banshee','夜にライオットが異なる生存善を選び、選ばれたバンシーは死亡して能力を得ます。','manual'],
  ['riot','exorcist','ライオットが祓魔師の選んだ人を指名・処刑した場合、善勝利です。','manual'],
  ['riot','farmer','夜にライオットが異なる生存善を選び、選ばれた農夫は死亡せず能力を使います。','manual'],
  ['riot','grandmother','ライオットのゲームで孫が処刑死した場合、悪勝利です。','manual'],
  ['riot','innkeeper','ライオットが宿屋主人に守られた人を指名・処刑した場合、善勝利です。','manual'],
  ['riot','king','ライオットのゲームでは、死者が1人でもいれば王は毎夜、生存役職を知ります。','engine'],
  ['riot','mayor','市長は暴動を止められます。生存ライオットが1人だけなら善勝利、それ以外は悪勝利です。','manual'],
  ['riot','monk','ライオットが修道士の守る人を指名・処刑した場合、善勝利です。','manual'],
  ['riot','ravenkeeper','夜にライオットが毎夜異なる生存善を選び、選ばれたカラス使いは死なずに能力を使います。','manual'],
  ['riot','sage','夜にライオットが毎夜異なる生存善を選び、選ばれた賢者は死なずに能力を使います。','manual'],
  ['riot','soldier','ライオットが兵士を指名・処刑した場合、善勝利です。','manual'],
  ['scarlet_woman','al_hadikhia','紅蓮の女の継承によってデーモンが2人になるなら、紅蓮の女は手下のままです。','manual'],
  ['scarlet_woman','fang_gu','紅蓮の女の継承によってデーモンが2人になるなら、紅蓮の女は手下のままです。','manual'],
  ['spy','damsel','スパイが参加したことがあるゲームでは、乙女は毒状態になります。','engine'],
  ['spy','poppy_grower','ポピーグロワーに能力がある間、スパイはグリモアを見られません。','manual'],
  ['summoner','clockmaker','召喚師は時計師に対してデーモンとして判定されます。','manual'],
  ['summoner','courtier','生きている召喚師の能力が止まっている間、語り手が召喚師の能力を持ちます。','manual'],
  ['summoner','engineer','生きている召喚師が盤面から消えた場合、語り手が召喚師の能力を持ちます。','manual'],
  ['summoner','kazali','召喚師によって2人目の生存デーモンが生まれたら、その夜の死亡は任意です。','manual'],
  ['summoner','lord_of_typhon','タイフォン卿を召喚した場合、手下と隣接し、もう片方の隣人も悪の手下になります。','manual'],
  ['summoner','pit_hag','召喚師によって2人目の生存デーモンが生まれたら、その夜の死亡は任意です。','manual'],
  ['summoner','poppy_grower','3夜目にポピーグロワーが生存中なら、召喚師はデーモン役職だけを選び、対象は語り手が選びます。','manual'],
  ['summoner','preacher','生きている召喚師の能力が止まっている間、語り手が召喚師の能力を持ちます。','manual'],
  ['summoner','pukka','召喚師はプッカを3夜目でなく2夜目に作ることもできます。','engine'],
  ['summoner','zombuul','死者をゾンブールに変えた場合、そのゾンブールは既に1回死んだ状態として扱われます。','manual'],
  ['vortox','banshee','ヴォートックスがバンシーを殺した場合、全員にバンシーの死亡が知らされます。','manual'],
  ['widow','damsel','ウィドウが参加したことがあるゲームでは、乙女は毒状態になります。','engine'],
  ['widow','poppy_grower','ポピーグロワーに能力がある間、ウィドウはグリモアを見られません。','manual'],
  ['yaggababble','exorcist','祓魔師がヤガバブルを選ぶと、その夜ヤガバブルは殺せません。','manual'],
];

const pairKey = (a: RoleId, b: RoleId) => [a,b].sort().join(':');
export const OFFICIAL_JINXES: ReadonlyArray<Jinx> = pairs.map(([a,b,description,support]) => ({
  id: pairKey(a,b), a,b,description,support,
}));
/** Only implemented effects and actual victory rules are surfaced to the player.
 * Storyteller-only pair text stays available for future implementation, but
 * is not presented as a working game mechanic in the current build.
 */
export const JINXES: ReadonlyArray<Jinx> = OFFICIAL_JINXES.filter(j =>
  j.support === 'engine' || JINX_VICTORY_PAIR_SET.has(j.id)
).map(j => JINX_VICTORY_PAIR_SET.has(j.id) ? {...j, support: 'victory' as const} : j);
export function hasJinx(a: RoleId, b: RoleId): boolean { return JINXES.some(j => j.id === pairKey(a,b)); }
export function scriptJinxes(roleIds: Iterable<RoleId>): Jinx[] {
  const present = new Set(roleIds);
  return JINXES.filter(j => present.has(j.a) && present.has(j.b));
}
export function roleJinxes(roleId: RoleId, roleIds: Iterable<RoleId>): Jinx[] {
  return scriptJinxes(roleIds).filter(j=>j.a===roleId || j.b===roleId);
}
/** Script-level jinxes are public, but do not prove that either role is in play. */
export function jinxLabel(jinx: Jinx): string {
  return `${ROLES[jinx.a].symbol} ${ROLES[jinx.a].name} × ${ROLES[jinx.b].symbol} ${ROLES[jinx.b].name}`;
}
