// Shared constructors and engine imports. Fixtures create fresh mutable game state.
const assert=require('node:assert/strict');

const {seats,setupCounts,setupCountsForRoles,setupCountsForGame,setupCountOptionsForGame,amnesiacAbilityRole,bansheeAwakenedAt,livingNeighbours,rebuildStatus,observations,latestClaim,diedByExecution,empathStableNeighbourShifts,seatingOrderAt}=require('../.engine-test/engine/game.js');

const {validSetup,evaluateAssignment,canRegisterRole,infoMatches,chefRange}=require('../.engine-test/engine/mechanics.js');

const {runSearch,empathShiftLogBonus,hardLocks,drawAssignment,rng}=require('../.engine-test/engine/search.js');

const {analyzeEvidence}=require('../.engine-test/engine/evidence.js');

const {minionPatternLogBonus}=require('../.engine-test/engine/minionPatterns.js');

const {outsiderModifierClaimFit,outsiderClaimStyle}=require('../.engine-test/engine/outsiderClaims.js');

const {nominationAdvice}=require('../.engine-test/engine/advice.js');

const {buildSpyOpponentProjection,buildEvilOpponentProjection,runSpyBluffAdvisor}=require('../.engine-test/engine/spyBluff.js');

const {rankCerenovusSuggestions,rankPitHagSuggestions}=require('../.engine-test/engine/minionStrategy.js');

const {estimateTravellerAlignments}=require('../.engine-test/engine/travellerAlignment.js');

const {travellerCanVote,travellerVoteWeight,travellerVoteTally}=require('../.engine-test/engine/travellerVotes.js');

const {baristaEffectFor,boneCollectorRestored,deviantsFunnyToday,matronSwapCount}=require('../.engine-test/engine/travellerMechanics.js');

const {ALL_TRAVELLER_IDS,BMR_TRAVELLER_IDS,SNV_TRAVELLER_IDS,EXPERIMENTAL_TRAVELLER_IDS,TRAVELLERS}=require('../.engine-test/travellers.js');

const {validateSnapshot,deleteEventGroup,loadSnapshot,saveSnapshot,hasUnreadableSnapshot,SAVE_KEY,SAVE_BACKUP_KEY}=require('../.engine-test/storage.js');

const {ROLES}=require('../.engine-test/roles.js');

const {JINXES,OFFICIAL_JINXES,scriptJinxes,roleJinxes,hasJinx,jinxLabel}=require('../.engine-test/jinxes.js');

const {resolveRecordedJinxVictory,automaticallyResolvedJinxVictory,JINX_VICTORY_PAIRS}=require('../.engine-test/engine/jinxVictory.js');

const {kingInformationAvailable}=require('../.engine-test/engine/mechanics.js');

const {ALL_CORE_ROLE_IDS,BUILT_IN_SCRIPTS}=require('../.engine-test/scripts.js');

const {DEATH_REASONS,availableDeathReasons}=require('../.engine-test/deathReasons.js');

const {getSnapshotScriptRoleIds}=require('../.engine-test/scripts.js');

function game(n=5){return{schemaVersion:2,playerCount:n,playset:'trouble_brewing',night:1,playerNames:{},playerStatus:Object.fromEntries(seats(n).map(p=>[p,{alive:true,deadVoteAvailable:true}])),roleClaimLog:[],abilityClaimLog:[],deathLog:[],revivalLog:[],nominationLog:[],abilityTriggerLog:[],talkLog:[],selfRole:{shownRole:null},selfInfoLog:[],selfActionLog:[],manualReads:{},completedNights:[],noExecutionDays:[]};}

function context(roles,poisonTarget=null,redHerring=null){return{roles,initial:roles,alive:new Set(Object.keys(roles)),poisonTarget,redHerring,order:Object.keys(roles)};}

function claim(g,p,r,id=1,when='D1'){g.roleClaimLog.push({id,playerId:p,subject:{kind:'role',roleId:r},claimType:'normal',origin:'manual',visibility:'public',recipients:[],when});}

function traveller(id,roleId,patch={}){return{id,name:'',roleId,joinedWhen:'D1',active:true,alive:true,deadVoteAvailable:true,knownAlignment:'unknown',voteTokens:0,...patch};}

const base={self:'fortune_teller','1L':'empath','2L':'virgin','2R':'poisoner','1R':'imp'};

const noPoison={self:'fortune_teller','1L':'empath','2L':'virgin','2R':'spy','1R':'imp'};

const ftPair={players:['1L','2L']};

const phase3RoleSymbols={choirboy:'唱',king:'王',engineer:'技',farmer:'農',fisherman:'漁',general:'将',high_priestess:'巫'};

function customGame(initial, n=5) {const g=game(n);g.playset='custom:phase3';g.scriptRoleIds=[...new Set(Object.values(initial))];return g;}

const phase4RoleSymbols={huntsman:'狩',knight:'騎',lycanthrope:'狼',magician:'幻',nightwatchman:'夜',noble:'貴',pixie:'妖',damsel:'乙'};

const phase5Ids=['poppy_grower','preacher','princess','shugenja','steward','village_idiot'];

const {isTyphonLayout,typhonLayouts,isLeviathanEnabled,demonPatternSignals,demonPatternLogBonus}=require('../.engine-test/engine/demonVariants.js');

const {drawSpecialAssignment}=require('../.engine-test/engine/specialDemons.js');

