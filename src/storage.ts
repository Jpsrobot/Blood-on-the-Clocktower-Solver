import { ROLES } from "./roles";
import { isBmrRecordedActionRole, BMR_ACTION_SPECS, bmrActionCanBeRecorded } from "./abilityTiming";
import { isTravellerRoleId } from "./travellers";
import type { GameSnapshot, GameLogEntry, GameLogStatus } from "./types";
import type { SearchResult } from "./engine/model";
import { validPhase, rebuildStatus, seats, setupCounts } from "./engine/game";
import { getSnapshotScriptName, getSnapshotScriptRoleIds } from "./scripts";
import { JINX_VICTORY_RECORDED_PAIRS } from "./engine/jinxVictory";
export const SAVE_KEY="clocktower.ja.snapshot.v2";
export const SAVE_BACKUP_KEY="clocktower.ja.snapshot.backup.v2";
export const CHECKPOINT_KEY="clocktower.ja.checkpoints.v2";
export const GAME_LOG_KEY="clocktower.ja.gameLogs.v1";
export const MAX_GAME_LOGS=40;
export const LOG_KEYS=["roleClaimLog","abilityClaimLog","deathLog","revivalLog","nominationLog","abilityTriggerLog","talkLog","selfInfoLog","selfActionLog","demonActionLog","minionActionLog"] as const;
export type LogKey=typeof LOG_KEYS[number];
let lastId=0;
export function eventId():number {lastId=Math.max(Date.now()*16,lastId+16);return lastId;}
function record(v:unknown):v is Record<string,unknown>{return !!v&&typeof v==='object'&&!Array.isArray(v);}
function role(v:unknown){return typeof v==='string'&&Object.hasOwn(ROLES,v);}
export function validateSnapshot(value:unknown):value is GameSnapshot {
  if(!record(value)||value.schemaVersion!==2||typeof value.playset!=='string'||!value.playset||!Number.isInteger(value.playerCount)||Number(value.playerCount)<5||Number(value.playerCount)>15||!Number.isInteger(value.night)||Number(value.night)<1||Number(value.night)>99)return false;
  if(value.scriptName!==undefined&&typeof value.scriptName!=='string')return false;
  if(value.scriptRoleIds!==undefined){if(!Array.isArray(value.scriptRoleIds)||value.scriptRoleIds.length===0||new Set(value.scriptRoleIds as unknown[]).size!==value.scriptRoleIds.length||value.scriptRoleIds.some((r:unknown)=>!role(r)))return false;}
  if(String(value.playset).startsWith('custom:')&&!Array.isArray(value.scriptRoleIds))return false;
  const scriptRoles=new Set(getSnapshotScriptRoleIds(value as GameSnapshot));
  if(value.leviathanConfirmed!==undefined&&(typeof value.leviathanConfirmed!=='boolean'||(value.leviathanConfirmed&&!scriptRoles.has('leviathan'))))return false;
  if(value.alHadikhiaConfirmed!==undefined&&(typeof value.alHadikhiaConfirmed!=='boolean'||(value.alHadikhiaConfirmed&&!scriptRoles.has('al_hadikhia'))))return false;
  if(value.riotConfirmed!==undefined&&(typeof value.riotConfirmed!=='boolean'||(value.riotConfirmed&&!scriptRoles.has('riot'))))return false;
  if(value.fearmongerActive!==undefined && (typeof value.fearmongerActive!=='boolean'||(value.fearmongerActive&&!scriptRoles.has('fearmonger'))))return false;
  if([value.leviathanConfirmed,value.alHadikhiaConfirmed,value.riotConfirmed].filter(Boolean).length>1)return false;
  if(!record(value.selfRole)||(value.selfRole.shownRole!==null&&(!role(value.selfRole.shownRole)||!scriptRoles.has(value.selfRole.shownRole as keyof typeof ROLES))))return false;
  if(!record(value.playerNames)||Object.values(value.playerNames).some(v=>typeof v!=='string')||!record(value.playerStatus)||!record(value.manualReads))return false;
  const travellerIds=new Set<string>();
  if(value.travellers!==undefined){
    if(!Array.isArray(value.travellers)||value.travellers.length>20)return false;
    for(const t of value.travellers){
      if(!record(t)||typeof t.id!=='string'||!t.id||travellerIds.has(t.id)||typeof t.name!=='string'||!isTravellerRoleId(t.roleId)||typeof t.joinedWhen!=='string'||!validPhase(t.joinedWhen)||Number(t.joinedWhen.slice(1))>Number(value.night)||typeof t.active!=='boolean'||typeof t.alive!=='boolean'||typeof t.deadVoteAvailable!=='boolean'||!['unknown','good','evil'].includes(String(t.knownAlignment))||!Number.isInteger(t.voteTokens)||Number(t.voteTokens)<0||Number(t.voteTokens)>99)return false;
      if(t.exiled!==undefined&&typeof t.exiled!=='boolean')return false;
      if(t.exiledWhen!==undefined&&(typeof t.exiledWhen!=='string'||!validPhase(t.exiledWhen)||!String(t.exiledWhen).startsWith('D')||Number(t.exiledWhen.slice(1))>Number(value.night)))return false;
      if(t.exiled===true&&(t.active!==false||t.alive!==false||typeof t.exiledWhen!=='string'))return false;
      travellerIds.add(t.id);
    }
  }
  const participantIds=new Set([...seats(Number(value.playerCount)),...travellerIds]);
  if(value.jinxVictoryLog!==undefined){
    if(!Array.isArray(value.jinxVictoryLog)||value.jinxVictoryLog.length>99)return false;
    const days=new Set<string>(), ids=new Set<number>();
    const allowed=new Set<string>(JINX_VICTORY_RECORDED_PAIRS);
    const seatIds=new Set(seats(Number(value.playerCount)));
    for(const event of value.jinxVictoryLog){
      if(!record(event)||!Number.isSafeInteger(event.id)||ids.has(event.id as number)||
         typeof event.when!=='string'||!/^D[1-9]\d*$/.test(event.when)||
         Number(event.when.slice(1))>Number(value.night)||days.has(event.when)||
         typeof event.pair!=='string'||!allowed.has(event.pair))return false;
      const names=String(event.pair).split(':');
      if(names.some(name=>!scriptRoles.has(name as keyof typeof ROLES)))return false;
      if(event.actor!==undefined&&(!seatIds.has(String(event.actor))))return false;
      if(event.target!==undefined&&(!seatIds.has(String(event.target))))return false;
      if(event.pair==='al_hadikhia:mastermind'){
        if(typeof event.allLive!=='boolean'||event.actor!==undefined||event.target!==undefined)return false;
      }else if(event.pair==='mayor:riot'){
        if(event.actor===undefined||event.target!==undefined||event.allLive!==undefined)return false;
      }else if(event.pair.includes('grandmother')){
        if(event.target===undefined||event.actor!==undefined||event.allLive!==undefined)return false;
      }else if(event.actor===undefined||event.target===undefined||event.allLive!==undefined)return false;
      days.add(event.when);ids.add(event.id as number);
    }
  }
  if(value.boomdandyLog!==undefined){
    if(!Array.isArray(value.boomdandyLog)||value.boomdandyLog.length>99||(value.boomdandyLog.length>0&&!scriptRoles.has('boomdandy')))return false;
    const days=new Set<string>();const ids=new Set<number>();
    for(const e of value.boomdandyLog){
      if(!record(e)||!Number.isSafeInteger(e.id)||ids.has(e.id as number)||!/^D[1-9]\d*$/.test(String(e.when))||Number(String(e.when).slice(1))>Number(value.night)||days.has(String(e.when))||typeof e.executedPlayer!=='string'||!participantIds.has(e.executedPlayer)||!Array.isArray(e.survivors)||e.survivors.length!==3||new Set(e.survivors).size!==3||e.survivors.some(p=>typeof p!=='string'||!participantIds.has(p))||typeof e.tied!=='boolean')return false;
      if(e.pointedPlayer!==null&&(!e.survivors.includes(e.pointedPlayer)||e.tied))return false;
      if(!e.tied && e.pointedPlayer===null)return false;
      days.add(String(e.when));ids.add(e.id as number);
    }
  }
  // Optional experimental Minion observation records; old saves remain valid.
  for(const [name,neededRole] of [['widowReports','widow'],['evilBehaviorReports','mezepheles'],['psychopathEvents','psychopath'],['organGrinderVotes','organ_grinder']] as const){
    const events=value[name];if(events===undefined)continue;
    if(!Array.isArray(events)||events.length>500||(events.length>0&&!scriptRoles.has(neededRole))) return false;
    const ids=new Set<number>();const seenDays=new Set<string>();
    for(const ev of events){
      if(!record(ev)||!Number.isSafeInteger(ev.id)||ids.has(ev.id as number)||typeof ev.when!=='string'||!validPhase(ev.when)||!ev.when.startsWith('D')||Number(ev.when.slice(1))>Number(value.night))return false;
      ids.add(ev.id as number);
      if(name==='organGrinderVotes'){
        if(typeof ev.hidden!=='boolean'||seenDays.has(ev.when))return false;
        seenDays.add(ev.when);
      }else if(typeof ev.playerId!=='string'||!participantIds.has(ev.playerId))return false;
      if(name==='evilBehaviorReports' && (typeof ev.note!=='string'||ev.note.length>1000))return false;
      if(name==='psychopathEvents' && (typeof ev.target!=='string'||!participantIds.has(ev.target)||typeof ev.killed!=='boolean'||ev.target===ev.playerId))return false;
    }
  }
  if(value.outsiderEvents!==undefined){
    if(!Array.isArray(value.outsiderEvents)||value.outsiderEvents.length>300)return false;
    const ids=new Set<number>();const oneUse=new Set<string>();
    const required:Record<string,string>={puzzlemaster_guess:'puzzlemaster',golem_nomination:'golem',ogre_choice:'ogre',hatter_change:'hatter',plague_grant:'plague_doctor',politician_reward:'politician',politician_suspicion:'politician'};
    for(const ev of value.outsiderEvents){
      if(!record(ev)||typeof ev.kind!=='string'||!Object.hasOwn(required,ev.kind)||!scriptRoles.has(required[ev.kind] as keyof typeof ROLES)||
        !Number.isSafeInteger(ev.id)||ids.has(ev.id as number)||typeof ev.when!=='string'||!validPhase(ev.when)||Number(ev.when.slice(1))>Number(value.night)||
        typeof ev.playerId!=='string'||!seats(Number(value.playerCount)).includes(ev.playerId))return false;
      ids.add(ev.id as number);
      const targetKinds=['puzzlemaster_guess','golem_nomination','ogre_choice','hatter_change'];
      if(targetKinds.includes(ev.kind) && (typeof ev.target!=='string'||!seats(Number(value.playerCount)).includes(ev.target)||(ev.kind!=='puzzlemaster_guess' && ev.playerId===ev.target)))return false;
      if(['puzzlemaster_guess','golem_nomination','politician_reward','politician_suspicion'].includes(ev.kind) && !ev.when.startsWith('D'))return false;
      if(ev.kind==='ogre_choice' && ev.when!=='N1')return false;
      if(ev.kind==='puzzlemaster_guess' && (typeof ev.shownDemon!=='string'||!seats(Number(value.playerCount)).includes(ev.shownDemon)))return false;
      if(ev.kind==='golem_nomination' && typeof ev.killed!=='boolean')return false;
      if(ev.kind==='hatter_change' && (!role(ev.newRole)||!scriptRoles.has(ev.newRole as keyof typeof ROLES)||!['minion','demon'].includes(ROLES[ev.newRole as keyof typeof ROLES].type)))return false;
      if(ev.kind==='plague_grant' && (!role(ev.abilityRole)||ROLES[ev.abilityRole as keyof typeof ROLES].type!=='minion'))return false;
      if(['ogre_choice','puzzlemaster_guess','golem_nomination','politician_reward','politician_suspicion'].includes(ev.kind)){
        const key=`${ev.kind}:${ev.playerId}`;if(oneUse.has(key))return false;oneUse.add(key);
      }
    }
  }
  if(value.travellerActionLog!==undefined){
    if(!Array.isArray(value.travellerActionLog)||value.travellerActionLog.length>5000)return false;
    const actionIds=new Set<number>();
    for(const a of value.travellerActionLog){
      if(!record(a)||typeof a.id!=='number'||!Number.isSafeInteger(a.id)||actionIds.has(a.id)||typeof a.travellerId!=='string'||!travellerIds.has(a.travellerId)||typeof a.when!=='string'||!validPhase(a.when)||Number(a.when.slice(1))>Number(value.night)||!isTravellerRoleId(a.roleId))return false;
      actionIds.add(a.id);
      if(a.kind==='vote_modifier'){
        if(!['bureaucrat','thief'].includes(String(a.roleId))||typeof a.target!=='string'||!participantIds.has(a.target)||!String(a.when).startsWith('N'))return false;
      }else if(a.kind==='donation'){
        if(a.roleId!=='beggar'||typeof a.donor!=='string'||!seats(Number(value.playerCount)).includes(a.donor)||!['unknown','good','evil'].includes(String(a.learnedAlignment))||!String(a.when).startsWith('D'))return false;
      }else if(a.kind==='shot'){
        if(a.roleId!=='gunslinger'||typeof a.target!=='string'||!participantIds.has(a.target)||typeof a.killed!=='boolean'||!String(a.when).startsWith('D'))return false;
      }else if(a.kind==='replacement'){
        if(a.roleId!=='scapegoat'||typeof a.savedPlayer!=='string'||!seats(Number(value.playerCount)).includes(a.savedPlayer)||!String(a.when).startsWith('D'))return false;
      }else if(a.kind==='apprentice_ability'){
        if(a.roleId!=='apprentice'||!String(a.when).startsWith('N')||!role(a.abilityRoleId)||!['townsfolk','minion'].includes(ROLES[a.abilityRoleId as keyof typeof ROLES].type))return false;
      }else if(a.kind==='seat_swap'){
        if(a.roleId!=='matron'||!String(a.when).startsWith('D')||typeof a.playerA!=='string'||typeof a.playerB!=='string'||a.playerA===a.playerB||!seats(Number(value.playerCount)).includes(a.playerA)||!seats(Number(value.playerCount)).includes(a.playerB))return false;
      }else if(a.kind==='judge_ruling'){
        if(a.roleId!=='judge'||!String(a.when).startsWith('D')||!Number.isSafeInteger(a.nominationId)||!['pass','fail'].includes(String(a.result)))return false;
      }else if(a.kind==='butcher_nomination'){
        if(a.roleId!=='butcher'||!String(a.when).startsWith('D')||!Number.isSafeInteger(a.nominationId))return false;
      }else if(a.kind==='restore_ability'){
        if(a.roleId!=='bone_collector'||!String(a.when).startsWith('N')||typeof a.target!=='string'||!participantIds.has(a.target))return false;
      }else if(a.kind==='harlot_visit'){
        if(a.roleId!=='harlot'||!String(a.when).startsWith('N')||typeof a.target!=='string'||!participantIds.has(a.target)||typeof a.agreed!=='boolean'||typeof a.bothDied!=='boolean'||(a.shownRole!==undefined&&!role(a.shownRole)))return false;
      }else if(a.kind==='barista_effect'){
        if(a.roleId!=='barista'||!String(a.when).startsWith('N')||typeof a.target!=='string'||!participantIds.has(a.target)||!['sober_healthy','acts_twice'].includes(String(a.effect)))return false;
      }else if(a.kind==='deviant_funny'){
        if(a.roleId!=='deviant'||!String(a.when).startsWith('D')||typeof a.funny!=='boolean')return false;
      }else if(a.kind==='cacklejack_protect'){
        if(a.roleId!=='cacklejack'||!String(a.when).startsWith('D')||typeof a.target!=='string'||!participantIds.has(a.target))return false;
      }else if(a.kind==='cacklejack_change'){
        if(a.roleId!=='cacklejack'||!String(a.when).startsWith('N')||Number(a.when.slice(1))<2||typeof a.target!=='string'||!participantIds.has(a.target)||!role(a.newRole))return false;
      }else if(a.kind==='gnome_friend'){
        if(a.roleId!=='gnome'||typeof a.friend!=='string'||!participantIds.has(a.friend))return false;
      }else if(a.kind==='gnome_kill'){
        if(a.roleId!=='gnome'||!String(a.when).startsWith('D')||!Number.isSafeInteger(a.nominationId)||typeof a.target!=='string'||!participantIds.has(a.target)||typeof a.killed!=='boolean')return false;
      }else if(a.kind==='gangster_kill'){
        if(a.roleId!=='gangster'||!String(a.when).startsWith('D')||typeof a.agreedPlayer!=='string'||typeof a.target!=='string'||a.agreedPlayer===a.target||!participantIds.has(a.agreedPlayer)||!participantIds.has(a.target)||typeof a.killed!=='boolean')return false;
      }else return false;
    }
  }
  if(value.demonState!==undefined){
    const d=value.demonState;if(!record(d)||!Array.isArray(d.knownMinions)||!Array.isArray(d.storytellerBluffs)||!record(d.bluffPlans))return false;
    const activeDemon=new Set(seats(Number(value.playerCount)));
    if(d.evilTeamIntro!==undefined && !['shown','blocked'].includes(String(d.evilTeamIntro)))return false;
    if(d.evilTeamLearnedWhen!==undefined&&d.evilTeamLearnedWhen!==null &&
       (typeof d.evilTeamLearnedWhen!=='string'||!/^N[1-9]\d*$/.test(d.evilTeamLearnedWhen)||Number(d.evilTeamLearnedWhen.slice(1))>Number(value.night)||d.evilTeamIntro!=='blocked'))return false;

    if(d.knownKing!==undefined && d.knownKing!==null && (typeof d.knownKing!=='string'||d.knownKing==='self'||!activeDemon.has(d.knownKing)||!scriptRoles.has('king')))return false;
    if(d.knownMarionette!==undefined && d.knownMarionette!==null){
      if(typeof d.knownMarionette!=='string'||!activeDemon.has(d.knownMarionette)||d.knownMarionette==='self'||!scriptRoles.has('marionette'))return false;
      const circle=seats(Number(value.playerCount)), i=circle.indexOf('self');
      if(![circle[(i+1)%circle.length],circle[(i+circle.length-1)%circle.length]].includes(d.knownMarionette))return false;
    }
    if(d.boffinGrantedAbility!==undefined&&d.boffinGrantedAbility!==null && (!role(d.boffinGrantedAbility)||!scriptRoles.has(d.boffinGrantedAbility as keyof typeof ROLES)||!['townsfolk','outsider'].includes(ROLES[d.boffinGrantedAbility as keyof typeof ROLES].type)||!scriptRoles.has('boffin')))return false;
    const demoMinions=setupCounts(Number(value.playerCount)).minion+(value.selfRole && record(value.selfRole) && value.selfRole.shownRole==='lord_of_typhon'?1:0);
    if(d.knownMinions.length>demoMinions+(scriptRoles.has("magician")?1:0))return false;
    if(d.typhonPredictions!==undefined){
      if(!record(d.typhonPredictions))return false;
      for(const [seat,r] of Object.entries(d.typhonPredictions))if(!activeDemon.has(seat)||seat==='self'||(r!==null&&(!role(r)||ROLES[r as keyof typeof ROLES].type!=='minion'||!scriptRoles.has(r as keyof typeof ROLES))))return false;
    }
    if(d.lleechHost!==undefined && d.lleechHost!==null && (typeof d.lleechHost!=="string" || d.lleechHost==="self" || !activeDemon.has(d.lleechHost) || !scriptRoles.has("lleech")))return false;
    if(d.lilMonstaBabysitters!==undefined){
      if(!Array.isArray(d.lilMonstaBabysitters)||d.lilMonstaBabysitters.length>100 || (d.lilMonstaBabysitters.length>0&&!scriptRoles.has('lil_monsta')))return false;
      if(d.lilMonstaBabysitters.some(v=>!record(v)||typeof v.when!=="string"||!/^N[1-9]\d*$/.test(v.when)||Number(v.when.slice(1))>Number(value.night)||typeof v.playerId!=="string"||!activeDemon.has(v.playerId)))return false;
      if(new Set(d.lilMonstaBabysitters.map(v=>v.when)).size!==d.lilMonstaBabysitters.length)return false;
    }
    if(d.legionAllies!==undefined){
      if(!Array.isArray(d.legionAllies)||d.legionAllies.length>=Number(value.playerCount)||new Set(d.legionAllies).size!==d.legionAllies.length||d.legionAllies.some(p=>typeof p!=='string'||p==='self'||!activeDemon.has(p)))return false;
    }
    const seenMinions=new Set<string>();
    for(const item of d.knownMinions){
      if(!record(item)||typeof item.playerId!=='string'||item.playerId==='self'||!activeDemon.has(item.playerId)||!['demon_info','minion_info','confirmed_later'].includes(String(item.source))||seenMinions.has(item.playerId))return false;
      if(item.roleId!==undefined&&item.roleId!==null&&(!role(item.roleId)||ROLES[item.roleId as keyof typeof ROLES].type!=='minion'))return false;
      seenMinions.add(item.playerId);
    }
    if(d.storytellerBluffs.length>3||Number(value.playerCount)<=6&&d.storytellerBluffs.length>0)return false;
    const seenBluffs=new Set<string>();
    for(const r of d.storytellerBluffs){if(!role(r)||ROLES[r as keyof typeof ROLES].type==='minion'||ROLES[r as keyof typeof ROLES].type==='demon'||seenBluffs.has(String(r)))return false;seenBluffs.add(String(r));}
    for(const [player,r] of Object.entries(d.bluffPlans)){if(!activeDemon.has(player)||!(r===null||role(r))||(r!==null&&(ROLES[r as keyof typeof ROLES].type==='minion'||ROLES[r as keyof typeof ROLES].type==='demon')))return false;}
  }
  if(value.minionState!==undefined){
    const d=value.minionState;if(!record(d)||!(d.knownDemon===null||record(d.knownDemon))||!Array.isArray(d.knownMinions)||!Array.isArray(d.sharedStorytellerBluffs)||!record(d.bluffPlans)||!record(d.spyInitialRoles)||!(d.spyRedHerring===null||typeof d.spyRedHerring==='string')||!(d.becameDemonAt===null||typeof d.becameDemonAt==='string'))return false;
    if(d.snitchBluffs!==undefined){
      if(!Array.isArray(d.snitchBluffs)||d.snitchBluffs.length>3||(d.snitchBluffs.length>0&&!scriptRoles.has('snitch'))||new Set(d.snitchBluffs).size!==d.snitchBluffs.length||
        d.snitchBluffs.some((r:unknown)=>!role(r)||!scriptRoles.has(r as keyof typeof ROLES)))return false;
    }
    if(d.summonedDemon!==undefined&&d.summonedDemon!==null){
      if(!scriptRoles.has('summoner')||!record(d.summonedDemon)||typeof d.summonedDemon.when!=='string'||!(['N2','N3'].includes(d.summonedDemon.when))||Number(value.night)<Number(d.summonedDemon.when.slice(1))||(d.summonedDemon.when==='N2'&&d.summonedDemon.demonRole!=='pukka')||!seats(Number(value.playerCount)).includes(String(d.summonedDemon.playerId))||!role(d.summonedDemon.demonRole)||!scriptRoles.has(d.summonedDemon.demonRole as keyof typeof ROLES)||ROLES[d.summonedDemon.demonRole as keyof typeof ROLES].type!=='demon')return false;
    }
    if(d.organGrinderDrunkNights!==undefined && (!Array.isArray(d.organGrinderDrunkNights)||(d.organGrinderDrunkNights.length>0&&!scriptRoles.has('organ_grinder'))||new Set(d.organGrinderDrunkNights).size!==d.organGrinderDrunkNights.length||d.organGrinderDrunkNights.some((ph:unknown)=>typeof ph!=='string'||!/^N[1-9]\d*$/.test(ph)||Number(ph.slice(1))>Number(value.night))))return false;
    if(d.widowPoisonedPlayer!==undefined&&d.widowPoisonedPlayer!==null&&(!scriptRoles.has('widow')||!seats(Number(value.playerCount)).includes(String(d.widowPoisonedPlayer))))return false;
    if(d.wizardWish!==undefined&&d.wizardWish!==null&&(!scriptRoles.has('wizard')||!record(d.wizardWish)||typeof d.wizardWish.when!=='string'||!validPhase(d.wizardWish.when)||Number(d.wizardWish.when.slice(1))>Number(value.night)||typeof d.wizardWish.wish!=='string'||typeof d.wizardWish.granted!=='boolean'||typeof d.wizardWish.price!=='string'||typeof d.wizardWish.clue!=='string'))return false;
    if(d.wraithNotes!==undefined&&(!Array.isArray(d.wraithNotes)||(d.wraithNotes.length>0&&!scriptRoles.has('wraith'))||d.wraithNotes.length>99||d.wraithNotes.some((x:unknown)=>!record(x)||typeof x.when!=='string'||!/^N[1-9]\d*$/.test(x.when)||Number(x.when.slice(1))>Number(value.night)||typeof x.note!=='string')))return false;
    const activeMinion=new Set(seats(Number(value.playerCount)));

    if(d.evilTeamIntro!==undefined && !['shown','blocked'].includes(String(d.evilTeamIntro)))return false;
    if(d.boffinGrantedAbility!==undefined&&d.boffinGrantedAbility!==null && (!role(d.boffinGrantedAbility)||!scriptRoles.has(d.boffinGrantedAbility as keyof typeof ROLES)||!['townsfolk','outsider'].includes(ROLES[d.boffinGrantedAbility as keyof typeof ROLES].type)||!scriptRoles.has('boffin')))return false;
    if(d.evilTeamLearnedWhen!==undefined&&d.evilTeamLearnedWhen!==null &&
       (typeof d.evilTeamLearnedWhen!=='string'||!/^N[1-9]\d*$/.test(d.evilTeamLearnedWhen)||Number(d.evilTeamLearnedWhen.slice(1))>Number(value.night)||d.evilTeamIntro!=='blocked'))return false;
    if(d.demonCandidates!==undefined){
      if(!Array.isArray(d.demonCandidates)||d.demonCandidates.length>2||new Set(d.demonCandidates).size!==d.demonCandidates.length||d.demonCandidates.some((x:unknown)=>typeof x!=='string'||x==='self'||!activeMinion.has(x as string)))return false;
      if(d.demonCandidates.length===2&&!scriptRoles.has("magician"))return false;
    }
    const minionSlots=Math.max(0,setupCounts(Number(value.playerCount)).minion-1+(scriptRoles.has("lord_of_typhon")?1:0));
    if(d.knownDemon!==null){
      const kd=d.knownDemon;if(!record(kd)||typeof kd.playerId!=='string'||kd.playerId==='self'||!activeMinion.has(kd.playerId)||!['minion_info','confirmed_later'].includes(String(kd.source)))return false;
    }
    if(d.knownMinions.length>minionSlots)return false;
    const seenTeam=new Set<string>();
    if(d.knownDemon!==null&&record(d.knownDemon))seenTeam.add(String(d.knownDemon.playerId));
    const seenRoles=new Set<string>();
    for(const item of d.knownMinions){
      if(!record(item)||typeof item.playerId!=='string'||item.playerId==='self'||!activeMinion.has(item.playerId)||!['demon_info','minion_info','confirmed_later'].includes(String(item.source))||seenTeam.has(item.playerId))return false;
      if(item.roleId!==undefined&&item.roleId!==null){if(!role(item.roleId)||ROLES[item.roleId as keyof typeof ROLES].type!=='minion'||seenRoles.has(String(item.roleId)))return false;seenRoles.add(String(item.roleId));}
      seenTeam.add(item.playerId);
    }
    if(d.sharedStorytellerBluffs.length>3||Number(value.playerCount)<=6&&d.sharedStorytellerBluffs.length>0)return false;
    const seenBluffs=new Set<string>();
    for(const r of d.sharedStorytellerBluffs){if(!role(r)||ROLES[r as keyof typeof ROLES].type==='minion'||ROLES[r as keyof typeof ROLES].type==='demon'||seenBluffs.has(String(r)))return false;seenBluffs.add(String(r));}
    for(const [player,r] of Object.entries(d.bluffPlans)){if(!activeMinion.has(player)||!(r===null||role(r))||(r!==null&&(ROLES[r as keyof typeof ROLES].type==='minion'||ROLES[r as keyof typeof ROLES].type==='demon')))return false;}
    const spyRoles=new Set<string>();
    for(const [player,r] of Object.entries(d.spyInitialRoles)){if(!activeMinion.has(player)||!(r===null||role(r)))return false;if(r!==null){if(spyRoles.has(String(r)))return false;spyRoles.add(String(r));}}
    if(d.spyRedHerring!==null&&!activeMinion.has(String(d.spyRedHerring)))return false;
    if(d.becameDemonAt!==null&&(!validPhase(String(d.becameDemonAt))||Number(String(d.becameDemonAt).slice(1))>Number(value.night)))return false;
    if(d.evilTwin!==undefined&&d.evilTwin!==null){if(!record(d.evilTwin)||typeof d.evilTwin.playerId!=='string'||d.evilTwin.playerId==='self'||!activeMinion.has(d.evilTwin.playerId)||!role(d.evilTwin.roleId)||!scriptRoles.has(d.evilTwin.roleId as keyof typeof ROLES)||!['townsfolk','outsider'].includes(ROLES[d.evilTwin.roleId as keyof typeof ROLES].type))return false;}
  }
  for(const v of Object.values(value.playerStatus))if(!record(v)||typeof v.alive!=='boolean'||typeof v.deadVoteAvailable!=='boolean')return false;
  for(const v of Object.values(value.manualReads))if(!record(v)||typeof v.playerId!=='string'||(v.roleId!==null&&!role(v.roleId))||!['unknown','good','evil'].includes(String(v.alignment))||typeof v.note!=='string')return false;
  for(const k of ['completedNights','noExecutionDays'])if(!Array.isArray(value[k])||value[k].some((n:unknown)=>!Number.isInteger(n)||Number(n)<1||Number(n)>99))return false;
  const active=new Set(seats(Number(value.playerCount)));
  const allIds=new Set<number>();
  for(const key of LOG_KEYS){
    const list=value[key]??[];if(!Array.isArray(list)||list.length>5000)return false;
    for(const e of list){
      if(!record(e)||typeof e.id!=='number'||!Number.isSafeInteger(e.id)||e.id<0||typeof e.when!=='string'||!validPhase(e.when)||Number(e.when.slice(1))>Number(value.night))return false;
      if(allIds.has(e.id))return false;allIds.add(e.id);
      for(const field of ['playerId','sourcePlayerId','rolePlayerId','targetPlayerId','player','target'])if(e[field]!==undefined&&(!active.has(String(e[field]))))return false;
      if(e.order!==undefined&&(typeof e.order!=='number'||!Number.isFinite(e.order)))return false;
      if(e.sourceEventId!==undefined&&(typeof e.sourceEventId!=='number'||!Number.isFinite(e.sourceEventId)))return false;
      if(e.roleId!==undefined&&(!role(e.roleId)||!scriptRoles.has(e.roleId as keyof typeof ROLES)))return false;
      if(e.sourceRoleId!==undefined&&!role(e.sourceRoleId))return false;
      if(e.sourceTravellerRoleId!==undefined&&!isTravellerRoleId(e.sourceTravellerRoleId))return false;
      if(e.shownRole!==undefined&&(!role(e.shownRole)||!scriptRoles.has(e.shownRole as keyof typeof ROLES)))return false;
      if(key==='roleClaimLog'){
        if(typeof e.playerId!=='string'||!record(e.subject)||!['public','private'].includes(String(e.visibility))||!['normal','bluff'].includes(String(e.claimType)))return false;
        const s=e.subject;
        if(s.kind==='role'&&(!role(s.roleId)||!scriptRoles.has(s.roleId as keyof typeof ROLES)))return false;
        if(s.kind==='tag'&&!['FIRST_NIGHT_INFO','CONTINUOUS_INFO','LACK_OF_INFO','WANTS_DEMON_TARGET','HIGH_SURVIVAL_VALUE'].includes(String(s.tag)))return false;
        if(s.kind==='type'&&!['townsfolk','outsider','minion','demon'].includes(String(s.roleType)))return false;
        if(s.kind==='alignment'&&!['good','evil'].includes(String(s.alignment)))return false;
        if(!['role','tag','type','alignment'].includes(String(s.kind)))return false;
      }
      for(const field of ['recipients','targets','participants','players'])if(e[field]!==undefined&&(!Array.isArray(e[field])||(e[field]as unknown[]).some(v=>typeof v!=='string'||!active.has(v))||Array.isArray(e[field])&&new Set(e[field]as string[]).size!==(e[field]as string[]).length))return false;
      if((key==='roleClaimLog'||key==='abilityClaimLog')&&!Array.isArray(e.recipients))return false;
      if(key==='abilityClaimLog'&&(!Array.isArray(e.targets)||typeof e.playerId!=='string'||!(e.result===null||typeof e.result==='string')))return false;
      if(key==='abilityClaimLog'&&e.affectedByHarpy!==undefined&&(e.affectedByHarpy!==true||e.roleId!=='harpy'||(e.targets as string[]).length!==1||e.playerId===(e.targets as string[])[0]))return false;
      if(key==='nominationLog'){
        if(!Array.isArray(e.voters)||e.voters.some(v=>typeof v!=='string'||!participantIds.has(String(v)))||new Set(e.voters).size!==e.voters.length||typeof e.nominator!=='string'||typeof e.nominee!=='string'||!active.has(e.nominee)||!(active.has(e.nominator)||travellerIds.has(e.nominator)||e.nominator==='storyteller'))return false;
        if(e.voteTotal!==undefined&&(typeof e.voteTotal!=='number'||!Number.isFinite(e.voteTotal)))return false;
        if(e.executed!==undefined && (typeof e.executed!=='boolean'||(e.executed===true&&e.votingOccurred===false)))return false;
        if(e.voteWeights!==undefined){
          if(!record(e.voteWeights))return false;
          for(const [p,w] of Object.entries(e.voteWeights))if(!e.voters.includes(p)||typeof w!=='number'||!Number.isFinite(w))return false;
        }
      }
      if(key==='talkLog'&&(!Array.isArray(e.participants)||e.participants.length<2||!(e.topic===null||typeof e.topic==='string')))return false;
      if(key==='deathLog'&&(typeof e.playerId!=='string'||!['storyteller','execution','night_death','ability','gnome','gangster','other','psychopath'].includes(String(e.reason))))return false;
      if(key==='revivalLog'&&(typeof e.playerId!=='string'||!e.when.startsWith('N')))return false;
      if(key==='abilityTriggerLog'&&(!['virgin','slayer'].includes(String(e.roleId))||typeof e.rolePlayerId!=='string'||typeof e.targetPlayerId!=='string'||typeof e.triggered!=='boolean'))return false;
      if(key==='selfInfoLog'){
        if(['washerwoman','investigator'].includes(String(e.roleId))&&(!Array.isArray(e.players)||e.players.length!==2||!role(e.shownRole)))return false;
        if(e.roleId==='librarian'&&(typeof e.noOutsiders!=='boolean'||(!e.noOutsiders&&(!Array.isArray(e.players)||e.players.length!==2||!role(e.shownRole)))))return false;
        if(['chef','empath','clockmaker','oracle','mathematician'].includes(String(e.roleId))&&!Number.isInteger(e.number))return false;
        if(e.roleId==='fortune_teller'&&(!Array.isArray(e.players)||e.players.length!==2||!['yes','no'].includes(String(e.result))))return false;
        if(['flowergirl','town_crier'].includes(String(e.roleId))&&!['yes','no'].includes(String(e.result)))return false;
        if(e.roleId==='dreamer'&&(typeof e.player!=='string'||!Array.isArray(e.shownRoles)||e.shownRoles.length!==2||e.shownRoles.some(v=>!role(v))))return false;
        if(e.roleId==='savant'){
          if(!e.when.startsWith('D')||!Array.isArray(e.statements)||e.statements.length!==2)return false;
          for(const st of e.statements){if(!record(st)||!['roleInPlay','roleAmong'].includes(String(st.kind))||!role(st.roleId)||!scriptRoles.has(st.roleId as keyof typeof ROLES))return false;if(st.kind==='roleAmong'&&(!Array.isArray(st.players)||st.players.length===0||st.players.some(v=>typeof v!=='string'||!active.has(v))||new Set(st.players).size!==st.players.length))return false;}
        }
        if(e.roleId==='seamstress'&&(!Array.isArray(e.players)||e.players.length!==2||!['same','different'].includes(String(e.result))))return false;
        if(e.roleId==='artist'&&(typeof e.question!=='string'||!e.question.trim()||!['yes','no','unknown'].includes(String(e.result))||!e.when.startsWith('D')))return false;
        if(e.roleId==='juggler'){
          if(!e.when.startsWith('N')||Number(e.when.slice(1))<2||typeof e.guessDay!=='string'||!/^D[1-9]\d*$/.test(e.guessDay)||Number(e.when.slice(1))!==Number(e.guessDay.slice(1))+1||!Array.isArray(e.guesses)||e.guesses.length===0||e.guesses.length>5||!Number.isInteger(e.number)||Number(e.number)<0||Number(e.number)>e.guesses.length)return false;
          const seen=new Set<string>(); for(const guess of e.guesses){if(!record(guess)||typeof guess.player!=='string'||!active.has(guess.player)||!role(guess.roleId)||!scriptRoles.has(guess.roleId as keyof typeof ROLES))return false;const k=`${guess.player}:${guess.roleId}`;if(seen.has(k))return false;seen.add(k);}
        }
        if(e.roleId==='sage'&&(!e.when.startsWith('N')||Number(e.when.slice(1))<2||!Array.isArray(e.players)||e.players.length!==2||e.players.some(v=>typeof v!=='string'||!active.has(v))))return false;
        if(['balloonist','bounty_hunter','choirboy','high_priestess'].includes(String(e.roleId))&&(!e.when.startsWith('N')||typeof e.player!=='string'||!active.has(e.player)||(e.roleId==='choirboy'&&Number(e.when.slice(1))<2)))return false;
        if(e.roleId==='knight'&&(!e.when.startsWith('N')||e.when!=='N1'||!Array.isArray(e.players)||e.players.length!==2||new Set(e.players).size!==2))return false;
        if(e.roleId==='noble'&&(!e.when.startsWith('N')||e.when!=='N1'||!Array.isArray(e.players)||e.players.length!==3||new Set(e.players).size!==3))return false;
        if(e.roleId==='grandmother'&&(e.when!=='N1'||typeof e.player!=='string'||!active.has(e.player)||e.player==='self'||!role(e.shownRole)||!scriptRoles.has(e.shownRole as keyof typeof ROLES)))return false;
        if(e.roleId==='godfather'&&(e.when!=='N1'||!Array.isArray(e.shownOutsiders)||new Set(e.shownOutsiders).size!==e.shownOutsiders.length||e.shownOutsiders.some(r=>!role(r)||!scriptRoles.has(r as keyof typeof ROLES)||ROLES[r as keyof typeof ROLES].type!=='outsider')))return false;
        if(e.roleId==='chambermaid'&&(!e.when.startsWith('N')||!Array.isArray(e.players)||e.players.length!==2||new Set(e.players).size!==2||e.players.includes('self')||e.players.some(p=>typeof p!=='string'||!active.has(p))||!Number.isInteger(e.number)||Number(e.number)<0||Number(e.number)>2))return false;
        if(e.roleId==='pixie'&&(e.when!=='N1'||!role(e.shownRole)||ROLES[e.shownRole as keyof typeof ROLES].type!=='townsfolk'))return false;
        if(e.roleId==='king'&&(!e.when.startsWith('N')||!role(e.shownRole)||!scriptRoles.has(e.shownRole as keyof typeof ROLES)))return false;
        if(e.roleId==='general'&&(!e.when.startsWith('N')||!['good','evil','neither'].includes(String(e.result))))return false;
        if(e.roleId==='fisherman'&&(!e.when.startsWith('D')||typeof e.advice!=='string'||!e.advice.trim()))return false;
        if(e.roleId==='steward'&&(e.when!=='N1'||typeof e.player!=='string'||!active.has(e.player)))return false;
        if(e.roleId==='shugenja'&&(e.when!=='N1'||!['clockwise','anticlockwise'].includes(String(e.direction))))return false;
        if(e.roleId==='village_idiot'&&(!e.when.startsWith('N')||typeof e.player!=='string'||!active.has(e.player)||!['good','evil'].includes(String(e.result))))return false;
        if(['undertaker','ravenkeeper'].includes(String(e.roleId))&&(typeof e.player!=='string'||!role(e.shownRole)))return false;
      }
      if(key==='selfActionLog'){
        if(!isBmrRecordedActionRole(e.roleId as keyof typeof BMR_ACTION_SPECS) && !['monk','exorcist','slayer','snake_charmer','philosopher','klutz','acrobat','alchemist','alsaahir','amnesiac','engineer','farmer','huntsman','lycanthrope','nightwatchman','pixie','damsel','preacher','princess'].includes(String(e.roleId)))return false;
        if(isBmrRecordedActionRole(e.roleId as keyof typeof BMR_ACTION_SPECS)){
          const r=e.roleId as keyof typeof BMR_ACTION_SPECS, spec=BMR_ACTION_SPECS[r];
          if(e.kind!=='bmr_action'||!bmrActionCanBeRecorded(r,String(e.when),Number(value.night))||!Array.isArray(e.targets)||e.targets.some(t=>typeof t!=='string'||!active.has(t))||
            e.targets.length<spec.min||e.targets.length>(r==='po'?3:spec.max)||
            (spec.role ? !role(e.chosenRole)||!scriptRoles.has(e.chosenRole as keyof typeof ROLES) : e.chosenRole!==null)||
            !(e.note===null||typeof e.note==='string')||
            (r==='gossip'&&(!e.note||typeof e.note!=='string'||!e.note.trim()))||
            (r==='po'&&![0,1,3].includes(e.targets.length)))return false;
        }
        if(['monk','exorcist','slayer','snake_charmer','klutz','acrobat'].includes(String(e.roleId))&&typeof e.target!=='string')return false;
        if(e.roleId==='snake_charmer'&&(!e.when.startsWith('N')||typeof e.swapped!=='boolean'||!(e.newDemonRole===null||role(e.newDemonRole))||(e.swapped&&(!role(e.newDemonRole)||ROLES[e.newDemonRole as keyof typeof ROLES].type!=='demon'||!scriptRoles.has(e.newDemonRole as keyof typeof ROLES)))||(!e.swapped&&e.newDemonRole!==null)))return false;
        if(e.roleId==='philosopher'&&(!e.when.startsWith('N')||!role(e.gainedRole)||!scriptRoles.has(e.gainedRole as keyof typeof ROLES)||!['townsfolk','outsider'].includes(ROLES[e.gainedRole as keyof typeof ROLES].type)||e.gainedRole==='philosopher'))return false;
        if(e.roleId==='klutz'&&(typeof e.teamLost!=='boolean'||!active.has(String(e.target))))return false;
        if(e.roleId==='acrobat'&&(!e.when.startsWith('N')||Number(e.when.slice(1))<2||typeof e.died!=='boolean'||!active.has(String(e.target))))return false;
        if(e.roleId==='engineer'){
          if(!e.when.startsWith('N')||!['demon','minions'].includes(String(e.kind)))return false;
          if(e.kind==='demon'){
            if(!role(e.demonRole)||!scriptRoles.has(e.demonRole as keyof typeof ROLES)||ROLES[e.demonRole as keyof typeof ROLES].type!=='demon')return false;
          }else{
            if(!Array.isArray(e.minionRoles)||e.minionRoles.length!==setupCounts(Number(value.playerCount)).minion||new Set(e.minionRoles).size!==e.minionRoles.length||e.minionRoles.some(r=>!role(r)||!scriptRoles.has(r as keyof typeof ROLES)||ROLES[r as keyof typeof ROLES].type!=='minion'))return false;
          }
        }
        if(e.roleId==='huntsman'&&(!e.when.startsWith('N')||typeof e.target!=='string'||!active.has(e.target)||e.target==='self'||(e.rescuedRole!==undefined&&e.rescuedRole!==null&&(!role(e.rescuedRole)||!scriptRoles.has(e.rescuedRole as keyof typeof ROLES)||ROLES[e.rescuedRole as keyof typeof ROLES].type!=='townsfolk'))))return false;
        if(e.roleId==='nightwatchman'&&(!e.when.startsWith('N')||typeof e.target!=='string'||!active.has(e.target)))return false;
        if(e.roleId==='preacher'&&(!e.when.startsWith('N')||typeof e.target!=='string'||!active.has(e.target)))return false;
        if(e.roleId==='princess'&&(e.kind!=='first_day_execution'||!e.when.startsWith('D')||typeof e.nominee!=='string'||!active.has(e.nominee)))return false;
        if(e.roleId==='lycanthrope'&&(!e.when.startsWith('N')||Number(e.when.slice(1))<2||typeof e.target!=='string'||!active.has(e.target)||typeof e.killed!=='boolean'))return false;
        if(e.roleId==='pixie'&&(e.kind!=='madness_confirmed'||!e.when.startsWith('N')||Number(e.when.slice(1))<2||!role(e.shownRole)||ROLES[e.shownRole as keyof typeof ROLES].type!=='townsfolk'))return false;
        if(e.roleId==='damsel'&&(e.kind!=='minion_guess'||!e.when.startsWith('D')||!active.has(String(e.minion))||!active.has(String(e.target))||typeof e.won!=='boolean'))return false;
        if(e.roleId==='farmer'&&(e.kind!=='became_farmer'||!e.when.startsWith('N')||Number(e.when.slice(1))<2||typeof e.deceasedFarmer!=='string'||e.deceasedFarmer==='self'||!active.has(e.deceasedFarmer)))return false;
        if(e.roleId==='alchemist'&&(e.kind!=='minion_ability'||e.when!=='N1'||!role(e.minionRole)||!scriptRoles.has(e.minionRole as keyof typeof ROLES)||ROLES[e.minionRole as keyof typeof ROLES].type!=='minion'))return false;
        if(e.roleId==='alsaahir'){
          if(!e.when.startsWith('D')||!Array.isArray(e.minions)||!Array.isArray(e.demons)||e.demons.length===0||typeof e.won!=='boolean')return false;
          const guessedMinions=e.minions as unknown[],guessedDemons=e.demons as unknown[];
          if(guessedMinions.some(v=>typeof v!=='string'||!active.has(v))||guessedDemons.some(v=>typeof v!=='string'||!active.has(v))||new Set(guessedMinions).size!==guessedMinions.length||new Set(guessedDemons).size!==guessedDemons.length||guessedMinions.some(v=>guessedDemons.includes(v)))return false;
        }
        if(e.roleId==='amnesiac'){
          if(e.kind==='tag_answer'){
            if(!e.when.startsWith('D')||typeof e.tag!=='string'||!Object.values(ROLES).some(r=>r.tags.includes(e.tag as never))||typeof e.matches!=='boolean')return false;
          }else if(e.kind==='lock_role'){
            if(!e.when.startsWith('D')||!role(e.chosenRole)||!scriptRoles.has(e.chosenRole as keyof typeof ROLES)||ROLES[e.chosenRole as keyof typeof ROLES].type!=='townsfolk'||e.chosenRole==='amnesiac')return false;
          }else return false;
        }
      }
      if(key==='demonActionLog'&&(!['imp','fang_gu','vigormortis','no_dashii','vortox','lord_of_typhon','kazali','lleech','ojo'].includes(String(e.roleId))||typeof e.target!=='string'||!e.when.startsWith('N')||Number(e.when.slice(1))<2||!(e.note===null||typeof e.note==='string')||(e.roleId==='ojo'&&(!role(e.targetRole)||!scriptRoles.has(e.targetRole as keyof typeof ROLES)))))return false;
      if(key==='minionActionLog'){
        if(!['poisoner','spy','witch','cerenovus','pit_hag','fearmonger','harpy','mezepheles','psychopath'].includes(String(e.roleId)) ||
          !['poison','grimoire','curse','madness','transform','choose','madness_pair','secret_word','public_kill'].includes(String(e.kind)))return false;
        if(e.roleId==='mezepheles'&&(!e.when.startsWith('D')||e.kind!=='secret_word'||typeof e.target!=='string'||!active.has(e.target)||e.target==='self'||typeof e.word!=='string'||!e.word.trim()||typeof e.transformed!=='boolean'))return false;
        if(e.roleId==='psychopath'&&(!e.when.startsWith('D')||e.kind!=='public_kill'||typeof e.target!=='string'||!active.has(e.target)||e.target==='self'||typeof e.killed!=='boolean'))return false;
        if(!['mezepheles','psychopath'].includes(String(e.roleId))&&(!e.when.startsWith('N')||!(e.note===null||typeof e.note==='string')))return false;
        if(e.roleId==='fearmonger'&&(e.kind!=='choose'||typeof e.target!=='string'||!active.has(e.target)))return false;
        if(e.roleId==='harpy'&&(e.kind!=='madness_pair'||typeof e.target!=='string'||typeof e.accuse!=='string'||e.target===e.accuse||!active.has(e.target)||!active.has(e.accuse)))return false;
        if(e.roleId==='poisoner'&&(e.kind!=='poison'||typeof e.target!=='string'))return false;
        if(e.roleId==='spy'&&(e.kind!=='grimoire'||!(e.poisonTarget===null||typeof e.poisonTarget==='string')||(e.poisonTarget!==null&&!active.has(String(e.poisonTarget)))))return false;
        if(e.roleId==='witch'&&(e.kind!=='curse'||typeof e.target!=='string'||!active.has(String(e.target))||!(e.triggered===null||typeof e.triggered==='boolean')))return false;
        if(e.roleId==='cerenovus'&&(e.kind!=='madness'||typeof e.target!=='string'||!active.has(String(e.target))||!role(e.madRole)||!scriptRoles.has(e.madRole as keyof typeof ROLES)||!['townsfolk','outsider'].includes(ROLES[e.madRole as keyof typeof ROLES].type)))return false;
        if(e.roleId==='pit_hag'&&(e.kind!=='transform'||typeof e.target!=='string'||Number(e.when.slice(1))<2||!role(e.newRole)||!scriptRoles.has(e.newRole as keyof typeof ROLES)))return false;
      }
      if(e.structured!==undefined){
        const d=e.structured;if(!record(d)||!['grandmotherRead','chambermaidRead','pairRole','noOutsiders','number','pairYesNo','singleYesNo','dreamer','savantPair','pairAlignment','artistAnswer','juggler','sage','knight','noble','singlePlayer','singleRole','storytellerAdvice','storytellerAssessment','klutzChoice','roleReveal','action','shugenjaDirection','alignmentRead'].includes(String(d.kind)))return false;
        if(['pairRole','pairYesNo','pairAlignment'].includes(String(d.kind))&&(!Array.isArray(d.players)||d.players.length!==2||d.players.some(v=>typeof v!=='string'||!active.has(v))||Array.isArray(d.players)&&new Set(d.players).size!==d.players.length))return false;
        if(['pairRole','roleReveal'].includes(String(d.kind))&&(!role(d.shownRole)||!scriptRoles.has(d.shownRole as keyof typeof ROLES)))return false;
        if(d.kind==='godfatherOutsiders'&&(!Array.isArray(d.roles)||new Set(d.roles).size!==d.roles.length||d.roles.some(r=>!role(r)||!scriptRoles.has(r as keyof typeof ROLES)||ROLES[r as keyof typeof ROLES].type!=='outsider')))return false;
        if(d.kind==='grandmotherRead'&&(!active.has(String(d.player))||!role(d.shownRole)||!scriptRoles.has(d.shownRole as keyof typeof ROLES)))return false;
        if(d.kind==='chambermaidRead'&&(!Array.isArray(d.players)||d.players.length!==2||new Set(d.players).size!==2||d.players.includes(e.sourcePlayerId??e.playerId)||d.players.some(p=>!active.has(String(p)))||!Number.isInteger(d.number)||Number(d.number)<0||Number(d.number)>2))return false;
        if(d.kind==='number'&&!Number.isInteger(d.value))return false;
        if(['pairYesNo','singleYesNo'].includes(String(d.kind))&&!['yes','no'].includes(String(d.result)))return false;
        if(d.kind==='pairAlignment'&&!['same','different'].includes(String(d.result)))return false;
        if(d.kind==='dreamer'&&(typeof d.player!=='string'||!active.has(d.player)||!Array.isArray(d.shownRoles)||d.shownRoles.length!==2||d.shownRoles.some(v=>!role(v)||!scriptRoles.has(v as keyof typeof ROLES))))return false;
        if(d.kind==='savantPair'){if(!Array.isArray(d.statements)||d.statements.length!==2)return false;for(const st of d.statements){if(!record(st)||!['roleInPlay','roleAmong'].includes(String(st.kind))||!role(st.roleId)||!scriptRoles.has(st.roleId as keyof typeof ROLES))return false;if(st.kind==='roleAmong'&&(!Array.isArray(st.players)||st.players.length===0||st.players.some(v=>typeof v!=='string'||!active.has(v))||new Set(st.players).size!==st.players.length))return false;}}
        if(d.kind==='artistAnswer'&&(typeof d.question!=='string'||!d.question.trim()||!['yes','no','unknown'].includes(String(d.result))))return false;
        if(d.kind==='juggler'){if(typeof d.guessDay!=='string'||!/^D[1-9]\d*$/.test(d.guessDay)||!String(e.when).startsWith('N')||Number(String(e.when).slice(1))!==Number(d.guessDay.slice(1))+1||!Array.isArray(d.guesses)||d.guesses.length===0||d.guesses.length>5||!Number.isInteger(d.number)||Number(d.number)<0||Number(d.number)>d.guesses.length)return false;const seen=new Set<string>();for(const guess of d.guesses){if(!record(guess)||typeof guess.player!=='string'||!active.has(guess.player)||!role(guess.roleId)||!scriptRoles.has(guess.roleId as keyof typeof ROLES))return false;const k=`${guess.player}:${guess.roleId}`;if(seen.has(k))return false;seen.add(k);}}
        if(['knight','noble'].includes(String(d.kind))&&(!Array.isArray(d.players)||d.players.length!==(d.kind==='knight'?2:3)||d.players.some(v=>typeof v!=='string'||!active.has(v))||new Set(d.players).size!==d.players.length))return false;
        if(d.kind==='sage'&&(!Array.isArray(d.players)||d.players.length!==2||d.players.some(v=>typeof v!=='string'||!active.has(v))))return false;
        if(d.kind==='singlePlayer'&&(typeof d.player!=='string'||!active.has(d.player)))return false;
        if(d.kind==='shugenjaDirection'&&!['clockwise','anticlockwise'].includes(String(d.direction)))return false;
        if(d.kind==='alignmentRead'&&(typeof d.player!=='string'||!active.has(d.player)||!['good','evil'].includes(String(d.result))))return false;
        if(d.kind==='singleRole'&&(!role(d.shownRole)||!scriptRoles.has(d.shownRole as keyof typeof ROLES)))return false;
        if(d.kind==='storytellerAdvice'&&(typeof d.advice!=='string'||!d.advice.trim()))return false;
        if(d.kind==='storytellerAssessment'&&!['good','evil','neither'].includes(String(d.result)))return false;
        if(d.kind==='klutzChoice'&&(typeof d.target!=='string'||!active.has(d.target)||typeof d.teamLost!=='boolean'))return false;
        if(d.kind==='roleReveal'&&(typeof d.player!=='string'||!active.has(d.player)))return false;
        if(d.kind==='action'&&(typeof d.target!=='string'||!active.has(d.target)))return false;
      }
    }
  }
  const selfActions=value.selfActionLog as Record<string,unknown>[]|undefined;
  if(selfActions){
    if(selfActions.filter(e=>e.roleId==='engineer').length>1||selfActions.filter(e=>e.roleId==='farmer').length>1||selfActions.filter(e=>e.roleId==='huntsman').length>1||selfActions.filter(e=>e.roleId==='nightwatchman').length>1||selfActions.filter(e=>e.roleId==='pixie').length>1||selfActions.filter(e=>e.roleId==='damsel').length>1)return false;
    const lycanTimes=selfActions.filter(e=>e.roleId==='lycanthrope').map(e=>String(e.when));if(new Set(lycanTimes).size!==lycanTimes.length)return false;
    const preachTimes=selfActions.filter(e=>e.roleId==='preacher').map(e=>String(e.when));if(new Set(preachTimes).size!==preachTimes.length)return false;
    if(selfActions.filter(e=>e.roleId==='princess').length>1)return false;
    for(const id of Object.keys(BMR_ACTION_SPECS) as (keyof typeof BMR_ACTION_SPECS)[]){
      const log=selfActions.filter(e=>e.kind==='bmr_action' && e.roleId===id).sort((a,b)=>Number(String(a.when).slice(1))-Number(String(b.when).slice(1)));
      if((BMR_ACTION_SPECS[id].once&&log.length>1)||new Set(log.map(e=>String(e.when))).size!==log.length)return false;
      if(id==='moonchild' && log.some(e=>!Array.isArray(value.deathLog)||!value.deathLog.some(d=>record(d)&&d.playerId==='self'&&validPhase(String(d.when))&&(Number(String(d.when).slice(1))===Number(String(e.when).slice(1))&&(String(d.when).startsWith('N')||d.when===e.when)))))return false;
      if(id==='zombuul' && log.some(e=>Array.isArray(value.deathLog)&&value.deathLog.some(d=>record(d)&&d.when===`D${Number(String(e.when).slice(1))-1}`)))return false;
      if(id==='devils_advocate')for(let i=1;i<log.length;i++)if(Number(String(log[i].when).slice(1))===Number(String(log[i-1].when).slice(1))+1 && (log[i].targets as unknown[])[0]===(log[i-1].targets as unknown[])[0])return false;
      if(id==='po')for(let i=0;i<log.length;i++){
        const prev=log[i-1];const charged=prev && Number(String(log[i].when).slice(1))===Number(String(prev.when).slice(1))+1 && (prev.targets as unknown[]).length===0;
        if(charged ? (log[i].targets as unknown[]).length!==3 : (log[i].targets as unknown[]).length===3)return false;
      }
    }

    for(const a of selfActions.filter(e=>e.roleId==='princess')){
      if(!Array.isArray(value.nominationLog)||!value.nominationLog.some(n=>record(n)&&n.when===a.when&&n.nominator==='self'&&n.nominee===a.nominee))return false;
      if(Array.isArray(value.noExecutionDays)&&value.noExecutionDays.includes(Number(String(a.when).slice(1))))return false;
      if(Array.isArray(value.deathLog)&&value.deathLog.some(d=>record(d)&&d.when===a.when&&(d.reason==='execution'||d.isExecution===true||d.sourceRoleId==='virgin')&&d.playerId!==a.nominee))return false;
    }
    for(const e of selfActions.filter(e=>e.roleId==='farmer')){
      if(!Array.isArray(value.deathLog)||!value.deathLog.some(d=>record(d)&&d.playerId===e.deceasedFarmer&&d.when===e.when&&(d.reason==='night_death'||(role(d.sourceRoleId)&&ROLES[d.sourceRoleId as keyof typeof ROLES].type==='demon'))))return false;
    }
  }
  if(Array.isArray(value.selfInfoLog)){
    for(const roleId of ['grandmother','godfather']){
      if(value.selfInfoLog.filter(e=>record(e)&&e.roleId===roleId).length>1)return false;
    }
    const maidNights=value.selfInfoLog.filter(e=>record(e)&&e.roleId==='chambermaid').map(e=>String(e.when));
    if(new Set(maidNights).size!==maidNights.length)return false;
    const fisherman=value.selfInfoLog.filter(e=>record(e)&&e.roleId==='fisherman');
    if(fisherman.length>1)return false;
    for(const roleId of ['choirboy','king','general','high_priestess','knight','noble','pixie','steward','shugenja','village_idiot']){
      const seen=new Set<string>();
      for(const entry of value.selfInfoLog.filter(e=>record(e)&&e.roleId===roleId)){
        if(seen.has(String(entry.when)))return false;
        seen.add(String(entry.when));
      }
    }
  }
  return true;
}
/**
 * Resume uses the same strict validation as importing a JSON record.
 * A previous auto-save used to produce empty optional role logs even when the role
 * was not on the script; those empty logs are allowed by validateSnapshot.
 * Never delete an unreadable record: the player might still be able to export it.
 */
