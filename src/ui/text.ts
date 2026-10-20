import type { GameSnapshot } from '../types';
import type { Reason, HistoryWorld, InfoDisposition } from '../engine/model';
import { ROLES, type RoleId } from '../roles';
import { TRAVELLERS } from '../travellers';
import { exactClaim } from '../engine/game';
export const L={
  analysis:'\u63a8\u7406', evidence:'\u6839\u62e0', info:'\u73fe\u5728\u306e\u60c5\u5831', worlds:'\u5019\u88dc\u76e4\u9762', history:'\u8a18\u9332',
  close:'\u9589\u3058\u308b',back:'\u623b\u308b',confirm:'\u78ba\u5b9a', select:'\u9078\u629e',self:'\u81ea\u5206',
  good:'\u5584',evil:'\u60aa',demon:'\u73fe\u5728\u306e\u30c7\u30fc\u30e2\u30f3',drunk:'\u9154\u3063\u6255\u3044',
  goodPoints:'\u5584\u306e\u6839\u62e0',evilPoints:'\u60aa\u306e\u6839\u62e0',inconsistent:'\u4e0d\u6574\u5408',
  sampleLabel:'\u63a2\u7d22\u5019\u88dc\u5185\u306e\u5272\u5408',
  sampleCaution:'\u63a2\u7d22\u3067\u898b\u3064\u3051\u305f\u91cd\u307f\u4ed8\u304d\u5019\u88dc\u306e\u5272\u5408\u3067\u3059\u3002\u771f\u306e\u78ba\u7387\u3067\u3082\u3001\u5168\u76e4\u9762\u306e\u7db2\u7f85\u3067\u3082\u3042\u308a\u307e\u305b\u3093\u3002',
  searching:'\u5019\u88dc\u3092\u63a2\u7d22\u4e2d\u2026',notReady:'\u63a2\u7d22\u5f85\u3061',
  noWorlds:'\u5019\u88dc\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093\u3067\u3057\u305f\u3002\u5168\u76e4\u9762\u304c\u4e0d\u53ef\u80fd\u3068\u3044\u3046\u610f\u5473\u3067\u306f\u3042\u308a\u307e\u305b\u3093\u3002\u5165\u529b\u3092\u78ba\u8a8d\u3057\u3001\u8ffd\u52a0\u63a2\u7d22\u3092\u8a66\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
  weakSample:'\u5019\u88dc\u304c\u5c11\u306a\u3044\u305f\u3081\u3001\u5272\u5408\u304c\u4e0d\u5b89\u5b9a\u3067\u3059\u3002\u8b66\u544a\u306e\u81ea\u52d5\u5224\u5b9a\u3092\u6291\u5236\u3057\u3066\u3044\u307e\u3059\u3002',
  explore:'\u518d\u63a2\u7d22',deep:'\u8ffd\u52a0\u63a2\u7d22',meta:'\u4f1a\u8a71\u30fb\u591c\u6b7b\u306e\u5f31\u3044\u50be\u5411\u3092\u52a0\u5473',
  reasons:'\u6839\u62e0\u3068\u6ce8\u610f',requires:'\u3053\u306e\u4eee\u8aac\u306b\u5fc5\u8981\u306a\u6761\u4ef6',
  none:'\u8a72\u5f53\u306a\u3057',unknown:'\u4e0d\u660e',read:'\u898b\u7acb\u3066',alignment:'\u9663\u55b6',role:'\u5f79\u8077',note:'\u30e1\u30e2',
  readHelp:'\u898b\u7acb\u3066\u306f\u500b\u4eba\u30e1\u30e2\u3067\u3059\u3002\u63a2\u7d22\u306e\u524d\u63d0\u3084\u70b9\u6570\u306b\u306f\u52a0\u7b97\u3057\u307e\u305b\u3093\u3002',
  noReasons:'\u307e\u3060\u5224\u65ad\u6750\u6599\u304c\u3042\u308a\u307e\u305b\u3093\u3002',
  advice:'\u884c\u52d5\u5019\u88dc',support:'\u652f\u6301\u5bc4\u308a',defend:'\u64c1\u8b77\u5bc4\u308a',hold:'\u4fdd\u7559',risk:'\u6ce8\u610f\u70b9',
  talk:'\u8a71\u3092\u805e\u304f',targets:'\u5bfe\u8c61\u5019\u88dc',
  completeNight:'\u3053\u306e\u591c\u306e\u6b7b\u4ea1\u306f\u5168\u3066\u8a18\u9332\u6e08\u307f',noExecution:'\u3053\u306e\u65e5\u306f\u51e6\u5211\u306a\u3057',
  completenessHelp:'\u672a\u8a18\u9332\u3068\u300c\u6b7b\u4ea1\u306a\u3057\u300d\u306f\u5225\u3067\u3059\u3002\u672a\u30c1\u30a7\u30c3\u30af\u306e\u591c\u306f\u3001\u7121\u6b7b\u4ea1\u306e\u8a3c\u62e0\u306b\u3057\u307e\u305b\u3093\u3002',
  remove:'\u8aa4\u5165\u529b\u3092\u524a\u9664',deleteConfirm:'\u3053\u306e\u8a18\u9332\u3068\u9023\u52d5\u3059\u308b\u767a\u52d5\u30fb\u6b7b\u4ea1\u8a18\u9332\u3092\u524a\u9664\u3057\u307e\u3059\u304b\uff1f',
  saved:'\u81ea\u52d5\u4fdd\u5b58\u6e08\u307f',saveError:'\u4fdd\u5b58\u3067\u304d\u307e\u305b\u3093\u3002\u66f8\u304d\u51fa\u3057\u3067\u63a7\u3048\u3092\u4f5c\u6210\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
  export:'\u8a18\u9332\u3092\u66f8\u304d\u51fa\u3059',import:'\u8a18\u9332\u3092\u8aad\u307f\u8fbc\u3080',resume:'\u7d9a\u304d\u304b\u3089',
  nominalTypes:['\u753a\u4eba','\u30a2\u30a6\u30c8\u30b5\u30a4\u30c0\u30fc','\u624b\u4e0b','\u30c7\u30fc\u30e2\u30f3'],
  structured:'情報を記録',source:'元の人',saidWhen:'\u767a\u8a00\u3055\u308c\u305f\u6642',infoWhen:'\u80fd\u529b\u60c5\u5831\u306e\u591c',
  shownRole:'\u898b\u305b\u3089\u308c\u305f\u5f79\u8077',choosePlayers:'\u5bfe\u8c61\u3092\u9078\u629e',result:'\u7d50\u679c',yes:'\u306f\u3044',no:'\u3044\u3044\u3048',
  noOutsiders:'\u30a2\u30a6\u30c8\u30b5\u30a4\u30c0\u30fc\u306a\u3057',public:'\u516c\u958b',private:'\u975e\u516c\u958b',audience:'\u4f1d\u3048\u305f\u76f8\u624b',
  directObserved:'\u81ea\u5206\u304c\u898b\u305f\u60c5\u5831',reported:'\u4ed6\u8005\u306e\u4e3b\u5f35',sourceCaution:'タップした人が話し手です。元の人は、その能力や情報の本人（人A）です。',
  virginQuestion:'\u751f\u306e\u80fd\u529b\u306f\u767a\u52d5\u3057\u307e\u3057\u305f\u304b\uff1f',
  virginBefore:'\u767a\u52d5\u3057\u305f\u5834\u5408\u306f\u6295\u7968\u3092\u884c\u308f\u305a\u3001\u6307\u540d\u8005\u306e\u51e6\u5211\u3092\u8a18\u9332\u3057\u307e\u3059\u3002',
  nominationReason:'\u6307\u540d\u7406\u7531\uff08\u4efb\u610f\uff09',
  unknownResult:'\u672a\u9078\u629e', countsHelp:'\u70b9\u6570\u306f\u6839\u62e0\u306e\u6574\u7406\u7528\u3067\u3059\u3002\u78ba\u7387\u3078\u306e\u76f4\u63a5\u5909\u63db\u306f\u3057\u307e\u305b\u3093\u3002',
};
export function person(g:GameSnapshot,p:string){
 const t=(g.travellers??[]).find(x=>x.id===p);
 return p==='self'?L.self:t?(t.name?`${t.name}（${TRAVELLERS[t.roleId].name}）`:TRAVELLERS[t.roleId].name):g.playerNames[p]?`${g.playerNames[p]} (${p})`:p;
}
export function explain(r:Reason,g:GameSnapshot):string{
 const p=r.players.map(x=>person(g,x)),a=p[0]??'',b=p[1]??'',role=(r.roles??[]).map(x=>ROLES[x].symbol).join(' / '),when=r.phase??'';
 const d:Record<string,string>={
  changedClaim:`${a}\u306e\u5f79\u8077\u4e3b\u5f35\u304c\u5909\u308f\u308a\u307e\u3057\u305f\u3002\u5584\u306e\u30ab\u30d0\u30fc\u4e3b\u5f35\u3082\u3042\u308b\u305f\u3081\u3001\u3053\u308c\u3060\u3051\u3067\u60aa\u3068\u306f\u5224\u65ad\u3057\u307e\u305b\u3093\u3002`,
  tagMismatch:`${a}\u306e\u5177\u4f53\u7684\u306a\u5f79\u8077\u4e3b\u5f35\u304c\u3001\u524d\u306e\u30ab\u30c6\u30b4\u30ea\u4e3b\u5f35\u3068\u4e00\u81f4\u3057\u307e\u305b\u3093\u3002\u4e3b\u5f35\u306e\u610f\u56f3\u3092\u78ba\u8a8d\u3059\u308b\u4fa1\u5024\u304c\u3042\u308a\u307e\u3059\u3002`,
  duplicateClaim:`${a}\u3068${b}\u304c\u540c\u3058\u5f79\u8077\uff08${role}\uff09\u3092\u4e3b\u5f35\u3057\u3066\u3044\u307e\u3059\u3002\u901a\u5e38\u306e\u914d\u5f79\u3067\u306f\u4e21\u65b9\u304c\u672c\u7269\u3068\u306f\u9650\u3089\u305a\u3001\u3069\u3061\u3089\u304c\u60aa\u304b\u306f\u5225\u554f\u984c\u3067\u3059\u3002`,
  boffinPublicAbility:`${a}で${role}の能力が発動しました。ただしボフィンが台本にいるため、デーモンが借りた善役職の能力かもしれません。善陣営・本人の役職の確定には使いません。`,
  mezephelesBehaviorChange:`${a}の言動が変わったと報告されています。メゼフェレスによる陣営変更の可能性もありますが、行動の変化だけでは悪陣営の証明になりません。`,
  mezephelesPossible:`${a}について善から悪への言動変化が記録され、メゼフェレスを弱く支持します。陣営変更そのものが確認されたわけではありません。`,
  widowReported:`${a}がウィドウの存在を通知されたと主張しました。真実ならウィドウを支持しますが、伝聞やブラフの可能性もあります。`,
  psychopathPublicKill:`${when}に${a}が${b}を公開で殺害した記録があります。サイコパス能力を強く示す公開事象として、候補盤面の役職と照合します。`,
  psychopathSeen:`${when}のサイコパス公開行動の記録です。成功した殺害かどうかで証拠の強さを区別します。`,
  hiddenVotes:`${when}に投票者が見えない秘密投票が記録されました。オルガングラインダーの可能性を上げますが、票の見えない人を未投票とみなしません。`,

  fearmongerExecutionRisk:'フィアモンガー警戒が有効です。特定の標的をフィアモンガー本人が指名・処刑すると標的の陣営が敗北します。安全が確認できるまで処刑推奨を保留します。',
  goblinExecutionRisk:'ゴブリンの可能性や主張があります。本人がゴブリンと名乗った状態で処刑すると悪陣営が勝利します。',
  boomdandyExecutionRisk:'ブームダンディの可能性や主張があります。処刑で大半のプレイヤーが死亡するため、慎重に判断してください。',
  virginConfirmed:`${a}\u306e\u751f\u306e\u767a\u52d5\u304c\u516c\u958b\u8a18\u9332\u3055\u308c\u3066\u3044\u307e\u3059\u3002\u901a\u5e38TB\u3067\u306f\u751f\u3068\u3057\u3066\u306e\u6a5f\u68b0\u7684\u306a\u6839\u62e0\u3067\u3059\u3002`,
  slayerConfirmed:`${a}\u306e\u6bba\u306e\u5ba3\u8a00\u306b\u3088\u308a\u6b7b\u4ea1\u304c\u767a\u751f\u3057\u305f\u516c\u958b\u8a18\u9332\u304c\u3042\u308a\u307e\u3059\u3002\u901a\u5e38TB\u3067\u306f\u6bba\u306e\u80fd\u529b\u3068\u3057\u3066\u6271\u3044\u307e\u3059\u3002`,
  virginNominator:`${a}\u306f\u751f\u3092\u767a\u52d5\u3055\u305b\u307e\u3057\u305f\u3002\u753a\u4eba\u307e\u305f\u306f\u753a\u4eba\u3068\u3057\u3066\u8a8d\u8b58\u3055\u308c\u305f\u5bc6\u3067\u8aac\u660e\u3067\u304d\u307e\u3059\u3002`,
  slayerTarget:`${a}\u306f\u6bba\u306e\u5ba3\u8a00\u3067\u6b7b\u4ea1\u3057\u307e\u3057\u305f\u3002\u30c7\u30fc\u30e2\u30f3\u3060\u3051\u3067\u306a\u304f\u3001\u30c7\u30fc\u30e2\u30f3\u3068\u8a8d\u8b58\u3055\u308c\u305f\u7bed\u3082\u6b8b\u308a\u307e\u3059\u3002`,
  virginNoTrigger:`${when}\u306e\u751f\u4e3b\u5f35\u8005\u3078\u306e\u6307\u540d\u306f\u4e0d\u767a\u3067\u3057\u305f\u3002\u6307\u540d\u8005\u304c\u753a\u4eba\u4ee5\u5916\u3001\u751f\u304c\u9152\u30fb\u6bd2\u3001\u4f7f\u7528\u6e08\u307f\u3001\u5f79\u8077\u4e3b\u5f35\u306e\u30d6\u30e9\u30d5\u3092\u533a\u5225\u3059\u308b\u5fc5\u8981\u304c\u3042\u308a\u307e\u3059\u3002`,
  exorcistNoDeathDirect:`${when}に自分の祓魔師で${a}を選び、この夜の死亡が0人でした。${a}がデーモンなら説明できますが、防御・ポーの溜め・ゾンブールなど他の説明もあるため確定ではありません。`,
  exorcistNoDeathClaim:`${b}が${when}に祓魔師で${a}を選んだと主張し、この夜の死亡が0人でした。${a}のデーモン疑いを弱く上げますが、主張自体が虚偽の可能性と他の無死亡要因が残ります。`,
  exorcistRepeatTarget:`${a}の祓魔師主張で前回と同じ${b}を連続して選んでいます。祓魔師は前の夜と同じ人を選べないため、入力または主張内容を確認してください。`,
  exorcistBadTiming:`${a}の祓魔師行動が${when}に記録されています。祓魔師は初夜には行動しないため、日時を確認してください。`,
  mastermindNoDeathAfterExecution:`前日の処刑で${a}が死亡し、${when}は死亡0人でした。もし${a}がデーモンで策士が生存・有効なら、策士の追加日である可能性があります。翌日の処刑は勝敗を直接決め得ます。`,
  badInfoEntry:`${a}\u306e${when}\u306e\u60c5\u5831\u306f\u3001\u65e5\u6642\u30fb\u5bfe\u8c61\u6570\u30fb\u7d50\u679c\u5f62\u5f0f\u306e\u78ba\u8a8d\u304c\u5fc5\u8981\u3067\u3059\u3002\u5165\u529b\u30df\u30b9\u3068\u865a\u507d\u4e3b\u5f35\u3092\u6df7\u540c\u3057\u307e\u305b\u3093\u3002`,
  missingExecution:`${a}\u306e\u5893\u60c5\u5831\u306b\u5bfe\u5fdc\u3059\u308b\u524d\u65e5\u306e\u51e6\u5211\u8a18\u9332\u304c\u3042\u308a\u307e\u305b\u3093\u3002\u672a\u5165\u529b\u306a\u306e\u304b\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002`,
  missingNightDeath:`${a}\u306e\u70cf\u60c5\u5831\u306b\u5bfe\u5fdc\u3059\u308b\u591c\u6b7b\u4ea1\u304c\u672a\u8a18\u9332\u3067\u3059\u3002`,
  conflictingReports:`${a}\u306e\u540c\u3058\u591c\u30fb\u80fd\u529b\u306b\u7570\u306a\u308b\u7d50\u679c\u304c\u3042\u308a\u307e\u3059\u3002\u8a02\u6b63\u306a\u3089\u53e4\u3044\u8a18\u9332\u3092\u524a\u9664\u3057\u3066\u304f\u3060\u3055\u3044\u3002`,
  empathShiftStableNeighbours:`${a}の共感者情報が${when}までに変化しましたが、隣接する生存者は${b}${p[2]?` / ${p[2]}`:''}のままで、その間に隣人の死亡記録がありません。酔っ払い、毒・酔い能力の影響を通常より強く評価します。これは確定ではなく、陣営変更など他のスクリプト固有能力も候補に残します。`,
  corroboration:`${a}\u306e\u60c5\u5831\u306f${b}\u306e\u4e3b\u5f35\u3068\u4e00\u81f4\u3057\u307e\u3059\u3002\u76f8\u4e92\u78ba\u8a8d\u306e\u5019\u88dc\u3067\u3059\u304c\u3001\u5171\u901a\u306e\u60c5\u5831\u6e90\u3084\u5bc6\u306b\u3088\u308b\u507d\u60c5\u5831\u306f\u6b8b\u308a\u307e\u3059\u3002`,
  sharedSource:`${a}\u3068${b}\u306b\u306f\u4f1a\u8a71\u306e\u8a18\u9332\u304c\u3042\u308a\u307e\u3059\u3002\u72ec\u7acb\u3057\u305f\u88cf\u4ed8\u3051\u3068\u3057\u3066\u306e\u52a0\u70b9\u3092\u6291\u3048\u3066\u3044\u307e\u3059\u3002`,
  undertakerImp:`${when}\u306e\u5893\u60c5\u5831\u306f\u51e6\u5211\u3055\u308c\u305f\u4eba\u3092\u6232\u3068\u4f1d\u3048\u3066\u3044\u307e\u3059\u3002\u7d99\u7d9a\u3057\u3066\u3044\u308b\u306a\u3089\u7d05\u306e\u7d99\u627f\u304c\u5019\u88dc\u3067\u3059\u304c\u3001\u7bed\u306e\u8a8d\u8b58\u5909\u5316\u3084\u5893\u306e\u9152\u30fb\u6bd2\u30fb\u865a\u507d\u3082\u6b8b\u308a\u307e\u3059\u3002`,
  extraOutsiders:'\u57fa\u672c\u914d\u5f79\u3088\u308a\u591a\u3044\u30a2\u30a6\u30c8\u30b5\u30a4\u30c0\u30fc\u4e3b\u5f35\u304c\u3042\u308a\u307e\u3059\u3002\u7235\u306e\u5019\u88dc\u3092\u5f31\u304f\u652f\u6301\u3057\u307e\u3059\u304c\u3001\u4e3b\u5f35\u306e\u6570\u306f\u5b9f\u969b\u306e\u4eba\u6570\u3067\u306f\u3042\u308a\u307e\u305b\u3093\u3002',
  vigormortisOutsiderCount:'通常配役よりアウトサイダー主張が1人少なく、ヴィゴモルティスの「アウトサイダー -1／町人 +1」と一致します。主張数は実際の配役数ではないため、ヴィゴモルティスを弱く支持する傾向点としてのみ扱います。',
  outsiderModifierEarlyMissing:`${role} の配役では通常より多いアウトサイダーが必要です。このスクリプトでは追加枠の一部が早出し型アウトサイダーになる必要がありますが、その主張が足りません。未主張の人が多い場合は弱めて計算します。`,
  outsiderReducerEarlyMissing:`${role} の配役では通常よりアウトサイダーが少なくなります。通常配役なら必要な早出し型アウトサイダーの主張が見えない場合、この数減少能力を弱く支持します。潜伏型アウトサイダーの未主張はこの根拠に数えません。`,
  hiddenKill:`${when}\u306b${a}\u304c\u6b7b\u4ea1\u3057\u307e\u3057\u305f\u3002\u4e8b\u524d\u306b${role}\u3092\u4e3b\u5f35\u3057\u3066\u3044\u308b\u3082\u306e\u306e\u3001\u516c\u958b\u4e3b\u5f35\u306f\u672a\u8a18\u9332\u3067\u3059\u3002\u5bc6\u306b\u3088\u308b\u60c5\u5831\u5171\u6709\u306f\u5f31\u3044\u4eee\u8aac\u3067\u3059\u3002`,
  ojoPrecisionKill:`${when}に${a}が夜死亡。事前に公開していない高価値な継続情報役を選ぶオジョの可能性があります（密の情報による狙いもあり、確定ではありません）。`,
  ojoPrecisionSequence:'序盤に価値の高い情報役が連続して夜死亡しています。オジョと密を両方検討しますが、弱い傾向にすぎません。',
  precisionSequence:'\u5e8f\u76e4\u306e\u9ad8\u4fa1\u5024\u4e3b\u5f35\u8005\u306e\u591c\u6b7b\u4ea1\u304c\u7d9a\u3044\u3066\u3044\u307e\u3059\u3002\u5bc6\u306e\u5f31\u3044\u50be\u5411\u70b9\u3092\u8ffd\u52a0\u3057\u307e\u3059\u3002',
  missingTalksNotProof:'\u4f1a\u8a71\u306e\u672a\u8a18\u9332\u306f\u3001\u60c5\u5831\u304c\u4f1d\u308f\u3089\u306a\u304b\u3063\u305f\u8a3c\u62e0\u3067\u306f\u3042\u308a\u307e\u305b\u3093\u3002\u88ab\u5bb3\u8005\u306e\u672c\u5f53\u306e\u5f79\u8077\u3082\u672a\u78ba\u5b9a\u3067\u3059\u3002',
  unstructured:`${a}の自由記述情報は保存されますが、専用形式がないため候補盤面では自動解釈しません。`,
  poisonPattern:`${when}\u306e\u6bd2\u304c\u5fc5\u8981\u306a\u4eee\u8aac\u304c\u512a\u52e2\u3067\u3059\u3002\u901a\u5e38\u306e\u914d\u5f79\u3068\u4e00\u591c\u4e00\u4eba\u306e\u6bd2\u3092\u540c\u6642\u306b\u78ba\u8a8d\u3057\u3066\u3044\u307e\u3059\u3002\u3053\u306e\u70b9\u6570\u306f\u8868\u793a\u7528\u3067\u3001\u63a2\u7d22\u306b\u91cd\u8907\u52a0\u7b97\u3057\u307e\u305b\u3093\u3002`,
  manualPublicMismatch:`${a}\u306e\u516c\u958b\u767a\u52d5\u8a18\u9332\u306f ${role} \u3092\u793a\u3057\u3066\u3044\u307e\u3059\u3002\u4fdd\u5b58\u3057\u305f\u898b\u7acb\u3066\u3068\u5408\u308f\u306a\u3044\u305f\u3081\u518d\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002`,
  sampleEvil:`${a}\u3092\u60aa\u3068\u3059\u308b\u63a2\u7d22\u5019\u88dc\u304c\u512a\u52e2\u3067\u3059\u3002\u4e0b\u306e\u5019\u88dc\u76e4\u9762\u306e\u6761\u4ef6\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002\u5584\u306e\u53ef\u80fd\u6027\u3092\u7db2\u7f85\u7684\u306b\u9664\u5916\u3057\u305f\u308f\u3051\u3067\u306f\u3042\u308a\u307e\u305b\u3093\u3002`,
  sampleDrunk:`${a}\u304c\u9152\u3068\u3057\u3066\u753a\u4eba\u306e\u5f79\u8077\u3092\u898b\u305b\u3089\u308c\u305f\u4eee\u8aac\u304c\u6b8b\u3063\u3066\u3044\u307e\u3059\u3002\u9152\u3068\u78ba\u5b9a\u3057\u305f\u308f\u3051\u3067\u306f\u3042\u308a\u307e\u305b\u3093\u3002`,
  samplePoison:`${a}\u306e${when}\u306e\u6bd2\u304c\u5fc5\u8981\u306a\u63a2\u7d22\u5019\u88dc\u304c\u591a\u304f\u6b8b\u308a\u307e\u3057\u305f\u3002\u540c\u3058\u591c\u306b\u5225\u4eba\u3092\u6bd2\u306b\u3057\u306a\u3044\u65e5\u7a0b\u3067\u691c\u8a0e\u3057\u3066\u3044\u307e\u3059\u3002`,
  manualMismatch:`${a}\u306e\u898b\u7acb\u3066\u3068\u73fe\u5728\u306e\u63a2\u7d22\u5019\u88dc\u306b\u5dee\u304c\u3042\u308a\u307e\u3059\u3002\u65b0\u3057\u3044\u8a18\u9332\u3068\u53e4\u3044\u6839\u62e0\u3092\u6bd4\u8f03\u3057\u3066\u304f\u3060\u3055\u3044\u3002`,
  finalThreeRisk:'\u751f\u5b58\u4e09\u4eba\u3067\u306f\u3001\u9593\u9055\u3063\u305f\u4eba\u306e\u51e6\u5211\u3067\u5373\u5ea7\u306b\u8ca0\u3051\u308b\u5371\u967a\u304c\u3042\u308a\u307e\u3059\u3002',
  deadNominator:'\u6b7b\u4ea1\u3057\u305f\u4eba\u306f\u6307\u540d\u3067\u304d\u307e\u305b\u3093\u3002',alreadyNominated:'\u3053\u306e\u6307\u540d\u8005\u306f\u672c\u65e5\u3059\u3067\u306b\u6307\u540d\u3057\u3066\u3044\u307e\u3059\u3002',alreadyNominee:'\u3053\u306e\u5bfe\u8c61\u306f\u672c\u65e5\u3059\u3067\u306b\u6307\u540d\u3055\u308c\u3066\u3044\u307e\u3059\u3002',deadTarget:'\u6b7b\u4ea1\u6e08\u307f\u306e\u5bfe\u8c61\u306e\u51e6\u5211\u3092\u63a8\u5968\u3057\u307e\u305b\u3093\u3002',
  mastermindRisk:'前日に処刑死があり、今夜は死亡0人です。策士がスクリプトにいる場合、昨日の処刑でデーモンが死亡して追加日になっている可能性があります。この日、善を処刑すると悪勝利、悪を処刑するか処刑なしなら善勝利です。',
  saintRisk:'\u8056\u306e\u53ef\u80fd\u6027\u304c\u6b8b\u308a\u3001\u51e6\u5211\u3067\u5373\u5ea7\u306b\u8ca0\u3051\u308b\u5371\u967a\u304c\u3042\u308a\u307e\u3059\u3002',
  virginTestRisk:'\u751f\u306e\u6700\u521d\u306e\u6307\u540d\u306a\u3089\u3001\u6307\u540d\u8005\u304c\u51e6\u5211\u3055\u308c\u308b\u53ef\u80fd\u6027\u304c\u3042\u308a\u307e\u3059\u3002\u8ab0\u304c\u6307\u540d\u3059\u308b\u304b\u3082\u91cd\u8981\u3067\u3059\u3002',
  mayorFinalThree:'\u751f\u5b58\u4e09\u4eba\u3067\u5e02\u4e3b\u5f35\u304c\u3042\u308a\u307e\u3059\u3002\u51e6\u5211\u3057\u306a\u3044\u9078\u629e\u80a2\u306e\u6761\u4ef6\u3082\u78ba\u8a8d\u3057\u307e\u3059\u3002',
  scarletBuffer:'\u6b7b\u4ea1\u524d\u306b\u4e94\u4eba\u4ee5\u4e0a\u751f\u5b58\u3057\u3066\u3044\u308b\u5834\u5408\u3001\u7d05\u306e\u7d99\u627f\u3067\u30c7\u30fc\u30e2\u30f3\u51e6\u5211\u5f8c\u3082\u7d99\u7d9a\u3057\u5f97\u307e\u3059\u3002',
  notEnoughWorlds:'\u73fe\u5728\u306e\u5019\u88dc\u3060\u3051\u3067\u306f\u6307\u540d\u65b9\u91dd\u3092\u7d5e\u308c\u307e\u305b\u3093\u3002\u60c5\u5831\u8ffd\u52a0\u307e\u305f\u306f\u8ffd\u52a0\u63a2\u7d22\u304c\u5fc5\u8981\u3067\u3059\u3002',
  demonCandidate:'\u73fe\u5728\u306e\u30c7\u30fc\u30e2\u30f3\u5019\u88dc\u304c\u3053\u306e\u4eba\u306b\u96c6\u307e\u3063\u3066\u3044\u307e\u3059\u3002\u4ed6\u306e\u5371\u967a\u6761\u4ef6\u3082\u78ba\u8a8d\u3057\u307e\u3059\u3002',
  goodCandidate:'\u63a2\u7d22\u3067\u306f\u5584\u3068\u3057\u3066\u8aac\u660e\u3055\u308c\u308b\u5019\u88dc\u304c\u512a\u52e2\u3067\u3059\u3002',
  mixedWorlds:'\u6b8b\u3063\u3066\u3044\u308b\u5019\u88dc\u3067\u306f\u5224\u65ad\u304c\u5206\u304b\u308c\u3066\u3044\u307e\u3059\u3002',
  valuableGoodRisk:'\u4e3b\u5f35\u304c\u672c\u5f53\u306a\u3089\u3001\u4eca\u5f8c\u306e\u80fd\u529b\u306e\u4fa1\u5024\u304c\u9ad8\u3044\u4eba\u3092\u5931\u3044\u307e\u3059\u3002',
  executionNoFlip:'\u51e6\u5211\u3057\u3066\u3082\u5f79\u8077\u3084\u9663\u55b6\u306f\u81ea\u52d5\u516c\u958b\u3055\u308c\u307e\u305b\u3093\u3002\u5893\u306e\u7d50\u679c\u3082\u9152\u30fb\u6bd2\u30fb\u8a8d\u8b58\u5909\u5316\u306e\u691c\u8a0e\u304c\u5fc5\u8981\u3067\u3059\u3002',
  incompatiblePublicEvents:'\u540c\u3058\u4eba\u306b\u4e21\u7acb\u3057\u306a\u3044\u516c\u958b\u80fd\u529b\u306e\u6210\u529f\u304c\u8a18\u9332\u3055\u308c\u3066\u3044\u307e\u3059\u3002',
  duplicatePublicRole:'\u540c\u3058\u5f79\u8077\u306e\u516c\u958b\u6210\u529f\u304c\u8907\u6570\u4eba\u306b\u8a18\u9332\u3055\u308c\u3066\u3044\u307e\u3059\u3002\u901a\u5e38TB\u306e\u5165\u529b\u304b\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
  selfRoleConflict:'自分が見た役職と公開能力の成功記録が両立しません。',
  knownMinionConflict:`${a}を悪チームの手下として登録していますが、公開発動記録では別の役職として固定されています。入力を確認してください。`,
  knownKingConflict:'王として記録した人が、別の確定情報と矛盾しています。入力を確認してください。',
  knownDemonConflict:`${a}を自分のデーモンとして登録していますが、他の確定情報と両立しません。悪チーム情報または公開記録を確認してください。`,
  spyGrimoireConflict:`密として入力した初期グリモアの役職と、他の機械的に固定された情報が両立しません。グリモア入力を確認してください。`,
  knownPoisonTarget:`${when}に自分が${a}を毒対象として選びました。緑の数字は推測ではなく、自分の能力行動記録から表示しています。`,
  spyPoisonSeen:`${when}のグリモアで${a}に毒の状態を確認しました。密が健康なら実際の毒対象ですが、自分自身が毒なら誤表示の可能性もあります。`,
 };
 return d[r.code]??`${a} ${when} ${r.detail??L.none}`;
}
export const DISPOSITION_LABELS:Record<InfoDisposition,string>={works:'\u901a\u5e38\u6210\u7acb',registration:'\u8a8d\u8b58\u306e\u4f8b\u5916',poison:'\u6bd2\u72b6\u614b',drunk:'\u9152\u306e\u60c5\u5831',vortox:'ヴォートックス\u3067\u507d\u60c5\u5831',bluff:'\u5225\u5f79\u8077\u306e\u4e3b\u5f35',lie:'\u7d50\u679c\u306e\u865a\u507d\u30fb\u8a02\u6b63',missing:'\u95a2\u9023\u8a18\u9332\u4e0d\u8db3'};
export function worldReasons(w:HistoryWorld,g:GameSnapshot):string[]{
 const list:string[]=[];
 for(const [p,r]of Object.entries(w.initial))if(r==='drunk')list.push(`${person(g,p)}\u3092\u9152\u3068\u3057\u3066\u8aac\u660e\u3059\u308b\u4eee\u8aac\u3067\u3059\u3002`);
 for(const [p,r]of Object.entries(w.believedRoles))list.push(`${person(g,p)}\u306b\u898b\u305b\u3089\u308c\u305f\u753a\u4eba\u30c8\u30fc\u30af\u30f3\u306f ${ROLES[r].symbol} \u3068\u3059\u308b\u4eee\u8aac\u3067\u3059\u3002`);
 for(const [n,p]of Object.entries(w.requiredPoison))list.push(`N${n}: ${person(g,p)}\u306e\u6bd2\u304c\u5fc5\u8981\u3067\u3059\u3002`);
 for(const text of w.assumptions){const parts=text.split(':');const [kind,p]=parts;if(kind==='lie')list.push(`${person(g,p)}の報告に虚偽または訂正を仮定します。`);if(kind==='cover')list.push(`${person(g,p)}の情報記録を別役職のカバーとして扱います。`);if(kind==='mayorRedirect')list.push(`${parts[1]}: ${person(g,parts[2])}への襲撃が市長能力で${person(g,parts[3])}へ移った仮説です。`);if(kind==='monkProtect')list.push(`${parts[1]}: ${person(g,parts[2])}が僧侶に守られた仮説です。`);if(kind==='pitHagImpaired')list.push(`${parts[1]}: 穴の老婆が能力を失っていたため、${person(g,parts[2])}への変身が起きなかった仮説です。`);if(kind==='pitHagInPlay'){const r=parts[3] as RoleId;list.push(`${parts[1]}: 選んだ${ROLES[r]?.symbol??parts[3]}が既に場にいたため、穴の老婆の変身は不発です。`);}if(kind==='witchImpaired')list.push(`${parts[1]}: 魔女が毒/酔いで能力を失っていた仮説です。`);if(kind==='cerenovusImpaired')list.push(`${parts[1]}: セレノヴァスが毒/酔いで能力を失っていた仮説です。`);}
 for(const c of w.changes){
  if(c.kind==='pit_hag')list.push(`${c.when}: ${person(g,c.playerId)}が ${ROLES[c.fromRole].symbol} → ${ROLES[c.toRole].symbol} に変身。陣営は${L[w.currentAlignment[c.playerId]]}のままです。`);
  else if(c.kind==='cacklejack')list.push(`${c.when}: カックルジャックにより${person(g,c.playerId)}が ${ROLES[c.fromRole].symbol} → ${ROLES[c.toRole].symbol} に役職変更。陣営は${L[w.currentAlignment[c.playerId]]}のままです。`);
  else if(c.kind==='engineer')list.push(`${c.when}: 技師の能力で${person(g,c.playerId)}の役職が ${ROLES[c.fromRole].symbol} → ${ROLES[c.toRole].symbol} に変化。陣営は維持されます。`);
  else if(c.kind==='mezepheles')list.push(`${c.when}: ${person(g,c.playerId)}がメゼフェレスの能力で悪陣営に変化した仮説です。役職は変わりません。`);
  else if(c.kind==='summoner')list.push(`${c.when}: 召喚者の能力により${person(g,c.playerId)}が ${ROLES[c.toRole].symbol} ${ROLES[c.toRole].name} となり、悪陣営になりました。`);
  else if(c.kind==='farmer')list.push(`${c.when}: 農夫の夜死亡により${person(g,c.playerId)}が ${ROLES[c.fromRole].symbol} → ${ROLES[c.toRole].symbol} に変化。善陣営のままです。`);
  else if(c.kind==='snake_charmer')list.push(`${c.when}: ${person(g,c.snake)}と${person(g,c.demon)}が蛇使い交換。${person(g,c.snake)}は ${ROLES[c.demonRole].symbol} ${ROLES[c.demonRole].name} になり、元デーモンは蛇使いになって毒状態です。`);
  else if(c.kind==='fang_gu')list.push(`${c.when}: ${person(g,c.newDemon)}が悪の ${ROLES.fang_gu.symbol} ${ROLES.fang_gu.name} になり、${person(g,c.oldDemon)}が代わりに死亡するファン・グー移動です。`);
  else if(c.kind==='scarlet'||c.kind==='starpass')list.push(`${c.when}: ${person(g,c.from)}から${person(g,c.to)}へデーモンが変化（${c.kind==='scarlet'?'紅':'自殺継承'}）。`);
 }
 for(const n of w.arbitraryDeathNights)list.push(`N${n}: 穴の老婆がデーモンを作成したため、この夜の死亡は任意として扱います。`);
 if(w.ended){
  if(w.endReason==='jinx' && w.jinxPair)list.push(`${w.jinxPair.split(':').map(k=>ROLES[k as RoleId]?.name??'不明').join(' × ')} の特殊な勝利条件：${w.jinxWinner==='good'?'善陣営':'悪陣営'}が勝利します。`);
  else if(w.endReason==='vortox')list.push('この仮説では、その日に誰も処刑されなかったためヴォートックスの夕暮れ勝利条件が成立します。');
  else if(w.endReason==='evilTwin')list.push('この仮説では善の双子が処刑され、悪の双子の勝利条件が成立します。');
  else if(w.endReason==='alsaahir')list.push('この仮説ではアルサーヒルが現在の全手下・全デーモンを正しく当て、善陣営の勝利条件が成立します。');
  else list.push('この仮説では最後の事象でゲーム終了条件が成立します。その後も続いたなら新しい時期の記録を追加してください。');
 }
 if(w.redHerring)list.push(`\u5360\u306e\u8aa4\u53cd\u5fdc\u5bfe\u8c61\u3092${person(g,w.redHerring)}\u3067\u56fa\u5b9a\u3059\u308b\u4eee\u8aac\u3067\u3059\u3002`);
 if(Object.values(w.info).includes('registration'))list.push('\u5bc6\u307e\u305f\u306f\u7bed\u306e\u8a8d\u8b58\u5909\u5316\u3092\u4f7f\u3046\u60c5\u5831\u304c\u3042\u308a\u307e\u3059\u3002');
 if(!list.length)list.push('\u5165\u529b\u3055\u308c\u305f\u7bc4\u56f2\u3067\u306f\u8ffd\u52a0\u306e\u4f8b\u5916\u3092\u8981\u3057\u306a\u3044\u5019\u88dc\u3067\u3059\u3002');
 return list;
}
export function currentClaimSymbol(g:GameSnapshot,p:string){const r=exactClaim(g,p);return r?ROLES[r].symbol:'?';}