function demonGame(n=10){const g=game(n);g.playset='custom:phase6';g.scriptRoleIds=Object.keys(ROLES);return g;}

function typhon10(){return {self:'lord_of_typhon','1L':'poisoner','2L':'assassin','3L':'chef','4L':'empath','5L':'monk','4R':'soldier','3R':'mayor','2R':'general','1R':'baron'};}

const {isAlHadikhiaEnabled,isRiotConfirmed}=require('../.engine-test/engine/demonVariants.js');

const PHASE7=['lil_monsta','lleech','al_hadikhia','ojo','riot','yaggababble'];

const phase8Symbols={boffin:'博',boomdandy:'炸',fearmonger:'恐',harpy:'鳥',marionette:'糸'};

function fakeJinxWorld(roles,dead=[],align={}){
 return {initial:roles,current:roles,alive:Object.keys(roles).filter(k=>!dead.includes(k)),
  currentAlignment:Object.fromEntries(Object.keys(roles).map(k=>[k,align[k]??(ROLES[roles[k]].type==='minion'||ROLES[roles[k]].type==='demon'?'evil':'good')]))};
}

function outsiderEight(out='puzzlemaster',minion='scarlet_woman'){
 const arr=[out,'chef','washerwoman','empath','monk','fortune_teller',minion,'imp'];
 const initial=Object.fromEntries(seats(8).map((p,i)=>[p,arr[i]]));
 return {initial,g:customGame(initial,8)};
}

const {BMR_ABILITY_TIMING,BMR_ACTION_SPECS,rolePhaseOptions,roleTimingCategories,isBmrRecordedActionRole,bmrActionCanBeRecorded}=require('../.engine-test/abilityTiming.js');

const {BAD_MOON_RISING_ROLE_IDS}=require('../.engine-test/scripts.js');

const {observationTimingValid}=require('../.engine-test/engine/game.js');

function bmrGame(n=7){const g=game(n);g.playset='bad_moon_rising';g.scriptName='バッド・ムーン・ライジング';g.scriptRoleIds=[...BAD_MOON_RISING_ROLE_IDS];return g;}

const {bmrWakePossibility,chambermaidWakeCountRange}=require('../.engine-test/abilityTiming.js');

module.exports = {
  assert,
  seats,
  setupCounts,
  setupCountsForRoles,
  setupCountsForGame,
  setupCountOptionsForGame,
  amnesiacAbilityRole,
  bansheeAwakenedAt,
  livingNeighbours,
  rebuildStatus,
  observations,
  latestClaim,
  diedByExecution,
  empathStableNeighbourShifts,
  seatingOrderAt,
  validSetup,
  evaluateAssignment,
  canRegisterRole,
  infoMatches,
  chefRange,
  runSearch,
  empathShiftLogBonus,
  hardLocks,
  drawAssignment,
  rng,
  analyzeEvidence,
  minionPatternLogBonus,
  outsiderModifierClaimFit,
  outsiderClaimStyle,
  nominationAdvice,
  buildSpyOpponentProjection,
  buildEvilOpponentProjection,
  runSpyBluffAdvisor,
  rankCerenovusSuggestions,
  rankPitHagSuggestions,
  estimateTravellerAlignments,
  travellerCanVote,
  travellerVoteWeight,
  travellerVoteTally,
  baristaEffectFor,
  boneCollectorRestored,
  deviantsFunnyToday,
  matronSwapCount,
  ALL_TRAVELLER_IDS,
  BMR_TRAVELLER_IDS,
  SNV_TRAVELLER_IDS,
  EXPERIMENTAL_TRAVELLER_IDS,
  TRAVELLERS,
  validateSnapshot,
  deleteEventGroup,
  loadSnapshot,
  saveSnapshot,
  hasUnreadableSnapshot,
  SAVE_KEY,
  SAVE_BACKUP_KEY,
  ROLES,
  JINXES,
  OFFICIAL_JINXES,
  scriptJinxes,
  roleJinxes,
  hasJinx,
  jinxLabel,
  resolveRecordedJinxVictory,
  automaticallyResolvedJinxVictory,
  JINX_VICTORY_PAIRS,
  kingInformationAvailable,
  ALL_CORE_ROLE_IDS,
  BUILT_IN_SCRIPTS,
  DEATH_REASONS,
  availableDeathReasons,
  getSnapshotScriptRoleIds,
  game,
  context,
  claim,
  traveller,
  base,
  noPoison,
  ftPair,
  phase3RoleSymbols,
  customGame,
  phase4RoleSymbols,
  phase5Ids,
  isTyphonLayout,
  typhonLayouts,
  isLeviathanEnabled,
  demonPatternSignals,
  demonPatternLogBonus,
  drawSpecialAssignment,
  demonGame,
  typhon10,
  isAlHadikhiaEnabled,
  isRiotConfirmed,
  PHASE7,
  phase8Symbols,
  fakeJinxWorld,
  outsiderEight,
  BMR_ABILITY_TIMING,
  BMR_ACTION_SPECS,
  rolePhaseOptions,
  roleTimingCategories,
  isBmrRecordedActionRole,
  bmrActionCanBeRecorded,
  BAD_MOON_RISING_ROLE_IDS,
  observationTimingValid,
  bmrGame,
  bmrWakePossibility,
  chambermaidWakeCountRange
};