function readValidSnapshot(key:string):GameSnapshot|null {
  try {
    const raw=localStorage.getItem(key);
    if(raw===null)return null;
    const parsed:unknown=JSON.parse(raw);
    return validateSnapshot(parsed)?parsed:null;
  }catch{return null;}
}
export function loadSnapshot():GameSnapshot|null {
  return readValidSnapshot(SAVE_KEY) ?? readValidSnapshot(SAVE_BACKUP_KEY);
}
export function hasUnreadableSnapshot():boolean {
  try { return localStorage.getItem(SAVE_KEY)!==null && readValidSnapshot(SAVE_KEY)===null; }
  catch { return false; }
}
/** Export the original current save, even when its validation failed. */
export function downloadStoredSnapshot():boolean {
  try {
    const raw=localStorage.getItem(SAVE_KEY) ?? localStorage.getItem(SAVE_BACKUP_KEY);
    if(raw===null)return false;
    const blob=new Blob([raw],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`clocktower-save-recovery-${new Date().toISOString().slice(0,10)}.json`;
    a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    return true;
  }catch{return false;}
}
/** Keep the preceding valid snapshot as a fallback before overwriting the current one. */
export function saveSnapshot(g:GameSnapshot):boolean {
  try {
    const next=JSON.stringify(g),previous=localStorage.getItem(SAVE_KEY);
    if(previous!==null&&previous!==next&&readValidSnapshot(SAVE_KEY)!==null){
      // A full backup can fail from storage quota, but must not block the primary save.
      try {localStorage.setItem(SAVE_BACKUP_KEY,previous);}catch{/* Primary remains authoritative. */}
    }
    localStorage.setItem(SAVE_KEY,next);
    return localStorage.getItem(SAVE_KEY)===next;
  }catch{return false;}
}
export function loadCheckpoints():GameSnapshot[]{try{const v:unknown=JSON.parse(localStorage.getItem(CHECKPOINT_KEY)||'[]');return Array.isArray(v)?v.filter(validateSnapshot):[];}catch{return [];}}
export function downloadSnapshot(g:GameSnapshot):void {
  const blob=new Blob([JSON.stringify(g,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`clocktower-N${g.night}-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function deleteEventGroup(g:GameSnapshot,key:LogKey,id:number):GameSnapshot {
  const all=LOG_KEYS.flatMap(k=>(g[k]??[])as {id:number;sourceEventId?:number}[]);
  let root=id;const seen=new Set<number>();
  while(!seen.has(root)){seen.add(root);const e=all.find(e=>e.id===root);if(e?.sourceEventId===undefined)break;root=e.sourceEventId;}
  const remove=new Set([root]);let changed=true;
  while(changed){changed=false;for(const e of all)if(e.sourceEventId!==undefined&&remove.has(e.sourceEventId)&&!remove.has(e.id)){remove.add(e.id);changed=true;}}
  remove.add(id);
  const next={...g};for(const k of LOG_KEYS)(next[k]as {id:number}[]|undefined)=((g[k]??[])as {id:number}[]).filter(e=>!remove.has(e.id)) as never;
  next.playerStatus=rebuildStatus(next);void key;return next;
}


function validateGameLogEntry(value: unknown): value is GameLogEntry {
  if(!record(value)||value.schemaVersion!==1||typeof value.id!=="string"||!Number.isFinite(value.savedAt))return false;
  if(!["snapshot","finished"].includes(String(value.status))||!["unknown","good","evil","special"].includes(String(value.outcome)))return false;
  if(typeof value.label!=="string"||typeof value.note!=="string"||!validateSnapshot(value.game))return false;
  if(value.reasoning===null)return true;
  const r=value.reasoning;if(!record(r)||!Number.isFinite(r.generatedAt)||!Number.isFinite(r.checked)||!Number.isFinite(r.unique)||!Number.isFinite(r.effectiveWorlds)||typeof r.meta!=="boolean")return false;
  if(!record(r.playerShares)||!record(r.presence)||!Array.isArray(r.topWorlds))return false;
  for(const share of Object.values(r.playerShares)){if(!record(share)||!Number.isFinite(share.evil)||(share.minion!==undefined&&!Number.isFinite(share.minion))||!Number.isFinite(share.demon)||!Number.isFinite(share.drunk))return false;}
  return true;
}

export function loadGameLogs():GameLogEntry[]{
  try{const value:unknown=JSON.parse(localStorage.getItem(GAME_LOG_KEY)||"[]");return Array.isArray(value)?value.filter(validateGameLogEntry).sort((a,b)=>b.savedAt-a.savedAt):[];}catch{return [];}
}
export function saveGameLogs(logs:GameLogEntry[]):boolean {
  try{localStorage.setItem(GAME_LOG_KEY,JSON.stringify([...logs].sort((a,b)=>b.savedAt-a.savedAt).slice(0,MAX_GAME_LOGS)));return true;}catch{return false;}
}
export function createGameLogEntry(g:GameSnapshot,result:SearchResult|null,status:GameLogStatus="snapshot"):GameLogEntry {
  const savedAt=Date.now();
  const reasoning=result?{
    generatedAt:savedAt,checked:result.checked,unique:result.unique,effectiveWorlds:result.effectiveWorlds,meta:result.meta,
    playerShares:Object.fromEntries(Object.entries(result.players).map(([p,s])=>[p,{evil:s.evil,minion:s.minion,demon:s.demon,drunk:s.drunk}])),
    presence:{...result.presence},
    topWorlds:result.worlds.slice(0,8).map(w=>({initial:{...w.initial},current:{...w.current},initialAlignment:{...w.initialAlignment},currentAlignment:{...w.currentAlignment},requiredPoison:{...w.requiredPoison},assumptions:[...w.assumptions],changes:w.changes.map(c=>({...c}))})),
  }:null;
  return {schemaVersion:1,id:`${savedAt.toString(36)}-${Math.random().toString(36).slice(2,8)}`,savedAt,status,outcome:"unknown",label:`${getSnapshotScriptName(g)} ${g.playerCount}人 / N${g.night}`,note:"",game:JSON.parse(JSON.stringify(g)) as GameSnapshot,reasoning};
}
export function updateGameLogEntry(logs:GameLogEntry[],id:string,patch:Partial<Pick<GameLogEntry,"label"|"note"|"outcome"|"status">>):GameLogEntry[]{
  return logs.map(log=>log.id===id?{...log,...patch}:log);
}
export function downloadGameLogEntry(log:GameLogEntry):void {
  const blob=new Blob([JSON.stringify(log,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=`clocktower-log-${new Date(log.savedAt).toISOString().slice(0,10)}-${log.id.slice(-6)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function downloadGameLogs(logs:GameLogEntry[]):void {
  const payload={schemaVersion:1,exportedAt:Date.now(),games:logs};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=`clocktower-game-logs-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
