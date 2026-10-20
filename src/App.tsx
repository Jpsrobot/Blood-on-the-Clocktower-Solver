import {
  useState,
  useMemo,
  useEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import "./App.css";
import { APP_NAME, APP_ICON_URL } from "./branding";
import { DEATH_REASONS, availableDeathReasons } from "./deathReasons";
import { useReasoning } from "./engine/useReasoning";
import { analyzeEvidence } from "./engine/evidence";
import { compareEvents, rebuildStatus, isAliveAt, diedByExecution, bansheeAwakenedAt, seats, seatingOrderAt, setupCounts } from "./engine/game";
import {
  eventId, loadSnapshot, saveSnapshot, loadCheckpoints, hasUnreadableSnapshot, downloadStoredSnapshot, CHECKPOINT_KEY, SAVE_KEY, SAVE_BACKUP_KEY,
  downloadSnapshot, validateSnapshot, deleteEventGroup, type LogKey,
  loadGameLogs, saveGameLogs, createGameLogEntry, updateGameLogEntry,
  downloadGameLogEntry, downloadGameLogs,
} from "./storage";
import { WarningBadges, PlayerSummary, AnalysisPanel, ManualReadForm, NominationCard, AdvicePanel, type AnalysisTab } from "./ui/ReasoningUI";
import { TravellerStrip, AlignmentLikelihoodSheet } from "./ui/TravellerUI";
import { GameLogPanel } from "./ui/GameLogUI";
import { DemonModePanel } from "./ui/DemonModeUI";
import { MinionModePanel } from "./ui/MinionModeUI";
import { ReportedInfoForm } from "./ui/ReportedInfoForm";
import { JinxList } from "./ui/JinxList";
import { L } from "./ui/text";
import {
  ROLES,
  type Role,
  type RoleId,
  type RoleTag,
  type RoleType,
} from "./roles";
import {
  ALL_CORE_ROLE_IDS,
  BUILT_IN_SCRIPTS,
  allScripts,
  createCustomScript,
  getScriptById,
  getSnapshotScriptName,
  getSnapshotScriptRoleIds,
  loadCustomScripts,
  saveCustomScripts,
  type ScriptDefinition,
} from "./scripts";
import { ALL_TRAVELLER_IDS, TRAVELLERS, TRAVELLER_TAG_LABELS, type TravellerRoleId } from "./travellers";
import { estimateTravellerAlignments } from "./engine/travellerAlignment";
import { travellerCanVote, travellerVoteTally, travellerVoteWeight as snapshotTravellerVoteWeight } from "./engine/travellerVotes";
import { apprenticeAbility, bishopActive, deviantsFunnyToday, matronSwapCount, voudonActive } from "./engine/travellerMechanics";

import { isBmrRole, rolePhaseOptions, roleTimingCategories, isBmrRecordedActionRole, BMR_ACTION_SPECS, bmrActionCanBeRecorded, BMR_PASSIVE_EXPLANATIONS } from "./abilityTiming";
import type { Screen, ClaimVisibility, RoleClaimType, ClaimSubjectKind, ClaimableRoleTag, ClaimSubject, RoleClaimEvent, AbilityClaimEvent, PlayerStatus, DeathReasonId, DeathEvent, RevivalEvent, NominationEvent, TalkTopic, TalkEvent, AbilityTriggerEvent, TriggerDraft, SelfRoleState, SelfInfoEvent, SelfActionEvent, DemonState, DemonActionEvent, MinionState, MinionActionEvent, BoomdandyEvent, JinxVictoryEvent, WidowReport, EvilBehaviorReport, PsychopathPublicEvent, OrganGrinderVoteEvent, OutsiderEvent, PlayerPanel, SelfPanel, ManualRead, GameSnapshot, GameLogEntry, GameLogOutcome, SavantStatement, JugglerGuess, TravellerState, TravellerActionEvent, Alignment } from "./types";

const LEFT_PLAYERS = ["7L", "6L", "5L", "4L", "3L", "2L", "1L"];
const RIGHT_PLAYERS = ["7R", "6R", "5R", "4R", "3R", "2R", "1R"];
const ALL_PLAYERS = [...LEFT_PLAYERS, ...RIGHT_PLAYERS];

const CLAIMABLE_ROLE_TAGS: ClaimableRoleTag[] = [
  "FIRST_NIGHT_INFO",
  "CONTINUOUS_INFO",
  "LACK_OF_INFO",
  "WANTS_DEMON_TARGET",
  "HIGH_SURVIVAL_VALUE",
];

const CLAIMABLE_TAG_LABELS: Record<ClaimableRoleTag, string> = {
  FIRST_NIGHT_INFO: "初夜情報",
  CONTINUOUS_INFO: "継続情報",
  LACK_OF_INFO: "情報なし",
  WANTS_DEMON_TARGET: "デーモンに狙われたい",
  HIGH_SURVIVAL_VALUE: "生存価値が高い",
};

const CLAIMABLE_TAG_SYMBOLS: Record<ClaimableRoleTag, string> = {
  FIRST_NIGHT_INFO: "初",
  CONTINUOUS_INFO: "継",
  LACK_OF_INFO: "無",
  WANTS_DEMON_TARGET: "狙",
  HIGH_SURVIVAL_VALUE: "存",
};

const AMNESIAC_SEARCH_TAGS: RoleTag[] = [
  "INFO_SOURCE", "FIRST_NIGHT_INFO", "CONTINUOUS_INFO", "LACK_OF_INFO",
  "WAKES_FIRST_NIGHT", "WAKES_OTHER_NIGHTS", "CONDITIONAL_NIGHT_WAKE",
  "ONE_TIME_ABILITY", "DAY_ABILITY", "PASSIVE", "ON_NIGHT_DEATH", "ON_EXECUTION",
  "ON_NOMINATION", "ON_DEATH", "TARGETS_PLAYER", "TARGETS_CHARACTER",
  "PREVENTS_DEATH", "PREVENTS_EXECUTION_DEATH", "KILLS", "CAUSES_OWN_DEATH",
  "REVIVES", "POISON_DRUNK_ABILITY", "HIGH_SURVIVAL_VALUE", "WANTS_DEMON_TARGET",
  "AVOIDS_DEMON_TARGET", "HIGH_CONFIRMABILITY", "CONDITIONAL_CONFIRMABILITY",
  "ROLE_CHANGING", "ALIGNMENT_CHANGING", "ALTERNATE_WIN_CONDITION",
  "SETUP_EFFECT", "OUTSIDER_COUNT_MODIFIER", "EVIL_TOWNSFOLK_SETUP",
  "DEMON_KILL_TRIGGER", "DOUBLE_NOMINATION_AFTER_DEMON_KILL",
  "DOUBLE_VOTE_AFTER_DEMON_KILL", "GAINS_EXECUTEE_ABILITY",
];

const ROLE_TAG_UI_LABELS: Partial<Record<RoleTag, string>> = {
  INFO_SOURCE: "情報を得る",
  FIRST_NIGHT_INFO: "初夜に情報を得る",
  CONTINUOUS_INFO: "継続して情報を得る",
  NIGHT_INFORMATION: "夜に情報を得る",
  NIGHT_ABILITY: "夜に能力を使う",
  DAY_INFORMATION: "昼に情報を得る",
  LACK_OF_INFO: "情報を直接得ない",
  WAKES_FIRST_NIGHT: "初夜に起きる",
  WAKES_OTHER_NIGHTS: "2夜目以降に起きる",
  CONDITIONAL_NIGHT_WAKE: "条件付きで夜に起きる",
  ONE_TIME_ABILITY: "一度きりの能力",
  DAY_ABILITY: "昼に使う能力",
  PASSIVE: "常時能力",
  ON_NIGHT_DEATH: "夜死亡で発動",
  ON_EXECUTION: "処刑で発動",
  ON_NOMINATION: "指名で発動",
  ON_DEATH: "死亡で発動",
  TARGETS_PLAYER: "プレイヤーを選ぶ",
  TARGETS_CHARACTER: "役職を選ぶ",
  PREVENTS_DEATH: "死亡を防ぐ",
  PREVENTS_EXECUTION_DEATH: "処刑死を防ぐ",
  KILLS: "死亡させる",
  CAUSES_OWN_DEATH: "自分が死亡しうる",
  REVIVES: "復活させる",
  POISON_DRUNK_ABILITY: "酔い・毒に関係する",
  HIGH_SURVIVAL_VALUE: "生存価値が高い",
  WANTS_DEMON_TARGET: "デーモンに狙われたい",
  AVOIDS_DEMON_TARGET: "デーモンに狙われたくない",
  HIGH_CONFIRMABILITY: "強く確認されやすい",
  CONDITIONAL_CONFIRMABILITY: "条件付きで確認されやすい",
  ROLE_CHANGING: "役職を変える",
  ALIGNMENT_CHANGING: "陣営を変える",
  ALTERNATE_WIN_CONDITION: "特殊勝利条件がある",
  SETUP_EFFECT: "初期構成を変える",
  OUTSIDER_COUNT_MODIFIER: "アウトサイダー数を変える",
  EVIL_TOWNSFOLK_SETUP: "町人を悪陣営にする",
  DEMON_KILL_TRIGGER: "デーモンによる死亡で発動",
  DOUBLE_NOMINATION_AFTER_DEMON_KILL: "発動後は1日2回指名できる",
  DOUBLE_VOTE_AFTER_DEMON_KILL: "発動後は1回の投票で2票になる",
  GAINS_EXECUTEE_ABILITY: "処刑死した人の能力を得る",
};

const TALK_TOPIC_LABELS: Record<TalkTopic, string> = {
  role_claim: "役職",
  ability_claim: "能力",
  info: "情報",
  strategy: "作戦",
  other: "その他",
};

const STRUCTURED_INFO_ROLES: RoleId[] = [
  "grandmother", "chambermaid",
  "washerwoman",
  "librarian",
  "investigator",
  "chef",
  "empath",
  "fortune_teller",
  "undertaker",
  "ravenkeeper",
  "clockmaker",
  "dreamer",
  "mathematician",
  "flowergirl",
  "town_crier",
  "oracle",
  "savant",
  "seamstress",
  "artist",
  "juggler",
  "sage",
  "klutz",
  "balloonist",
  "bounty_hunter",
  "choirboy", "king", "fisherman", "general", "high_priestess", "knight", "noble", "pixie",
];

function isStructuredInfoRole(roleId: RoleId | null | undefined): roleId is RoleId {
  return !!roleId && STRUCTURED_INFO_ROLES.includes(roleId);
}

function makeEmptyNames(): Record<string, string> {
  return Object.fromEntries(ALL_PLAYERS.map((player) => [player, ""])) as Record<
    string,
    string
  >;
}

function makeInitialStatus(): Record<string, PlayerStatus> {
  return Object.fromEntries(
    ["self", ...ALL_PLAYERS].map((player) => [
      player,
      { alive: true, deadVoteAvailable: true },
    ])
  ) as Record<string, PlayerStatus>;
}

function makeEmptyDemonState(): DemonState {
  return { knownMinions: [], storytellerBluffs: [], knownKing: null, bluffPlans: {} };
}

function makeEmptyMinionState(): MinionState {
  return {
    knownDemon: null,
    knownMinions: [],
    demonCandidates: [],
    sharedStorytellerBluffs: [],
    bluffPlans: {},
    spyInitialRoles: {},
    spyRedHerring: null,
    becameDemonAt: null,
    evilTwin: null,
  };
}

function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [playerCount, setPlayerCount] = useState(15);
  const [playset, setPlayset] = useState("trouble_brewing");
  const [night, setNight] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [endGameOpen, setEndGameOpen] = useState(false);
  const [exileTravellerOpen, setExileTravellerOpen] = useState(false);
  const [customScripts, setCustomScripts] = useState<ScriptDefinition[]>(loadCustomScripts);
  const [scriptManagerOpen, setScriptManagerOpen] = useState(false);
  const [scriptEditorOpen, setScriptEditorOpen] = useState(false);
  const [scriptEditorId, setScriptEditorId] = useState<string | null>(null);
  const [scriptEditorReadOnly, setScriptEditorReadOnly] = useState(false);
  const [scriptEditorRoles, setScriptEditorRoles] = useState<RoleId[]>([]);
  const [gameScriptName, setGameScriptName] = useState(BUILT_IN_SCRIPTS[0].name);
  const [gameScriptRoleIds, setGameScriptRoleIds] = useState<RoleId[]>([...BUILT_IN_SCRIPTS[0].roleIds]);

  // Player menu / identity
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [playerPanel, setPlayerPanel] = useState<PlayerPanel>("menu");
  const [playerNames, setPlayerNames] = useState<Record<string, string>>(
    makeEmptyNames
  );
  const [pendingPlayerName, setPendingPlayerName] = useState("");

  // Role claims, including broad tag/category claims
  const [roleClaimLog, setRoleClaimLog] = useState<RoleClaimEvent[]>([]);
  const [claimSubjectKind, setClaimSubjectKind] =
    useState<ClaimSubjectKind>("role");
  const [pendingClaimRole, setPendingClaimRole] = useState<RoleId | null>(null);
  const [pendingClaimTag, setPendingClaimTag] =
    useState<ClaimableRoleTag | null>(null);
  const [roleClaimType, setRoleClaimType] =
    useState<RoleClaimType>("normal");
  const [claimVisibility, setClaimVisibility] =
    useState<ClaimVisibility>("public");
  const [claimRecipients, setClaimRecipients] = useState<string[]>([]);
  const [claimWhen, setClaimWhen] = useState("D1");

  // Ability claims are social statements, not mechanical triggers.
  const [abilityClaimLog, setAbilityClaimLog] = useState<AbilityClaimEvent[]>([]);
  const [abilityClaimRole, setAbilityClaimRole] = useState<RoleId | null>(null);
  const [abilityClaimWhen, setAbilityClaimWhen] = useState("D1");
  const [abilityClaimTargets, setAbilityClaimTargets] = useState<string[]>([]);
  const [abilityClaimResult, setAbilityClaimResult] = useState("");
  const [abilityClaimVisibility, setAbilityClaimVisibility] =
    useState<ClaimVisibility>("public");
  const [abilityClaimRecipients, setAbilityClaimRecipients] = useState<string[]>(
    []
  );

  // Status / death
  const [playerStatus, setPlayerStatus] = useState<Record<string, PlayerStatus>>(
    makeInitialStatus
  );
  const [deathLog, setDeathLog] = useState<DeathEvent[]>([]);
  const [revivalLog, setRevivalLog] = useState<RevivalEvent[]>([]);
  const [pendingDeathReason, setPendingDeathReason] =
    useState<DeathReasonId>("night_death");
  const [deathWhen, setDeathWhen] = useState("N1");
  const [pendingMutantExecution, setPendingMutantExecution] = useState(false);

  // Nominations / votes
  const [nominationLog, setNominationLog] = useState<NominationEvent[]>([]);
  const [pendingNominee, setPendingNominee] = useState<string | null>(null);
  const [pendingVoters, setPendingVoters] = useState<string[]>([]);
  const [nominationWhen, setNominationWhen] = useState("D1");
  const [nominationExecutedSurvived, setNominationExecutedSurvived] = useState(false);

  // Mechanical ability trigger events: currently Virgin + Slayer.
  const [abilityTriggerLog, setAbilityTriggerLog] = useState<
    AbilityTriggerEvent[]
  >([]);
  const [triggerDraft, setTriggerDraft] = useState<TriggerDraft | null>(null);

  // Conversation graph
  const [talkLog, setTalkLog] = useState<TalkEvent[]>([]);
  const [talkParticipants, setTalkParticipants] = useState<string[]>([]);
  const [talkWhen, setTalkWhen] = useState("D1");
  const [talkTopic, setTalkTopic] = useState<TalkTopic | null>(null);
  const [talkDetails, setTalkDetails] = useState("");

  // Self role / information / actions. Townsfolk first.
  const [selfMenuOpen, setSelfMenuOpen] = useState(false);
  const [selfPanel, setSelfPanel] = useState<SelfPanel>("menu");
  const [selfRole, setSelfRole] = useState<SelfRoleState>({ shownRole: null });
  const [pendingSelfRole, setPendingSelfRole] = useState<RoleId | null>(null);
  const [selfInfoLog, setSelfInfoLog] = useState<SelfInfoEvent[]>([]);
  const [selfInfoWhen, setSelfInfoWhen] = useState("N1");
  const [selfInfoPlayers, setSelfInfoPlayers] = useState<string[]>([]);
  const [selfInfoShownRole, setSelfInfoShownRole] =
    useState<RoleId | null>(null);
  const [selfInfoShownRole2, setSelfInfoShownRole2] =
    useState<RoleId | null>(null);
  const [selfInfoNumber, setSelfInfoNumber] = useState<number | null>(null);
  const [selfInfoYesNo, setSelfInfoYesNo] = useState<"yes" | "no" | null>(null);
  const [selfGeneralResult, setSelfGeneralResult] = useState<"good" | "evil" | "neither" | null>(null);
  const [selfShugenjaDirection, setSelfShugenjaDirection] = useState<"clockwise" | "anticlockwise" | null>(null);
  const [selfVillageResult, setSelfVillageResult] = useState<"good" | "evil" | null>(null);
  const [selfFisherAdvice, setSelfFisherAdvice] = useState("");
  const [selfSavantKind1, setSelfSavantKind1] = useState<"roleInPlay" | "roleAmong">("roleInPlay");
  const [selfSavantKind2, setSelfSavantKind2] = useState<"roleInPlay" | "roleAmong">("roleInPlay");
  const [selfSavantRole1, setSelfSavantRole1] = useState<RoleId | null>(null);
  const [selfSavantRole2, setSelfSavantRole2] = useState<RoleId | null>(null);
  const [selfSavantPlayers1, setSelfSavantPlayers1] = useState<string[]>([]);
  const [selfSavantPlayers2, setSelfSavantPlayers2] = useState<string[]>([]);
  const [selfArtistQuestion, setSelfArtistQuestion] = useState("");
  const [selfArtistResult, setSelfArtistResult] = useState<"yes" | "no" | "unknown" | null>(null);
  const [selfJugglerGuessDay, setSelfJugglerGuessDay] = useState("D1");
  const [selfJugglerGuesses, setSelfJugglerGuesses] = useState<JugglerGuess[]>([]);
  const [selfJugglerDraftPlayer, setSelfJugglerDraftPlayer] = useState<string | null>(null);
  const [selfJugglerDraftRole, setSelfJugglerDraftRole] = useState<RoleId | null>(null);
  const [librarianNoOutsiders, setLibrarianNoOutsiders] = useState(false);
  const [selfActionLog, setSelfActionLog] = useState<SelfActionEvent[]>([]);
  const [selfGodfatherRoles,setSelfGodfatherRoles] = useState<RoleId[]>([]);
  const [selfPhilosopherRole, setSelfPhilosopherRole] = useState<RoleId | null>(null);
  const [selfKlutzTeamLost, setSelfKlutzTeamLost] = useState<boolean | null>(null);
  const [selfActionTarget, setSelfActionTarget] = useState<string | null>(null);
  const [bmrActionTargets,setBmrActionTargets] = useState<string[]>([]);
  const [bmrActionRole,setBmrActionRole] = useState<RoleId|null>(null);
  const [bmrActionNote,setBmrActionNote] = useState('');
  const [selfActionWhen, setSelfActionWhen] = useState("N2");
  const [selfEngineerMode, setSelfEngineerMode] = useState<"demon" | "minions">("demon");
  const [selfEngineerDemon, setSelfEngineerDemon] = useState<RoleId | null>(null);
  const [selfEngineerMinions, setSelfEngineerMinions] = useState<RoleId[]>([]);
  const [selfFarmerDeceased, setSelfFarmerDeceased] = useState<string | null>(null);
  const [selfHuntsmanRole, setSelfHuntsmanRole] = useState<RoleId | null>(null);
  const [selfLycanKilled, setSelfLycanKilled] = useState(false);
  const [selfDamselMinion, setSelfDamselMinion] = useState<string | null>(null);
  const [selfDamselWon, setSelfDamselWon] = useState(false);
  const [selfSlayerKilled, setSelfSlayerKilled] = useState(false);
  const [selfSnakeSwapped, setSelfSnakeSwapped] = useState(false);
  const [selfSnakeDemonRole, setSelfSnakeDemonRole] = useState<RoleId | null>(null);
  const [selfAcrobatDied, setSelfAcrobatDied] = useState(false);
  const [selfAlchemistRole, setSelfAlchemistRole] = useState<RoleId | null>(null);
  const [selfAlsaahirMinions, setSelfAlsaahirMinions] = useState<string[]>([]);
  const [selfAlsaahirDemons, setSelfAlsaahirDemons] = useState<string[]>([]);
  const [selfAlsaahirWon, setSelfAlsaahirWon] = useState(false);
  const [demonState, setDemonState] = useState<DemonState>(makeEmptyDemonState);
  const [demonActionLog, setDemonActionLog] = useState<DemonActionEvent[]>([]);
  const [minionState, setMinionState] = useState<MinionState>(makeEmptyMinionState);
  const [minionActionLog, setMinionActionLog] = useState<MinionActionEvent[]>([]);
  const [travellers, setTravellers] = useState<TravellerState[]>([]);
  const [travellerActionLog, setTravellerActionLog] = useState<TravellerActionEvent[]>([]);
  const [travellerPanelId, setTravellerPanelId] = useState<string | null>(null);
  const [alignmentOpen, setAlignmentOpen] = useState(false);
  const [newTravellerRole, setNewTravellerRole] = useState<TravellerRoleId>("bureaucrat");
  const [newTravellerName, setNewTravellerName] = useState("");
  const [travellerTarget, setTravellerTarget] = useState<string | null>(null);
  const [travellerTarget2, setTravellerTarget2] = useState<string | null>(null);
  const [travellerRoleChoice, setTravellerRoleChoice] = useState<RoleId | null>(null);
  const [travellerEffectChoice, setTravellerEffectChoice] = useState<"sober_healthy" | "acts_twice" | null>(null);
  const [travellerJudgeResult, setTravellerJudgeResult] = useState<"pass" | "fail" | null>(null);
  const [travellerNominationChoice, setTravellerNominationChoice] = useState<number | null>(null);
  const [travellerHarlotAgreed, setTravellerHarlotAgreed] = useState<boolean | null>(null);
  const [travellerHarlotBothDied, setTravellerHarlotBothDied] = useState(false);
  const [travellerKillSucceeded, setTravellerKillSucceeded] = useState(true);
  const [travellerKnownAlignment, setTravellerKnownAlignment] = useState<Alignment | "unknown">("unknown");
  const [beggarLearnedAlignment, setBeggarLearnedAlignment] = useState<Alignment | "unknown">("unknown");

  const [manualReads, setManualReads] = useState<Record<string, ManualRead>>({});
  const [completedNights, setCompletedNights] = useState<number[]>([]);
  const [noExecutionDays, setNoExecutionDays] = useState<number[]>([]);
  const [leviathanConfirmed, setLeviathanConfirmed] = useState(false);
  const [alHadikhiaConfirmed, setAlHadikhiaConfirmed] = useState(false);
  const [riotConfirmed, setRiotConfirmed] = useState(false);
  const [fearmongerActive,setFearmongerActive]=useState(false);
  const [boomdandyLog,setBoomdandyLog]=useState<BoomdandyEvent[]>([]);
  const [jinxVictoryLog,setJinxVictoryLog]=useState<JinxVictoryEvent[]>([]);
  const [widowReports,setWidowReports]=useState<WidowReport[]>([]);
  const [evilBehaviorReports,setEvilBehaviorReports]=useState<EvilBehaviorReport[]>([]);
  const [psychopathEvents,setPsychopathEvents]=useState<PsychopathPublicEvent[]>([]);
  const [organGrinderVotes,setOrganGrinderVotes]=useState<OrganGrinderVoteEvent[]>([]);
  const [outsiderEvents,setOutsiderEvents]=useState<OutsiderEvent[]>([]);
  const riotAnalysisOpened = useRef(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisPlayer, setAnalysisPlayer] = useState<string | null>(null);
  const [analysisInitialTab, setAnalysisInitialTab] = useState<AnalysisTab>("overview");
  const [gameLogOpen, setGameLogOpen] = useState(false);
  const [gameLogs, setGameLogs] = useState<GameLogEntry[]>(loadGameLogs);
  const [pendingType, setPendingType] = useState<RoleType>("townsfolk");
  const [pendingAlignment, setPendingAlignment] = useState<"good" | "evil">("good");
  const [nominationReason, setNominationReason] = useState("");
  const [virginResult, setVirginResult] = useState<boolean | null>(null);
  const [savedGame, setSavedGame] = useState<GameSnapshot | null>(loadSnapshot);
  const [saveFailed, setSaveFailed] = useState(false);
  const activeGameRef=useRef(false);
  const latestSnapshotRef=useRef<GameSnapshot|null>(null);
  const [checkpoints, setCheckpoints] = useState<GameSnapshot[]>(loadCheckpoints);
  const importRef = useRef<HTMLInputElement>(null);
  const snapshot = useMemo<GameSnapshot>(() => ({
    schemaVersion: 2, playerCount, playset, scriptName: gameScriptName, scriptRoleIds: gameScriptRoleIds, night, playerNames, playerStatus,
    roleClaimLog, abilityClaimLog, deathLog, revivalLog, nominationLog, travellers, travellerActionLog, abilityTriggerLog,
    talkLog, selfRole, selfInfoLog, selfActionLog, demonState, demonActionLog,
    minionState, minionActionLog, manualReads,
    completedNights, noExecutionDays, leviathanConfirmed, alHadikhiaConfirmed, riotConfirmed, fearmongerActive, boomdandyLog, jinxVictoryLog, widowReports, evilBehaviorReports, psychopathEvents, organGrinderVotes, outsiderEvents,
  }), [playerCount, playset, gameScriptName, gameScriptRoleIds, night, playerNames, playerStatus, roleClaimLog,
    abilityClaimLog, deathLog, revivalLog, nominationLog, travellers, travellerActionLog, abilityTriggerLog, talkLog,
    selfRole, selfInfoLog, selfActionLog, demonState, demonActionLog,
    minionState, minionActionLog, manualReads, completedNights, noExecutionDays, leviathanConfirmed, alHadikhiaConfirmed, riotConfirmed, fearmongerActive, boomdandyLog, jinxVictoryLog, widowReports, evilBehaviorReports, psychopathEvents, organGrinderVotes, outsiderEvents]);
  // Keep lifecycle callbacks pointing at the last rendered active game.
  latestSnapshotRef.current=snapshot;
  activeGameRef.current=screen === "game";
  const reasoning = useReasoning(snapshot, screen === "game");
  const analysis = useMemo(() => analyzeEvidence(snapshot, reasoning.result), [snapshot, reasoning.result]);
  const travellerEstimates = useMemo(() => estimateTravellerAlignments(snapshot, reasoning.result), [snapshot, reasoning.result]);
  // On reaching Riot Day 3, automatically open the special accusation view once.
  useEffect(() => {
    if(screen!=="game" || night<3 || !(riotConfirmed || selfRole.shownRole==="riot")){
      if(night<3 || !riotConfirmed)riotAnalysisOpened.current=false;
      return;
    }
    if(riotAnalysisOpened.current)return;
    riotAnalysisOpened.current=true;
    if(!analysisOpen){setAnalysisPlayer(null);setAnalysisInitialTab("overview");setAnalysisOpen(true);}
  },[screen,night,riotConfirmed,selfRole.shownRole,analysisOpen]);
  useEffect(() => {
    if (screen !== "game") return;
    // localStorage writes are synchronous. Do not debounce: Android may suspend the
    // WebView before a pending timer fires, leaving the next launch with no game.
    const saved=saveSnapshot(snapshot);
    setSaveFailed(!saved || !validateSnapshot(snapshot));
    if(saved)setSavedGame(snapshot);
  }, [snapshot, screen]);
  useEffect(() => {
    const flushActiveGame=() => {
      if(!activeGameRef.current || !latestSnapshotRef.current)return;
      saveSnapshot(latestSnapshotRef.current);
    };
    const onVisibilityChange=() => {
      if(document.visibilityState==='hidden')flushActiveGame();
    };
    document.addEventListener('visibilitychange',onVisibilityChange);
    window.addEventListener('pagehide',flushActiveGame);
    return () => {
      document.removeEventListener('visibilitychange',onVisibilityChange);
      window.removeEventListener('pagehide',flushActiveGame);
    };
  }, []);
  useEffect(() => {
    try { localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(checkpoints)); }
    catch { setSaveFailed(true); }
  }, [checkpoints]);

  function applySnapshot(g: GameSnapshot) {
    setPlayerCount(g.playerCount); setPlayset(g.playset); setGameScriptName(getSnapshotScriptName(g)); setGameScriptRoleIds([...getSnapshotScriptRoleIds(g)]); setNight(g.night);
    setPlayerNames({...makeEmptyNames(), ...g.playerNames});
    setPlayerStatus({...makeInitialStatus(), ...rebuildStatus(g)});
    setRoleClaimLog(g.roleClaimLog); setAbilityClaimLog(g.abilityClaimLog);
    setDeathLog(g.deathLog); setRevivalLog(g.revivalLog ?? []); setNominationLog(g.nominationLog);
    setTravellers(g.travellers ?? []); setTravellerActionLog(g.travellerActionLog ?? []);
    setAbilityTriggerLog(g.abilityTriggerLog); setTalkLog(g.talkLog);
    setSelfRole(g.selfRole); setSelfInfoLog(g.selfInfoLog); setSelfActionLog(g.selfActionLog);
    setDemonState(g.demonState ?? makeEmptyDemonState()); setDemonActionLog(g.demonActionLog ?? []);
    setMinionState(g.minionState ?? makeEmptyMinionState()); setMinionActionLog(g.minionActionLog ?? []);
    setManualReads(g.manualReads); setCompletedNights(g.completedNights);
    setNoExecutionDays(g.noExecutionDays);
    setLeviathanConfirmed(g.leviathanConfirmed===true);
    setAlHadikhiaConfirmed(g.alHadikhiaConfirmed===true);
    setRiotConfirmed(g.riotConfirmed===true);
    setFearmongerActive(g.fearmongerActive===true);
    setBoomdandyLog(g.boomdandyLog??[]);
    setJinxVictoryLog(g.jinxVictoryLog??[]);
    setWidowReports(g.widowReports??[]);
    setEvilBehaviorReports(g.evilBehaviorReports??[]);
    setPsychopathEvents(g.psychopathEvents??[]);
    setOrganGrinderVotes(g.organGrinderVotes??[]);
    setOutsiderEvents(g.outsiderEvents??[]);
    riotAnalysisOpened.current=false;
  }

  function openAnalysis(player: string | null = null, initialTab: AnalysisTab = "overview") {
    setAnalysisPlayer(player);
    setAnalysisInitialTab(initialTab);
    setAnalysisOpen(true);
  }

  function persistGameLogs(next: GameLogEntry[]) {
    const sorted = [...next].sort((a, b) => b.savedAt - a.savedAt).slice(0, 40);
    const ok = saveGameLogs(sorted);
    if (!ok) setSaveFailed(true);
    setGameLogs(sorted);
    return ok;
  }

  function archiveCurrentGame(status: "snapshot" | "finished", outcome: GameLogOutcome = "unknown") {
    const entry = { ...createGameLogEntry(snapshot, reasoning.result, status), outcome };
    const ok = persistGameLogs([entry, ...gameLogs]);
    if (ok && status === "snapshot") window.alert("現在のゲームをログに保存しました。");
    return ok;
  }

  function updateArchivedGame(id: string, patch: Partial<Pick<GameLogEntry, "label" | "note" | "outcome" | "status">>) {
    persistGameLogs(updateGameLogEntry(gameLogs, id, patch));
  }

  function deleteArchivedGame(id: string) {
    persistGameLogs(gameLogs.filter(log => log.id !== id));
  }

  function loadArchivedGame(log: GameLogEntry, openWorlds: boolean) {
    if (screen === "game" && !window.confirm("現在のゲームをログの内容で置き換えますか？")) return;
    applySnapshot(log.game);
    setCheckpoints([]);
    setSavedGame(log.game);
    saveSnapshot(log.game);
    setMenuOpen(false);
    setExileTravellerOpen(false);
    setGameLogOpen(false);
    setSelectedPlayer(null);
    setSelfMenuOpen(false);
    setScreen("game");
    if (openWorlds) openAnalysis(null, "worlds");
  }

  function deleteHistory(key: LogKey, id: number) {
    applySnapshot(deleteEventGroup(snapshot, key, id));
  }

  function confirmDeleteHistory(key: LogKey, id: number, label = "この記録") {
    if (!window.confirm(`${label}を削除しますか？\n連動して作られた記録も一緒に削除されます。`)) return;
    deleteHistory(key, id);
  }

  function setCompleteness(n: number, kind: "night" | "day", value: boolean) {
    if (kind === "day" && value && deathLog.some(d => d.when === `D${n}` && diedByExecution(d))) {
      window.alert("\u3053\u306e\u65e5\u306e\u51e6\u5211\u304c\u8a18\u9332\u3055\u308c\u3066\u3044\u307e\u3059\u3002"); return;
    }
    const setter = kind === "night" ? setCompletedNights : setNoExecutionDays;
    setter(current => value ? [...new Set([...current,n])] : current.filter(k => k !== n));
  }

  async function importGame(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 3000000) throw new Error("ファイルが大きすぎます");
      const parsed: unknown = JSON.parse(await file.text());
      if (!validateSnapshot(parsed)) throw new Error("ゲーム記録の形式が正しくありません");
      if (screen === "game" && !window.confirm("\u73fe\u5728\u306e\u8a18\u9332\u3092\u8aad\u307f\u8fbc\u3093\u3060\u30b2\u30fc\u30e0\u3067\u7f6e\u304d\u63db\u3048\u307e\u3059\u304b\uff1f")) return;
      applySnapshot(parsed); setCheckpoints([]); setMenuOpen(false); setSelectedPlayer(null);
      setSelfMenuOpen(false); setSavedGame(parsed); setScreen("game");
    } catch { window.alert("\u8aad\u307f\u8fbc\u3081\u307e\u305b\u3093\u3002\u3053\u306e\u30d0\u30fc\u30b8\u30e7\u30f3\u306eJSON\u30b2\u30fc\u30e0\u8a18\u9332\u3092\u9078\u3093\u3067\u304f\u3060\u3055\u3044\u3002"); }
    if (importRef.current) importRef.current.value = "";
  }

  function saveReportedInfo(event: AbilityClaimEvent) {
    setAbilityClaimLog(xs => [...xs,event]);
    if ((!event.sourcePlayerId || event.sourcePlayerId === event.playerId) && !hasExactRoleClaim(event.playerId)) {
      setRoleClaimLog(xs => [...xs, {
        id: event.id+1, sourceEventId: event.id, playerId: event.playerId,
        subject:{kind:"role",roleId:event.roleId}, claimType:"normal",origin:"ability_claim",
        when:event.reportedWhen ?? event.when, visibility:event.visibility,recipients:event.recipients,
      }]);
    }
    returnFromPlayerPanel();
  }

  function needsVirginCheck(target: string | null, when: string) {
    if (!target) return false;
    const claimed = target === "self" ? selfRole.shownRole : getLatestExactRoleClaim(target);
    return claimed === "virgin" && !nominationLog.some(n => n.nominee === target && compareEvents(n,{when,id:Infinity}) < 0);
  }

  const otherPlayerCount = playerCount - 1;
  const activeLeftCount = Math.ceil(otherPlayerCount / 2);
  const activeRightCount = Math.floor(otherPlayerCount / 2);

  const currentScriptRoleIds = gameScriptRoleIds;
  const currentScriptRoles = currentScriptRoleIds.map((roleId) => ROLES[roleId]).filter(Boolean);
  const currentScriptHasReviver = currentScriptRoles.some((role) => role.tags.includes("REVIVES"));

  const activeClaimableTags = CLAIMABLE_ROLE_TAGS.filter((tag) =>
    currentScriptRoles.some((role) => role.tags.includes(tag))
  );

  function isPlayerActive(player: string) {
    const seatNumber = Number.parseInt(player, 10);

    if (player.endsWith("L")) {
      return seatNumber <= activeLeftCount;
    }

    return seatNumber <= activeRightCount;
  }

  function getActivePlayers() {
    return ALL_PLAYERS.filter((player) => isPlayerActive(player));
  }

  function getPhaseOptions() {
    const options: string[] = [];

    for (let i = 1; i <= night; i += 1) {
      options.push(`N${i}`);
      options.push(`D${i}`);
    }

    return options;
  }

  function getDayOptions() {
    return getPhaseOptions().filter((phase) => phase.startsWith("D"));
  }

  function getNightOptions(startAt = 1) {
    return getPhaseOptions().filter((phase) => {
      if (!phase.startsWith("N")) {
        return false;
      }

      return Number.parseInt(phase.slice(1), 10) >= startAt;
    });
  }

  function togglePlayerInList(
    player: string,
    setList: Dispatch<SetStateAction<string[]>>
  ) {
    setList((current) =>
      current.includes(player)
        ? current.filter((item) => item !== player)
        : [...current, player]
    );
  }

  function toggleLimitedSelfInfoPlayer(player: string, max: number) {
    setSelfInfoPlayers((current) => {
      if (current.includes(player)) {
        return current.filter((item) => item !== player);
      }

      if (current.length >= max) {
        return current;
      }

      return [...current, player];
    });
  }

  function toggleSelfSavantPlayer(statement: 1 | 2, player: string) {
    const setPlayers = statement === 1 ? setSelfSavantPlayers1 : setSelfSavantPlayers2;
    setPlayers((current) =>
      current.includes(player)
        ? current.filter((item) => item !== player)
        : [...current, player]
    );
  }

  function getPlayerDisplayName(player: string) {
    if (player === "self") {
      return "自分";
    }
    if (player === "storyteller") return "語り手";

    const traveller = travellers.find((item) => item.id === player);
    if (traveller) {
      const role = TRAVELLERS[traveller.roleId];
      return traveller.name ? `${traveller.name}（${role.name}）` : role.name;
    }

    const name = playerNames[player];
    return name ? `${name} (${player})` : player;
  }

  function getActiveTravellers() {
    return travellers.filter((traveller) => traveller.active);
  }

  function getActiveParticipantIds() {
    return ["self", ...getActivePlayers(), ...getActiveTravellers().map((traveller) => traveller.id)];
  }

  function getVotingTravellers() {
    return travellers.filter((traveller) => traveller.active || traveller.exiled === true);
  }

  function getTraveller(id: string) {
    return travellers.find((traveller) => traveller.id === id) ?? null;
  }

  function updateTraveller(id: string, patch: Partial<TravellerState>) {
    setTravellers((current) => current.map((traveller) => traveller.id === id ? { ...traveller, ...patch } : traveller));
  }

  function addTraveller() {
    if (travellers.some((traveller) => traveller.active && traveller.roleId === newTravellerRole)) {
      window.alert("同じ旅人役職がすでに参加中です。");
      return;
    }
    const id = `traveller-${eventId()}`;
    const next: TravellerState = {
      id,
      name: newTravellerName.trim(),
      roleId: newTravellerRole,
      joinedWhen: `D${night}`,
      active: true,
      exiled: false,
      alive: true,
      deadVoteAvailable: true,
      knownAlignment: "unknown",
      voteTokens: 0,
    };
    setTravellers((current) => [...current, next]);
    setNewTravellerName("");
  }

  function openTravellerPanel(id: string) {
    const traveller = getTraveller(id);
    if (!traveller) return;
    setTravellerPanelId(id);
    const currentVoteTarget = travellerActionLog
      .filter((event): event is Extract<TravellerActionEvent, { kind: "vote_modifier" }> => event.kind === "vote_modifier")
      .find((event) => event.travellerId === id && event.when === `N${night}`)?.target ?? null;
    const cackleProtect = travellerActionLog.find((event): event is Extract<TravellerActionEvent, { kind: "cacklejack_protect" }> => event.kind === "cacklejack_protect" && event.travellerId === id && event.when === `D${night}`);
    const cackleChange = travellerActionLog.find((event): event is Extract<TravellerActionEvent, { kind: "cacklejack_change" }> => event.kind === "cacklejack_change" && event.travellerId === id && event.when === `N${night}`);
    const gnomeFriend = travellerActionLog.find((event): event is Extract<TravellerActionEvent, { kind: "gnome_friend" }> => event.kind === "gnome_friend" && event.travellerId === id);
    setTravellerTarget(traveller.roleId === "cacklejack" ? (cackleProtect?.target ?? null) : traveller.roleId === "gnome" ? (gnomeFriend?.friend ?? null) : currentVoteTarget);
    setTravellerTarget2(traveller.roleId === "cacklejack" ? (cackleChange?.target ?? null) : null);
    setTravellerRoleChoice(traveller.roleId === "cacklejack" ? (cackleChange?.newRole ?? null) : apprenticeAbility(snapshot, id));
    setTravellerEffectChoice(null);
    setTravellerJudgeResult(null);
    setTravellerNominationChoice(null);
    setTravellerHarlotAgreed(null);
    setTravellerHarlotBothDied(false);
    setTravellerKillSucceeded(true);
    setTravellerKnownAlignment(traveller.knownAlignment);
    setBeggarLearnedAlignment("unknown");
  }

  function travellerVoteWeight(player: string, when: string): number {
    return snapshotTravellerVoteWeight(snapshot, player, when);
  }

  function voteTally(voters: string[], when: string): { total: number; weights: Record<string, number> } {
    return travellerVoteTally(snapshot, voters, when);
  }

  function getVoteParticipantOrder(nominee: string): string[] {
    return [...getClockwiseVoteOrder(nominee), ...getVotingTravellers().map((traveller) => traveller.id)];
  }

  function getClockwiseVoteOrder(nominee: string): string[] {
    const order = seatingOrderAt(snapshot, nominationWhen);
    const index = order.indexOf(nominee);
    if (index < 0) return order;
    // The Storyteller sweeps clockwise and returns to the nominee, so the
    // nominee is shown last in the voting controls.
    return [...order.slice(index + 1), ...order.slice(0, index + 1)];
  }

  function formatStructuredClaim(claim: AbilityClaimEvent): string {
    const data = claim.structured;
    if (!data) {
      if (claim.result) return claim.result;
      return isStructuredInfoRole(claim.roleId)
        ? "旧形式・詳細なし（取り消して「情報を記録」から再入力）"
        : "内容未記録";
    }
    if (data.kind === "grandmotherRead") return `${getPlayerDisplayName(data.player)} → ${ROLES[data.shownRole].symbol} ${ROLES[data.shownRole].name}（善陣営）`;
    if (data.kind === "chambermaidRead") return `${data.players.map(getPlayerDisplayName).join(" / ")} → 起床${data.number}人`;
    if (data.kind === "godfatherOutsiders") return `ゲーム内のよそ者: ${data.roles.map(r=>ROLES[r].symbol + ROLES[r].name).join('・') || 'なし'}`;
    if (data.kind === "number") return String(data.value);
    if (data.kind === "pairRole") {
      return `${data.players.map(getPlayerDisplayName).join(" / ")} → ${ROLES[data.shownRole].symbol} ${ROLES[data.shownRole].name}`;
    }
    if (data.kind === "noOutsiders") return "アウトサイダーなし";
    if (data.kind === "pairYesNo") {
      return `${data.players.map(getPlayerDisplayName).join(" / ")} → ${data.result === "yes" ? "はい" : "いいえ"}`;
    }
    if (data.kind === "roleReveal") {
      return `${getPlayerDisplayName(data.player)} → ${ROLES[data.shownRole].symbol} ${ROLES[data.shownRole].name}`;
    }
    if (data.kind === "singleYesNo") return data.result === "yes" ? "はい" : "いいえ";
    if (data.kind === "dreamer") {
      return `${getPlayerDisplayName(data.player)} → ${data.shownRoles.map(r => `${ROLES[r].symbol} ${ROLES[r].name}`).join(" / ")}`;
    }
    if (data.kind === "pairAlignment") {
      return `${data.players.map(getPlayerDisplayName).join(" / ")} → ${data.result === "same" ? "同陣営" : "別陣営"}`;
    }
    if (data.kind === "savantPair") {
      const label = (st: SavantStatement) => st.kind === "roleInPlay"
        ? `${ROLES[st.roleId].symbol} ${ROLES[st.roleId].name} がゲーム内にいる`
        : `${st.players.map(getPlayerDisplayName).join("・")} の中に ${ROLES[st.roleId].symbol} ${ROLES[st.roleId].name} がいる`;
      return data.statements.map(label).join(" / ");
    }
    if (data.kind === "artistAnswer") return `${data.question} → ${data.result === "yes" ? "はい" : data.result === "no" ? "いいえ" : "不明"}`;
    if (data.kind === "juggler") return `${data.guessDay}: ${data.guesses.map(g0 => `${getPlayerDisplayName(g0.player)}=${ROLES[g0.roleId].symbol}${ROLES[g0.roleId].name}`).join(" / ")} → ${data.number}`;
    if (data.kind === "sage") return `${data.players.map(getPlayerDisplayName).join(" / ")} のどちらかがデーモン`;
    if (data.kind === "knight") return `${data.players.map(getPlayerDisplayName).join(" / ")} はデーモンでない`;
    if (data.kind === "noble") return `${data.players.map(getPlayerDisplayName).join(" / ")} のうち1人が悪陣営`;
    if (data.kind === "singlePlayer") return getPlayerDisplayName(data.player);
    if (data.kind === "singleRole") return `${ROLES[data.shownRole].symbol} ${ROLES[data.shownRole].name}`;
    if (data.kind === "storytellerAdvice") return data.advice;
    if (data.kind === "storytellerAssessment") return {good:"善が優勢",evil:"悪が優勢",neither:"互角"}[data.result];
    if (data.kind === "klutzChoice") return `${getPlayerDisplayName(data.target)} → ${data.teamLost ? "敗北" : "継続"}`;
    if (data.kind === "shugenjaDirection") return data.direction === "clockwise" ? "時計回り" : "反時計回り";
    if (data.kind === "alignmentRead") return `${getPlayerDisplayName(data.player)} → ${data.result === "good" ? "善陣営" : "悪陣営"}`;
    return data.kind === "action" ? getPlayerDisplayName(data.target) : "情報";
  }

  function formatSelfInfoEvent(event: SelfInfoEvent): string {
    if (event.roleId === "grandmother") return `${getPlayerDisplayName(event.player)} → ${ROLES[event.shownRole].symbol} ${ROLES[event.shownRole].name}（善陣営）`;
    if (event.roleId === "chambermaid") return `${event.players.map(getPlayerDisplayName).join(" / ")} → 起床${event.number}人`;
    if (event.roleId === "godfather") return `ゲーム内のよそ者: ${event.shownOutsiders.map(r=>ROLES[r].symbol + ROLES[r].name).join('・') || 'なし'}`;
    if (event.roleId === "washerwoman" || event.roleId === "investigator") {
      return `${event.players.map(getPlayerDisplayName).join(" / ")} → ${ROLES[event.shownRole].symbol} ${ROLES[event.shownRole].name}`;
    }
    if (event.roleId === "librarian") {
      if (event.noOutsiders) return "アウトサイダーなし";
      if (event.players && event.shownRole) {
        return `${event.players.map(getPlayerDisplayName).join(" / ")} → ${ROLES[event.shownRole].symbol} ${ROLES[event.shownRole].name}`;
      }
      return "詳細なし";
    }
    if (event.roleId === "chef" || event.roleId === "empath" || event.roleId === "clockmaker" || event.roleId === "oracle" || event.roleId === "mathematician") return String(event.number);
    if (event.roleId === "fortune_teller") {
      return `${event.players.map(getPlayerDisplayName).join(" / ")} → ${event.result === "yes" ? "はい" : "いいえ"}`;
    }
    if (event.roleId === "flowergirl" || event.roleId === "town_crier") return event.result === "yes" ? "はい" : "いいえ";
    if (event.roleId === "dreamer") {
      return `${getPlayerDisplayName(event.player)} → ${event.shownRoles.map(r => `${ROLES[r].symbol} ${ROLES[r].name}`).join(" / ")}`;
    }
    if (event.roleId === "savant") {
      const label = (st: SavantStatement) => st.kind === "roleInPlay"
        ? `${ROLES[st.roleId].symbol} ${ROLES[st.roleId].name} がゲーム内にいる`
        : `${st.players.map(getPlayerDisplayName).join("・")} の中に ${ROLES[st.roleId].symbol} ${ROLES[st.roleId].name} がいる`;
      return event.statements.map(label).join(" / ");
    }
    if (event.roleId === "seamstress") {
      return `${event.players.map(getPlayerDisplayName).join(" / ")} → ${event.result === "same" ? "同陣営" : "別陣営"}`;
    }
    if (event.roleId === "artist") return `${event.question} → ${event.result === "yes" ? "はい" : event.result === "no" ? "いいえ" : "不明"}`;
    if (event.roleId === "juggler") return `${event.guessDay}: ${event.guesses.map(g0 => `${getPlayerDisplayName(g0.player)}=${ROLES[g0.roleId].symbol}${ROLES[g0.roleId].name}`).join(" / ")} → ${event.number}`;
    if (event.roleId === "sage") return `${event.players.map(getPlayerDisplayName).join(" / ")} のどちらかがデーモン`;
    if (event.roleId === "knight") return `${event.players.map(getPlayerDisplayName).join(" / ")} はデーモンではない`;
    if (event.roleId === "noble") return `${event.players.map(getPlayerDisplayName).join(" / ")} のうち1人が悪陣営`;
    if (event.roleId === "pixie") return `${ROLES[event.shownRole].symbol} ${ROLES[event.shownRole].name} の役職を知った`;
    if (event.roleId === "balloonist") return `${getPlayerDisplayName(event.player)} を知らされた`;
    if (event.roleId === "bounty_hunter") return `${getPlayerDisplayName(event.player)} を悪陣営として知らされた`;
    if (event.roleId === "choirboy") return `デーモン: ${getPlayerDisplayName(event.player)}`;
    if (event.roleId === "high_priestess") return `会話相手: ${getPlayerDisplayName(event.player)}`;
    if (event.roleId === "king") return `生存する役職: ${ROLES[event.shownRole].symbol} ${ROLES[event.shownRole].name}`;
    if (event.roleId === "steward") return `善陣営の人: ${getPlayerDisplayName(event.player)}`;
    if (event.roleId === "shugenja") return event.direction === "clockwise" ? "最も近い悪陣営は時計回り" : "最も近い悪陣営は反時計回り";
    if (event.roleId === "village_idiot") return `${getPlayerDisplayName(event.player)} → ${event.result === "good" ? "善" : "悪"}`;
    if (event.roleId === "general") return {good:"善が優勢",evil:"悪が優勢",neither:"互角"}[event.result];
    if (event.roleId === "fisherman") return `助言: ${event.advice}`;
    if (event.roleId === "undertaker" || event.roleId === "ravenkeeper") {
      return `${getPlayerDisplayName(event.player)} → ${ROLES[event.shownRole].symbol} ${ROLES[event.shownRole].name}`;
    }
    return "詳細なし";
  }

  function formatSelfActionEvent(event: SelfActionEvent): string {
    if ('kind' in event && event.kind === 'bmr_action') {
      const names=event.targets.map(getPlayerDisplayName).join('・');
      const role=event.chosenRole ? `${ROLES[event.chosenRole].symbol} ${ROLES[event.chosenRole].name}` : '';
      return [names,role,event.note].filter(Boolean).join(' / ') || '殺害なし・ためる';
    }
    if (event.roleId === "philosopher") {
      const gained = ROLES[event.gainedRole];
      return `${gained.symbol} ${gained.name} の能力を獲得`;
    }
    if (event.roleId === "alsaahir") return `手下: ${event.minions.map(getPlayerDisplayName).join("・") || "なし"} / デーモン: ${event.demons.map(getPlayerDisplayName).join("・") || "なし"} → ${event.won ? "正解" : "不正解"}`;
    if (event.roleId === "alchemist") return `${ROLES[event.minionRole].symbol} ${ROLES[event.minionRole].name} の能力`;
    if (event.roleId === "amnesiac" && event.kind === "tag_answer") return `${ROLE_TAG_UI_LABELS[event.tag] ?? "能力タグ"} → ${event.matches ? "当てはまる" : "当てはまらない"}`;
    if (event.roleId === "amnesiac" && event.kind === "lock_role") return `${ROLES[event.chosenRole].symbol} ${ROLES[event.chosenRole].name} に決定`;
    if (event.roleId === "preacher") return `${getPlayerDisplayName(event.target)} を選択（手下なら能力を失う）`;
    if (event.roleId === "princess") return `${getPlayerDisplayName(event.nominee)} を指名して処刑（今夜デーモンの殺害なし）`;
    if (event.roleId === "engineer") return event.kind === "demon" ? `デーモンを ${ROLES[event.demonRole].symbol} ${ROLES[event.demonRole].name} に変更` : `手下を ${event.minionRoles.map(r => `${ROLES[r].symbol} ${ROLES[r].name}`).join("・")} に変更`;
    if (event.roleId === "farmer") return `${getPlayerDisplayName(event.deceasedFarmer)} の夜死亡を受けて農夫になった`;
    if (event.roleId === "huntsman") return `${getPlayerDisplayName(event.target)} を選択${event.rescuedRole ? ` → ${ROLES[event.rescuedRole].symbol} ${ROLES[event.rescuedRole].name}` : ''}`;
    if (event.roleId === "nightwatchman") return `${getPlayerDisplayName(event.target)} に自分の正体を伝えた`;
    if (event.roleId === "lycanthrope") return `${getPlayerDisplayName(event.target)} → ${event.killed ? '死亡' : '死亡なし'}`;
    if (event.roleId === "pixie") return `${ROLES[event.shownRole].symbol} ${ROLES[event.shownRole].name} の能力を獲得（語り手確認）`;
    if (event.roleId === "damsel") return `${getPlayerDisplayName(event.minion)} が ${getPlayerDisplayName(event.target)} を推理 → ${event.won ? '悪勝利' : '不正解'}`;
    const target = 'target' in event ? getPlayerDisplayName(event.target) : '';
    if (event.roleId === "slayer") {
      return `${target} → ${event.killed ? "死亡" : "死亡なし"}`;
    }
    if (event.roleId === "snake_charmer") {
      if (!event.swapped) return `${target} → 交換なし`;
      const demon = event.newDemonRole ? ROLES[event.newDemonRole] : null;
      return `${target} → 交換${demon ? ` / ${demon.symbol} ${demon.name}` : ""}`;
    }
    if (event.roleId === "klutz") return `${target} → ${event.teamLost ? "自陣営敗北" : "継続"}`;
    if (event.roleId === "acrobat") return `${target} → ${event.died ? "自分が死亡" : "死亡なし"}`;
    return target;
  }

  function getLatestClaim(playerId: string): RoleClaimEvent | null {
    return roleClaimLog.filter(c => c.playerId === playerId).sort(compareEvents).at(-1) ?? null;
  }

  function getLatestExactRoleClaim(playerId: string): RoleId | null {
    if (playerId === "self") return selfRole.shownRole;
    const claim = roleClaimLog.filter(c => c.playerId === playerId && c.subject.kind === "role").sort(compareEvents).at(-1);
    return claim?.subject.kind === "role" ? claim.subject.roleId : null;
  }

  function hasExactRoleClaim(playerId: string) {
    return getLatestExactRoleClaim(playerId) !== null;
  }

  function getClaimSymbol(claim: RoleClaimEvent | null): string {
    if (!claim) return "?";
    const s = claim.subject;
    if (s.kind === "role") return ROLES[s.roleId].symbol;
    if (s.kind === "tag") return CLAIMABLE_TAG_SYMBOLS[s.tag];
    if (s.kind === "type") return {townsfolk:"\u753a",outsider:"\u5916",minion:"\u624b",demon:"\u9b54"}[s.roleType];
    return s.alignment === "good" ? L.good : L.evil;
  }

  function getClaimLabel(claim: RoleClaimEvent | null): string {
    if (!claim) return L.none;
    const s = claim.subject;
    if (s.kind === "role") return `${ROLES[s.roleId].symbol} ${ROLES[s.roleId].name}`;
    if (s.kind === "tag") return `${CLAIMABLE_TAG_SYMBOLS[s.tag]} ${CLAIMABLE_TAG_LABELS[s.tag]}`;
    if (s.kind === "type") return L.nominalTypes[["townsfolk","outsider","minion","demon"].indexOf(s.roleType)];
    return L[s.alignment];
  }

  function formatAudience(
    visibility: ClaimVisibility,
    recipients: string[]
  ) {
    if (visibility === "public") {
      return "公開";
    }

    if (recipients.length === 0) {
      return "非公開 → 相手未記録";
    }

    return `非公開 → ${recipients.map(getPlayerDisplayName).join("・")}`;
  }

  function getDeathReasonLabel(reasonId: DeathReasonId) {
    return DEATH_REASONS.find((reason) => reason.id === reasonId)?.label ?? reasonId;
  }

  function getDeathPhaseOptions(reasonId: DeathReasonId) {
    const reason = DEATH_REASONS.find((item) => item.id === reasonId);
    const phases = getPhaseOptions();

    if (reason?.phase === "day") {
      return phases.filter((phase) => phase.startsWith("D"));
    }

    if (reason?.phase === "night") {
      return phases.filter((phase) => phase.startsWith("N"));
    }

    return phases;
  }

  function getLatestPhilosopherAction() {
    return selfActionLog
      .filter((event): event is Extract<SelfActionEvent, { roleId: "philosopher" }> => event.roleId === "philosopher")
      .sort(compareEvents)
      .at(-1) ?? null;
  }

  function getLatestAlchemistAction() {
    return selfActionLog
      .filter((event): event is Extract<SelfActionEvent, { roleId: "alchemist" }> => event.roleId === "alchemist" && event.kind === "minion_ability")
      .sort(compareEvents)
      .at(-1) ?? null;
  }

  function getLatestAmnesiacLock() {
    return selfActionLog
      .filter((event): event is Extract<SelfActionEvent, { roleId: "amnesiac"; kind: "lock_role" }> => event.roleId === "amnesiac" && event.kind === "lock_role")
      .sort(compareEvents)
      .at(-1) ?? null;
  }

  function getCannibalExecutee(): DeathEvent | null {
    return [...deathLog]
      .filter((death) => diedByExecution(death))
      .sort(compareEvents)
      .at(-1) ?? null;
  }

  function getCannibalAssumedRole(): RoleId | null {
    const executee = getCannibalExecutee();
    if (!executee) return null;
    return getLatestExactRoleClaim(executee.playerId);
  }

  function getAmnesiacCandidates(): Role[] {
    const answers = selfActionLog
      .filter((event): event is Extract<SelfActionEvent, { roleId: "amnesiac"; kind: "tag_answer" }> => event.roleId === "amnesiac" && event.kind === "tag_answer")
      .sort(compareEvents);
    return currentScriptRoles
      .filter((role) => role.type === "townsfolk" && role.id !== "amnesiac")
      .filter((role) => answers.every((answer) => role.tags.includes(answer.tag) === answer.matches));
  }

  function getAmnesiacSuggestedTag(): RoleTag | null {
    const candidates = getAmnesiacCandidates();
    if (candidates.length <= 1) return null;
    const used = new Set(selfActionLog
      .filter((event): event is Extract<SelfActionEvent, { roleId: "amnesiac"; kind: "tag_answer" }> => event.roleId === "amnesiac" && event.kind === "tag_answer")
      .map((event) => event.tag));
    let best: { tag: RoleTag; score: number } | null = null;
    for (const tag of AMNESIAC_SEARCH_TAGS) {
      if (used.has(tag)) continue;
      const yes = candidates.filter((role) => role.tags.includes(tag)).length;
      const no = candidates.length - yes;
      if (!yes || !no) continue;
      const score = Math.abs(yes - no);
      if (!best || score < best.score) best = { tag, score };
    }
    return best?.tag ?? null;
  }

  function getSelfAbilityRole(): RoleId | null {
    if (!selfRole.shownRole) return null;
    if (selfActionLog.some(a => a.roleId === "farmer" && a.kind === "became_farmer")) return "farmer";
    if (selfRole.shownRole === "amnesiac") return getLatestAmnesiacLock()?.chosenRole ?? "amnesiac";
    if (selfRole.shownRole === "cannibal") return getCannibalAssumedRole() ?? "cannibal";
    if (selfRole.shownRole === "pixie") {
      const awakened = selfActionLog.find((event): event is Extract<SelfActionEvent,{roleId:"pixie"}> => event.roleId === "pixie" && event.kind === "madness_confirmed");
      return awakened?.shownRole ?? "pixie";
    }
    if (selfRole.shownRole !== "philosopher") return selfRole.shownRole;
    return getLatestPhilosopherAction()?.gainedRole ?? "philosopher";
  }

  function getSelfInfoNightOptions(roleId: RoleId) {
    const philosopherAction = selfRole.shownRole === "philosopher" ? getLatestPhilosopherAction() : null;
    const usingPhilosopherAbility = philosopherAction?.gainedRole === roleId;
    if (usingPhilosopherAbility && philosopherAction) {
      const gainedNight = Number.parseInt(philosopherAction.when.slice(1), 10);
      if (["washerwoman", "librarian", "investigator", "chef", "clockmaker"].includes(roleId)) return [philosopherAction.when];
      if (roleId === "artist" || roleId === "savant" || roleId === "fisherman") return getDayOptions().filter((phase) => Number.parseInt(phase.slice(1), 10) >= gainedNight);
      if (roleId === "juggler") return night >= gainedNight + 1 ? [`N${gainedNight + 1}`] : [];
      if (roleId === "undertaker" || roleId === "ravenkeeper" || roleId === "flowergirl" || roleId === "town_crier" || roleId === "oracle" || roleId === "sage") return getNightOptions(Math.max(2, gainedNight));
      return getNightOptions(gainedNight);
    }
    if (isBmrRole(roleId) && rolePhaseOptions(roleId,night,"info").length) return rolePhaseOptions(roleId,night,"info");
    if (roleId === "savant" || roleId === "artist" || roleId === "fisherman") return getDayOptions();
    if (roleId === "juggler") return night >= 2 ? ["N2"] : [];
    if (roleId === "sage" || roleId === "choirboy") return getNightOptions(2);
    if (
      roleId === "washerwoman" ||
      roleId === "librarian" ||
      roleId === "investigator" ||
      roleId === "chef" ||
      roleId === "clockmaker" ||
      roleId === "knight" || roleId === "noble" || roleId === "pixie" || roleId === "steward" || roleId === "shugenja"
    ) {
      return ["N1"];
    }

    if (roleId === "undertaker" || roleId === "ravenkeeper" || roleId === "flowergirl" || roleId === "town_crier" || roleId === "oracle") {
      return getNightOptions(2);
    }

    return getNightOptions(1);
  }

  function getSelfInfoRoleOptions(roleId: RoleId): Role[] {
    if (roleId === "washerwoman") {
      return currentScriptRoles.filter((role) => role.type === "townsfolk");
    }

    if (roleId === "librarian") {
      return currentScriptRoles.filter((role) => role.type === "outsider");
    }

    if (roleId === "investigator") {
      return currentScriptRoles.filter((role) => role.type === "minion");
    }

    return currentScriptRoles;
  }

  function getPossibleHiddenSelfRoles(shownRoleId: RoleId) {
    const shownType = ROLES[shownRoleId].type;

    const tagByType: Record<string, RoleTag> = {
      townsfolk: "THINKS_TOWNSFOLK",
      outsider: "THINKS_OUTSIDER",
      minion: "THINKS_MINION",
      demon: "THINKS_DEMON",
    };

    const hiddenTag = tagByType[shownType];

    return currentScriptRoles.filter((role) => role.tags.includes(hiddenTag));
  }

  function resetClaimForm() {
    setClaimSubjectKind("role");
    setPendingClaimRole(null);
    setPendingClaimTag(null);
    setRoleClaimType("normal");
    setClaimVisibility("public");
    setClaimRecipients([]);
    setClaimWhen(`D${night}`);
  }

  function resetAbilityClaimForm() {
    setAbilityClaimRole(null);
    setAbilityClaimWhen(`D${night}`);
    setAbilityClaimTargets([]);
    setAbilityClaimResult("");
    setAbilityClaimVisibility("public");
    setAbilityClaimRecipients([]);
  }

  function resetNominationForm() {
    setPendingNominee(null);
    setPendingVoters([]);
    setVirginResult(null);
    setNominationExecutedSurvived(false);
    setNominationReason("");
    setNominationWhen(`D${night}`);
  }

  function resetTalkForm() {
    setTalkParticipants([]);
    setTalkWhen(`D${night}`);
    setTalkTopic(null);
    setTalkDetails("");
  }

  function resetSelfInfoForm() {
    setSelfInfoWhen("N1");
    setSelfInfoPlayers([]);
    setSelfInfoShownRole(null);
    setSelfInfoShownRole2(null);
    setSelfInfoNumber(null);
    setSelfInfoYesNo(null);
    setSelfGeneralResult(null);
    setSelfShugenjaDirection(null);
    setSelfVillageResult(null);
    setSelfFisherAdvice("");
    setSelfSavantKind1("roleInPlay"); setSelfSavantKind2("roleInPlay");
    setSelfSavantRole1(null); setSelfSavantRole2(null); setSelfSavantPlayers1([]); setSelfSavantPlayers2([]);
    setSelfArtistQuestion(""); setSelfArtistResult(null);
    setSelfJugglerGuessDay("D1"); setSelfJugglerGuesses([]); setSelfJugglerDraftPlayer(null); setSelfJugglerDraftRole(null);
    setLibrarianNoOutsiders(false);
  }

  function resetSelfActionForm() {
    setSelfActionTarget(null);
    setBmrActionTargets([]);setBmrActionRole(null);setBmrActionNote('');
    setSelfActionWhen("N2");
    setSelfSlayerKilled(false);
    setSelfSnakeSwapped(false);
    setSelfSnakeDemonRole(null);
    setSelfPhilosopherRole(null);
    setSelfKlutzTeamLost(null);
    setSelfAcrobatDied(false);
    setSelfEngineerMode("demon"); setSelfEngineerDemon(null); setSelfEngineerMinions([]);
    setSelfFarmerDeceased(null);
    setSelfHuntsmanRole(null); setSelfLycanKilled(false);
    setSelfDamselMinion(null); setSelfDamselWon(false);
    setSelfAlsaahirMinions([]);
    setSelfAlsaahirDemons([]);
    setSelfAlsaahirWon(false);
  }

  function resetGameData() {
    setNight(1);
    setManualReads({}); setCompletedNights([]); setNoExecutionDays([]); setLeviathanConfirmed(false); setAlHadikhiaConfirmed(false); setRiotConfirmed(false); setFearmongerActive(false); setBoomdandyLog([]); setJinxVictoryLog([]); setWidowReports([]); setEvilBehaviorReports([]); setPsychopathEvents([]); setOrganGrinderVotes([]); setOutsiderEvents([]); riotAnalysisOpened.current=false;
    setCheckpoints([]); setAnalysisOpen(false); setSavedGame(null);
    setMenuOpen(false);
    setExileTravellerOpen(false);
    setSelectedPlayer(null);
    setPlayerPanel("menu");
    setPlayerNames(makeEmptyNames());
    setPendingPlayerName("");
    setRoleClaimLog([]);
    resetClaimForm();
    setAbilityClaimLog([]);
    resetAbilityClaimForm();
    setPlayerStatus(makeInitialStatus());
    setDeathLog([]);
    setRevivalLog([]);
    setPendingDeathReason("night_death");
    setDeathWhen("N1");
    setPendingMutantExecution(false);
    setNominationLog([]);
    resetNominationForm();
    setAbilityTriggerLog([]);
    setTriggerDraft(null);
    setTalkLog([]);
    resetTalkForm();
    setSelfMenuOpen(false);
    setSelfPanel("menu");
    setSelfRole({ shownRole: null });
    setPendingSelfRole(null);
    setSelfInfoLog([]);
    resetSelfInfoForm();
    setSelfActionLog([]);
    resetSelfActionForm();
    setDemonState(makeEmptyDemonState());
    setDemonActionLog([]);
    setMinionState(makeEmptyMinionState());
    setMinionActionLog([]);
    setTravellers([]);
    setTravellerActionLog([]);
    setTravellerPanelId(null);
    setAlignmentOpen(false);
    setNewTravellerRole("bureaucrat");
    setNewTravellerName("");
    setTravellerTarget(null);
    setTravellerTarget2(null);
    setTravellerRoleChoice(null);
    setTravellerEffectChoice(null);
    setTravellerJudgeResult(null);
    setTravellerNominationChoice(null);
    setTravellerHarlotAgreed(null);
    setTravellerHarlotBothDied(false);
    setTravellerKillSucceeded(true);
    setTravellerKnownAlignment("unknown");
    setBeggarLearnedAlignment("unknown");
  }

  function startGame() {
    const selected = getScriptById(playset, customScripts) ?? BUILT_IN_SCRIPTS[0];
    const counts = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 };
    for (const roleId of selected.roleIds) counts[ROLES[roleId].type] += 1;
    if (counts.townsfolk === 0 || counts.minion === 0 || counts.demon === 0) {
      if (!window.confirm("このスクリプトは標準ゲームに必要な役職タイプが不足しています。\nそれでも開始しますか？")) return;
    }
    setGameScriptName(selected.name);
    setGameScriptRoleIds([...selected.roleIds]);
    resetGameData();
    setScreen("game");
  }

  function confirmNextNight() {
    if (night >= 99) return;
    if (!window.confirm(`\u7b2c${night + 1}\u591c\u306b\u9032\u307f\u307e\u3059\u304b\uff1f`)) return;
    setCheckpoints(xs => [...xs,snapshot].slice(-20));
    setTravellerTarget(null);
    setTravellerTarget2(null);
    setTravellerEffectChoice(null);
    setTravellerJudgeResult(null);
    setTravellerNominationChoice(null);
    setTravellerHarlotAgreed(null);
    setTravellerHarlotBothDied(false);
    setTravellerKillSucceeded(true);
    setTriggerDraft(null);
    if (playerPanel === "trigger_choice" || playerPanel === "trigger") setPlayerPanel("menu");
    setNight(n => n+1);
  }

  function confirmUndoNight() {
    if (night <= 1 || checkpoints.length === 0) return;
    if (!window.confirm("\u524d\u306e\u591c\u306b\u623b\u3057\u307e\u3059\u304b\uff1f\n\u591c\u3092\u9032\u3081\u305f\u5f8c\u306e\u5165\u529b\u30fb\u4fee\u6b63\u3082\u5143\u306b\u623b\u308a\u307e\u3059\u3002")) return;
    const previous = checkpoints[checkpoints.length-1];
    applySnapshot(previous); setCheckpoints(xs => xs.slice(0,-1));
    setMenuOpen(false); setSelectedPlayer(null); setSelfMenuOpen(false);
  }

  function confirmEndGame() {
    setMenuOpen(false);
    setEndGameOpen(true);
  }

  function finishCurrentGame(outcome: Exclude<GameLogOutcome, "unknown">) {
    const logSaved = archiveCurrentGame("finished", outcome);
    if (!logSaved) {
      setSaveFailed(true);
      window.alert("ゲームログを保存できませんでした。終了を中止します。");
      return;
    }

    try {
      localStorage.removeItem(SAVE_KEY);
      localStorage.removeItem(SAVE_BACKUP_KEY);
      localStorage.removeItem(CHECKPOINT_KEY);
    } catch {
      setSaveFailed(true);
    }

    setSavedGame(null);
    setCheckpoints([]);
    setEndGameOpen(false);
    setSelectedPlayer(null);
    setSelfMenuOpen(false);
    setAnalysisOpen(false);
    setScreen("home");
  }
  function openPlayerMenu(player: string) {
    setSelectedPlayer(player);
    setPlayerPanel("menu");
  }

  function openClaimPanel() {
    resetClaimForm();
    setPlayerPanel("claim");
  }

  function openAbilityClaimPanel() {
    resetAbilityClaimForm();

    if (selectedPlayer) {
      const exactRole = getLatestExactRoleClaim(selectedPlayer);
      if (isStructuredInfoRole(exactRole) && exactRole !== 'godfather') {
        setPlayerPanel("reported_info");
        return;
      }
      setAbilityClaimRole(exactRole);
      if (exactRole && isBmrRole(exactRole)) {
        const options = rolePhaseOptions(exactRole, night, "action");
        setAbilityClaimWhen(options[options.length - 1] ?? `D${night}`);
      }
    }

    setPlayerPanel("ability_claim");
  }

  function openIdentityPanel() {
    if (!selectedPlayer) {
      return;
    }

    setPendingPlayerName(playerNames[selectedPlayer] ?? "");
    setPlayerPanel("identity");
  }

  function openStatusPanel() {
    setPlayerPanel("status");
  }

  function openDeathPanel() {
    setPendingDeathReason("night_death");
    setPendingMutantExecution(false);
    setDeathWhen(`N${night}`);
    setPlayerPanel("death");
  }

  function openNominationPanel() {
    resetNominationForm();
    setPlayerPanel("nomination");
  }

  function openTalkPanel() {
    resetTalkForm();
    setPlayerPanel("talk");
  }

  function saveRoleClaim() {
    if (!selectedPlayer) {
      return;
    }

    let subject: ClaimSubject | null = null;

    if (claimSubjectKind === "role" && pendingClaimRole) {
      subject = { kind: "role", roleId: pendingClaimRole };
    }

    if (claimSubjectKind === "tag" && pendingClaimTag) {
      subject = { kind: "tag", tag: pendingClaimTag };
    }

    if (claimSubjectKind === "type") subject = {kind:"type",roleType:pendingType};
    if (claimSubjectKind === "alignment") subject = {kind:"alignment",alignment:pendingAlignment};
    if (!subject) {
      return;
    }

    const claim: RoleClaimEvent = {
      id: eventId(),
      playerId: selectedPlayer,
      subject,
      claimType: roleClaimType,
      origin: "manual",
      visibility: claimVisibility,
      recipients: claimVisibility === "private" ? claimRecipients : [],
      when: claimWhen,
    };

    setRoleClaimLog((current) => [...current, claim]);
    resetClaimForm();
    returnFromPlayerPanel();
  }

  function saveHarpyAffectedClaim(){
    if(!selectedPlayer||abilityClaimTargets.length!==1||abilityClaimTargets[0]===selectedPlayer)return;
    const claim:AbilityClaimEvent={id:eventId(),playerId:selectedPlayer,roleId:'harpy',affectedByHarpy:true,when:abilityClaimWhen,targets:[abilityClaimTargets[0]],result:abilityClaimResult.trim()||'ハーピーに選ばれ、指定された相手を悪だと思うよう求められた',visibility:abilityClaimVisibility,recipients:abilityClaimVisibility==='private'?abilityClaimRecipients:[]};
    setAbilityClaimLog(current=>[...current,claim]);
    // This is a victim report, not a Harpy role claim.
    resetAbilityClaimForm();returnFromPlayerPanel();
  }
  function saveAbilityClaim() {
    if (!selectedPlayer || !abilityClaimRole ||
      (isBmrRole(abilityClaimRole) && !rolePhaseOptions(abilityClaimRole, night, "action").includes(abilityClaimWhen))) {
      return;
    }

    const id = eventId();
    const claim: AbilityClaimEvent = {
      id,
      playerId: selectedPlayer,
      roleId: abilityClaimRole,
      when: abilityClaimWhen,
      targets: abilityClaimTargets,
      result: abilityClaimResult.trim() || null,
      visibility: abilityClaimVisibility,
      recipients:
        abilityClaimVisibility === "private" ? abilityClaimRecipients : [],
    };

    setAbilityClaimLog((current) => [...current, claim]);

    // Ability claiming an exact role also establishes that role claim unless
    // they have already made an exact role claim. Broad tag claims do not block this.
    if (!hasExactRoleClaim(selectedPlayer)) {
      const automaticRoleClaim: RoleClaimEvent = {
        id: id + 1,
        sourceEventId: id,
        playerId: selectedPlayer,
        subject: { kind: "role", roleId: abilityClaimRole },
        claimType: "normal",
        origin: "ability_claim",
        visibility: abilityClaimVisibility,
        recipients:
          abilityClaimVisibility === "private" ? abilityClaimRecipients : [],
        when: abilityClaimWhen,
      };

      setRoleClaimLog((current) => [...current, automaticRoleClaim]);
    }

    resetAbilityClaimForm();
    returnFromPlayerPanel();
  }

  function recordBoomdandyExplosion(event:BoomdandyEvent){
    const phase=event.when;
    const wasExecuted=deathLog.some(d=>d.when===phase&&d.playerId===event.executedPlayer&&diedByExecution(d)) || nominationLog.some(n=>n.when===phase&&n.nominee===event.executedPlayer&&n.executed===true);
    if(!wasExecuted){window.alert('最初にブームダンディの処刑を記録してください。');return;}
    if(boomdandyLog.some(x=>x.when===phase)){window.alert('この日の爆発は既に記録済みです。先に削除してください。');return;}
    const currentlyAlive=seats(playerCount).filter(p=>isAliveAt(snapshot,p,phase));
    if(event.survivors.some(p=>!currentlyAlive.includes(p))){window.alert('すでに死亡した人を生存者に指定できません。');return;}
    const killSeats=currentlyAlive.filter(p=>!event.survivors.includes(p)||(!event.tied&&event.pointedPlayer===p));
    const linked:DeathEvent[]=killSeats.map((p,i)=>({id:eventId()+i,sourceEventId:event.id,playerId:p,when:phase,reason:'ability',sourceRoleId:'boomdandy',sourcePlayerId:event.executedPlayer}));
    const nextDeaths=[...deathLog,...linked];
    setBoomdandyLog(old=>[...old,event]);
    setDeathLog(nextDeaths);
    setPlayerStatus({...makeInitialStatus(),...rebuildStatus({...snapshot,deathLog:nextDeaths,revivalLog})});
  }
  function deleteBoomdandyExplosion(id:number){
    const kept=deathLog.filter(d=>d.sourceEventId!==id);
    setDeathLog(kept);setBoomdandyLog(old=>old.filter(e=>e.id!==id));
    setPlayerStatus({...makeInitialStatus(),...rebuildStatus({...snapshot,deathLog:kept,revivalLog})});
  }
  function recordOutsiderEvent(ev:OutsiderEvent){
    if (ev.kind==='golem_nomination'){
      if (!nominationLog.some(n=>n.when===ev.when&&n.nominator===ev.playerId&&n.nominee===ev.target)){
        window.alert('先にゴーレムの指名を通常の指名メニューで記録してください。');return;
      }
      if (ev.killed && !isAliveAt(snapshot,ev.target,ev.when,ev.id+1)){
        window.alert('対象はすでに死亡しています。');return;
      }
      if (ev.killed){
        const death:DeathEvent={id:ev.id+1,when:ev.when,playerId:ev.target,reason:'ability',sourceRoleId:'golem',sourcePlayerId:ev.playerId,sourceEventId:ev.id};
        const next=[...deathLog,death];setDeathLog(next);
        setPlayerStatus({...makeInitialStatus(),...rebuildStatus({...snapshot,deathLog:next,revivalLog})});
      }
    }
    setOutsiderEvents(xs=>[...xs,ev]);
  }
  function deleteOutsiderEvent(id:number){
    const next=deathLog.filter(d=>d.sourceEventId!==id);
    setOutsiderEvents(xs=>xs.filter(e=>e.id!==id));
    if(next.length!==deathLog.length){setDeathLog(next);setPlayerStatus({...makeInitialStatus(),...rebuildStatus({...snapshot,deathLog:next,revivalLog})});}
  }
  function recordPsychopathEvent(event:PsychopathPublicEvent){
    if(psychopathEvents.some(e=>e.when===event.when && e.playerId===event.playerId)){
      window.alert('この日のサイコパスの行動は記録済みです。');return;
    }
    const generated:DeathEvent|undefined=event.killed?{id:event.id+1,when:event.when,playerId:event.target,reason:'psychopath',sourceRoleId:'psychopath',sourcePlayerId:event.playerId,sourceEventId:event.id}:undefined;
    if(generated && !isAliveAt(snapshot,event.target,event.when,generated.id)){
      window.alert('対象はこの時点ですでに死亡しています。');return;
    }
    setPsychopathEvents(xs=>[...xs,event]);
    if(generated){const next=[...deathLog,generated];setDeathLog(next);setPlayerStatus({...makeInitialStatus(),...rebuildStatus({...snapshot,deathLog:next,revivalLog})});}
  }
  function deletePsychopathEvent(id:number){
    const kept=deathLog.filter(d=>d.sourceEventId!==id);
    setPsychopathEvents(xs=>xs.filter(e=>e.id!==id));setDeathLog(kept);
    setPlayerStatus({...makeInitialStatus(),...rebuildStatus({...snapshot,deathLog:kept,revivalLog})});
  }
  function createDeathEvent(event: DeathEvent) {
    if (!isAliveAt(snapshot, event.playerId, event.when, event.id)) {
      window.alert("この時点ではすでに死亡しています。復活後の再死亡は記録できます。");
      return;
    }
    const deaths = [...deathLog,event];
    setDeathLog(deaths);
    setPlayerStatus({...makeInitialStatus(),...rebuildStatus({...snapshot,deathLog:deaths,revivalLog})});
    if (diedByExecution(event)) setNoExecutionDays(xs => xs.filter(n => `D${n}` !== event.when));
  }

  function killParticipantFromTraveller(target: string, reason: "gnome" | "gangster", roleId: "gnome" | "gangster", sourceEventId: number, when: string) {
    const targetTraveller = getTraveller(target);
    if (targetTraveller) {
      if (!targetTraveller.alive) return;
      updateTraveller(targetTraveller.id, { alive: false, deadVoteAvailable: true, voteTokens: 0 });
      return;
    }
    createDeathEvent({
      id: sourceEventId + 1,
      playerId: target,
      when,
      reason,
      sourceTravellerRoleId: roleId,
      sourceEventId,
    });
  }

  function revivePlayer(player: string) {
    if (!currentScriptHasReviver || playerStatus[player]?.alive || night < 2) return;
    const event: RevivalEvent = { id: eventId(), playerId: player, when: `N${night}` };
    const revivals = [...revivalLog, event];
    setRevivalLog(revivals);
    setPlayerStatus({...makeInitialStatus(),...rebuildStatus({...snapshot,revivalLog:revivals})});
  }

  function saveManualDeath() {
    if (!selectedPlayer) {
      return;
    }

    createDeathEvent({
      id: eventId(),
      playerId: selectedPlayer,
      when: deathWhen,
      reason: pendingMutantExecution ? "storyteller" : pendingDeathReason,
      sourceRoleId: pendingMutantExecution ? "mutant" : undefined,
      sourceTravellerRoleId: !pendingMutantExecution && pendingDeathReason === "gnome" ? "gnome" : !pendingMutantExecution && pendingDeathReason === "gangster" ? "gangster" : undefined,
      isExecution: pendingMutantExecution ? true : undefined,
    });

    setPlayerPanel("status");
  }

  function setDeathReason(reasonId: DeathReasonId) {
    setPendingMutantExecution(false);
    setPendingDeathReason(reasonId);
    const options = getDeathPhaseOptions(reasonId);

    if (options.length > 0 && !options.includes(deathWhen)) {
      setDeathWhen(options[options.length - 1]);
    }
  }

  function canVoteParticipantAt(player: string, when: string) {
    const traveller = getTraveller(player);
    if (traveller) return travellerCanVote(traveller, snapshot, when);
    if (bansheeAwakenedAt(snapshot, player, when)) return true;
    const historical = rebuildStatus({...snapshot,
      deathLog: deathLog.filter(d => compareEvents(d,{when,id:Infinity}) < 0),
      revivalLog: revivalLog.filter(r => compareEvents(r,{when,id:Infinity}) < 0),
      nominationLog: nominationLog.filter(n => compareEvents(n,{when,id:Infinity}) < 0),
    });
    const status = historical[player] ?? {alive:true,deadVoteAvailable:true};
    if (voudonActive(snapshot, when)) return !status.alive;
    return status.alive || status.deadVoteAvailable;
  }

  function canVoteParticipant(player: string) {
    return canVoteParticipantAt(player, nominationWhen);
  }

  function saveNomination() {
    if (!selectedPlayer || !pendingNominee) return;
    const bishop = bishopActive(snapshot, nominationWhen);
    const nominator = bishop ? "storyteller" : selectedPlayer;
    const riotDay3 = (snapshot.riotConfirmed || snapshot.selfRole.shownRole === "riot") && nominationWhen === "D3";
    const riotChainNominator = riotDay3 && deathLog.some(d=>d.when===nominationWhen && d.playerId===selectedPlayer && d.sourceRoleId==='riot');
    const awakenedBanshee = !bishop && bansheeAwakenedAt(snapshot, selectedPlayer, nominationWhen);
    if (!bishop && !isAliveAt(snapshot,selectedPlayer,nominationWhen) && !awakenedBanshee && !riotChainNominator) {
      window.alert("\u6b7b\u4ea1\u3057\u305f\u4eba\u306f\u6307\u540d\u3067\u304d\u307e\u305b\u3093\u3002"); return;
    }
    const sameDayNominations = nominationLog.filter(n => n.when === nominationWhen && !bishop && n.nominator === nominator).length;
    const nominationLimit = riotDay3 ? Number.POSITIVE_INFINITY : awakenedBanshee ? 2 : 1;
    if (nominationLog.some(n => n.when === nominationWhen && n.nominee === pendingNominee) || sameDayNominations >= nominationLimit) {
      window.alert("\u305d\u306e\u65e5\u306e\u6307\u540d\u56de\u6570\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002\u8a02\u6b63\u306f\u5c65\u6b74\u304b\u3089\u884c\u3048\u307e\u3059\u3002"); return;
    }
    if (deathLog.some(d => d.when === nominationWhen && diedByExecution(d))) {
      window.alert("\u3053\u306e\u65e5\u306f\u51e6\u5211\u6e08\u307f\u3067\u3059\u3002\u904e\u53bb\u306e\u6307\u540d\u306f\u51e6\u5211\u8a18\u9332\u3092\u4e00\u5ea6\u8a02\u6b63\u3057\u3066\u304b\u3089\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002"); return;
    }
    const virgin = !bishop && !riotDay3 && needsVirginCheck(pendingNominee,nominationWhen);
    if (virgin && virginResult === null) return;
    const id = eventId();
    const triggered = virgin && virginResult === true;
    const voters = triggered || riotDay3
      ? []
      : getVoteParticipantOrder(pendingNominee).filter(
          (player) => pendingVoters.includes(player) && canVoteParticipant(player)
        );
    const hiddenVote=organGrinderVotes.some(e=>e.when===nominationWhen&&e.hidden);
    const tally = voteTally(voters, nominationWhen);
    const nomination: NominationEvent = {
      id,nominator,nominee:pendingNominee,when:nominationWhen,
      voters: hiddenVote ? [] : voters,
      voteTotal: hiddenVote ? undefined : triggered || riotDay3 ? 0 : tally.total,
      voteWeights: hiddenVote ? undefined : triggered || riotDay3 ? {} : tally.weights,
      votingOccurred: !triggered && !riotDay3, executed: !triggered && !riotDay3 && nominationExecutedSurvived ? true : undefined, reason: nominationReason.trim(),
    };
    const nominations = [...nominationLog,nomination];
    let deaths = deathLog;
    setNominationLog(nominations);
    if(riotDay3 && !deathLog.some(d=>d.when===nominationWhen && d.playerId===pendingNominee)){
      deaths=[...deathLog,{id:id+3,playerId:pendingNominee,when:nominationWhen,reason:'ability',sourceRoleId:'riot',sourcePlayerId:nominator,sourceEventId:id}];
      setDeathLog(deaths);
    }
    if(nomination.executed)setNoExecutionDays(xs=>xs.filter(n=>`D${n}`!==nominationWhen));
    if (virgin) {
      const trigger: AbilityTriggerEvent = {id:id+1,roleId:"virgin",rolePlayerId:pendingNominee,targetPlayerId:selectedPlayer,when:nominationWhen,triggered,sourceEventId:id};
      setAbilityTriggerLog(xs=>[...xs,trigger]);
      if (triggered) {
        deaths=[...deathLog,{id:id+2,playerId:selectedPlayer,when:nominationWhen,reason:"execution",isExecution:true,sourceRoleId:"virgin",sourcePlayerId:pendingNominee,sourceEventId:id+1}];
        setDeathLog(deaths); setNoExecutionDays(xs=>xs.filter(n=>`D${n}`!==nominationWhen));
      }
    }
    if (!triggered && !riotDay3) {
      const voudonVoting = voudonActive(snapshot, nominationWhen);
      setTravellers((current) => current.map((traveller) => {
        if (!voters.includes(traveller.id)) return traveller;
        if (!traveller.alive) {
          if (voudonVoting && !traveller.exiled) return traveller;
          return { ...traveller, deadVoteAvailable: false };
        }
        if (traveller.roleId === "beggar") return { ...traveller, voteTokens: Math.max(0, traveller.voteTokens - 1) };
        return traveller;
      }));
    }
    setPlayerStatus({...makeInitialStatus(),...rebuildStatus({...snapshot,deathLog:deaths,nominationLog:nominations})});
    resetNominationForm(); returnFromPlayerPanel();
  }

  function saveTravellerVoteModifier(traveller: TravellerState, recipient: string | null = travellerTarget) {
    if (!recipient || (recipient === traveller.id)) return;
    const roleId = traveller.roleId;
    if (roleId !== "bureaucrat" && roleId !== "thief") return;
    const when = `N${night}`;
    const next: TravellerActionEvent = {
      id: eventId(), roleId, kind: "vote_modifier", travellerId: traveller.id, when, target: recipient,
    };
    setTravellerActionLog((current) => [
      ...current.filter((event) => !(event.travellerId === traveller.id && event.kind === "vote_modifier" && event.when === when)),
      next,
    ]);
    setTravellerTarget(recipient);
  }

  function saveBeggarDonation(traveller: TravellerState) {
    if (traveller.roleId !== "beggar" || !travellerTarget) return;
    const donorStatus = playerStatus[travellerTarget];
    if (!donorStatus || donorStatus.alive || !donorStatus.deadVoteAvailable) return;
    const action: TravellerActionEvent = {
      id: eventId(), roleId: "beggar", kind: "donation", travellerId: traveller.id,
      when: `D${night}`, donor: travellerTarget, learnedAlignment: beggarLearnedAlignment,
    };
    const nextLog = [...travellerActionLog, action];
    setTravellerActionLog(nextLog);
    setTravellers((current) => current.map((item) => item.id === traveller.id ? { ...item, voteTokens: item.voteTokens + 1 } : item));
    setPlayerStatus({...makeInitialStatus(),...rebuildStatus({...snapshot,travellerActionLog:nextLog})});
    setTravellerTarget(null);
    setBeggarLearnedAlignment("unknown");
  }

  function saveGunslingerShot(traveller: TravellerState) {
    if (traveller.roleId !== "gunslinger" || !travellerTarget) return;
    const firstVote = nominationLog
      .filter((event) => event.when === `D${night}` && event.votingOccurred !== false)
      .sort(compareEvents)[0];
    if (!firstVote?.voters.includes(travellerTarget)) {
      window.alert("その日の最初の投票で挙手した人だけを選べます。");
      return;
    }
    if (travellerActionLog.some((event) => event.travellerId === traveller.id && event.kind === "shot" && event.when === `D${night}`)) {
      window.alert("ガンスリンガーはこの日はすでに能力を使用しています。");
      return;
    }
    const action: TravellerActionEvent = {
      id: eventId(), roleId: "gunslinger", kind: "shot", travellerId: traveller.id,
      when: `D${night}`, target: travellerTarget, killed: true,
    };
    setTravellerActionLog((current) => [...current, action]);
    const targetTraveller = getTraveller(travellerTarget);
    if (targetTraveller) {
      updateTraveller(targetTraveller.id, { alive: false, deadVoteAvailable: true, voteTokens: 0 });
    } else {
      createDeathEvent({
        id: action.id + 1,
        playerId: travellerTarget,
        when: action.when,
        reason: "ability",
        sourceEventId: action.id,
      });
    }
    setTravellerTarget(null);
  }

  function saveScapegoatReplacement(traveller: TravellerState) {
    if (traveller.roleId !== "scapegoat" || !travellerTarget) return;
    const action: TravellerActionEvent = {
      id: eventId(), roleId: "scapegoat", kind: "replacement", travellerId: traveller.id,
      when: `D${night}`, savedPlayer: travellerTarget,
    };
    setTravellerActionLog((current) => [...current, action]);
    updateTraveller(traveller.id, { alive: false, deadVoteAvailable: true, voteTokens: 0 });
    setTravellerTarget(null);
  }

  function saveApprenticeAbility(traveller: TravellerState) {
    if (traveller.roleId !== "apprentice" || !travellerRoleChoice) return;
    const role = ROLES[travellerRoleChoice];
    if (role.type !== "townsfolk" && role.type !== "minion") return;
    if (traveller.knownAlignment === "good" && role.type !== "townsfolk") { window.alert("善の見習いが得られるのは町人能力だけです。"); return; }
    if (traveller.knownAlignment === "evil" && role.type !== "minion") { window.alert("悪の見習いが得られるのは手下能力だけです。"); return; }
    if (travellerActionLog.some(a => a.kind === "apprentice_ability" && a.travellerId === traveller.id)) { window.alert("見習いの能力はすでに記録されています。"); return; }
    const joinedDay = Number(traveller.joinedWhen.slice(1));
    if (night <= joinedDay) { window.alert(`見習いが能力を得るのは参加後の最初の夜（N${joinedDay + 1}）です。`); return; }
    const action: TravellerActionEvent = { id: eventId(), roleId: "apprentice", kind: "apprentice_ability", travellerId: traveller.id, when: `N${night}`, abilityRoleId: travellerRoleChoice };
    setTravellerActionLog(current => [...current, action]);
    if (role.type === "townsfolk") updateTraveller(traveller.id, { knownAlignment: "good" });
    if (role.type === "minion") updateTraveller(traveller.id, { knownAlignment: "evil" });
  }

  function saveMatronSwap(traveller: TravellerState) {
    if (traveller.roleId !== "matron" || !travellerTarget || !travellerTarget2 || travellerTarget === travellerTarget2) return;
    if (matronSwapCount(snapshot, traveller.id, night) >= 3) { window.alert("寮母の席交換は1日3回までです。"); return; }
    const legal = new Set(["self", ...getActivePlayers()]);
    if (!legal.has(travellerTarget) || !legal.has(travellerTarget2)) return;
    const action: TravellerActionEvent = { id: eventId(), roleId: "matron", kind: "seat_swap", travellerId: traveller.id, when: `D${night}`, playerA: travellerTarget, playerB: travellerTarget2 };
    setTravellerActionLog(current => [...current, action]);
    setTravellerTarget(null); setTravellerTarget2(null);
  }

  function saveJudgeRuling(traveller: TravellerState) {
    if (traveller.roleId !== "judge" || travellerNominationChoice === null || !travellerJudgeResult) return;
    if (travellerActionLog.some(a => a.kind === "judge_ruling" && a.travellerId === traveller.id)) { window.alert("判事の能力はゲーム中1回だけです。"); return; }
    const nomination = nominationLog.find(n => n.id === travellerNominationChoice);
    if (!nomination || nomination.nominator === traveller.id || nomination.nominator === "storyteller") { window.alert("他のプレイヤーによる指名だけを判定できます。"); return; }
    const action: TravellerActionEvent = { id: eventId(), roleId: "judge", kind: "judge_ruling", travellerId: traveller.id, when: nomination.when, nominationId: nomination.id, result: travellerJudgeResult };
    setTravellerActionLog(current => [...current, action]);
    if (travellerJudgeResult === "pass" && !deathLog.some(d => d.when === nomination.when && d.playerId === nomination.nominee && diedByExecution(d))) {
      createDeathEvent({ id: action.id + 1, playerId: nomination.nominee, when: nomination.when, reason: "execution", isExecution: true, sourceEventId: action.id });
      setNoExecutionDays(xs => xs.filter(n => `D${n}` !== nomination.when));
    }
    setTravellerNominationChoice(null); setTravellerJudgeResult(null);
  }

  function saveButcherNomination(traveller: TravellerState) {
    if (traveller.roleId !== "butcher" || !travellerTarget) return;
    const when = `D${night}`;
    if (bishopActive(snapshot, when)) { window.alert("司教が有効な間は肉屋自身は指名できません。"); return; }
    if (!deathLog.some(d => d.when === when && diedByExecution(d))) { window.alert("肉屋の追加指名は、その日の最初の処刑後だけです。"); return; }
    if (travellerActionLog.some(a => a.kind === "butcher_nomination" && a.travellerId === traveller.id && a.when === when)) { window.alert("肉屋はこの日はすでに追加指名しています。"); return; }
    if (nominationLog.some(n => n.when === when && n.nominator === traveller.id)) { window.alert("肉屋の追加指名はこの日はすでに記録されています。"); return; }
    const order = seatingOrderAt(snapshot, when);
    const index = order.indexOf(travellerTarget);
    const clockwise = index < 0 ? order : [...order.slice(index + 1), ...order.slice(0, index + 1)];
    const participants = [...clockwise, ...getVotingTravellers().map(t => t.id)];
    const voters = participants.filter(player => pendingVoters.includes(player) && canVoteParticipantAt(player, when));
    const tally = travellerVoteTally(snapshot, voters, when);
    const nominationId = eventId();
    const nomination: NominationEvent = { id: nominationId, nominator: traveller.id, nominee: travellerTarget, when, voters, voteTotal: tally.total, voteWeights: tally.weights, votingOccurred: true, reason: "肉屋の追加指名" };
    const action: TravellerActionEvent = { id: nominationId + 1, roleId: "butcher", kind: "butcher_nomination", travellerId: traveller.id, when, nominationId };
    setNominationLog(current => [...current, nomination]);
    setTravellerActionLog(current => [...current, action]);
    const voudonVoting = voudonActive(snapshot, when);
    setTravellers(current => current.map(item => {
      if (!voters.includes(item.id)) return item;
      if (!item.alive) return voudonVoting && !item.exiled ? item : { ...item, deadVoteAvailable: false };
      if (item.roleId === "beggar") return { ...item, voteTokens: Math.max(0, item.voteTokens - 1) };
      return item;
    }));
    setPlayerStatus({...makeInitialStatus(),...rebuildStatus({...snapshot,nominationLog:[...nominationLog,nomination]})});
    setPendingVoters([]); setTravellerTarget(null);
  }

  function saveBoneCollectorRestore(traveller: TravellerState) {
    if (traveller.roleId !== "bone_collector" || !travellerTarget || night < 2) return;
    if (travellerActionLog.some(a => a.kind === "restore_ability" && a.travellerId === traveller.id)) { window.alert("骨拾いの能力はゲーム中1回だけです。"); return; }
    const targetTraveller = getTraveller(travellerTarget);
    const dead = targetTraveller ? !targetTraveller.alive : !(playerStatus[travellerTarget]?.alive ?? true);
    if (!dead) { window.alert("骨拾いは死亡者だけを選べます。"); return; }
    const action: TravellerActionEvent = { id: eventId(), roleId: "bone_collector", kind: "restore_ability", travellerId: traveller.id, when: `N${night}`, target: travellerTarget };
    setTravellerActionLog(current => [...current, action]); setTravellerTarget(null);
  }

  function saveHarlotVisit(traveller: TravellerState) {
    if (traveller.roleId !== "harlot" || !travellerTarget || night < 2 || travellerHarlotAgreed === null) return;
    if (travellerActionLog.some(a => a.kind === "harlot_visit" && a.travellerId === traveller.id && a.when === `N${night}`)) { window.alert("娼婦はこの夜すでに対象を選んでいます。"); return; }
    const targetTraveller = getTraveller(travellerTarget);
    const targetAlive = targetTraveller ? targetTraveller.alive : (playerStatus[travellerTarget]?.alive ?? true);
    if (!targetAlive) { window.alert("娼婦は生存者を選びます。"); return; }
    if (travellerHarlotAgreed && !targetTraveller && !travellerRoleChoice) { window.alert("同意した場合は見せられた役職を記録してください。"); return; }
    const action: TravellerActionEvent = { id: eventId(), roleId: "harlot", kind: "harlot_visit", travellerId: traveller.id, when: `N${night}`, target: travellerTarget, agreed: travellerHarlotAgreed, ...(travellerHarlotAgreed && !targetTraveller && travellerRoleChoice ? {shownRole: travellerRoleChoice} : {}), bothDied: travellerHarlotAgreed && travellerHarlotBothDied };
    setTravellerActionLog(current => [...current, action]);
    if (action.bothDied) {
      updateTraveller(traveller.id, { alive: false, deadVoteAvailable: true, voteTokens: 0 });
      if (targetTraveller) updateTraveller(targetTraveller.id, { alive: false, deadVoteAvailable: true, voteTokens: 0 });
      else createDeathEvent({ id: action.id + 1, playerId: travellerTarget, when: action.when, reason: "ability", sourceEventId: action.id });
    }
    setTravellerTarget(null); setTravellerRoleChoice(null); setTravellerHarlotAgreed(null); setTravellerHarlotBothDied(false);
  }

  function saveBaristaEffect(traveller: TravellerState) {
    if (traveller.roleId !== "barista" || !travellerTarget || !travellerEffectChoice) return;
    const when = `N${night}`;
    const action: TravellerActionEvent = { id: eventId(), roleId: "barista", kind: "barista_effect", travellerId: traveller.id, when, target: travellerTarget, effect: travellerEffectChoice };
    setTravellerActionLog(current => [...current.filter(a => !(a.kind === "barista_effect" && a.travellerId === traveller.id && a.when === when)), action]);
    setTravellerTarget(null); setTravellerEffectChoice(null);
  }

  function saveDeviantFunny(traveller: TravellerState, funny: boolean) {
    if (traveller.roleId !== "deviant") return;
    const when = `D${night}`;
    const action: TravellerActionEvent = { id: eventId(), roleId: "deviant", kind: "deviant_funny", travellerId: traveller.id, when, funny };
    setTravellerActionLog(current => [...current.filter(a => !(a.kind === "deviant_funny" && a.travellerId === traveller.id && a.when === when)), action]);
  }

  function saveCacklejackProtection(traveller: TravellerState) {
    if (traveller.roleId !== "cacklejack" || !travellerTarget) return;
    const when = `D${night}`;
    const action: TravellerActionEvent = { id: eventId(), roleId: "cacklejack", kind: "cacklejack_protect", travellerId: traveller.id, when, target: travellerTarget };
    setTravellerActionLog(current => [...current.filter(a => !(a.kind === "cacklejack_protect" && a.travellerId === traveller.id && a.when === when)), action]);
  }

  function saveCacklejackChange(traveller: TravellerState) {
    if (traveller.roleId !== "cacklejack" || night < 2 || !travellerTarget2 || !travellerRoleChoice) return;
    const previousProtection = travellerActionLog.find((a): a is Extract<TravellerActionEvent, { kind: "cacklejack_protect" }> => a.kind === "cacklejack_protect" && a.travellerId === traveller.id && a.when === `D${night - 1}`);
    if (previousProtection?.target === travellerTarget2) {
      window.alert("前日にカックルジャックが選んだ人は、この夜の役職変更対象にはできません。");
      return;
    }
    const when = `N${night}`;
    const action: TravellerActionEvent = { id: eventId(), roleId: "cacklejack", kind: "cacklejack_change", travellerId: traveller.id, when, target: travellerTarget2, newRole: travellerRoleChoice };
    setTravellerActionLog(current => [...current.filter(a => !(a.kind === "cacklejack_change" && a.travellerId === traveller.id && a.when === when)), action]);
  }

  function saveGnomeFriend(traveller: TravellerState) {
    if (traveller.roleId !== "gnome" || !travellerTarget || travellerTarget === traveller.id) return;
    const existing = travellerActionLog.some(a => a.kind === "gnome_friend" && a.travellerId === traveller.id);
    if (existing && !window.confirm("ノームの友人はすでに記録されています。置き換えますか？")) return;
    const action: TravellerActionEvent = { id: eventId(), roleId: "gnome", kind: "gnome_friend", travellerId: traveller.id, when: traveller.joinedWhen, friend: travellerTarget };
    setTravellerActionLog(current => [...current.filter(a => !(a.kind === "gnome_friend" && a.travellerId === traveller.id)), action]);
  }

  function saveGnomeKill(traveller: TravellerState) {
    if (traveller.roleId !== "gnome" || travellerNominationChoice === null) return;
    const friend = travellerActionLog.find((a): a is Extract<TravellerActionEvent, { kind: "gnome_friend" }> => a.kind === "gnome_friend" && a.travellerId === traveller.id)?.friend;
    if (!friend) { window.alert("先にノームの友人を記録してください。"); return; }
    const nomination = nominationLog.find(n => n.id === travellerNominationChoice && n.nominee === friend);
    if (!nomination) { window.alert("友人への指名を選んでください。"); return; }
    if (travellerActionLog.some(a => a.kind === "gnome_kill" && a.travellerId === traveller.id && a.nominationId === nomination.id)) {
      window.alert("この指名については、すでにノームの結果を記録しています。");
      return;
    }
    const target = nomination.nominator;
    if (target === "storyteller") { window.alert("語り手はノームの死亡対象にはできません。"); return; }
    const action: TravellerActionEvent = { id: eventId(), roleId: "gnome", kind: "gnome_kill", travellerId: traveller.id, when: nomination.when, nominationId: nomination.id, target, killed: travellerKillSucceeded };
    setTravellerActionLog(current => [...current, action]);
    if (travellerKillSucceeded) killParticipantFromTraveller(target, "gnome", "gnome", action.id, action.when);
    setTravellerNominationChoice(null);
    setTravellerKillSucceeded(true);
  }

  function saveGangsterKill(traveller: TravellerState) {
    if (traveller.roleId !== "gangster" || !travellerTarget || !travellerTarget2 || travellerTarget === travellerTarget2) return;
    const when = `D${night}`;
    if (travellerActionLog.some(a => a.kind === "gangster_kill" && a.travellerId === traveller.id && a.when === when)) {
      window.alert("ギャングスターはこの日はすでに能力を使用しています。");
      return;
    }
    const targetTraveller = getTraveller(travellerTarget2);
    const targetAlive = targetTraveller ? targetTraveller.alive : (playerStatus[travellerTarget2]?.alive ?? false);
    const agreedTraveller = getTraveller(travellerTarget);
    const agreedAlive = agreedTraveller ? agreedTraveller.alive : (playerStatus[travellerTarget]?.alive ?? false);
    if (!targetAlive || !agreedAlive) { window.alert("同意者と死亡対象は、どちらも生存している隣人を選んでください。"); return; }
    const action: TravellerActionEvent = { id: eventId(), roleId: "gangster", kind: "gangster_kill", travellerId: traveller.id, when, agreedPlayer: travellerTarget, target: travellerTarget2, killed: travellerKillSucceeded };
    setTravellerActionLog(current => [...current, action]);
    if (travellerKillSucceeded) killParticipantFromTraveller(travellerTarget2, "gangster", "gangster", action.id, action.when);
    setTravellerTarget(null); setTravellerTarget2(null); setTravellerKillSucceeded(true);
  }

  function toggleTravellerLife(traveller: TravellerState) {
    if (traveller.alive) updateTraveller(traveller.id, { alive: false, deadVoteAvailable: true, voteTokens: 0 });
    else updateTraveller(traveller.id, { alive: true, deadVoteAvailable: true });
  }

  function exileTraveller(traveller: TravellerState) {
    if (!traveller.active || traveller.exiled) return;
    if (traveller.roleId === "deviant" && deviantsFunnyToday(snapshot, traveller.id, night)) {
      window.alert("変人は本日『面白かった』と記録されているため、追放では死亡しません。語り手判定を変更してから再度追放してください。");
      return;
    }
    if (!window.confirm(`${traveller.name || TRAVELLERS[traveller.roleId].name}を追放しますか？\n能力は失われますが、死者票を1票保持します。`)) return;
    updateTraveller(traveller.id, {
      active: false,
      exiled: true,
      exiledWhen: `D${night}`,
      alive: false,
      deadVoteAvailable: true,
      voteTokens: 0,
    });
    setExileTravellerOpen(false);
    setMenuOpen(false);
    setTravellerPanelId(null);
  }

  function openSlayerTriggerPanel() {
    if (!selectedPlayer) {
      return;
    }

    setTriggerDraft({
      kind: "slayer",
      rolePlayerId: selectedPlayer,
      targetPlayerId: null,
      when: `D${night}`,
      result: null,
    });
    setPlayerPanel("trigger");
  }

  function openAbilityTriggerMenu() {
    if (!selectedPlayer) return;
    setTriggerDraft(null);
    setPlayerPanel("trigger_choice");
  }

  function saveAbilityTrigger() {
    if (!triggerDraft || triggerDraft.result === null) {
      return;
    }

    if (!triggerDraft.targetPlayerId) {
      return;
    }

    const id = eventId();
    const event: AbilityTriggerEvent = {
      id,
      roleId: triggerDraft.kind,
      rolePlayerId: triggerDraft.rolePlayerId,
      targetPlayerId: triggerDraft.targetPlayerId,
      when: triggerDraft.when,
      triggered: triggerDraft.result,
      sourceEventId: triggerDraft.sourceEventId,
    };

    setAbilityTriggerLog((current) => [...current, event]);

    if (triggerDraft.result) {
      createDeathEvent({
        id: id + 1,
        playerId: triggerDraft.targetPlayerId,
        when: triggerDraft.when,
        reason: triggerDraft.kind === "virgin" ? "execution" : "ability",
        isExecution: triggerDraft.kind === "virgin",
        sourceRoleId: triggerDraft.kind,
        sourcePlayerId: triggerDraft.rolePlayerId,
        sourceEventId: id,
      });
    }

    setTriggerDraft(null);
    resetNominationForm();
    setPlayerPanel("menu");
  }

  function saveTalk() {
    if (!selectedPlayer || talkParticipants.length === 0) {
      return;
    }

    const participants = [...new Set([selectedPlayer, ...talkParticipants])];
    if (participants.length < 2) return;
    const event: TalkEvent = {
      id: eventId(),
      participants,
      when: talkWhen,
      topic: talkTopic,
      details: talkTopic === null ? null : talkDetails.trim() || null,
    };

    setTalkLog((current) => [...current, event]);
    resetTalkForm();
    returnFromPlayerPanel();
  }

  function openSelfMenu() {
    setSelectedPlayer(null);
    setPlayerPanel("menu");
    setSelfPanel("menu");
    setPendingSelfRole(selfRole.shownRole);
    setSelfMenuOpen(true);
  }

  function openSelfPlayerPanel(panel: PlayerPanel) {
    setSelfMenuOpen(false);
    setSelectedPlayer("self");

    if (panel === "claim") {
      resetClaimForm();
    } else if (panel === "ability_claim") {
      resetAbilityClaimForm();
      setAbilityClaimRole(getLatestExactRoleClaim("self"));
    } else if (panel === "nomination") {
      resetNominationForm();
    } else if (panel === "talk") {
      resetTalkForm();
    }

    setPlayerPanel(panel);
  }

  function returnFromPlayerPanel() {
    if (selectedPlayer === "self") {
      setSelectedPlayer(null);
      setPlayerPanel("menu");
      setSelfPanel("menu");
      setSelfMenuOpen(true);
      return;
    }

    setPlayerPanel("menu");
  }

  function openSelfInfoPanel() {
    const abilityRole = getSelfAbilityRole();
    if (!abilityRole || !ROLES[abilityRole].tags.includes("INFO_SOURCE")) return;

    resetSelfInfoForm();
    const options = getSelfInfoNightOptions(abilityRole);
    if (options.length > 0) setSelfInfoWhen(options[options.length - 1]);
    if (abilityRole === "juggler" && options.length > 0) {
      const resultNight = Number.parseInt(options[options.length - 1].slice(1), 10);
      setSelfJugglerGuessDay(`D${Math.max(1, resultNight - 1)}`);
    }
    setSelfPanel("info");
  }

  function openSelfActionPanel() {
    const abilityRole = getSelfAbilityRole();
    if (!abilityRole) return;

    resetSelfActionForm();

    if (isBmrRecordedActionRole(abilityRole)) {
      const options=rolePhaseOptions(abilityRole,night,'action');
      setSelfActionWhen(options[options.length-1]??`N${night}`);
    } else if (["philosopher","engineer","huntsman","nightwatchman","preacher"].includes(abilityRole)) {
      const options = getNightOptions(1);
      setSelfActionWhen(options[options.length - 1] ?? "N1");
    } else if (["monk","exorcist","acrobat","lycanthrope","pixie"].includes(abilityRole)) {
      const options = getNightOptions(2);
      setSelfActionWhen(options[options.length - 1] ?? "N2");
    } else if (abilityRole === "snake_charmer") {
      const options = getNightOptions(1);
      setSelfActionWhen(options[options.length - 1] ?? "N1");
    } else {
      setSelfActionWhen(`D${night}`);
    }

    setSelfPanel("action");
  }

  function saveBmrAction() {
    const role=getSelfAbilityRole();
    if (!isBmrRecordedActionRole(role) || !bmrActionCanBeRecorded(role,selfActionWhen,night)) return;
    const spec=BMR_ACTION_SPECS[role];
    const previous=selfActionLog.filter((e):e is Extract<SelfActionEvent,{kind:'bmr_action'}>=>e.roleId===role && 'kind' in e && e.kind==='bmr_action');
    const count=bmrActionTargets.length;
    const last = [...previous].sort(compareEvents).at(-1);
    const max=role==='po' && last?.when===`N${Number(selfActionWhen.slice(1))-1}` && last.targets.length===0 ? 3 : spec.max;
    const min=role==='po' && max===3 ? 3 : spec.min;
    const alreadyDied=deathLog.some(d=>d.playerId==='self' && Number(d.when.slice(1))===Number(selfActionWhen.slice(1)) && (d.when.startsWith('N')||d.when===selfActionWhen));
    const previousDayDied=role==='zombuul' && deathLog.some(d=>d.when===`D${Number(selfActionWhen.slice(1))-1}`);
    if(count<min||count>max ||
      (role==='moonchild' && !alreadyDied) || previousDayDied ||
      (spec.role&&!bmrActionRole) ||
      (role==='gossip'&&!bmrActionNote.trim()) ||
      (spec.once&&previous.length>0) ||
      previous.some(e=>e.when===selfActionWhen) ||
      (role==='devils_advocate'&&last?.when===`N${Number(selfActionWhen.slice(1))-1}`&&last.targets[0]===bmrActionTargets[0]))return;
    setSelfActionLog(current=>[...current,{
      id:eventId(),kind:'bmr_action',roleId:role,when:selfActionWhen,targets:[...bmrActionTargets],chosenRole:bmrActionRole,note:bmrActionNote.trim()||null,
    }]);
    resetSelfActionForm();setSelfPanel('menu');
  }

  function saveSelfGodfatherInfo() {
    if (selfInfoLog.some(e=>e.roleId==='godfather') || selfGodfatherRoles.some(r=>ROLES[r]?.type!=='outsider'||!currentScriptRoleIds.includes(r))) return;
    setSelfInfoLog(current=>[...current,{id:eventId(),roleId:'godfather',when:'N1',shownOutsiders:[...selfGodfatherRoles]}]);
    setSelfGodfatherRoles([]);resetSelfInfoForm();setSelfPanel('menu');
  }
  function saveSelfGrandmotherInfo() {
    if (selfInfoPlayers.length !== 1 || selfInfoPlayers[0] === 'self' || !selfInfoShownRole ||
        selfInfoWhen !== 'N1' || selfInfoLog.some(e => e.roleId === 'grandmother')) return;
    setSelfInfoLog(current => [...current, {id:eventId(), roleId:'grandmother', when:'N1', player:selfInfoPlayers[0], shownRole:selfInfoShownRole}]);
    resetSelfInfoForm(); setSelfPanel('menu');
  }
  function saveSelfChambermaidInfo() {
    if (selfInfoPlayers.length !== 2 || selfInfoPlayers.includes('self') ||
        selfInfoNumber === null || selfInfoNumber > 2 || selfInfoNumber < 0 ||
        !getSelfInfoNightOptions('chambermaid').includes(selfInfoWhen) ||
        selfInfoLog.some(e => e.roleId === 'chambermaid' && e.when === selfInfoWhen)) return;
    setSelfInfoLog(current => [...current, {id:eventId(), roleId:'chambermaid', when:selfInfoWhen, players:[selfInfoPlayers[0],selfInfoPlayers[1]], number:selfInfoNumber as 0|1|2}]);
    resetSelfInfoForm(); setSelfPanel('menu');
  }
  function saveSelfPairInfo(roleId: "washerwoman" | "investigator") {
    if (selfInfoPlayers.length !== 2 || !selfInfoShownRole) {
      return;
    }

    setSelfInfoLog((current) => [
      ...current,
      {
        id: eventId(),
        roleId,
        when: selfInfoWhen,
        players: [selfInfoPlayers[0], selfInfoPlayers[1]],
        shownRole: selfInfoShownRole,
      },
    ]);

    resetSelfInfoForm();
    setSelfPanel("menu");
  }

  function saveSelfLibrarianInfo() {
    if (librarianNoOutsiders) {
      setSelfInfoLog((current) => [
        ...current,
        {
          id: eventId(),
          roleId: "librarian",
          when: selfInfoWhen,
          noOutsiders: true,
        },
      ]);
    } else {
      if (selfInfoPlayers.length !== 2 || !selfInfoShownRole) {
        return;
      }

      setSelfInfoLog((current) => [
        ...current,
        {
          id: eventId(),
          roleId: "librarian",
          when: selfInfoWhen,
          noOutsiders: false,
          players: [selfInfoPlayers[0], selfInfoPlayers[1]],
          shownRole: selfInfoShownRole,
        },
      ]);
    }

    resetSelfInfoForm();
    setSelfPanel("menu");
  }

  function saveSelfChefInfo() {
    if (selfInfoNumber === null) return;
    setSelfInfoLog((current) => [
      ...current,
      {
        id: eventId(),
        roleId: "chef",
        when: selfInfoWhen,
        number: selfInfoNumber,
      },
    ]);

    resetSelfInfoForm();
    setSelfPanel("menu");
  }

  function saveSelfEmpathInfo() {
    if (selfInfoNumber === null || !getSelfInfoNightOptions("empath").includes(selfInfoWhen)) return;
    setSelfInfoLog((current) => [
      ...current,
      {
        id: eventId(),
        roleId: "empath",
        when: selfInfoWhen,
        number: selfInfoNumber as 0 | 1 | 2,
      },
    ]);

    resetSelfInfoForm();
    setSelfPanel("menu");
  }

  function saveSelfNumberInfo(roleId: "clockmaker" | "oracle" | "mathematician") {
    if (selfInfoNumber === null || !getSelfInfoNightOptions(roleId).includes(selfInfoWhen)) return;
    setSelfInfoLog((current) => [
      ...current,
      { id: eventId(), roleId, when: selfInfoWhen, number: selfInfoNumber },
    ]);
    resetSelfInfoForm();
    setSelfPanel("menu");
  }

  function saveSelfDreamerInfo() {
    if (selfInfoPlayers.length !== 1 || !selfInfoShownRole || !selfInfoShownRole2 || selfInfoShownRole === selfInfoShownRole2 || !getSelfInfoNightOptions("dreamer").includes(selfInfoWhen)) return;
    setSelfInfoLog((current) => [
      ...current,
      { id: eventId(), roleId: "dreamer", when: selfInfoWhen, player: selfInfoPlayers[0], shownRoles: [selfInfoShownRole, selfInfoShownRole2] },
    ]);
    resetSelfInfoForm();
    setSelfPanel("menu");
  }

  function saveSelfSimpleYesNoInfo(roleId: "flowergirl" | "town_crier") {
    if (selfInfoYesNo === null || !getSelfInfoNightOptions(roleId).includes(selfInfoWhen)) return;
    setSelfInfoLog((current) => [
      ...current,
      { id: eventId(), roleId, when: selfInfoWhen, result: selfInfoYesNo },
    ]);
    resetSelfInfoForm();
    setSelfPanel("menu");
  }

  function buildSelfSavantStatement(kind: "roleInPlay" | "roleAmong", roleId: RoleId | null, players: string[]): SavantStatement | null {
    if (!roleId) return null;
    return kind === "roleInPlay" ? { kind, roleId } : players.length ? { kind, roleId, players } : null;
  }

  function saveSelfSavantInfo() {
    const a = buildSelfSavantStatement(selfSavantKind1, selfSavantRole1, selfSavantPlayers1);
    const b = buildSelfSavantStatement(selfSavantKind2, selfSavantRole2, selfSavantPlayers2);
    if (!a || !b || !getDayOptions().includes(selfInfoWhen)) return;
    setSelfInfoLog((current) => [...current, { id: eventId(), roleId: "savant", when: selfInfoWhen, statements: [a, b] }]);
    resetSelfInfoForm();
    setSelfPanel("menu");
  }

  function saveSelfSeamstressInfo() {
    if (selfInfoPlayers.length !== 2 || selfInfoYesNo === null || !getSelfInfoNightOptions("seamstress").includes(selfInfoWhen)) return;
    setSelfInfoLog((current) => [
      ...current,
      { id: eventId(), roleId: "seamstress", when: selfInfoWhen, players: [selfInfoPlayers[0], selfInfoPlayers[1]], result: selfInfoYesNo === "yes" ? "same" : "different" },
    ]);
    resetSelfInfoForm();
    setSelfPanel("menu");
  }

  function saveSelfArtistInfo() {
    if (selfInfoLog.some((entry) => entry.roleId === "artist") || !selfArtistQuestion.trim() || selfArtistResult === null || !getSelfInfoNightOptions("artist").includes(selfInfoWhen)) return;
    setSelfInfoLog((current) => [...current, { id: eventId(), roleId: "artist", when: selfInfoWhen, question: selfArtistQuestion.trim(), result: selfArtistResult }]);
    resetSelfInfoForm();
    setSelfPanel("menu");
  }

  function saveSelfJugglerInfo() {
    if (selfInfoLog.some((entry) => entry.roleId === "juggler") || selfJugglerGuesses.length === 0 || selfJugglerGuesses.length > 5 || selfInfoNumber === null || selfInfoNumber < 0 || selfInfoNumber > selfJugglerGuesses.length || !getSelfInfoNightOptions("juggler").includes(selfInfoWhen)) return;
    const expectedGuessDay = `D${Math.max(1, Number.parseInt(selfInfoWhen.slice(1), 10) - 1)}`;
    if (selfJugglerGuessDay !== expectedGuessDay) return;
    setSelfInfoLog((current) => [...current, { id: eventId(), roleId: "juggler", when: selfInfoWhen, guessDay: selfJugglerGuessDay, guesses: selfJugglerGuesses, number: selfInfoNumber }]);
    resetSelfInfoForm();
    setSelfPanel("menu");
  }

  function saveSelfSageInfo() {
    if (selfInfoPlayers.length !== 2 || !getSelfInfoNightOptions("sage").includes(selfInfoWhen)) return;
    setSelfInfoLog((current) => [...current, { id: eventId(), roleId: "sage", when: selfInfoWhen, players: [selfInfoPlayers[0], selfInfoPlayers[1]] }]);
    resetSelfInfoForm();
    setSelfPanel("menu");
  }

  function saveSelfSinglePlayerInfo(roleId: "balloonist" | "bounty_hunter" | "choirboy" | "high_priestess") {
    if (selfInfoPlayers.length !== 1 || !getSelfInfoNightOptions(roleId).includes(selfInfoWhen)) return;
    if (roleId === "bounty_hunter" && selfInfoLog.some((event) => event.roleId === "bounty_hunter" && event.player === selfInfoPlayers[0])) return;
    setSelfInfoLog((current) => [
      ...current,
      { id: eventId(), roleId, when: selfInfoWhen, player: selfInfoPlayers[0] },
    ]);
    resetSelfInfoForm();
    setSelfPanel("menu");
  }

  function saveSelfKnightNobleInfo(roleId: "knight" | "noble") {
    const required = roleId === "knight" ? 2 : 3;
    if (selfInfoPlayers.length !== required || new Set(selfInfoPlayers).size !== required || selfInfoWhen !== "N1" || selfInfoLog.some(e=>e.roleId === roleId)) return;
    if (roleId === "knight") setSelfInfoLog(cur=>[...cur,{id:eventId(),roleId:"knight",when:"N1",players:[selfInfoPlayers[0],selfInfoPlayers[1]]}]);
    else setSelfInfoLog(cur=>[...cur,{id:eventId(),roleId:"noble",when:"N1",players:[selfInfoPlayers[0],selfInfoPlayers[1],selfInfoPlayers[2]]}]);
    resetSelfInfoForm(); setSelfPanel("menu");
  }
  function saveSelfPixieInfo() {
    if (!selfInfoShownRole || ROLES[selfInfoShownRole].type !== "townsfolk" || !currentScriptRoleIds.includes(selfInfoShownRole) || selfInfoShownRole === "pixie" || selfInfoLog.some(e=>e.roleId === "pixie")) return;
    setSelfInfoLog(cur=>[...cur,{id:eventId(),roleId:"pixie",when:"N1",shownRole:selfInfoShownRole}]);
    resetSelfInfoForm(); setSelfPanel("menu");
  }
  function saveSelfKingInfo() {
    if (!selfInfoShownRole || !getSelfInfoNightOptions("king").includes(selfInfoWhen) ||
        selfInfoLog.some(e => e.roleId === "king" && e.when === selfInfoWhen)) return;
    setSelfInfoLog(cur => [...cur, {id:eventId(), roleId:"king", when:selfInfoWhen, shownRole:selfInfoShownRole}]);
    resetSelfInfoForm(); setSelfPanel("menu");
  }
  function saveSelfGeneralInfo() {
    if (!selfGeneralResult || !getSelfInfoNightOptions("general").includes(selfInfoWhen) ||
        selfInfoLog.some(e => e.roleId === "general" && e.when === selfInfoWhen)) return;
    setSelfInfoLog(cur => [...cur, {id:eventId(), roleId:"general", when:selfInfoWhen, result:selfGeneralResult}]);
    resetSelfInfoForm(); setSelfPanel("menu");
  }
  function saveSelfStewardInfo() {
    if(selfInfoPlayers.length !== 1 || !getSelfInfoNightOptions("steward").includes(selfInfoWhen) || selfInfoLog.some(e=>e.roleId==="steward"))return;
    setSelfInfoLog(cur=>[...cur,{id:eventId(),roleId:"steward",when:selfInfoWhen,player:selfInfoPlayers[0]}]);
    resetSelfInfoForm();setSelfPanel("menu");
  }
  function saveSelfShugenjaInfo() {
    if(!selfShugenjaDirection || !getSelfInfoNightOptions("shugenja").includes(selfInfoWhen) || selfInfoLog.some(e=>e.roleId==="shugenja"))return;
    setSelfInfoLog(cur=>[...cur,{id:eventId(),roleId:"shugenja",when:selfInfoWhen,direction:selfShugenjaDirection}]);
    resetSelfInfoForm();setSelfPanel("menu");
  }
  function saveSelfVillageInfo() {
    if(selfInfoPlayers.length !== 1 || !selfVillageResult || !getSelfInfoNightOptions("village_idiot").includes(selfInfoWhen) || selfInfoLog.some(e=>e.roleId==="village_idiot" && e.when===selfInfoWhen))return;
    setSelfInfoLog(cur=>[...cur,{id:eventId(),roleId:"village_idiot",when:selfInfoWhen,player:selfInfoPlayers[0],result:selfVillageResult}]);
    resetSelfInfoForm();setSelfPanel("menu");
  }
  function saveSelfPreacherAction() {
    if(!selfActionTarget || !getNightOptions(1).includes(selfActionWhen) || selfActionLog.some(e=>e.roleId==="preacher" && e.when===selfActionWhen))return;
    setSelfActionLog(cur=>[...cur,{id:eventId(),roleId:"preacher",when:selfActionWhen,target:selfActionTarget}]);
    resetSelfActionForm();setSelfPanel("menu");
  }
  function saveSelfPrincessAction() {
    if(!selfActionTarget || !getDayOptions().includes(selfActionWhen) || selfActionLog.some(e=>e.roleId==="princess"))return;
    if(!nominationLog.some(e=>e.when===selfActionWhen && e.nominator==="self" && e.nominee===selfActionTarget))return;
    if(noExecutionDays.includes(Number(selfActionWhen.slice(1))) || deathLog.some(e=>e.when===selfActionWhen && diedByExecution(e) && e.playerId!==selfActionTarget))return;
    setSelfActionLog(cur=>[...cur,{id:eventId(),roleId:"princess",kind:"first_day_execution",when:selfActionWhen,nominee:selfActionTarget}]);
    resetSelfActionForm();setSelfPanel("menu");
  }
  function saveSelfFisherInfo() {
    if (!selfFisherAdvice.trim() || !getSelfInfoNightOptions("fisherman").includes(selfInfoWhen) ||
        selfInfoLog.some(e => e.roleId === "fisherman")) return;
    setSelfInfoLog(cur => [...cur, {id:eventId(), roleId:"fisherman", when:selfInfoWhen, advice:selfFisherAdvice.trim()}]);
    resetSelfInfoForm(); setSelfPanel("menu");
  }
  function saveSelfHuntsmanAction() {
    if (!selfActionTarget || selfActionTarget === "self" || playerStatus[selfActionTarget]?.alive === false || !getNightOptions(1).includes(selfActionWhen) || selfActionLog.some(e=>e.roleId === "huntsman")) return;
    if (selfHuntsmanRole && (!currentScriptRoleIds.includes(selfHuntsmanRole) || ROLES[selfHuntsmanRole].type !== "townsfolk")) return;
    setSelfActionLog(cur=>[...cur,{id:eventId(),roleId:"huntsman",when:selfActionWhen,target:selfActionTarget,rescuedRole:selfHuntsmanRole}]);
    resetSelfActionForm(); setSelfPanel("menu");
  }
  function saveSelfNightwatchmanAction() {
    if (!selfActionTarget || !getNightOptions(1).includes(selfActionWhen) || selfActionLog.some(e=>e.roleId === "nightwatchman")) return;
    setSelfActionLog(cur=>[...cur,{id:eventId(),roleId:"nightwatchman",when:selfActionWhen,target:selfActionTarget}]);
    resetSelfActionForm(); setSelfPanel("menu");
  }
  function saveSelfLycanAction() {
    if (!selfActionTarget || playerStatus[selfActionTarget]?.alive === false || !getNightOptions(2).includes(selfActionWhen) || selfActionLog.some(e=>e.roleId === "lycanthrope" && e.when === selfActionWhen)) return;
    setSelfActionLog(cur=>[...cur,{id:eventId(),roleId:"lycanthrope",when:selfActionWhen,target:selfActionTarget,killed:selfLycanKilled}]);
    resetSelfActionForm(); setSelfPanel("menu");
  }
  function saveSelfPixieAwakening() {
    const shown = selfInfoLog.find((event):event is Extract<SelfInfoEvent,{roleId:"pixie"}>=>event.roleId === "pixie" && event.when === "N1");
    if (selfRole.shownRole !== "pixie" || !shown || selfActionLog.some(e=>e.roleId==="pixie") || !getNightOptions(2).includes(selfActionWhen)) return;
    setSelfActionLog(cur=>[...cur,{id:eventId(),roleId:"pixie",kind:"madness_confirmed",when:selfActionWhen,shownRole:shown.shownRole}]);
    resetSelfActionForm(); setSelfPanel("menu");
  }
  function saveDamselGuess() {
    if (!selfActionTarget || !selfDamselMinion || !getDayOptions().includes(selfActionWhen) || selfActionLog.some(e=>e.roleId === "damsel")) return;
    setSelfActionLog(cur=>[...cur,{id:eventId(),roleId:"damsel",kind:"minion_guess",when:selfActionWhen,minion:selfDamselMinion,target:selfActionTarget,won:selfDamselWon}]);
    resetSelfActionForm(); setSelfPanel("menu");
  }
  function saveSelfEngineerAction() {
    if (!getNightOptions(1).includes(selfActionWhen) || selfActionLog.some(e => e.roleId === "engineer")) return;
    const chosen = selfEngineerMode === "demon" ? [selfEngineerDemon] : selfEngineerMinions;
    const count = selfEngineerMode === "demon" ? 1 : setupCounts(playerCount).minion;
    const type = selfEngineerMode === "demon" ? "demon" : "minion";
    if (chosen.length !== count || chosen.some(r => !r || !currentScriptRoleIds.includes(r) || ROLES[r].type !== type) || new Set(chosen).size !== count) return;
    if (selfEngineerMode === "demon" && selfEngineerDemon) {
      setSelfActionLog(cur => [...cur,{id:eventId(),roleId:"engineer",when:selfActionWhen,kind:"demon",demonRole:selfEngineerDemon}]);
    } else if (selfEngineerMode === "minions") {
      setSelfActionLog(cur => [...cur,{id:eventId(),roleId:"engineer",when:selfActionWhen,kind:"minions",minionRoles:[...selfEngineerMinions]}]);
    }
    resetSelfActionForm(); setSelfPanel("menu");
  }
  function saveSelfFarmerTransformation() {
    if (!selfFarmerDeceased || selfFarmerDeceased === "self" || !getNightOptions(2).includes(selfActionWhen) ||
        !deathLog.some(d => d.playerId === selfFarmerDeceased && d.when === selfActionWhen && (d.reason === "night_death" || (d.sourceRoleId && ROLES[d.sourceRoleId].type === "demon"))) ||
        selfActionLog.some(a => a.roleId === "farmer")) return;
    setSelfActionLog(cur => [...cur,{id:eventId(),roleId:"farmer",kind:"became_farmer",when:selfActionWhen,deceasedFarmer:selfFarmerDeceased}]);
    resetSelfActionForm(); setSelfPanel("menu");
  }

  function saveSelfFortuneTellerInfo() {
    if (selfInfoPlayers.length !== 2 || selfInfoYesNo === null || !getSelfInfoNightOptions("fortune_teller").includes(selfInfoWhen)) {
      return;
    }

    setSelfInfoLog((current) => [
      ...current,
      {
        id: eventId(),
        roleId: "fortune_teller",
        when: selfInfoWhen,
        players: [selfInfoPlayers[0], selfInfoPlayers[1]],
        result: selfInfoYesNo,
      },
    ]);

    resetSelfInfoForm();
    setSelfPanel("menu");
  }

  function saveSelfRoleRevealInfo(roleId: "undertaker" | "ravenkeeper") {
    if (selfInfoPlayers.length !== 1 || !selfInfoShownRole || !getSelfInfoNightOptions(roleId).includes(selfInfoWhen)) {
      return;
    }

    const id = eventId();
    const player = selfInfoPlayers[0];
    const shownRole = selfInfoShownRole;

    if (roleId === "undertaker") {
      setSelfInfoLog((current) => [
        ...current,
        {
          id,
          roleId: "undertaker",
          when: selfInfoWhen,
          player,
          shownRole,
        },
      ]);
    } else {
      setSelfInfoLog((current) => [
        ...current,
        {
          id,
          roleId: "ravenkeeper",
          when: selfInfoWhen,
          player,
          shownRole,
        },
      ]);
    }

    resetSelfInfoForm();
    setSelfPanel("menu");
  }

  function saveSelfPhilosopherAction() {
    if (!selfPhilosopherRole || !getNightOptions(1).includes(selfActionWhen)) return;
    const chosen = ROLES[selfPhilosopherRole];
    if (!chosen || (chosen.type !== "townsfolk" && chosen.type !== "outsider") || selfPhilosopherRole === "philosopher" || !currentScriptRoleIds.includes(selfPhilosopherRole)) return;
    if (selfActionLog.some((event) => event.roleId === "philosopher")) return;
    setSelfActionLog((current) => [...current, { id: eventId(), roleId: "philosopher", when: selfActionWhen, gainedRole: selfPhilosopherRole }]);
    resetSelfActionForm();
    setSelfPanel("menu");
  }

  function saveSelfKlutzAction() {
    if (!selfActionTarget || selfActionTarget === "self" || selfKlutzTeamLost === null || !getPhaseOptions().includes(selfActionWhen) || playerStatus.self?.alive !== false || playerStatus[selfActionTarget]?.alive === false) return;
    if (selfActionLog.some((event) => event.roleId === "klutz")) return;
    setSelfActionLog((current) => [...current, { id: eventId(), roleId: "klutz", when: selfActionWhen, target: selfActionTarget, teamLost: selfKlutzTeamLost }]);
    resetSelfActionForm();
    setSelfPanel("menu");
  }

  function saveSelfMonkAction() {
    if (!selfActionTarget || selfActionTarget === "self" || !getNightOptions(2).includes(selfActionWhen)) {
      return;
    }

    const duplicate = selfActionLog.some(
      (event) => event.roleId === "monk" && event.when === selfActionWhen
    );

    if (duplicate) {
      const replace = window.confirm(
        `${selfActionWhen}の僧侶の行動は既にあります。置き換えますか？`
      );

      if (!replace) {
        return;
      }
    }

    setSelfActionLog((current) => [
      ...current.filter(
        (event) => !(event.roleId === "monk" && event.when === selfActionWhen)
      ),
      {
        id: eventId(),
        roleId: "monk",
        when: selfActionWhen,
        target: selfActionTarget,
      },
    ]);

    resetSelfActionForm();
    setSelfPanel("menu");
  }

  function saveSelfExorcistAction() {
    if (!selfActionTarget || !getNightOptions(2).includes(selfActionWhen)) {
      return;
    }

    const previous = selfActionLog
      .filter((event): event is Extract<SelfActionEvent, { roleId: "exorcist" }> => event.roleId === "exorcist")
      .filter((event) => compareEvents(event, { when: selfActionWhen, id: Infinity }) < 0)
      .sort(compareEvents)
      .at(-1);

    if (previous?.target === selfActionTarget) {
      window.alert("祓魔師は前の夜と同じ人を選べません。");
      return;
    }

    const duplicate = selfActionLog.some(
      (event) => event.roleId === "exorcist" && event.when === selfActionWhen
    );

    if (duplicate) {
      const replace = window.confirm(
        `${selfActionWhen}の祓魔師の行動は既にあります。置き換えますか？`
      );
      if (!replace) return;
    }

    setSelfActionLog((current) => [
      ...current.filter(
        (event) => !(event.roleId === "exorcist" && event.when === selfActionWhen)
      ),
      {
        id: eventId(),
        roleId: "exorcist",
        when: selfActionWhen,
        target: selfActionTarget,
      },
    ]);

    resetSelfActionForm();
    setSelfPanel("menu");
  }

  function saveSelfSnakeCharmerAction() {
    if (!selfActionTarget || !getNightOptions(1).includes(selfActionWhen)) return;
    if (selfSnakeSwapped && (!selfSnakeDemonRole || ROLES[selfSnakeDemonRole].type !== "demon")) return;
    const duplicate = selfActionLog.some((event) => event.roleId === "snake_charmer" && event.when === selfActionWhen);
    if (duplicate && !window.confirm(`${selfActionWhen}の蛇使いの行動は既にあります。置き換えますか？`)) return;
    setSelfActionLog((current) => [
      ...current.filter((event) => !(event.roleId === "snake_charmer" && event.when === selfActionWhen)),
      { id: eventId(), roleId: "snake_charmer", when: selfActionWhen, target: selfActionTarget, swapped: selfSnakeSwapped, newDemonRole: selfSnakeSwapped ? selfSnakeDemonRole : null },
    ]);
    resetSelfActionForm();
    setSelfPanel("menu");
  }

  function saveSelfSlayerAction() {
    if (!selfActionTarget) {
      return;
    }

    if (selfActionLog.some((event) => event.roleId === "slayer")) {
      return;
    }

    const id = eventId();
    setSelfActionLog((current) => [
      ...current,
      {
        id,
        roleId: "slayer",
        when: selfActionWhen,
        target: selfActionTarget,
        killed: selfSlayerKilled,
      },
    ]);

    setAbilityTriggerLog((current) => [
      ...current,
      {
        id: id + 1,
        roleId: "slayer",
        rolePlayerId: "self",
        sourceEventId: id,
        when: selfActionWhen,
        targetPlayerId: selfActionTarget,
        triggered: selfSlayerKilled,
      },
    ]);

    if (selfSlayerKilled) {
      createDeathEvent({
        id: id + 2,
        playerId: selfActionTarget,
        when: selfActionWhen,
        reason: "ability",
        sourceRoleId: "slayer",
        sourcePlayerId: "self",
        sourceEventId: id + 1,
      });
    }

    resetSelfActionForm();
    setSelfPanel("menu");
  }

  function saveSelfAcrobatAction() {
    if (!selfActionTarget || !getNightOptions(2).includes(selfActionWhen)) return;
    const duplicate = selfActionLog.some((event) => event.roleId === "acrobat" && event.when === selfActionWhen);
    if (duplicate && !window.confirm(`${selfActionWhen}の軽業師の行動は既にあります。置き換えますか？`)) return;
    const id = eventId();
    setSelfActionLog((current) => [
      ...current.filter((event) => !(event.roleId === "acrobat" && event.when === selfActionWhen)),
      { id, roleId: "acrobat", when: selfActionWhen, target: selfActionTarget, died: selfAcrobatDied },
    ]);
    if (selfAcrobatDied && !deathLog.some((death) => death.playerId === "self" && death.when === selfActionWhen && death.sourceRoleId === "acrobat")) {
      createDeathEvent({ id: id + 1, playerId: "self", when: selfActionWhen, reason: "ability", sourceRoleId: "acrobat", sourcePlayerId: "self", sourceEventId: id });
    }
    resetSelfActionForm(); setSelfAcrobatDied(false); setSelfPanel("menu");
  }

  function saveSelfAlchemistAbility() {
    if (!selfAlchemistRole || ROLES[selfAlchemistRole]?.type !== "minion" || !currentScriptRoleIds.includes(selfAlchemistRole)) return;
    setSelfActionLog((current) => [
      ...current.filter((event) => event.roleId !== "alchemist"),
      { id: eventId(), roleId: "alchemist", kind: "minion_ability", when: "N1", minionRole: selfAlchemistRole },
    ]);
    setSelfPanel("menu");
  }

  function saveSelfAlsaahirGuess() {
    if (!getDayOptions().includes(selfActionWhen) || selfActionLog.some((event) => event.roleId === "alsaahir" && event.when === selfActionWhen)) return;
    if (!selfAlsaahirDemons.length) return;
    const overlap = selfAlsaahirMinions.some((player) => selfAlsaahirDemons.includes(player));
    if (overlap) return;
    setSelfActionLog((current) => [...current, { id: eventId(), roleId: "alsaahir", when: selfActionWhen, minions: [...selfAlsaahirMinions], demons: [...selfAlsaahirDemons], won: selfAlsaahirWon }]);
    setSelfAlsaahirMinions([]); setSelfAlsaahirDemons([]); setSelfAlsaahirWon(false); setSelfPanel("menu");
  }

  function saveAmnesiacTagAnswer(tag: RoleTag, matches: boolean) {
    if (selfActionLog.some((event) => event.roleId === "amnesiac" && event.kind === "tag_answer" && event.tag === tag)) return;
    setSelfActionLog((current) => [...current, { id: eventId(), roleId: "amnesiac", kind: "tag_answer", when: `D${night}`, tag, matches }]);
  }

  function lockAmnesiacRole(roleId: RoleId) {
    if (!getAmnesiacCandidates().some((role) => role.id === roleId)) return;
    setSelfActionLog((current) => [
      ...current.filter((event) => !(event.roleId === "amnesiac" && event.kind === "lock_role")),
      { id: eventId(), roleId: "amnesiac", kind: "lock_role", when: `D${night}`, chosenRole: roleId },
    ]);
    setSelfPanel("menu");
  }

  function hasTalked(player: string) {
    return talkLog.some((talk) => talk.participants.includes(player));
  }

  function getSeamstressMarkers(player: string): string[] {
    const links: Array<{ id: number; when: string; players: [string, string]; result: "same" | "different" }> = [];
    for (const event of selfInfoLog) {
      if (event.roleId === "seamstress") links.push({ id: event.id, when: event.when, players: event.players, result: event.result });
    }
    for (const event of abilityClaimLog) {
      if (event.roleId === "seamstress" && event.structured?.kind === "pairAlignment") {
        links.push({ id: event.id, when: event.when, players: event.structured.players, result: event.structured.result });
      }
    }
    return links
      .sort(compareEvents)
      .map((link, index) => ({ link, index }))
      .filter(({ link }) => link.players.includes(player))
      .map(({ link, index }) => `縫${index + 1}${link.result === "same" ? "=" : "≠"}`);
  }

  function getMinionMarkers(player: string): string[] {
    if (!selfRole.shownRole || ROLES[selfRole.shownRole].type !== "minion") return [];
    const markers: string[] = [];
    if (selfRole.shownRole === "evil_twin" && minionState.evilTwin?.playerId === player) markers.push("双");
    const latestWitch = minionActionLog.filter((a): a is Extract<MinionActionEvent,{roleId:"witch"}> => a.roleId === "witch").sort((a,b)=>b.id-a.id)[0];
    if (latestWitch?.target === player) markers.push(`呪${latestWitch.when.slice(1)}`);
    const latestCere = minionActionLog.filter((a): a is Extract<MinionActionEvent,{roleId:"cerenovus"}> => a.roleId === "cerenovus").sort((a,b)=>b.id-a.id)[0];
    if (latestCere?.target === player) markers.push(`脳${latestCere.when.slice(1)}${ROLES[latestCere.madRole].symbol}`);
    const latestPit = minionActionLog.filter((a): a is Extract<MinionActionEvent,{roleId:"pit_hag"}> => a.roleId === "pit_hag").filter(a=>a.target===player).sort((a,b)=>b.id-a.id)[0];
    if (latestPit) markers.push(`変${latestPit.when.slice(1)}${ROLES[latestPit.newRole].symbol}`);
    return markers;
  }

  function renderPlayerButton(player: string) {
    const active=isPlayerActive(player),claim=active?getLatestClaim(player):null;
    const dead=active && playerStatus[player]?.alive===false;
    const selfType=selfRole.shownRole?ROLES[selfRole.shownRole].type:null;
    const spyGrimoireRole = active && selfRole.shownRole === "spy"
      ? minionState.spyInitialRoles[player] ?? null
      : null;
    const boardRoleLabel = spyGrimoireRole
      ? `${ROLES[spyGrimoireRole].symbol} ${ROLES[spyGrimoireRole].name}`
      : getClaimLabel(claim);
    const fellowMinion=active && (
      (selfRole.shownRole==="imp" && demonState.knownMinions.some(m=>m.playerId===player)) ||
      (selfType==="minion" && minionState.knownMinions.some(m=>m.playerId===player))
    );
    const knownDemon=active && selfType==="minion" && minionState.knownDemon?.playerId===player;
    const ally=fellowMinion||knownDemon;
    const name=playerNames[player];
    return <div className="player-slot" key={player}>
      <button className={`player-button${dead?" player-dead":""}${ally?" player-evil-ally":""}`} disabled={!active} onClick={()=>openPlayerMenu(player)} aria-label={`${getPlayerDisplayName(player)} ${boardRoleLabel}`}>
        {active&&hasTalked(player)&&<span className="talk-indicator" title="会話記録あり"/>}
        {active&&[...getSeamstressMarkers(player), ...getMinionMarkers(player)].slice(0,3).map((label, index)=><span key={`${label}-${index}`} className={`relation-indicator relation-indicator-${Math.min(index,2)}`} title="リンク / 能力マーカー">{label}</span>)}
        {knownDemon&&<span className="evil-ally-indicator evil-demon-indicator" title="既知のデーモン">魔</span>}
        {!knownDemon&&fellowMinion&&<span className="evil-ally-indicator" title="既知の手下">味</span>}
        <span className="player-symbol" title={spyGrimoireRole ? `グリモア: ${ROLES[spyGrimoireRole].name}` : undefined}>
          {active ? (spyGrimoireRole ? ROLES[spyGrimoireRole].symbol : getClaimSymbol(claim)) : ""}
        </span>
        {active&&name?<><span className="player-name">{name}</span><span className="player-seat">{player}</span></>:<span className="player-seat">{player}</span>}
      </button>
      {active&&<WarningBadges warnings={analysis.players[player]?.warnings??[]} onOpen={()=>openAnalysis(player)}/>}
    </div>;
  }

  if (screen === "home") {
    return (
      <main className="app">
        <div className="home-brand">
          <img src={APP_ICON_URL} className="home-brand-icon" alt="" aria-hidden="true"/>
          <h1>{APP_NAME}</h1>
        </div>
        {savedGame && <button className="main-button" onClick={()=>{applySnapshot(savedGame);setScreen("game");}}>{L.resume}</button>}
        {hasUnreadableSnapshot() && <div className="save-recovery-note" role="alert">
          <p>保存データの一部を確認できませんでした。元の記録は残してあります。必要なら書き出して保管してください。</p>
          <button className="secondary-button" onClick={()=>{if(!downloadStoredSnapshot())window.alert("保存データを取り出せませんでした。");}}>保存データを救出する</button>
        </div>}
        <button className="secondary-button" onClick={()=>setGameLogOpen(true)}>ゲームログ ({gameLogs.length})</button>
        <button className="secondary-button" onClick={()=>importRef.current?.click()}>{L.import}</button>
        <input hidden type="file" accept=".json,application/json" ref={importRef} onChange={e=>void importGame(e.target.files?.[0])}/>
        <button className="secondary-button" onClick={() => setScriptManagerOpen(true)}>スクリプト管理</button>
        <button className="main-button" onClick={() => setScreen("setup")}>
          ゲーム開始
        </button>
        {gameLogOpen&&<GameLogPanel logs={gameLogs} onClose={()=>setGameLogOpen(false)} onLoad={loadArchivedGame} onDelete={deleteArchivedGame} onUpdate={updateArchivedGame} onExportOne={downloadGameLogEntry} onExportAll={()=>downloadGameLogs(gameLogs)}/>}
        {scriptManagerOpen && (
          <div className="menu-overlay" onClick={() => { setScriptManagerOpen(false); setScriptEditorOpen(false); }}>
            <div className="script-manager" onClick={event => event.stopPropagation()}>
              {!scriptEditorOpen ? (
                <>
                  <h2>スクリプト管理</h2>
                  <button className="menu-option main-button" onClick={() => { setScriptEditorId(null); setScriptEditorReadOnly(false); setScriptEditorRoles([]); setScriptEditorOpen(true); }}>新規スクリプト</button>
                  <div className="script-list">
                    {BUILT_IN_SCRIPTS.map(script => (
                      <button key={script.id} className="script-list-item" onClick={() => { setScriptEditorId(script.id); setScriptEditorReadOnly(true); setScriptEditorRoles([...script.roleIds]); setScriptEditorOpen(true); }}>
                        <strong>{script.name}</strong><span>{script.roleIds.length}役職</span>
                      </button>
                    ))}
                    {customScripts.map(script => (
                      <div className="script-list-row" key={script.id}>
                        <button className="script-list-item" onClick={() => { setScriptEditorId(script.id); setScriptEditorReadOnly(false); setScriptEditorRoles([...script.roleIds]); setScriptEditorOpen(true); }}>
                          <strong>{script.name}</strong><span>{script.roleIds.length}役職 / カスタム</span>
                        </button>
                        <button className="compact-danger" onClick={() => {
                          if (!window.confirm(`${script.name}を削除しますか？`)) return;
                          const next = customScripts.filter(item => item.id !== script.id);
                          if (saveCustomScripts(next)) setCustomScripts(next);
                          if (playset === script.id) setPlayset("trouble_brewing");
                        }}>削除</button>
                      </div>
                    ))}
                  </div>
                  <button className="menu-option" onClick={() => setScriptManagerOpen(false)}>閉じる</button>
                </>
              ) : (
                <>
                  <h2>{scriptEditorReadOnly ? (getScriptById(scriptEditorId ?? "", customScripts)?.name ?? "スクリプト") : scriptEditorId ? "スクリプト編集" : "新規スクリプト"}</h2>
                  <p className="panel-note">役職をタップして有効／無効を切り替えます。聖歌隊を選ぶと王、猟師を選ぶと乙女が自動追加されます。表示・主張・候補盤面はこのリストだけを使います。</p>
                  <div className="script-counts">
                    {(["townsfolk","outsider","minion","demon"] as RoleType[]).map(type => <span key={type}>{type === "townsfolk" ? "町人" : type === "outsider" ? "アウトサイダー" : type === "minion" ? "手下" : "デーモン"}: {scriptEditorRoles.filter(id => ROLES[id].type === type).length}</span>)}
                  </div>
                  {(["townsfolk","outsider","minion","demon"] as RoleType[]).map(type => (
                    <section key={type} className="script-role-section">
                      <h3>{type === "townsfolk" ? "町人" : type === "outsider" ? "アウトサイダー" : type === "minion" ? "手下" : "デーモン"}</h3>
                      <div className="script-role-grid">
                        {ALL_CORE_ROLE_IDS.filter(id => ROLES[id].type === type).map(id => {
                          const role = ROLES[id], on = scriptEditorRoles.includes(id);
                          return <button key={id} disabled={scriptEditorReadOnly} className={`script-role-toggle${on ? " is-on" : ""}${role.solverSupport === "generic" ? " generic-role" : ""}`} onClick={() => setScriptEditorRoles(current => {
                            if (current.includes(id)) return current.filter(x => x !== id && !(id === "king" && x === "choirboy") && !(id === "damsel" && x === "huntsman"));
                            if (id === "choirboy") return [...new Set<RoleId>([...current,"king","choirboy"])];
                            if (id === "huntsman") return [...new Set<RoleId>([...current,"damsel","huntsman"])];
                            return [...current,id];
                          })}>
                            <span className="role-choice-symbol">{role.symbol}</span><span>{role.name}</span><small>{on ? "有効" : "無効"}{isBmrRole(id) ? ` / ${roleTimingCategories(id).map(tag => tag === 'NIGHT_INFORMATION' ? '夜情報' : tag === 'NIGHT_ABILITY' ? '夜行動' : '昼情報').join('・') || (role.tags.includes('PASSIVE') ? '常時能力' : id === 'gossip' ? '昼行動' : '条件付き能力')}` : ''}{role.solverSupport === "generic" ? " / 汎用推理" : ""}</small>
                          </button>;
                        })}
                      </div>
                    </section>
                  ))}
                  <JinxList roleIds={scriptEditorRoles} />
                  {!scriptEditorReadOnly && <button className="menu-option confirm-claim-button" onClick={() => {
                    if (scriptEditorRoles.length === 0) { window.alert("少なくとも1役職を有効にしてください。"); return; }
                    const existing = scriptEditorId ? customScripts.find(x => x.id === scriptEditorId) : null;
                    const name = window.prompt("スクリプト名を入力してください", existing?.name ?? "");
                    if (!name?.trim()) return;
                    let next: ScriptDefinition[];
                    if (existing) next = customScripts.map(item => item.id === existing.id ? { ...item, name: name.trim(), roleIds: [...scriptEditorRoles] } : item);
                    else next = [...customScripts, createCustomScript(name, scriptEditorRoles)];
                    if (!saveCustomScripts(next)) { window.alert("スクリプトを保存できませんでした。"); return; }
                    setCustomScripts(next); setScriptEditorOpen(false); setScriptEditorId(null); setScriptEditorRoles([]);
                  }}>保存</button>}
                  <button className="menu-option" onClick={() => { setScriptEditorOpen(false); setScriptEditorId(null); setScriptEditorRoles([]); }}>戻る</button>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    );
  }

  if (screen === "setup") {
    return (
      <main className="app setup-screen">
        <h1>ゲーム設定</h1>

        <div className="setup-box">
          <label>プレイヤー人数</label>
          <select
            value={playerCount}
            onChange={(event) => setPlayerCount(Number(event.target.value))}
          >
            {Array.from({ length: 11 }, (_, index) => index + 5).map(
              (number) => (
                <option key={number} value={number}>
                  {number}人
                </option>
              )
            )}
          </select>
        </div>

        <div className="setup-box">
          <label>プレイセット</label>
          <select
            value={playset}
            onChange={(event) => setPlayset(event.target.value)}
          >
            {allScripts(customScripts).map(script => (
              <option key={script.id} value={script.id}>{script.name}</option>
            ))}
          </select>
        </div>

        <div className="button-row">
          <button className="secondary-button" onClick={() => setScreen("home")}>
            戻る
          </button>
          <button className="main-button" onClick={startGame}>
            開始
          </button>
        </div>
      </main>
    );
  }

  const selectedLatestClaim = selectedPlayer
    ? getLatestClaim(selectedPlayer)
    : null;
  const selectedPlayerClaims = selectedPlayer
    ? roleClaimLog.filter((claim) => claim.playerId === selectedPlayer)
    : [];
  const selectedAbilityClaims = selectedPlayer
    ? abilityClaimLog.filter((claim) => claim.playerId === selectedPlayer).sort(compareEvents)
    : [];
  const selectedOtherAbilityClaims = selectedAbilityClaims.filter(
    (claim) => !claim.structured && !isStructuredInfoRole(claim.roleId)
  );
  const selectedDeaths = selectedPlayer
    ? deathLog.filter((death) => death.playerId === selectedPlayer)
    : [];
  const selectedRevivals = selectedPlayer
    ? revivalLog.filter((event) => event.playerId === selectedPlayer).sort(compareEvents)
    : [];
  const selectedLatestRoleClaimToUndo = [...selectedPlayerClaims].sort(compareEvents).at(-1);
  const selectedLatestInfoRecordToUndo = selectedAbilityClaims.at(-1);
  const selectedLatestOtherAbilityToUndo = selectedOtherAbilityClaims.at(-1);
  const effectiveSelfAbilityRole = getSelfAbilityRole();
  const latestSelfInfoToUndo = [...selfInfoLog].sort(compareEvents).at(-1);
  const latestSelfActionToUndo = [...selfActionLog].sort(compareEvents).at(-1);
  const successfulSnakeSwap = selfActionLog
    .filter((event): event is Extract<SelfActionEvent, { roleId: "snake_charmer" }> => event.roleId === "snake_charmer" && event.swapped)
    .sort(compareEvents)
    .at(-1);
  const currentSelfDisplayRole = successfulSnakeSwap?.newDemonRole ?? selfRole.shownRole;
  const selectedTraveller = travellerPanelId ? getTraveller(travellerPanelId) : null;
  const selectedGnomeFriend = selectedTraveller?.roleId === "gnome"
    ? travellerActionLog.find((event): event is Extract<TravellerActionEvent, { kind: "gnome_friend" }> => event.kind === "gnome_friend" && event.travellerId === selectedTraveller.id)?.friend ?? null
    : null;
  const activeVoteModifierTravellers = getActiveTravellers().filter(
    (traveller) => traveller.alive && (traveller.roleId === "bureaucrat" || traveller.roleId === "thief")
  );
  const firstVoteToday = nominationLog
    .filter((event) => event.when === `D${night}` && event.votingOccurred !== false)
    .sort(compareEvents)[0] ?? null;
  const pendingValidVoters = pendingVoters.filter((player) => canVoteParticipant(player));
  const pendingVote = voteTally(pendingValidVoters, nominationWhen);

  const selfHiddenRolePossibilities = selfRole.shownRole && analysis.players.self?.confirmedRole !== selfRole.shownRole
    ? getPossibleHiddenSelfRoles(selfRole.shownRole)
    : [];

  return (
    <main className="game-screen">
      <div className="top-bar">
        <span>N{night} / D{night}</span>
        <div className="top-analysis-buttons">
          <button className="analysis-open" onClick={()=>openAnalysis()}>{L.analysis}{reasoning.status === "running" ? " ..." : ""}</button>
          <button className="analysis-open alignment-open" onClick={()=>setAlignmentOpen(true)}>善悪</button>
        </div>
        <span>{playerCount}人</span>
      </div>

      <div className="board">
        <div className="player-column">{LEFT_PLAYERS.map(renderPlayerButton)}</div>
        <TravellerStrip g={snapshot} estimates={travellerEstimates} onOpen={openTravellerPanel}/>
        <div className="player-column">{RIGHT_PLAYERS.map(renderPlayerButton)}</div>
      </div>

      <div className="player-slot self-slot">
      <button className={`self-button${playerStatus.self?.alive===false?" player-dead":""}`} onClick={openSelfMenu}>
        {currentSelfDisplayRole && (
          <span className="player-symbol">{ROLES[currentSelfDisplayRole].symbol}</span>
        )}
        <span className="player-seat self-label">自分</span>
      </button>
      <WarningBadges warnings={analysis.players.self?.warnings??[]} onOpen={()=>openAnalysis("self")}/>
      </div>
      {saveFailed&&<div className="save-error" role="alert">{L.saveError}</div>}
      <input hidden type="file" accept=".json,application/json" ref={importRef} onChange={e=>void importGame(e.target.files?.[0])}/>
      {analysisOpen&&<AnalysisPanel
        onOutsiderEvent={recordOutsiderEvent}
        onRemoveOutsiderEvent={deleteOutsiderEvent}
        onWidowReport={report=>setWidowReports(old=>[...old,report])}
        onEvilBehaviorReport={report=>setEvilBehaviorReports(old=>[...old,report])}
        onPsychopathEvent={recordPsychopathEvent}
        onOrganGrinderVote={event=>setOrganGrinderVotes(old=>[...old.filter(x=>x.when!==event.when),event])}
        onRemoveExperimental={(kind,id)=>{
          if(kind==='widow')setWidowReports(old=>old.filter(e=>e.id!==id));
          if(kind==='mezepheles')setEvilBehaviorReports(old=>old.filter(e=>e.id!==id));
          if(kind==='psychopath')deletePsychopathEvent(id);
          if(kind==='organ_grinder')setOrganGrinderVotes(old=>old.filter(e=>e.id!==id));
        }}
        onFearmongerActive={setFearmongerActive} onBoomdandyRecord={recordBoomdandyExplosion} onBoomdandyDelete={deleteBoomdandyExplosion}
        onJinxVictoryRecord={e=>setJinxVictoryLog(old=>[...old.filter(item=>item.when!==e.when),e])}
        onJinxVictoryDelete={id=>setJinxVictoryLog(old=>old.filter(e=>e.id!==id))} g={snapshot} e={analysis} query={reasoning} player={analysisPlayer} initialTab={analysisInitialTab} onClose={()=>setAnalysisOpen(false)} onCompleteness={setCompleteness} onDelete={deleteHistory} onLeviathanConfirmed={v=>{setLeviathanConfirmed(v);if(v){setAlHadikhiaConfirmed(false);setRiotConfirmed(false);}}} onAlHadikhiaConfirmed={v=>{setAlHadikhiaConfirmed(v);if(v){setLeviathanConfirmed(false);setRiotConfirmed(false);}}} onRiotConfirmed={v=>{setRiotConfirmed(v);if(v){setLeviathanConfirmed(false);setAlHadikhiaConfirmed(false);}}}/>}
      {alignmentOpen&&<AlignmentLikelihoodSheet g={snapshot} r={reasoning.result} travellerEstimates={travellerEstimates} onClose={()=>setAlignmentOpen(false)}/>} 
      {gameLogOpen&&<GameLogPanel logs={gameLogs} onClose={()=>setGameLogOpen(false)} onLoad={loadArchivedGame} onDelete={deleteArchivedGame} onUpdate={updateArchivedGame} onExportOne={downloadGameLogEntry} onExportAll={()=>downloadGameLogs(gameLogs)}/>}

      {selectedTraveller && (
        <div className="menu-overlay" onClick={()=>setTravellerPanelId(null)}>
          <div className="player-menu" onClick={(event)=>event.stopPropagation()}>
            <h2>{TRAVELLERS[selectedTraveller.roleId].symbol} {selectedTraveller.name || TRAVELLERS[selectedTraveller.roleId].name}</h2>
            <div className="traveller-role-line">{TRAVELLERS[selectedTraveller.roleId].name} / {selectedTraveller.alive ? "生存" : "死亡"}</div>
            <p className="panel-note">{TRAVELLERS[selectedTraveller.roleId].ability}</p>
            <div className="traveller-tags">
              {TRAVELLERS[selectedTraveller.roleId].tags.map((tag)=><span key={tag}>{TRAVELLER_TAG_LABELS[tag]}</span>)}
            </div>

            <div className="claim-option-title">陣営の確定情報</div>
            <div className="visibility-switch">
              {(["unknown","good","evil"] as const).map((alignment)=><button key={alignment} type="button" className={`visibility-button ${travellerKnownAlignment===alignment?"visibility-selected":""}`} onClick={()=>setTravellerKnownAlignment(alignment)}>{alignment==="unknown"?"不明":alignment==="good"?"善":"悪"}</button>)}
            </div>
            <button className="menu-option" onClick={()=>updateTraveller(selectedTraveller.id,{knownAlignment:travellerKnownAlignment})}>陣営情報を保存</button>

            {(selectedTraveller.roleId === "bureaucrat" || selectedTraveller.roleId === "thief") && selectedTraveller.alive && (
              <section className="analysis-card">
                <h3>N{night} の対象</h3>
                <p className="panel-note">対象は毎日リセットされます。前日の対象は次の日には引き継がれません。</p>
                <div className="player-toggle-grid">
                  {["self",...getActivePlayers(),...getActiveTravellers().filter(t=>t.id!==selectedTraveller.id).map(t=>t.id)].map((player)=><button key={player} type="button" className={`player-toggle ${travellerTarget===player?"selected":""}`} onClick={()=>setTravellerTarget(player)}>{getPlayerDisplayName(player)}</button>)}
                </div>
                <button className="menu-option" disabled={!travellerTarget} onClick={()=>saveTravellerVoteModifier(selectedTraveller)}>{selectedTraveller.roleId==="bureaucrat"?"3票の対象を保存":"マイナス票の対象を保存"}</button>
              </section>
            )}

            {selectedTraveller.roleId === "beggar" && selectedTraveller.alive && (
              <section className="analysis-card">
                <h3>投票トークン: {selectedTraveller.voteTokens}</h3>
                <p className="panel-note">死亡者が投票トークンを渡した記録です。渡した死亡者は以後その死者投票を使えません。</p>
                <div className="player-toggle-grid">
                  {["self",...getActivePlayers()].filter((player)=>playerStatus[player] && !playerStatus[player].alive && playerStatus[player].deadVoteAvailable).map((player)=><button key={player} type="button" className={`player-toggle ${travellerTarget===player?"selected":""}`} onClick={()=>setTravellerTarget(player)}>{getPlayerDisplayName(player)}</button>)}
                </div>
                <div className="visibility-switch">
                  {(["unknown","good","evil"] as const).map((alignment)=><button key={alignment} type="button" className={`visibility-button ${beggarLearnedAlignment===alignment?"visibility-selected":""}`} onClick={()=>setBeggarLearnedAlignment(alignment)}>{alignment==="unknown"?"未記録":alignment==="good"?"善と知った":"悪と知った"}</button>)}
                </div>
                <button className="menu-option" disabled={!travellerTarget} onClick={()=>saveBeggarDonation(selectedTraveller)}>受け取りを保存</button>
              </section>
            )}

            {selectedTraveller.roleId === "gunslinger" && selectedTraveller.alive && (
              <section className="analysis-card">
                <h3>D{night} ガンスリンガー</h3>
                {!firstVoteToday ? <p className="panel-note">その日の最初の投票がまだ記録されていません。</p> : <>
                  <p className="panel-note">最初の投票で挙手した人だけを射殺対象にできます。</p>
                  <div className="player-toggle-grid">{firstVoteToday.voters.map((player)=><button key={player} type="button" className={`player-toggle ${travellerTarget===player?"selected":""}`} onClick={()=>setTravellerTarget(player)}>{getPlayerDisplayName(player)}</button>)}</div>
                  <button className="menu-option danger-button" disabled={!travellerTarget} onClick={()=>saveGunslingerShot(selectedTraveller)}>射殺を記録</button>
                </>}
              </section>
            )}

            {selectedTraveller.roleId === "scapegoat" && selectedTraveller.alive && (
              <section className="analysis-card">
                <h3>処刑の身代わり</h3>
                <p className="panel-note">本来処刑されるはずだった通常プレイヤーを選びます。この2人は同じ陣営です。</p>
                <div className="player-toggle-grid">{["self",...getActivePlayers()].map((player)=><button key={player} type="button" className={`player-toggle ${travellerTarget===player?"selected":""}`} onClick={()=>setTravellerTarget(player)}>{getPlayerDisplayName(player)}</button>)}</div>
                <button className="menu-option danger-button" disabled={!travellerTarget} onClick={()=>saveScapegoatReplacement(selectedTraveller)}>身代わり処刑を記録</button>
              </section>
            )}

            {selectedTraveller.roleId === "apprentice" && selectedTraveller.alive && (
              <section className="analysis-card">
                <h3>見習いの獲得能力</h3>
                {apprenticeAbility(snapshot, selectedTraveller.id) ? (
                  <p className="panel-note">獲得済み: {ROLES[apprenticeAbility(snapshot, selectedTraveller.id)!].symbol} {ROLES[apprenticeAbility(snapshot, selectedTraveller.id)!].name}</p>
                ) : <>
                  <p className="panel-note">参加後の最初の夜に記録します。町人能力なら善、手下能力なら悪が機械的に確定します。</p>
                  <select value={travellerRoleChoice ?? ""} onChange={e=>setTravellerRoleChoice((e.target.value || null) as RoleId | null)}>
                    <option value="">能力を選択</option>
                    {gameScriptRoleIds.filter(id => { const type=ROLES[id].type; return selectedTraveller.knownAlignment==="good" ? type==="townsfolk" : selectedTraveller.knownAlignment==="evil" ? type==="minion" : type==="townsfolk"||type==="minion"; }).map(id=><option key={id} value={id}>{ROLES[id].symbol} {ROLES[id].name}</option>)}
                  </select>
                  <button className="menu-option" disabled={!travellerRoleChoice} onClick={()=>saveApprenticeAbility(selectedTraveller)}>獲得能力を保存</button>
                </>}
              </section>
            )}

            {selectedTraveller.roleId === "matron" && selectedTraveller.alive && (
              <section className="analysis-card">
                <h3>D{night} 席交換 — {matronSwapCount(snapshot, selectedTraveller.id, night)}/3</h3>
                <p className="panel-note">寮母が有効な間は席を離れた私談は禁止です。席交換は隣接判定（共感者・ノーダシー等）にも反映されます。</p>
                <p className="panel-note">現在の時計回り: {seatingOrderAt(snapshot, `D${night}`).map(getPlayerDisplayName).join(" → ")}</p>
                <div className="claim-option-title">1人目</div>
                <div className="player-toggle-grid">{["self",...getActivePlayers()].map(player=><button key={`a-${player}`} type="button" className={`player-toggle ${travellerTarget===player?"selected":""}`} onClick={()=>setTravellerTarget(player)}>{getPlayerDisplayName(player)}</button>)}</div>
                <div className="claim-option-title">2人目</div>
                <div className="player-toggle-grid">{["self",...getActivePlayers()].map(player=><button key={`b-${player}`} type="button" className={`player-toggle ${travellerTarget2===player?"selected":""}`} onClick={()=>setTravellerTarget2(player)}>{getPlayerDisplayName(player)}</button>)}</div>
                <button className="menu-option" disabled={!travellerTarget||!travellerTarget2||travellerTarget===travellerTarget2||matronSwapCount(snapshot,selectedTraveller.id,night)>=3} onClick={()=>saveMatronSwap(selectedTraveller)}>席を入れ替える</button>
              </section>
            )}

            {selectedTraveller.roleId === "voudon" && selectedTraveller.alive && (
              <section className="analysis-card">
                <h3>ブードゥー師の投票ルール</h3>
                <p className="panel-note">有効中はブードゥー師と死亡者だけが投票できます。死亡者は死者票を消費しません。処刑候補は通常の過半数ではなく、その日の最多票で決まります。</p>
              </section>
            )}

            {selectedTraveller.roleId === "judge" && selectedTraveller.alive && (
              <section className="analysis-card">
                <h3>判事 — ゲーム中1回</h3>
                {travellerActionLog.some(a=>a.kind==="judge_ruling"&&a.travellerId===selectedTraveller.id) ? <p className="panel-note">使用済みです。</p> : <>
                  <p className="panel-note">他のプレイヤーによる現在の指名を選び、処刑を強制成功または強制失敗にします。</p>
                  <div className="player-toggle-grid">{nominationLog.filter(n=>n.when===`D${night}`&&n.nominator!==selectedTraveller.id&&n.nominator!=="storyteller").map(n=><button key={n.id} type="button" className={`player-toggle ${travellerNominationChoice===n.id?"selected":""}`} onClick={()=>setTravellerNominationChoice(n.id)}>{getPlayerDisplayName(n.nominator)} → {getPlayerDisplayName(n.nominee)} ({n.voteTotal ?? n.voters.length}票)</button>)}</div>
                  <div className="visibility-switch">
                    <button type="button" className={`visibility-button ${travellerJudgeResult==="pass"?"visibility-selected":""}`} onClick={()=>setTravellerJudgeResult("pass")}>処刑成功</button>
                    <button type="button" className={`visibility-button ${travellerJudgeResult==="fail"?"visibility-selected":""}`} onClick={()=>setTravellerJudgeResult("fail")}>処刑失敗</button>
                  </div>
                  <button className="menu-option" disabled={travellerNominationChoice===null||!travellerJudgeResult} onClick={()=>saveJudgeRuling(selectedTraveller)}>判定を保存</button>
                </>}
              </section>
            )}

            {selectedTraveller.roleId === "bishop" && selectedTraveller.alive && (
              <section className="analysis-card">
                <h3>司教の指名ルール</h3>
                <p className="panel-note">有効中、通常の指名入力は自動的に「語り手の指名」として保存されます。プレイヤー自身は指名者として記録されません。</p>
              </section>
            )}

            {selectedTraveller.roleId === "butcher" && selectedTraveller.alive && (
              <section className="analysis-card">
                <h3>D{night} 肉屋の追加指名</h3>
                <p className="panel-note">その日の最初の処刑後だけ使用できます。追加指名は同日2回目の処刑を起こせます。</p>
                <div className="player-toggle-grid">{["self",...getActivePlayers()].map(player=><button key={player} type="button" className={`player-toggle ${travellerTarget===player?"selected":""}`} onClick={()=>{setTravellerTarget(player);setPendingVoters([]);}}>{getPlayerDisplayName(player)}</button>)}</div>
                {travellerTarget && <>
                  <div className="claim-option-title">追加指名の投票</div>
                  <div className="player-toggle-grid">{[...seatingOrderAt(snapshot,`D${night}`),...getVotingTravellers().map(t=>t.id)].map(player=><button key={`butcher-${player}`} type="button" disabled={!canVoteParticipantAt(player,`D${night}`)} className={`player-toggle ${pendingVoters.includes(player)?"selected":""}`} onClick={()=>togglePlayerInList(player,setPendingVoters)}>{getPlayerDisplayName(player)}</button>)}</div>
                </>}
                <button className="menu-option" disabled={!travellerTarget} onClick={()=>saveButcherNomination(selectedTraveller)}>追加指名を保存</button>
              </section>
            )}

            {selectedTraveller.roleId === "bone_collector" && selectedTraveller.alive && (
              <section className="analysis-card">
                <h3>骨拾い — ゲーム中1回</h3>
                {travellerActionLog.some(a=>a.kind==="restore_ability"&&a.travellerId===selectedTraveller.id) ? <p className="panel-note">使用済みです。</p> : <>
                  <p className="panel-note">N2以降、死亡者1人の能力をその日の夕暮れまで戻します。</p>
                  <div className="player-toggle-grid">{getActiveParticipantIds().filter(player=>player!==selectedTraveller.id).filter(player=>{const t=getTraveller(player);return t?!t.alive:!(playerStatus[player]?.alive??true);}).map(player=><button key={player} type="button" className={`player-toggle ${travellerTarget===player?"selected":""}`} onClick={()=>setTravellerTarget(player)}>{getPlayerDisplayName(player)}</button>)}</div>
                  <button className="menu-option" disabled={!travellerTarget||night<2} onClick={()=>saveBoneCollectorRestore(selectedTraveller)}>能力復帰を保存</button>
                </>}
              </section>
            )}

            {selectedTraveller.roleId === "harlot" && selectedTraveller.alive && (
              <section className="analysis-card">
                <h3>N{night} 娼婦</h3>
                <p className="panel-note">N2以降、生存者を選びます。相手が同意した場合は見せられた役職と、語り手が2人を死亡させたかを記録します。</p>
                <div className="player-toggle-grid">{getActiveParticipantIds().filter(player=>player!==selectedTraveller.id).filter(player=>{const t=getTraveller(player);return t?t.alive:(playerStatus[player]?.alive??true);}).map(player=><button key={player} type="button" className={`player-toggle ${travellerTarget===player?"selected":""}`} onClick={()=>{setTravellerTarget(player);setTravellerRoleChoice(null);}}>{getPlayerDisplayName(player)}</button>)}</div>
                <div className="visibility-switch">
                  <button type="button" className={`visibility-button ${travellerHarlotAgreed===true?"visibility-selected":""}`} onClick={()=>setTravellerHarlotAgreed(true)}>同意</button>
                  <button type="button" className={`visibility-button ${travellerHarlotAgreed===false?"visibility-selected":""}`} onClick={()=>setTravellerHarlotAgreed(false)}>拒否</button>
                </div>
                {travellerHarlotAgreed===true && travellerTarget && !getTraveller(travellerTarget) && <>
                  <select value={travellerRoleChoice ?? ""} onChange={e=>setTravellerRoleChoice((e.target.value||null) as RoleId|null)}><option value="">見せられた役職</option>{gameScriptRoleIds.map(id=><option key={id} value={id}>{ROLES[id].symbol} {ROLES[id].name}</option>)}</select>
                  <label className="checkbox-row"><input type="checkbox" checked={travellerHarlotBothDied} onChange={e=>setTravellerHarlotBothDied(e.target.checked)}/> 2人とも死亡した</label>
                </>}
                {travellerHarlotAgreed===true && travellerTarget && getTraveller(travellerTarget) && <label className="checkbox-row"><input type="checkbox" checked={travellerHarlotBothDied} onChange={e=>setTravellerHarlotBothDied(e.target.checked)}/> 2人とも死亡した</label>}
                <button className="menu-option" disabled={!travellerTarget||travellerHarlotAgreed===null||night<2} onClick={()=>saveHarlotVisit(selectedTraveller)}>訪問結果を保存</button>
              </section>
            )}

            {selectedTraveller.roleId === "barista" && selectedTraveller.alive && (
              <section className="analysis-card">
                <h3>N{night} バリスタ</h3>
                <p className="panel-note">語り手が選んだ対象と効果を記録します。「酔い・毒なし」はVortox下でも真情報として推理に反映されます。</p>
                <div className="player-toggle-grid">{getActiveParticipantIds().filter(player=>player!==selectedTraveller.id).map(player=><button key={player} type="button" className={`player-toggle ${travellerTarget===player?"selected":""}`} onClick={()=>setTravellerTarget(player)}>{getPlayerDisplayName(player)}</button>)}</div>
                <div className="visibility-switch">
                  <button type="button" className={`visibility-button ${travellerEffectChoice==="sober_healthy"?"visibility-selected":""}`} onClick={()=>setTravellerEffectChoice("sober_healthy")}>酔い・毒なし＋真情報</button>
                  <button type="button" className={`visibility-button ${travellerEffectChoice==="acts_twice"?"visibility-selected":""}`} onClick={()=>setTravellerEffectChoice("acts_twice")}>能力が2回働く</button>
                </div>
                <button className="menu-option" disabled={!travellerTarget||!travellerEffectChoice} onClick={()=>saveBaristaEffect(selectedTraveller)}>バリスタ効果を保存</button>
              </section>
            )}

            {selectedTraveller.roleId === "deviant" && selectedTraveller.alive && (
              <section className="analysis-card">
                <h3>D{night} 語り手判定</h3>
                <p className="panel-note">「面白かった」が有効なら、その日は追放ボタンを押しても追放されません。</p>
                <div className="visibility-switch">
                  <button type="button" className={`visibility-button ${deviantsFunnyToday(snapshot,selectedTraveller.id,night)?"visibility-selected":""}`} onClick={()=>saveDeviantFunny(selectedTraveller,true)}>今日は面白かった</button>
                  <button type="button" className={`visibility-button ${!deviantsFunnyToday(snapshot,selectedTraveller.id,night)?"visibility-selected":""}`} onClick={()=>saveDeviantFunny(selectedTraveller,false)}>今日は保護なし</button>
                </div>
              </section>
            )}

            {selectedTraveller.roleId === "cacklejack" && selectedTraveller.alive && (
              <section className="analysis-card">
                <h3>カックルジャック</h3>
                <div className="claim-option-title">D{night} — 今夜変えられない人</div>
                <p className="panel-note">今日選んだ1人は、次の夜のカックルジャックによる役職変更対象から外れます。</p>
                <div className="player-toggle-grid">{getActiveParticipantIds().filter(player=>player!==selectedTraveller.id).map(player=><button key={`cj-protect-${player}`} type="button" className={`player-toggle ${travellerTarget===player?"selected":""}`} onClick={()=>setTravellerTarget(player)}>{getPlayerDisplayName(player)}</button>)}</div>
                <button className="menu-option" disabled={!travellerTarget} onClick={()=>saveCacklejackProtection(selectedTraveller)}>保護対象を保存</button>
                <div className="claim-option-title">N{night} — 実際の役職変更</div>
                {night < 2 ? <p className="panel-note">最初の夜は役職変更しません。</p> : <>
                  <div className="player-toggle-grid">{getActiveParticipantIds().filter(player=>player!==selectedTraveller.id).map(player=><button key={`cj-change-${player}`} type="button" className={`player-toggle ${travellerTarget2===player?"selected":""}`} onClick={()=>setTravellerTarget2(player)}>{getPlayerDisplayName(player)}</button>)}</div>
                  <select value={travellerRoleChoice ?? ""} onChange={e=>setTravellerRoleChoice((e.target.value||null) as RoleId|null)}>
                    <option value="">変更後の役職</option>
                    {(Object.keys(ROLES) as RoleId[]).map(id=><option key={id} value={id}>{ROLES[id].symbol} {ROLES[id].name}</option>)}
                  </select>
                  <button className="menu-option" disabled={!travellerTarget2||!travellerRoleChoice} onClick={()=>saveCacklejackChange(selectedTraveller)}>役職変更を保存</button>
                </>}
              </section>
            )}

            {selectedTraveller.roleId === "gnome" && selectedTraveller.alive && (
              <section className="analysis-card">
                <h3>ノーム</h3>
                <div className="claim-option-title">公開された同陣営の友人</div>
                <div className="player-toggle-grid">{getActiveParticipantIds().filter(player=>player!==selectedTraveller.id).map(player=><button key={`gnome-friend-${player}`} type="button" className={`player-toggle ${travellerTarget===player?"selected":""}`} onClick={()=>setTravellerTarget(player)}>{getPlayerDisplayName(player)}</button>)}</div>
                <button className="menu-option" disabled={!travellerTarget} onClick={()=>saveGnomeFriend(selectedTraveller)}>友人を保存</button>
                <div className="claim-option-title">友人への指名 → 指名者を死亡</div>
                {!selectedGnomeFriend ? <p className="panel-note">先に友人を保存してください。</p> : <>
                  <p className="panel-note">友人: {getPlayerDisplayName(selectedGnomeFriend)}。能力を使わない選択もできます。</p>
                  <div className="player-toggle-grid">{nominationLog.filter(n=>n.nominee===selectedGnomeFriend&&n.nominator!=="storyteller").map(n=><button key={`gnome-nom-${n.id}`} type="button" className={`player-toggle ${travellerNominationChoice===n.id?"selected":""}`} onClick={()=>setTravellerNominationChoice(n.id)}>{n.when}: {getPlayerDisplayName(n.nominator)} → {getPlayerDisplayName(n.nominee)}</button>)}</div>
                  <label className="checkbox-row"><input type="checkbox" checked={travellerKillSucceeded} onChange={e=>setTravellerKillSucceeded(e.target.checked)}/> 実際に死亡した</label>
                  <button className="menu-option danger-button" disabled={travellerNominationChoice===null} onClick={()=>saveGnomeKill(selectedTraveller)}>ノームの死亡結果を保存</button>
                </>}
              </section>
            )}

            {selectedTraveller.roleId === "gangster" && selectedTraveller.alive && (
              <section className="analysis-card">
                <h3>D{night} ギャングスター</h3>
                <p className="panel-note">旅人は中央表示なので、現在の2人の生存隣人は手動で指定します。死亡者は飛ばしてください。合意が成立した時点で、その日の能力は使用済みです。</p>
                <div className="claim-option-title">同意した生存隣人</div>
                <div className="player-toggle-grid">{getActiveParticipantIds().filter(player=>player!==selectedTraveller.id).filter(player=>{const t=getTraveller(player);return t?t.alive:(playerStatus[player]?.alive??false);}).map(player=><button key={`gangster-agree-${player}`} type="button" className={`player-toggle ${travellerTarget===player?"selected":""}`} onClick={()=>setTravellerTarget(player)}>{getPlayerDisplayName(player)}</button>)}</div>
                <div className="claim-option-title">死亡させるもう一方の生存隣人</div>
                <div className="player-toggle-grid">{getActiveParticipantIds().filter(player=>player!==selectedTraveller.id&&player!==travellerTarget).filter(player=>{const t=getTraveller(player);return t?t.alive:(playerStatus[player]?.alive??false);}).map(player=><button key={`gangster-kill-${player}`} type="button" className={`player-toggle ${travellerTarget2===player?"selected":""}`} onClick={()=>setTravellerTarget2(player)}>{getPlayerDisplayName(player)}</button>)}</div>
                <label className="checkbox-row"><input type="checkbox" checked={travellerKillSucceeded} onChange={e=>setTravellerKillSucceeded(e.target.checked)}/> 実際に死亡した</label>
                <button className="menu-option danger-button" disabled={!travellerTarget||!travellerTarget2||travellerTarget===travellerTarget2} onClick={()=>saveGangsterKill(selectedTraveller)}>ギャングスターの死亡結果を保存</button>
              </section>
            )}

            <section className="analysis-card">
              <h3>状態</h3>
              <button className="menu-option" onClick={()=>toggleTravellerLife(selectedTraveller)}>{selectedTraveller.alive?"死亡にする":"生存に戻す"}</button>
              <button className="menu-option danger-button" onClick={()=>exileTraveller(selectedTraveller)}>追放する（死者票を保持）</button>
            </section>
            <button className="menu-option" onClick={()=>setTravellerPanelId(null)}>閉じる</button>
          </div>
        </div>
      )}

      <button
        className="corner-button menu-button"
        onClick={() => setMenuOpen(true)}
      >
        メニュー
      </button>

      <button
        className="corner-button night-button"
        onClick={confirmNextNight}
      >
        次の夜
      </button>

      {selectedPlayer && (
        <div className="menu-overlay" onClick={() => setSelectedPlayer(null)}>
          <div className="player-menu" onClick={(event) => event.stopPropagation()}>
            {playerPanel === "menu" && (
              <>
                <h2>
                  {playerNames[selectedPlayer] || selectedPlayer}
                  {playerNames[selectedPlayer] && (
                    <span className="player-menu-seat"> ({selectedPlayer})</span>
                  )}
                </h2>

                <div className="current-claim">
                  現在の主張：<strong>{getClaimLabel(selectedLatestClaim)}</strong>
                </div>

                <div className="status-detail">
                  状態：{playerStatus[selectedPlayer].alive ? "生存" : "死亡"}
                  {!playerStatus[selectedPlayer].alive &&
                    ` / 死者投票 ${
                      playerStatus[selectedPlayer].deadVoteAvailable
                        ? "使用可能"
                        : "使用済み"
                    }`}
                </div>

                <div className="claim-history">
                  <div className="claim-history-title">主張履歴</div>
                  {selectedPlayerClaims.length === 0 ? (
                    <div className="claim-history-empty">履歴なし</div>
                  ) : (
                    selectedPlayerClaims.map((claim) => (
                      <div className="claim-history-item" key={claim.id}>
                        <span className="claim-history-role">
                          {getClaimSymbol(claim)}
                        </span>
                        <span>{claim.when}</span>
                        <span>
                          {claim.claimType === "bluff" ? "ブラフ / " : ""}
                          {formatAudience(claim.visibility, claim.recipients)}
                          {claim.origin === "ability_claim" ? " / 自動追加" : ""}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {selectedAbilityClaims.length > 0 && (
                  <div className="claim-history">
                    <div className="claim-history-title">情報記録</div>
                    {selectedAbilityClaims.map((claim) => {
                      const source = claim.sourcePlayerId || claim.playerId;
                      return (
                        <div className="claim-history-item" key={claim.id}>
                          <span className="claim-history-role">{ROLES[claim.roleId].symbol}</span>
                          <span>{claim.when}</span>
                          <span>
                            {source !== claim.playerId ? `元: ${getPlayerDisplayName(source)} / ` : ""}
                            {formatStructuredClaim(claim)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <PlayerSummary g={snapshot} p={selectedPlayer} r={reasoning.result} e={analysis} onOpen={()=>openAnalysis(selectedPlayer)}/>
                <button className="menu-option" onClick={()=>setPlayerPanel("reported_info")}>情報を記録</button>
                {selectedPlayer !== "self" && (
                  <button className="menu-option" onClick={openIdentityPanel}>
                    プレイヤー情報
                  </button>
                )}
                <button className="menu-option" onClick={openClaimPanel}>
                  役職主張
                </button>
                <button className="menu-option" onClick={openNominationPanel}>
                  指名
                </button>
                <button className="menu-option" onClick={openTalkPanel}>
                  会話
                </button>
                <button className="menu-option" onClick={openStatusPanel}>
                  状態
                </button>

                <button
                  className="menu-option"
                  disabled={!currentScriptRoleIds.includes("slayer") && activeVoteModifierTravellers.length === 0}
                  onClick={openAbilityTriggerMenu}
                >
                  能力発動
                </button>

                <button className="menu-option" onClick={()=>setPlayerPanel("read")}>{L.read}</button>

                <button
                  className="menu-option"
                  onClick={() => setSelectedPlayer(null)}
                >
                  閉じる
                </button>
              </>
            )}

            {playerPanel === "read" && <ManualReadForm g={snapshot} player={selectedPlayer} onBack={returnFromPlayerPanel} onSave={read=>{setManualReads(xs=>({...xs,[selectedPlayer]:read}));returnFromPlayerPanel();}} onClear={()=>{setManualReads(xs=>{const next={...xs};delete next[selectedPlayer];return next;});returnFromPlayerPanel();}}/>}
            {playerPanel === "reported_info" && <ReportedInfoForm g={snapshot} speaker={selectedPlayer} onSave={saveReportedInfo} onUndo={selectedLatestInfoRecordToUndo ? () => deleteHistory("abilityClaimLog", selectedLatestInfoRecordToUndo.id) : undefined} onBack={returnFromPlayerPanel}/>}
            {playerPanel === "identity" && (
              <>
                <h2>{selectedPlayer} — プレイヤー情報</h2>
                <div className="form-section">
                  <label htmlFor="player-name">名前</label>
                  <input
                    id="player-name"
                    type="text"
                    value={pendingPlayerName}
                    placeholder="名前を入力"
                    maxLength={20}
                    onChange={(event) => setPendingPlayerName(event.target.value)}
                  />
                </div>
                <button
                  className="menu-option confirm-claim-button"
                  onClick={() => {
                    setPlayerNames((current) => ({
                      ...current,
                      [selectedPlayer]: pendingPlayerName.trim(),
                    }));
                    setPlayerPanel("menu");
                  }}
                >
                  確定
                </button>
                <button className="menu-option" onClick={returnFromPlayerPanel}>
                  戻る
                </button>
              </>
            )}

            {playerPanel === "claim" && (
              <>
                <h2>{selectedPlayer} — 役職主張</h2>

                <div className="claim-option-title">主張内容</div>
                <div className="visibility-switch">
                  <button
                    className={
                      claimSubjectKind === "role"
                        ? "visibility-button visibility-selected"
                        : "visibility-button"
                    }
                    onClick={() => {
                      setClaimSubjectKind("role");
                      setPendingClaimTag(null);
                    }}
                  >
                    役職
                  </button>
                  <button
                    className={
                      claimSubjectKind === "tag"
                        ? "visibility-button visibility-selected"
                        : "visibility-button"
                    }
                    onClick={() => {
                      setClaimSubjectKind("tag");
                      setPendingClaimRole(null);
                    }}
                  >
                    カテゴリ
                  </button>
                </div>

                <div className="compact-row">
                  <button className="visibility-button" onClick={()=>setClaimSubjectKind("type")}>{"\u5f79\u8077\u533a\u5206"}</button>
                  <button className="visibility-button" onClick={()=>setClaimSubjectKind("alignment")}>{L.alignment}</button>
                </div>
                {claimSubjectKind === "type" && <div className="player-toggle-grid">{(["townsfolk","outsider","minion","demon"] as RoleType[]).map((t,i)=><button key={t} className={`player-toggle ${pendingType===t?"selected":""}`} onClick={()=>setPendingType(t)}>{L.nominalTypes[i]}</button>)}</div>}
                {claimSubjectKind === "alignment" && <div className="visibility-switch">{(["good","evil"] as const).map(a=><button key={a} className={`visibility-button ${pendingAlignment===a?"visibility-selected":""}`} onClick={()=>setPendingAlignment(a)}>{L[a]}</button>)}</div>}
                {(claimSubjectKind === "role" || claimSubjectKind === "tag") && <>
                {claimSubjectKind === "role" ? (
                  <div className="role-grid">
                    {currentScriptRoles.map((role) => (
                      <button
                        key={role.id}
                        className={
                          pendingClaimRole === role.id
                            ? "role-choice role-choice-selected"
                            : "role-choice"
                        }
                        onClick={() => setPendingClaimRole(role.id)}
                      >
                        <span className="role-choice-symbol">{role.symbol}</span>
                        <span className="role-choice-name">{role.name}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="player-toggle-grid">
                    {activeClaimableTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={
                          pendingClaimTag === tag
                            ? "player-toggle selected"
                            : "player-toggle"
                        }
                        onClick={() => setPendingClaimTag(tag)}
                      >
                        {CLAIMABLE_TAG_SYMBOLS[tag]} {CLAIMABLE_TAG_LABELS[tag]}
                      </button>
                    ))}
                  </div>
                )}

                </>}
                <div className="claim-option-title">主張タイプ</div>
                <div className="visibility-switch">
                  <button
                    className={
                      roleClaimType === "normal"
                        ? "visibility-button visibility-selected"
                        : "visibility-button"
                    }
                    onClick={() => setRoleClaimType("normal")}
                  >
                    通常
                  </button>
                  <button
                    className={
                      roleClaimType === "bluff"
                        ? "visibility-button visibility-selected"
                        : "visibility-button"
                    }
                    onClick={() => setRoleClaimType("bluff")}
                  >
                    ブラフ
                  </button>
                </div>

                <div className="form-section">
                  <label>いつ</label>
                  <select
                    value={claimWhen}
                    onChange={(event) => setClaimWhen(event.target.value)}
                  >
                    {getPhaseOptions().map((phase) => (
                      <option key={phase} value={phase}>
                        {phase}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="claim-option-title">公開範囲</div>
                <div className="visibility-switch">
                  <button
                    className={
                      claimVisibility === "public"
                        ? "visibility-button visibility-selected"
                        : "visibility-button"
                    }
                    onClick={() => {
                      setClaimVisibility("public");
                      setClaimRecipients([]);
                    }}
                  >
                    公開
                  </button>
                  <button
                    className={
                      claimVisibility === "private"
                        ? "visibility-button visibility-selected"
                        : "visibility-button"
                    }
                    onClick={() => {
                      setClaimVisibility("private");
                      setClaimRecipients([]);
                    }}
                  >
                    非公開
                  </button>
                </div>

                {claimVisibility === "private" && (
                  <div className="form-section">
                    <label>伝えた相手</label>
                    <div className="player-toggle-grid">
                      <button
                        type="button"
                        className={
                          claimRecipients.includes("self")
                            ? "player-toggle selected"
                            : "player-toggle"
                        }
                        onClick={() =>
                          togglePlayerInList("self", setClaimRecipients)
                        }
                      >
                        自分
                      </button>
                      {getActivePlayers()
                        .filter((player) => player !== selectedPlayer)
                        .map((player) => (
                          <button
                            key={player}
                            type="button"
                            className={
                              claimRecipients.includes(player)
                                ? "player-toggle selected"
                                : "player-toggle"
                            }
                            onClick={() =>
                              togglePlayerInList(player, setClaimRecipients)
                            }
                          >
                            {getPlayerDisplayName(player)}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                <button
                  className="menu-option confirm-claim-button"
                  disabled={
                    claimSubjectKind === "role"
                      ? !pendingClaimRole
                      : claimSubjectKind === "tag" ? !pendingClaimTag : false
                  }
                  onClick={saveRoleClaim}
                >
                  確定
                </button>
                <button
                  className="menu-option"
                  disabled={!selectedLatestRoleClaimToUndo}
                  onClick={() => selectedLatestRoleClaimToUndo && deleteHistory("roleClaimLog", selectedLatestRoleClaimToUndo.id)}
                >
                  取り消し
                </button>
                <button className="menu-option" onClick={returnFromPlayerPanel}>
                  戻る
                </button>
              </>
            )}

            {playerPanel === "ability_claim" && (
              <>
                <h2>{selectedPlayer} — その他の能力主張</h2>
                <div className="panel-note">
                  洗・図・探・料・感・占・墓・烏の情報は「情報主張」から役職別の形式で入力します。
                </div>

                {currentScriptRoles.some(r=>r.id==='harpy')&&<section className="analysis-card">
                  <h3>ハーピーに選ばれたという報告</h3>
                  <p className="panel-note">この人がハーピーに選ばれ、別の人を悪だと思うよう強制されたという主張です。ハーピー本人の役職主張にはしません。下の「いつ」「対象」「公開範囲」を選んで保存します。</p>
                  <button className="menu-option" type="button" disabled={abilityClaimTargets.length!==1||abilityClaimTargets[0]===selectedPlayer} onClick={saveHarpyAffectedClaim}>ハーピーの被害報告を保存</button>
                </section>}
                <div className="form-section">
                  <label>主張している役職</label>
                  <select
                    value={abilityClaimRole ?? ""}
                    onChange={(event) => {
                      const chosen = event.target.value ? (event.target.value as RoleId) : null;
                      setAbilityClaimRole(chosen);
                      const options = chosen && isBmrRole(chosen) ? rolePhaseOptions(chosen, night, "action") : getPhaseOptions();
                      setAbilityClaimWhen(options[options.length - 1] ?? `D${night}`);
                    }}
                  >
                    <option value="">選択</option>
                    {currentScriptRoles
                      .filter((role) => !isStructuredInfoRole(role.id) || role.id === 'godfather')
                      .map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.symbol} {role.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-section">
                  <label>いつ</label>
                  {abilityClaimRole && isBmrRole(abilityClaimRole) && (
                    <p className="panel-note">{roleTimingCategories(abilityClaimRole).map(tag =>
                      tag === 'NIGHT_ABILITY' ? '夜の行動' : tag === 'NIGHT_INFORMATION' ? '夜の情報' : '昼の情報'
                    ).join(' / ') || '受動能力・死亡時の発動'}</p>
                  )}
                  <select
                    value={abilityClaimWhen}
                    disabled={!!abilityClaimRole && isBmrRole(abilityClaimRole) && rolePhaseOptions(abilityClaimRole, night, 'action').length===0}
                    onChange={(event) => setAbilityClaimWhen(event.target.value)}
                  >
                    {(abilityClaimRole && isBmrRole(abilityClaimRole) ? rolePhaseOptions(abilityClaimRole, night, 'action') : getPhaseOptions()).map((phase) => (
                      <option key={phase} value={phase}>
                        {phase}
                      </option>
                    ))}
                  </select>
                  {abilityClaimRole && isBmrRole(abilityClaimRole) && rolePhaseOptions(abilityClaimRole, night, 'action').length===0 && <p className="panel-note">この役職はまだ行動する夜になっていません。</p>}
                </div>

                <div className="claim-option-title">対象（分かる場合）</div>
                <div className="player-toggle-grid">
                  <button
                    type="button"
                    className={
                      abilityClaimTargets.includes("self")
                        ? "player-toggle selected"
                        : "player-toggle"
                    }
                    onClick={() =>
                      togglePlayerInList("self", setAbilityClaimTargets)
                    }
                  >
                    自分
                  </button>
                  {getActivePlayers()
                    .filter((player) => player !== selectedPlayer)
                    .map((player) => (
                      <button
                        key={player}
                        type="button"
                        className={
                          abilityClaimTargets.includes(player)
                            ? "player-toggle selected"
                            : "player-toggle"
                        }
                        onClick={() =>
                          togglePlayerInList(player, setAbilityClaimTargets)
                        }
                      >
                        {getPlayerDisplayName(player)}
                      </button>
                    ))}
                </div>

                <div className="form-section">
                  <label>内容 / 結果（任意）</label>
                  <textarea
                    value={abilityClaimResult}
                    placeholder="例：1、はい、3Lを守った など"
                    onChange={(event) => setAbilityClaimResult(event.target.value)}
                  />
                </div>

                <div className="claim-option-title">公開範囲</div>
                <div className="visibility-switch">
                  <button
                    className={
                      abilityClaimVisibility === "public"
                        ? "visibility-button visibility-selected"
                        : "visibility-button"
                    }
                    onClick={() => {
                      setAbilityClaimVisibility("public");
                      setAbilityClaimRecipients([]);
                    }}
                  >
                    公開
                  </button>
                  <button
                    className={
                      abilityClaimVisibility === "private"
                        ? "visibility-button visibility-selected"
                        : "visibility-button"
                    }
                    onClick={() => {
                      setAbilityClaimVisibility("private");
                      setAbilityClaimRecipients([]);
                    }}
                  >
                    非公開
                  </button>
                </div>

                {abilityClaimVisibility === "private" && (
                  <div className="form-section">
                    <label>伝えた相手</label>
                    <div className="player-toggle-grid">
                      <button
                        type="button"
                        className={
                          abilityClaimRecipients.includes("self")
                            ? "player-toggle selected"
                            : "player-toggle"
                        }
                        onClick={() =>
                          togglePlayerInList("self", setAbilityClaimRecipients)
                        }
                      >
                        自分
                      </button>
                      {getActivePlayers()
                        .filter((player) => player !== selectedPlayer)
                        .map((player) => (
                          <button
                            key={player}
                            type="button"
                            className={
                              abilityClaimRecipients.includes(player)
                                ? "player-toggle selected"
                                : "player-toggle"
                            }
                            onClick={() =>
                              togglePlayerInList(player, setAbilityClaimRecipients)
                            }
                          >
                            {getPlayerDisplayName(player)}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                <div className="panel-note">
                  能力主張を確定すると、まだ正確な役職主張がない場合だけ同じ役職を自動で役職主張に追加します。
                </div>

                <button
                  className="menu-option confirm-claim-button"
                  disabled={!abilityClaimRole || (isBmrRole(abilityClaimRole) && !rolePhaseOptions(abilityClaimRole, night, 'action').includes(abilityClaimWhen))}
                  onClick={saveAbilityClaim}
                >
                  確定
                </button>
                <button
                  className="menu-option"
                  disabled={!selectedLatestOtherAbilityToUndo}
                  onClick={() => selectedLatestOtherAbilityToUndo && deleteHistory("abilityClaimLog", selectedLatestOtherAbilityToUndo.id)}
                >
                  取り消し
                </button>
                <button className="menu-option" onClick={returnFromPlayerPanel}>
                  戻る
                </button>
              </>
            )}

            {playerPanel === "nomination" && (
              <>
                <h2>{selectedPlayer} — 指名</h2>
                {(riotConfirmed || selfRole.shownRole==='riot') && nominationWhen==='D3' && <p className="panel-note">ライオット3日目：指名された人は直ちに死亡し、その死亡した人も続けて指名できます。通常の投票はありません。死亡は指名と一緒に記録します。</p>}
                {bishopActive(snapshot, nominationWhen) && <p className="panel-note">司教が有効です。この入力は指名者に関係なく「語り手の指名」として保存されます。</p>}

                <details className="analysis-card traveller-manager">
                  <summary>旅人を追加・管理</summary>
                  <p className="panel-note">旅人は通常の役職一覧やセットアップ人数には入りません。参加中の旅人だけが投票欄と中央表示に出ます。</p>
                  <div className="form-section">
                    <label>旅人役職（全旅人）</label>
                    <select value={newTravellerRole} onChange={(event)=>setNewTravellerRole(event.target.value as TravellerRoleId)}>
                      {ALL_TRAVELLER_IDS.map((id)=><option key={id} value={id}>{TRAVELLERS[id].symbol} {TRAVELLERS[id].name}</option>)}
                    </select>
                  </div>
                  <div className="form-section">
                    <label>名前（任意）</label>
                    <input value={newTravellerName} maxLength={30} placeholder="旅人プレイヤー名" onChange={(event)=>setNewTravellerName(event.target.value)}/>
                  </div>
                  <button className="menu-option" type="button" onClick={addTraveller}>旅人を参加させる</button>
                  {getActiveTravellers().length > 0 && <div className="traveller-manager-list">
                    {getActiveTravellers().map((traveller)=><button key={traveller.id} type="button" className="player-toggle" onClick={()=>openTravellerPanel(traveller.id)}>{TRAVELLERS[traveller.roleId].symbol} {traveller.name || TRAVELLERS[traveller.roleId].name}</button>)}
                  </div>}
                </details>

                <div className="claim-option-title">指名された人</div>
                <div className="player-toggle-grid">
                  {getActivePlayers()
                    .map((player) => (
                      <button
                        key={player}
                        type="button"
                        className={
                          pendingNominee === player
                            ? "player-toggle selected"
                            : "player-toggle"
                        }
                        onClick={() => {
                          setPendingNominee(player);
                          setPendingVoters([]); setVirginResult(null);
                        }}
                      >
                        {getPlayerDisplayName(player)}
                      </button>
                    ))}
                  <button
                    type="button"
                    className={
                      pendingNominee === "self"
                        ? "player-toggle selected"
                        : "player-toggle"
                    }
                    onClick={() => {
                      setPendingNominee("self");
                      setPendingVoters([]); setVirginResult(null);
                    }}
                  >
                    自分
                  </button>
                </div>

                <div className="form-section">
                  <label>いつ</label>
                  <select
                    value={nominationWhen}
                    onChange={(event) => {setNominationWhen(event.target.value);setVirginResult(null);setPendingVoters([]);}}
                  >
                    {getDayOptions().map((phase) => (
                      <option key={phase} value={phase}>
                        {phase}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-section"><label>{L.nominationReason}</label><textarea value={nominationReason} onChange={e=>setNominationReason(e.target.value)} maxLength={1000}/></div>
                {pendingNominee&&<NominationCard g={snapshot} r={reasoning.result} p={pendingNominee} nominator={selectedPlayer} compact/>}
                {!((riotConfirmed || selfRole.shownRole==='riot') && nominationWhen==="D3") && needsVirginCheck(pendingNominee,nominationWhen)&&<section className="analysis-card"><h3>{L.virginQuestion}</h3><p className="panel-note">{L.virginBefore}</p><div className="visibility-switch">{([true,false] as const).map(v=><button type="button" key={String(v)} className={`visibility-button ${virginResult===v?"visibility-selected":""}`} onClick={()=>{setVirginResult(v);setPendingVoters([]);}}>{v?L.yes:L.no}</button>)}</div></section>}
                {pendingNominee && !((riotConfirmed || selfRole.shownRole==='riot') && nominationWhen==="D3") && (!needsVirginCheck(pendingNominee,nominationWhen)||virginResult===false) && (
                  <>
                    <div className="claim-option-title">
                      投票 — 挙手 {pendingValidVoters.length}人 / 合計 {pendingVote.total}票
                    </div>
                    {voudonActive(snapshot, nominationWhen) && <p className="panel-note">ブードゥー師有効中: ブードゥー師と死亡者だけが投票できます。死亡者の死者票は消費せず、通常の過半数は不要です。</p>}
                    <div className="panel-note">選択中 = 挙手</div>
                    <div className="panel-note">
                      時計回りの投票順です。最後が指名された本人です。
                    </div>
                    <div className="player-toggle-grid vote-order-grid">
                      {getClockwiseVoteOrder(pendingNominee).map((player, index) => {
                        const status = player === "self"
                          ? playerStatus.self
                          : playerStatus[player];
                        const weight = travellerVoteWeight(player, nominationWhen);
                        return (
                          <button
                            key={player}
                            type="button"
                            disabled={!canVoteParticipant(player)}
                            className={
                              pendingVoters.includes(player)
                                ? "player-toggle selected"
                                : "player-toggle"
                            }
                            onClick={() => togglePlayerInList(player, setPendingVoters)}
                          >
                            <span className="vote-order-number">{index + 1}</span> {getPlayerDisplayName(player)}
                            {weight !== 1 && <span className="vote-weight"> {weight > 0 ? `+${weight}` : weight}</span>}
                            {status && !status.alive && !status.deadVoteAvailable && " ×"}
                          </button>
                        );
                      })}
                    </div>
                    {getVotingTravellers().length > 0 && <>
                      <div className="claim-option-title">旅人の投票</div>
                      <div className="player-toggle-grid traveller-vote-grid">
                        {getVotingTravellers().map((traveller)=>{
                          const weight = travellerVoteWeight(traveller.id, nominationWhen);
                          const disabled = !canVoteParticipant(traveller.id);
                          return <button key={traveller.id} type="button" disabled={disabled} className={`player-toggle ${pendingVoters.includes(traveller.id)?"selected":""}`} onClick={()=>togglePlayerInList(traveller.id,setPendingVoters)}>
                            {TRAVELLERS[traveller.roleId].symbol} {traveller.name || TRAVELLERS[traveller.roleId].name}
                            <span className="vote-weight"> {weight > 0 ? `+${weight}` : weight}</span>
                            {traveller.roleId==="beggar"&&traveller.alive&&<small> / 残{traveller.voteTokens}</small>}
                            {traveller.exiled&&<small> / 追放・{traveller.deadVoteAvailable?"死者票あり":"死者票使用済み"}</small>}
                            {!traveller.alive&&!traveller.deadVoteAvailable&&" ×"}
                          </button>;
                        })}
                      </div>
                    </>}
                  </>
                )}
                {pendingNominee && !((riotConfirmed || selfRole.shownRole==='riot') && nominationWhen==="D3") && (!needsVirginCheck(pendingNominee,nominationWhen) || virginResult===false) && <label className="check-label"><input type="checkbox" checked={nominationExecutedSurvived} onChange={event=>setNominationExecutedSurvived(event.target.checked)}/>処刑が成立したが本人は生存（平和主義者など）。リヴァイアサンでは処刑人数に含めます。</label>}

                <button
                  className="menu-option confirm-claim-button"
                  disabled={!pendingNominee || (!((riotConfirmed || selfRole.shownRole==='riot') && nominationWhen==="D3") && needsVirginCheck(pendingNominee,nominationWhen)&&virginResult===null)}
                  onClick={saveNomination}
                >
                  確定
                </button>
                <button className="menu-option" onClick={returnFromPlayerPanel}>
                  戻る
                </button>
              </>
            )}

            {playerPanel === "status" && (
              <>
                <h2>{selectedPlayer} — 状態</h2>
                <div className="status-display">
                  {playerStatus[selectedPlayer].alive ? "生存" : "死亡"}
                </div>

                {selectedDeaths.length > 0 && (
                  <div className="claim-history">
                    <div className="claim-history-title">死亡履歴</div>
                    {selectedDeaths.map((death) => (
                      <div className="claim-history-item" key={death.id}>
                        <span>{death.when}</span>
                        <span>{getDeathReasonLabel(death.reason)}</span>
                        <span>
                          {death.sourceRoleId
                            ? `${ROLES[death.sourceRoleId].symbol} ${ROLES[death.sourceRoleId].name}`
                            : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {selectedRevivals.length > 0 && (
                  <div className="claim-history">
                    <div className="claim-history-title">復活履歴</div>
                    {selectedRevivals.map((event) => (
                      <div className="claim-history-item" key={event.id}>
                        <span>{event.when}</span>
                        <span>復活</span>
                      </div>
                    ))}
                  </div>
                )}

                {playerStatus[selectedPlayer].alive ? (
                  <button className="menu-option danger-button" onClick={openDeathPanel}>
                    キル
                  </button>
                ) : (
                  <>
                    <div className="status-detail">
                      死者投票：
                      {playerStatus[selectedPlayer].deadVoteAvailable
                        ? "使用可能"
                        : "使用済み"}
                    </div>
                    {currentScriptHasReviver && night >= 2 && (
                      <button className="menu-option confirm-claim-button" onClick={() => revivePlayer(selectedPlayer)}>
                        復活
                      </button>
                    )}
                    <button className="menu-option" onClick={()=>openAnalysis(selectedPlayer)}>{L.history}</button>
                    <p className="panel-note">{"\u6b7b\u8005\u6295\u7968\u306f\u78ba\u5b9a\u3057\u305f\u6295\u7968\u8a18\u9332\u304b\u3089\u8a08\u7b97\u3057\u307e\u3059\u3002\u8aa4\u5165\u529b\u306f\u8a18\u9332\u304b\u3089\u8a02\u6b63\u3057\u3066\u304f\u3060\u3055\u3044\u3002"}</p>
                  </>
                )}

                <button className="menu-option" onClick={returnFromPlayerPanel}>
                  戻る
                </button>
              </>
            )}

            {playerPanel === "death" && (
              <>
                <h2>{selectedPlayer} — キル</h2>
                {currentScriptRoleIds.includes("mutant") && (
                  <>
                    <div className="claim-option-title">突然変異者による処刑</div>
                    <div className="visibility-switch">
                      <button
                        type="button"
                        className={!pendingMutantExecution ? "visibility-button visibility-selected" : "visibility-button"}
                        onClick={() => setPendingMutantExecution(false)}
                      >通常</button>
                      <button
                        type="button"
                        className={pendingMutantExecution ? "visibility-button visibility-selected" : "visibility-button"}
                        onClick={() => {
                          setPendingMutantExecution(true);
                          setPendingDeathReason("storyteller");
                        }}
                      >突然変異者の狂気違反による処刑</button>
                    </div>
                  </>
                )}
                <div className="claim-option-title">理由</div>
                <div className="player-toggle-grid">
                  {availableDeathReasons(currentScriptRoleIds, getActiveTravellers()).map((reason) => (
                    <button
                      key={reason.id}
                      type="button"
                      className={
                        pendingDeathReason === reason.id
                          ? "player-toggle selected"
                          : "player-toggle"
                      }
                      onClick={() => setDeathReason(reason.id)}
                    >
                      {reason.label}
                    </button>
                  ))}
                </div>

                <div className="form-section">
                  <label>いつ</label>
                  <select
                    value={deathWhen}
                    onChange={(event) => setDeathWhen(event.target.value)}
                  >
                    {getDeathPhaseOptions(pendingDeathReason).map((phase) => (
                      <option key={phase} value={phase}>
                        {phase}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="panel-note">
                  一部の特殊能力による死亡は、能力の発動記録から自動で追加されます。
                </div>

                <button
                  className="menu-option confirm-claim-button"
                  onClick={saveManualDeath}
                >
                  確定
                </button>
                <button className="menu-option" onClick={() => setPlayerPanel("status")}>
                  戻る
                </button>
              </>
            )}

            {playerPanel === "talk" && (
              <>
                <h2>{selectedPlayer} — 会話</h2>
                <div className="claim-option-title">話した相手</div>
                <div className="player-toggle-grid">
                  <button
                    type="button"
                    disabled={selectedPlayer === "self"}
                    className={
                      talkParticipants.includes("self")
                        ? "player-toggle selected"
                        : "player-toggle"
                    }
                    onClick={() =>
                      togglePlayerInList("self", setTalkParticipants)
                    }
                  >
                    自分
                  </button>
                  {getActivePlayers()
                    .filter((player) => player !== selectedPlayer)
                    .map((player) => (
                      <button
                        key={player}
                        type="button"
                        className={
                          talkParticipants.includes(player)
                            ? "player-toggle selected"
                            : "player-toggle"
                        }
                        onClick={() =>
                          togglePlayerInList(player, setTalkParticipants)
                        }
                      >
                        {getPlayerDisplayName(player)}
                      </button>
                    ))}
                </div>

                <div className="form-section">
                  <label>いつ</label>
                  <select
                    value={talkWhen}
                    onChange={(event) => setTalkWhen(event.target.value)}
                  >
                    {getDayOptions().map((phase) => (
                      <option key={phase} value={phase}>
                        {phase}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="claim-option-title">話題</div>
                <div className="player-toggle-grid">
                  <button
                    type="button"
                    className={
                      talkTopic === null
                        ? "player-toggle selected"
                        : "player-toggle"
                    }
                    onClick={() => setTalkTopic(null)}
                  >
                    不明
                  </button>
                  {(Object.keys(TALK_TOPIC_LABELS) as TalkTopic[]).map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      className={
                        talkTopic === topic
                          ? "player-toggle selected"
                          : "player-toggle"
                      }
                      onClick={() => setTalkTopic(topic)}
                    >
                      {TALK_TOPIC_LABELS[topic]}
                    </button>
                  ))}
                </div>

                {talkTopic !== null && (
                  <div className="form-section">
                    <label>内容（任意）</label>
                    <textarea
                      value={talkDetails}
                      placeholder="分かる範囲で入力"
                      onChange={(event) => setTalkDetails(event.target.value)}
                    />
                  </div>
                )}

                <button
                  className="menu-option confirm-claim-button"
                  disabled={talkParticipants.length === 0}
                  onClick={saveTalk}
                >
                  確定
                </button>
                <button className="menu-option" onClick={returnFromPlayerPanel}>
                  戻る
                </button>
              </>
            )}

            {playerPanel === "trigger_choice" && (
              <>
                <h2>能力発動</h2>
                <div className="panel-note">
                  処刑人では {getPlayerDisplayName(selectedPlayer)} が能力の使用者です。官僚・泥棒では {getPlayerDisplayName(selectedPlayer)} が能力の対象です。
                </div>

                {currentScriptRoleIds.includes("slayer") && (
                  <button className="menu-option" onClick={openSlayerTriggerPanel}>
                    {ROLES.slayer.symbol} {ROLES.slayer.name} — この人が使用者
                  </button>
                )}

                {activeVoteModifierTravellers.map((traveller) => {
                  const existing = travellerActionLog
                    .filter((event): event is Extract<TravellerActionEvent, { kind: "vote_modifier" }> => event.kind === "vote_modifier")
                    .find((event) => event.travellerId === traveller.id && event.when === `N${night}`);
                  return (
                    <div key={traveller.id} className="analysis-card">
                      <button
                        className="menu-option"
                        onClick={() => {
                          saveTravellerVoteModifier(traveller, selectedPlayer);
                          setPlayerPanel("menu");
                        }}
                      >
                        {TRAVELLERS[traveller.roleId].symbol} {TRAVELLERS[traveller.roleId].name} — この人を対象にする
                      </button>
                      <div className="panel-note">
                        N{night}：{existing ? `${getPlayerDisplayName(existing.target)} を選択済み。選び直すと上書きします。` : "対象未選択"}
                      </div>
                    </div>
                  );
                })}

                <button className="menu-option" onClick={() => setPlayerPanel("menu")}>戻る</button>
              </>
            )}

            {playerPanel === "trigger" && triggerDraft && (
              <>
                <h2>
                  {triggerDraft.kind === "virgin" ? "処女" : "処刑人"} — 能力発動
                </h2>

                {triggerDraft.kind === "virgin" ? (
                  <>
                    <div className="panel-note">
                      {getPlayerDisplayName(triggerDraft.targetPlayerId ?? "")} → {" "}
                      {getPlayerDisplayName(triggerDraft.rolePlayerId)} を指名
                    </div>
                    <div className="claim-option-title">処女は発動しましたか？</div>
                  </>
                ) : (
                  <>
                    <div className="claim-option-title">対象</div>
                    <div className="player-toggle-grid">
                      {getActivePlayers()
                        .filter((player) => player !== triggerDraft.rolePlayerId)
                        .map((player) => (
                          <button
                            key={player}
                            type="button"
                            className={
                              triggerDraft.targetPlayerId === player
                                ? "player-toggle selected"
                                : "player-toggle"
                            }
                            onClick={() =>
                              setTriggerDraft((current) =>
                                current
                                  ? { ...current, targetPlayerId: player }
                                  : current
                              )
                            }
                          >
                            {getPlayerDisplayName(player)}
                          </button>
                        ))}
                    </div>
                    <div className="form-section">
                      <label>いつ</label>
                      <select
                        value={triggerDraft.when}
                        onChange={(event) =>
                          setTriggerDraft((current) =>
                            current ? { ...current, when: event.target.value } : current
                          )
                        }
                      >
                        {getDayOptions().map((phase) => (
                          <option key={phase} value={phase}>
                            {phase}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="claim-option-title">対象は死亡しましたか？</div>
                  </>
                )}

                <div className="visibility-switch">
                  <button
                    className={
                      triggerDraft.result === true
                        ? "visibility-button visibility-selected"
                        : "visibility-button"
                    }
                    onClick={() =>
                      setTriggerDraft((current) =>
                        current ? { ...current, result: true } : current
                      )
                    }
                  >
                    はい
                  </button>
                  <button
                    className={
                      triggerDraft.result === false
                        ? "visibility-button visibility-selected"
                        : "visibility-button"
                    }
                    onClick={() =>
                      setTriggerDraft((current) =>
                        current ? { ...current, result: false } : current
                      )
                    }
                  >
                    いいえ
                  </button>
                </div>

                <button
                  className="menu-option confirm-claim-button"
                  disabled={
                    triggerDraft.result === null || !triggerDraft.targetPlayerId
                  }
                  onClick={saveAbilityTrigger}
                >
                  確定
                </button>
                <button
                  className="menu-option"
                  onClick={() => {
                    setTriggerDraft(null);
                    setPlayerPanel("menu");
                  }}
                >
                  戻る
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {selfMenuOpen && (
        <div className="menu-overlay" onClick={() => setSelfMenuOpen(false)}>
          <div className="player-menu" onClick={(event) => event.stopPropagation()}>
            {selfPanel === "menu" && (
              <>
                <h2>自分</h2>
                <PlayerSummary g={snapshot} p="self" r={reasoning.result} e={analysis} onOpen={()=>openAnalysis("self")}/>
                <button className="menu-option" onClick={()=>setSelfPanel("advice")}>{L.advice}</button>
                <div className="current-claim">
                  表示役職：
                  <strong>
                    {selfRole.shownRole
                      ? `${ROLES[selfRole.shownRole].symbol} ${ROLES[selfRole.shownRole].name}`
                      : "未設定"}
                  </strong>
                </div>

                {successfulSnakeSwap?.newDemonRole && (
                  <div className="current-claim">
                    現在：<strong>{ROLES[successfulSnakeSwap.newDemonRole].symbol} {ROLES[successfulSnakeSwap.newDemonRole].name}</strong>（蛇使い交換）
                  </div>
                )}

                {selfRole.shownRole && selfHiddenRolePossibilities.length > 0 && (
                  <div className="self-role-warning">
                    <strong>役職未確定</strong>
                    {selfHiddenRolePossibilities.map((role) => (
                      <div key={role.id}>
                        {role.symbol} {role.name} の可能性あり
                      </div>
                    ))}
                  </div>
                )}

                {selfRole.shownRole && selfHiddenRolePossibilities.length === 0 && (
                  <div className="self-role-confirmed">役職確認済み</div>
                )}

                <div className="status-detail">
                  {selfRole.shownRole && ROLES[selfRole.shownRole].type === "demon"
                    ? `味方：${demonState.knownMinions.length}人${demonActionLog.length ? ` / 襲撃記録：${demonActionLog.length}件` : ""}`
                    : selfRole.shownRole && ROLES[selfRole.shownRole].type === "minion"
                      ? `デーモン：${minionState.knownDemon ? "確認" : "未確認"} / 手下の行動：${minionActionLog.length}件`
                    : `自分の情報：${selfInfoLog.length}件 / 行動：${selfActionLog.length}件`}
                </div>

                {selfRole.shownRole === "cannibal" && (() => {
                  const executee = getCannibalExecutee();
                  const assumed = getCannibalAssumedRole();
                  return <div className="panel-note">
                    {executee
                      ? `直近の処刑死者：${getPlayerDisplayName(executee.playerId)}${assumed ? ` / 主張役職：${ROLES[assumed].symbol} ${ROLES[assumed].name}` : " / 役職主張不明"}`
                      : "まだ処刑で死亡した人がいないため、カニバルの獲得能力はありません。"}
                  </div>;
                })()}

                <button
                  className="menu-option"
                  onClick={() => {
                    setPendingSelfRole(selfRole.shownRole);
                    setSelfPanel("role");
                  }}
                >
                  自分の役職
                </button>

                <button
                  className="menu-option"
                  disabled={
                    !effectiveSelfAbilityRole ||
                    !ROLES[effectiveSelfAbilityRole].tags.includes("INFO_SOURCE")
                  }
                  onClick={openSelfInfoPanel}
                >
                  自分の情報
                </button>

                <button
                  className="menu-option"
                  disabled={
                    !effectiveSelfAbilityRole ||
                    selfRole.shownRole === "amnesiac" ||
                    !(selfRole.shownRole === "pixie" && !selfActionLog.some(e => e.roleId === "pixie")) &&
                    !isBmrRecordedActionRole(effectiveSelfAbilityRole) &&
                    !["philosopher", "monk", "exorcist", "slayer", "snake_charmer", "klutz", "acrobat", "alsaahir", "engineer", "huntsman", "lycanthrope", "nightwatchman", "pixie", "preacher", "princess"].includes(effectiveSelfAbilityRole)
                  }
                  onClick={openSelfActionPanel}
                >
                  自分の行動
                </button>

                {effectiveSelfAbilityRole && isBmrRole(effectiveSelfAbilityRole) && BMR_PASSIVE_EXPLANATIONS[effectiveSelfAbilityRole] && (
                  <p className="panel-note">{BMR_PASSIVE_EXPLANATIONS[effectiveSelfAbilityRole]}</p>
                )}

                {selfRole.shownRole && currentScriptRoleIds.includes("farmer") && !selfActionLog.some(e => e.roleId === "farmer") && selfRole.shownRole !== "farmer" && (
                  <button className="menu-option" onClick={() => {resetSelfActionForm();setSelfActionWhen(`N${night}`);setSelfPanel("farmer");}}>農夫への変身を記録</button>
                )}

                {currentScriptRoleIds.includes("damsel") && (
                  <button className="menu-option" onClick={() => {resetSelfActionForm();setSelfActionWhen(`D${night}`);setSelfPanel("damsel");}}>乙女への手下の公開推理を記録</button>
                )}
                {selfRole.shownRole === "pixie" && <p className="panel-note">ピクシーの能力獲得は、自分の行動から語り手の認定後に記録します。</p>}
                {selfRole.shownRole === "alchemist" && (
                  <button className="menu-option" onClick={() => { setSelfAlchemistRole(getLatestAlchemistAction()?.minionRole ?? null); setSelfPanel("alchemist"); }}>
                    錬金術師の能力
                  </button>
                )}

                {selfRole.shownRole === "amnesiac" && (
                  <button className="menu-option" onClick={() => setSelfPanel("amnesiac")}>
                    記憶喪失者の能力推理
                  </button>
                )}

                <div className="claim-option-title">主張・公開行動</div>
                <button className="menu-option" onClick={() => openSelfPlayerPanel("claim")}>
                  自分の役職主張
                </button>
                <button className="menu-option" onClick={() => openSelfPlayerPanel("reported_info")}>
                  自分の情報を記録
                </button>
                <button className="menu-option" onClick={() => openSelfPlayerPanel("nomination")}>
                  指名
                </button>
                <button className="menu-option" onClick={() => openSelfPlayerPanel("talk")}>
                  会話
                </button>
                <button className="menu-option" onClick={() => openSelfPlayerPanel("status")}>
                  状態・死亡
                </button>

                {selfRole.shownRole && ROLES[selfRole.shownRole].type === "demon" && (
                  <button className="menu-option evil-mode-button" onClick={() => setSelfPanel("demon")}>
                    デーモンモード
                  </button>
                )}

                {selfRole.shownRole && ROLES[selfRole.shownRole].type === "minion" && (
                  <button className="menu-option evil-mode-button" onClick={() => setSelfPanel("minion")}>
                    手下モード
                  </button>
                )}

                <button className="menu-option" onClick={() => setSelfMenuOpen(false)}>
                  閉じる
                </button>
              </>
            )}

            {selfPanel === "advice" && <><AdvicePanel g={snapshot} r={reasoning.result}/><button className="menu-option" onClick={()=>setSelfPanel("menu")}>{L.back}</button></>}
            {selfPanel === "demon" && selfRole.shownRole && ROLES[selfRole.shownRole].type === "demon" && (
              <DemonModePanel
                g={snapshot}
                state={demonState}
                actions={demonActionLog}
                result={reasoning.result}
                onChange={setDemonState}
                onChangeActions={setDemonActionLog}
                onBack={() => setSelfPanel("menu")}
              />
            )}
            {selfPanel === "minion" && selfRole.shownRole && ROLES[selfRole.shownRole].type === "minion" && (
              <MinionModePanel
                g={snapshot}
                state={minionState}
                actions={minionActionLog}
                demonActions={demonActionLog}
                result={reasoning.result}
                onChange={setMinionState}
                onChangeActions={setMinionActionLog}
                onChangeDemonActions={setDemonActionLog}
                onCreateDeath={createDeathEvent}
                onDeleteAction={(id) => deleteHistory("minionActionLog", id)}
                onBack={() => setSelfPanel("menu")}
              />
            )}
            {selfPanel === "alchemist" && selfRole.shownRole === "alchemist" && (
              <>
                <h2>錬金術師の能力</h2>
                <p className="panel-note">このゲームで得た手下能力を記録します。手下そのものになったわけではなく、自分は善の町人のままです。</p>
                {getLatestAlchemistAction() && <div className="current-claim">現在：<strong>{ROLES[getLatestAlchemistAction()!.minionRole].symbol} {ROLES[getLatestAlchemistAction()!.minionRole].name}</strong></div>}
                <div className="role-grid minion-role-grid">
                  {currentScriptRoles.filter((role) => role.type === "minion").map((role) => (
                    <button key={role.id} className={selfAlchemistRole === role.id ? "role-choice role-choice-selected" : "role-choice"} onClick={() => setSelfAlchemistRole(role.id)}>
                      <span className="role-choice-symbol">{role.symbol}</span><span className="role-choice-name">{role.name}</span>
                    </button>
                  ))}
                </div>
                {selfAlchemistRole && ROLES[selfAlchemistRole].tags.includes("OUTSIDER_COUNT_MODIFIER") && <p className="panel-note">この能力のセットアップ時アウトサイダー増減も候補盤面に適用します。</p>}
                <button className="menu-option confirm-claim-button" disabled={!selfAlchemistRole} onClick={saveSelfAlchemistAbility}>確定</button>
                <button className="menu-option" onClick={() => setSelfPanel("menu")}>戻る</button>
              </>
            )}
            {selfPanel === "amnesiac" && selfRole.shownRole === "amnesiac" && (() => {
              const candidates = getAmnesiacCandidates();
              const suggestedTag = getAmnesiacSuggestedTag();
              const locked = getLatestAmnesiacLock();
              const answers = selfActionLog.filter((event): event is Extract<SelfActionEvent,{roleId:"amnesiac";kind:"tag_answer"}> => event.roleId === "amnesiac" && event.kind === "tag_answer").sort(compareEvents);
              return <>
                <h2>記憶喪失者の能力推理</h2>
                <p className="panel-note">スクリプト上の町人を候補にし、残り候補をできるだけ半分に分けるタグを次の質問として提案します。</p>
                {locked && <div className="current-claim">現在の推定能力：<strong>{ROLES[locked.chosenRole].symbol} {ROLES[locked.chosenRole].name}</strong></div>}
                <div className="status-detail">残り候補：{candidates.length}人</div>
                {answers.length > 0 && <div className="claim-history">{answers.map((answer) => <div key={answer.id} className="claim-history-item"><span>{answer.when}</span><span>{ROLE_TAG_UI_LABELS[answer.tag] ?? "能力タグ"}</span><span>{answer.matches ? "当てはまる" : "当てはまらない"}</span></div>)}</div>}
                {suggestedTag ? <section className="analysis-card">
                  <h3>次に聞くタグ</h3>
                  <p>「この能力は『{ROLE_TAG_UI_LABELS[suggestedTag] ?? "この性質"}』に当てはまりますか？」</p>
                  <div className="visibility-switch">
                    <button className="visibility-button" onClick={() => saveAmnesiacTagAnswer(suggestedTag, true)}>当てはまる</button>
                    <button className="visibility-button" onClick={() => saveAmnesiacTagAnswer(suggestedTag, false)}>当てはまらない</button>
                  </div>
                </section> : <p className="panel-note">これ以上きれいに候補を分けられる未使用タグはありません。</p>}
                {candidates.length > 0 && <>
                  <div className="claim-option-title">能力をこれだと決める</div>
                  <div className="role-grid">
                    {candidates.map((role) => <button key={role.id} className="role-choice" onClick={() => lockAmnesiacRole(role.id)}><span className="role-choice-symbol">{role.symbol}</span><span className="role-choice-name">{role.name}</span></button>)}
                  </div>
                </>}
                <button className="menu-option" onClick={() => setSelfPanel("menu")}>戻る</button>
              </>;
            })()}
            {selfPanel === "role" && (
              <>
                <h2>自分の役職</h2>
                <div className="panel-note">
                  町人／手下／デーモンを選べます。悪役職は専用モードで味方情報と能力を記録します。
                </div>
                <div className="claim-option-title">町人</div>
                <div className="role-grid">
                  {currentScriptRoles
                    .filter((role) => role.type === "townsfolk")
                    .map((role) => (
                      <button
                        key={role.id}
                        className={
                          pendingSelfRole === role.id
                            ? "role-choice role-choice-selected"
                            : "role-choice"
                        }
                        onClick={() => setPendingSelfRole(role.id)}
                      >
                        <span className="role-choice-symbol">{role.symbol}</span>
                        <span className="role-choice-name">{role.name}</span>
                      </button>
                    ))}
                </div>
                <div className="claim-option-title">アウトサイダー</div>
                <div className="role-grid">
                  {currentScriptRoles.filter((role) => role.type === "outsider").map((role) => (
                    <button key={role.id} className={pendingSelfRole === role.id ? "role-choice role-choice-selected" : "role-choice"} onClick={() => setPendingSelfRole(role.id)}>
                      <span className="role-choice-symbol">{role.symbol}</span><span className="role-choice-name">{role.name}</span>
                    </button>
                  ))}
                </div>
                <div className="claim-option-title">手下</div>
                <div className="role-grid minion-role-grid">
                  {currentScriptRoles.filter((role) => role.type === "minion").map((role) => (
                    <button
                      key={role.id}
                      className={pendingSelfRole === role.id ? "role-choice role-choice-selected evil-role-selected" : "role-choice"}
                      onClick={() => setPendingSelfRole(role.id)}
                    >
                      <span className="role-choice-symbol">{role.symbol}</span>
                      <span className="role-choice-name">{role.name}</span>
                    </button>
                  ))}
                </div>
                <div className="claim-option-title">デーモン</div>
                <div className="role-grid demon-role-grid">
                  {currentScriptRoles.filter((role) => role.type === "demon").map((role) => (
                    <button
                      key={role.id}
                      className={pendingSelfRole === role.id ? "role-choice role-choice-selected evil-role-selected" : "role-choice"}
                      onClick={() => setPendingSelfRole(role.id)}
                    >
                      <span className="role-choice-symbol">{role.symbol}</span>
                      <span className="role-choice-name">{role.name}</span>
                    </button>
                  ))}
                </div>
                <button
                  className="menu-option confirm-claim-button"
                  disabled={!pendingSelfRole}
                  onClick={() => {
                    if (!pendingSelfRole) {
                      return;
                    }
                    const oldRole = selfRole.shownRole;
                    const oldType = oldRole ? ROLES[oldRole].type : null;
                    const newType = ROLES[pendingSelfRole].type;
                    const changingRole = oldRole !== pendingSelfRole;

                    if (changingRole && (oldType === "townsfolk" || oldType === "outsider") && (selfInfoLog.length > 0 || selfActionLog.length > 0)) {
                      if (!window.confirm("役職を切り替えると、自分の町人情報・行動記録を消去します。続けますか？")) return;
                      setSelfInfoLog([]); setSelfActionLog([]);
                    }

                    if (changingRole && oldType === "demon" && (demonState.knownMinions.length > 0 || demonState.storytellerBluffs.length > 0 || demonActionLog.length > 0)) {
                      if (!window.confirm("デーモンから切り替えると、悪チーム・ブラフ・襲撃記録を消去します。続けますか？")) return;
                      setDemonState(makeEmptyDemonState()); setDemonActionLog([]);
                    }

                    if (changingRole && oldType === "minion") {
                      const hasMinionData = minionState.knownDemon !== null || minionState.knownMinions.length > 0 ||
                        minionState.sharedStorytellerBluffs.length > 0 || Object.values(minionState.bluffPlans).some(Boolean) ||
                        Object.keys(minionState.spyInitialRoles).length > 0 || minionState.becameDemonAt !== null || !!minionState.evilTwin ||
                        minionActionLog.length > 0 || demonActionLog.length > 0;
                      if (newType !== "minion" && hasMinionData) {
                        if (!window.confirm("手下から切り替えると、悪チーム・ブラフ・能力記録を消去します。続けますか？")) return;
                        setMinionState(makeEmptyMinionState()); setMinionActionLog([]); setDemonActionLog([]);
                      } else if (newType === "minion" && oldRole !== pendingSelfRole) {
                        if (hasMinionData && !window.confirm("別の手下に切り替えます。味方・共有ブラフは残し、役職固有記録と継承記録を消去します。続けますか？")) return;
                        setMinionState(current => ({
                          ...current,
                          spyInitialRoles: {},
                          spyRedHerring: null,
                          becameDemonAt: null,
                          evilTwin: null,
                        }));
                        setMinionActionLog([]); setDemonActionLog([]);
                      }
                    }

                    if (changingRole && oldType !== "townsfolk" && newType === "townsfolk") {
                      setSelfInfoLog([]); setSelfActionLog([]);
                    }
                    setSelfRole({ shownRole: pendingSelfRole });
                    setSelfPanel(newType === "demon" ? "demon" : newType === "minion" ? "minion" : "menu");
                  }}
                >
                  確定
                </button>
                <button className="menu-option" onClick={() => setSelfPanel("menu")}>
                  戻る
                </button>
              </>
            )}

            {selfPanel === "damsel" && (
              <>
                <h2>乙女への公開推理</h2>
                {selfActionLog.some(a=>a.roleId==="damsel") ? <p className="panel-note">手下チームはこのゲームで既に乙女を推理しています。</p> : <>
                  <p className="panel-note">手下が公開で乙女を推理した場合にのみ記録します。正解で、乙女が健康かつ存命なら悪が即勝利します。スパイが登場したゲームでは乙女は毒状態です。</p>
                  <div className="form-section"><label>公開推理の日</label><select value={selfActionWhen} onChange={e=>setSelfActionWhen(e.target.value)}>{getDayOptions().map(x=><option key={x} value={x}>{x}</option>)}</select></div>
                  <div className="claim-option-title">推理を行った手下</div>
                  <div className="player-toggle-grid">{["self",...getActivePlayers()].map(x=><button key={x} type="button" className={selfDamselMinion===x?"player-toggle selected":"player-toggle"} onClick={()=>setSelfDamselMinion(x)}>{getPlayerDisplayName(x)}</button>)}</div>
                  <div className="claim-option-title">乙女だと推理された人</div>
                  <div className="player-toggle-grid">{["self",...getActivePlayers()].map(x=><button key={x} type="button" className={selfActionTarget===x?"player-toggle selected":"player-toggle"} onClick={()=>setSelfActionTarget(x)}>{getPlayerDisplayName(x)}</button>)}</div>
                  <div className="visibility-switch"><button className={selfDamselWon?"visibility-button":"visibility-button visibility-selected"} onClick={()=>setSelfDamselWon(false)}>不正解・ゲーム継続</button><button className={selfDamselWon?"visibility-button visibility-selected":"visibility-button"} onClick={()=>setSelfDamselWon(true)}>正解・悪勝利</button></div>
                  <button className="menu-option confirm-claim-button" disabled={!selfDamselMinion||!selfActionTarget} onClick={saveDamselGuess}>確定</button>
                </>}
                <button className="menu-option" onClick={()=>setSelfPanel("menu")}>戻る</button>
              </>
            )}

            {selfPanel === "farmer" && (
              <>
                <h2>農夫への変身を記録</h2>
                <p className="panel-note">夜に農夫が死亡し、自分が新しい農夫になったことを直接確認した場合のみ記録してください。元の役職と陣営は記録に残ります。</p>
                <div className="form-section"><label>変身した夜</label><select value={selfActionWhen} onChange={e => {setSelfActionWhen(e.target.value);setSelfFarmerDeceased(null);}}>{getNightOptions(2).map(phase => <option key={phase} value={phase}>{phase}</option>)}</select></div>
                <div className="claim-option-title">夜に死亡した元の農夫</div>
                <div className="player-toggle-grid">{getActivePlayers().filter(player => deathLog.some(d => d.playerId === player && d.when === selfActionWhen && (d.reason === "night_death" || (d.sourceRoleId && ROLES[d.sourceRoleId].type === "demon")))).map(player => <button type="button" key={player} className={selfFarmerDeceased === player ? "player-toggle selected" : "player-toggle"} onClick={() => setSelfFarmerDeceased(player)}>{getPlayerDisplayName(player)}</button>)}</div>
                {!getActivePlayers().some(player => deathLog.some(d => d.playerId === player && d.when === selfActionWhen && d.reason === "night_death")) && <p className="panel-note">該当する夜の死亡を先に記録してください。</p>}
                <button className="menu-option confirm-claim-button" disabled={!selfFarmerDeceased} onClick={saveSelfFarmerTransformation}>確定</button>
                <button className="menu-option" onClick={() => setSelfPanel("menu")}>戻る</button>
              </>
            )}

            {selfPanel === "info" && effectiveSelfAbilityRole && (
              <>
                <h2>自分の情報</h2>
                <div className="current-claim">
                  <strong>
                    {ROLES[effectiveSelfAbilityRole].symbol} {ROLES[effectiveSelfAbilityRole].name}
                  </strong>
                </div>

                {selfInfoLog.filter((event) => event.roleId === effectiveSelfAbilityRole).length > 0 && (
                  <div className="claim-history">
                    <div className="claim-history-title">過去の情報</div>
                    {selfInfoLog
                      .filter((event) => event.roleId === effectiveSelfAbilityRole)
                      .sort(compareEvents)
                      .map((event) => (
                        <div className="claim-history-item" key={event.id}>
                          <span className="claim-history-role">{ROLES[event.roleId].symbol}</span>
                          <span>{event.when}</span>
                          <span>{formatSelfInfoEvent(event)}</span>
                        </div>
                      ))}
                  </div>
                )}

                {effectiveSelfAbilityRole === "grandmother" && (
                  <>
                    <p className="panel-note">初夜に善陣営の1人とその役職を知ります。その人がデーモンに殺されると祖母も死亡します。死亡記録は別に記録してください。</p>
                    <div className="claim-option-title">初夜に知らされた善陣営の人</div>
                    <div className="player-toggle-grid">{getActivePlayers().map(player=><button type="button" key={player} className={selfInfoPlayers.includes(player)?"player-toggle selected":"player-toggle"} onClick={()=>setSelfInfoPlayers([player])}>{getPlayerDisplayName(player)}</button>)}</div>
                    <div className="form-section"><label>その人の役職</label><select value={selfInfoShownRole??""} onChange={e=>setSelfInfoShownRole(e.target.value as RoleId || null)}><option value="">選択</option>{currentScriptRoles.map(r=><option key={r.id} value={r.id}>{r.symbol} {r.name}</option>)}</select></div>
                    <button className="menu-option confirm-claim-button" disabled={selfInfoPlayers.length!==1 || !selfInfoShownRole || selfInfoLog.some(e=>e.roleId==='grandmother')} onClick={saveSelfGrandmotherInfo}>確定</button>
                  </>
                )}
                {effectiveSelfAbilityRole === "godfather" && <>
                  {selfInfoLog.some(e=>e.roleId==='godfather') ? <p className="panel-note">初夜のよそ者情報は記録済みです。</p> : <>
                    <p className="panel-note">初夜に知らされた、ゲーム内のよそ者役職を全て選びます。よそ者0人なら未選択のまま保存します。</p>
                    <div className="player-toggle-grid">{currentScriptRoles.filter(r=>r.type==='outsider').map(r=><button type="button" key={r.id} className={selfGodfatherRoles.includes(r.id)?'player-toggle selected':'player-toggle'} onClick={()=>setSelfGodfatherRoles(xs=>xs.includes(r.id)?xs.filter(x=>x!==r.id):[...xs,r.id])}>{r.symbol} {r.name}</button>)}</div>
                    <button className="menu-option confirm-claim-button" onClick={saveSelfGodfatherInfo}>確定</button>
                  </>}
                </>}
                {effectiveSelfAbilityRole === "chambermaid" && (
                  <>
                    <div className="form-section"><label>情報を得た夜</label><select value={selfInfoWhen} onChange={e=>{setSelfInfoWhen(e.target.value);setSelfInfoPlayers([]);setSelfInfoNumber(null);}}>{getSelfInfoNightOptions('chambermaid').map(p=><option key={p} value={p}>{p}</option>)}</select></div>
                    <p className="panel-note">生存中の自分以外の2人を選び、この夜「自分の能力で起きた」人数（0〜2）を記録します。</p>
                    <div className="player-toggle-grid">{getActivePlayers().filter(p=>playerStatus[p]?.alive!==false).map(p=><button type="button" key={p} className={selfInfoPlayers.includes(p)?"player-toggle selected":"player-toggle"} onClick={()=>toggleLimitedSelfInfoPlayer(p,2)}>{getPlayerDisplayName(p)}</button>)}</div>
                    <div className="player-toggle-grid">{([0,1,2] as const).map(n=><button type="button" key={n} className={selfInfoNumber===n?"player-toggle selected":"player-toggle"} onClick={()=>setSelfInfoNumber(n)}>{n}</button>)}</div>
                    <button className="menu-option confirm-claim-button" disabled={selfInfoPlayers.length!==2 || selfInfoNumber===null || selfInfoLog.some(e=>e.roleId==='chambermaid'&&e.when===selfInfoWhen)} onClick={saveSelfChambermaidInfo}>確定</button>
                  </>
                )}
                {(effectiveSelfAbilityRole === "washerwoman" ||
                  effectiveSelfAbilityRole === "investigator") && (
                  <>
                    <div className="claim-option-title">表示された2人</div>
                    <div className="player-toggle-grid">
                      {getActivePlayers().map((player) => (
                        <button
                          key={player}
                          type="button"
                          className={
                            selfInfoPlayers.includes(player)
                              ? "player-toggle selected"
                              : "player-toggle"
                          }
                          onClick={() => toggleLimitedSelfInfoPlayer(player, 2)}
                        >
                          {getPlayerDisplayName(player)}
                        </button>
                      ))}
                    </div>
                    <div className="form-section">
                      <label>表示された役職</label>
                      <select
                        value={selfInfoShownRole ?? ""}
                        onChange={(event) =>
                          setSelfInfoShownRole(
                            event.target.value ? (event.target.value as RoleId) : null
                          )
                        }
                      >
                        <option value="">選択</option>
                        {getSelfInfoRoleOptions(effectiveSelfAbilityRole).map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.symbol} {role.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      className="menu-option confirm-claim-button"
                      disabled={
                        selfInfoPlayers.length !== 2 || !selfInfoShownRole
                      }
                      onClick={() =>
                        saveSelfPairInfo(
                          effectiveSelfAbilityRole as "washerwoman" | "investigator"
                        )
                      }
                    >
                      確定
                    </button>
                  </>
                )}

                {effectiveSelfAbilityRole === "librarian" && (
                  <>
                    <button
                      type="button"
                      className={
                        librarianNoOutsiders
                          ? "player-toggle selected"
                          : "player-toggle"
                      }
                      onClick={() => {
                        setLibrarianNoOutsiders((current) => !current);
                        setSelfInfoPlayers([]);
                        setSelfInfoShownRole(null);
                      }}
                    >
                      アウトサイダーなし
                    </button>

                    {!librarianNoOutsiders && (
                      <>
                        <div className="claim-option-title">表示された2人</div>
                        <div className="player-toggle-grid">
                          {getActivePlayers().map((player) => (
                            <button
                              key={player}
                              type="button"
                              className={
                                selfInfoPlayers.includes(player)
                                  ? "player-toggle selected"
                                  : "player-toggle"
                              }
                              onClick={() =>
                                toggleLimitedSelfInfoPlayer(player, 2)
                              }
                            >
                              {getPlayerDisplayName(player)}
                            </button>
                          ))}
                        </div>
                        <div className="form-section">
                          <label>表示された役職</label>
                          <select
                            value={selfInfoShownRole ?? ""}
                            onChange={(event) =>
                              setSelfInfoShownRole(
                                event.target.value
                                  ? (event.target.value as RoleId)
                                  : null
                              )
                            }
                          >
                            <option value="">選択</option>
                            {getSelfInfoRoleOptions("librarian").map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.symbol} {role.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    <button
                      className="menu-option confirm-claim-button"
                      disabled={
                        !librarianNoOutsiders &&
                        (selfInfoPlayers.length !== 2 || !selfInfoShownRole)
                      }
                      onClick={saveSelfLibrarianInfo}
                    >
                      確定
                    </button>
                  </>
                )}

                {effectiveSelfAbilityRole === "chef" && (
                  <>
                    <div className="claim-option-title">悪の隣接ペア数</div>
                    <div className="player-toggle-grid">
                      {Array.from({length:playerCount+1},(_,i)=>i).map((number) => (
                        <button
                          key={number}
                          type="button"
                          className={
                            selfInfoNumber === number
                              ? "player-toggle selected"
                              : "player-toggle"
                          }
                          onClick={() => setSelfInfoNumber(number)}
                        >
                          {number}
                        </button>
                      ))}
                    </div>
                    <button
                      className="menu-option confirm-claim-button"
                      disabled={selfInfoNumber===null} onClick={saveSelfChefInfo}
                    >
                      確定
                    </button>
                  </>
                )}

                {effectiveSelfAbilityRole === "empath" && (
                  <>
                    <div className="form-section">
                      <label>いつ</label>
                      <select
                        value={selfInfoWhen}
                        onChange={(event) => setSelfInfoWhen(event.target.value)}
                      >
                        {getSelfInfoNightOptions("empath").map((phase) => (
                          <option key={phase} value={phase}>
                            {phase}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="claim-option-title">悪の隣人の数</div>
                    <div className="player-toggle-grid">
                      {[0, 1, 2].map((number) => (
                        <button
                          key={number}
                          type="button"
                          className={
                            selfInfoNumber === number
                              ? "player-toggle selected"
                              : "player-toggle"
                          }
                          onClick={() => setSelfInfoNumber(number)}
                        >
                          {number}
                        </button>
                      ))}
                    </div>
                    <button
                      className="menu-option confirm-claim-button"
                      disabled={selfInfoNumber===null} onClick={saveSelfEmpathInfo}
                    >
                      確定
                    </button>
                  </>
                )}

                {effectiveSelfAbilityRole === "fortune_teller" && (
                  <>
                    <div className="form-section">
                      <label>いつ</label>
                      <select
                        value={selfInfoWhen}
                        onChange={(event) => setSelfInfoWhen(event.target.value)}
                      >
                        {getSelfInfoNightOptions("fortune_teller").map((phase) => (
                          <option key={phase} value={phase}>
                            {phase}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="claim-option-title">選んだ2人</div>
                    <div className="player-toggle-grid">
                      {["self", ...getActivePlayers()].map((player) => (
                        <button
                          key={player}
                          type="button"
                          className={
                            selfInfoPlayers.includes(player)
                              ? "player-toggle selected"
                              : "player-toggle"
                          }
                          onClick={() => toggleLimitedSelfInfoPlayer(player, 2)}
                        >
                          {getPlayerDisplayName(player)}
                        </button>
                      ))}
                    </div>
                    <div className="claim-option-title">結果</div>
                    <div className="visibility-switch">
                      <button
                        className={
                          selfInfoYesNo === "yes"
                            ? "visibility-button visibility-selected"
                            : "visibility-button"
                        }
                        onClick={() => setSelfInfoYesNo("yes")}
                      >
                        はい
                      </button>
                      <button
                        className={
                          selfInfoYesNo === "no"
                            ? "visibility-button visibility-selected"
                            : "visibility-button"
                        }
                        onClick={() => setSelfInfoYesNo("no")}
                      >
                        いいえ
                      </button>
                    </div>
                    <button
                      className="menu-option confirm-claim-button"
                      disabled={selfInfoPlayers.length !== 2 || selfInfoYesNo===null}
                      onClick={saveSelfFortuneTellerInfo}
                    >
                      確定
                    </button>
                  </>
                )}

                {(effectiveSelfAbilityRole === "clockmaker" || effectiveSelfAbilityRole === "oracle" || effectiveSelfAbilityRole === "mathematician") && (
                  <>
                    <div className="form-section">
                      <label>いつ</label>
                      <select value={selfInfoWhen} onChange={(event) => setSelfInfoWhen(event.target.value)}>
                        {getSelfInfoNightOptions(effectiveSelfAbilityRole).map((phase) => (
                          <option key={phase} value={phase}>{phase}</option>
                        ))}
                      </select>
                    </div>
                    <div className="claim-option-title">結果</div>
                    <div className="player-toggle-grid">
                      {Array.from({
                        length: effectiveSelfAbilityRole === "clockmaker"
                          ? Math.floor(playerCount / 2) + 1
                          : effectiveSelfAbilityRole === "mathematician"
                            ? playerCount
                            : playerCount + 1,
                      }, (_, i) => i).map((number) => (
                        <button
                          key={number}
                          type="button"
                          className={selfInfoNumber === number ? "player-toggle selected" : "player-toggle"}
                          onClick={() => setSelfInfoNumber(number)}
                        >
                          {number}
                        </button>
                      ))}
                    </div>
                    <button
                      className="menu-option confirm-claim-button"
                      disabled={selfInfoNumber === null}
                      onClick={() => saveSelfNumberInfo(effectiveSelfAbilityRole as "clockmaker" | "oracle" | "mathematician")}
                    >
                      確定
                    </button>
                  </>
                )}

                {effectiveSelfAbilityRole === "dreamer" && (
                  <>
                    <div className="form-section">
                      <label>いつ</label>
                      <select value={selfInfoWhen} onChange={(event) => setSelfInfoWhen(event.target.value)}>
                        {getSelfInfoNightOptions("dreamer").map((phase) => <option key={phase} value={phase}>{phase}</option>)}
                      </select>
                    </div>
                    <div className="claim-option-title">選んだ人</div>
                    <div className="player-toggle-grid">
                      {getActivePlayers().map((player) => (
                        <button
                          key={player}
                          type="button"
                          className={selfInfoPlayers[0] === player ? "player-toggle selected" : "player-toggle"}
                          onClick={() => setSelfInfoPlayers(selfInfoPlayers[0] === player ? [] : [player])}
                        >
                          {getPlayerDisplayName(player)}
                        </button>
                      ))}
                    </div>
                    <div className="form-section">
                      <label>表示された善役職</label>
                      <select value={selfInfoShownRole ?? ""} onChange={(event) => setSelfInfoShownRole(event.target.value ? event.target.value as RoleId : null)}>
                        <option value="">選択</option>
                        {currentScriptRoles.filter(role => role.type === "townsfolk" || role.type === "outsider").map(role => (
                          <option key={role.id} value={role.id}>{role.symbol} {role.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-section">
                      <label>表示された悪役職</label>
                      <select value={selfInfoShownRole2 ?? ""} onChange={(event) => setSelfInfoShownRole2(event.target.value ? event.target.value as RoleId : null)}>
                        <option value="">選択</option>
                        {currentScriptRoles.filter(role => role.type === "minion" || role.type === "demon").map(role => (
                          <option key={role.id} value={role.id}>{role.symbol} {role.name}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      className="menu-option confirm-claim-button"
                      disabled={selfInfoPlayers.length !== 1 || !selfInfoShownRole || !selfInfoShownRole2}
                      onClick={saveSelfDreamerInfo}
                    >
                      確定
                    </button>
                  </>
                )}

                {(effectiveSelfAbilityRole === "flowergirl" || effectiveSelfAbilityRole === "town_crier") && (
                  <>
                    <div className="form-section">
                      <label>いつ</label>
                      <select value={selfInfoWhen} onChange={(event) => setSelfInfoWhen(event.target.value)}>
                        {getSelfInfoNightOptions(effectiveSelfAbilityRole).map((phase) => <option key={phase} value={phase}>{phase}</option>)}
                      </select>
                    </div>
                    <div className="claim-option-title">結果</div>
                    <div className="visibility-switch">
                      <button className={selfInfoYesNo === "yes" ? "visibility-button visibility-selected" : "visibility-button"} onClick={() => setSelfInfoYesNo("yes")}>はい</button>
                      <button className={selfInfoYesNo === "no" ? "visibility-button visibility-selected" : "visibility-button"} onClick={() => setSelfInfoYesNo("no")}>いいえ</button>
                    </div>
                    <button
                      className="menu-option confirm-claim-button"
                      disabled={selfInfoYesNo === null}
                      onClick={() => saveSelfSimpleYesNoInfo(effectiveSelfAbilityRole as "flowergirl" | "town_crier")}
                    >
                      確定
                    </button>
                  </>
                )}

                {effectiveSelfAbilityRole === "savant" && (
                  <>
                    <div className="form-section">
                      <label>いつ</label>
                      <select value={selfInfoWhen} onChange={(event) => setSelfInfoWhen(event.target.value)}>
                        {getDayOptions().map((phase) => <option key={phase} value={phase}>{phase}</option>)}
                      </select>
                    </div>
                    {([1, 2] as const).map((statement) => {
                      const kind = statement === 1 ? selfSavantKind1 : selfSavantKind2;
                      const role = statement === 1 ? selfSavantRole1 : selfSavantRole2;
                      const players = statement === 1 ? selfSavantPlayers1 : selfSavantPlayers2;
                      const setKind = statement === 1 ? setSelfSavantKind1 : setSelfSavantKind2;
                      const setRole = statement === 1 ? setSelfSavantRole1 : setSelfSavantRole2;
                      return (
                        <div className="form-section" key={statement}>
                          <div className="claim-option-title">情報 {statement}</div>
                          <select
                            value={kind}
                            onChange={(event) => {
                              const next = event.target.value as "roleInPlay" | "roleAmong";
                              setKind(next);
                              if (next === "roleInPlay") {
                                (statement === 1 ? setSelfSavantPlayers1 : setSelfSavantPlayers2)([]);
                              }
                            }}
                          >
                            <option value="roleInPlay">この役職がゲーム内にいる</option>
                            <option value="roleAmong">選んだ人の中にこの役職がいる</option>
                          </select>
                          <select
                            value={role ?? ""}
                            onChange={(event) => setRole(event.target.value ? event.target.value as RoleId : null)}
                          >
                            <option value="">役職を選択</option>
                            {currentScriptRoles.map((candidate) => (
                              <option key={candidate.id} value={candidate.id}>{candidate.symbol} {candidate.name}</option>
                            ))}
                          </select>
                          {kind === "roleAmong" && (
                            <div className="player-toggle-grid">
                              {["self", ...getActivePlayers()].map((player) => (
                                <button
                                  key={player}
                                  type="button"
                                  className={players.includes(player) ? "player-toggle selected" : "player-toggle"}
                                  onClick={() => toggleSelfSavantPlayer(statement, player)}
                                >
                                  {getPlayerDisplayName(player)}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div className="panel-note">健康な賢者なら、2つの情報のうち正しいのはちょうど1つです。</div>
                    <button
                      className="menu-option confirm-claim-button"
                      disabled={
                        !buildSelfSavantStatement(selfSavantKind1, selfSavantRole1, selfSavantPlayers1) ||
                        !buildSelfSavantStatement(selfSavantKind2, selfSavantRole2, selfSavantPlayers2)
                      }
                      onClick={saveSelfSavantInfo}
                    >
                      確定
                    </button>
                  </>
                )}

                {effectiveSelfAbilityRole === "seamstress" && (
                  <>
                    <div className="form-section">
                      <label>いつ</label>
                      <select value={selfInfoWhen} onChange={(event) => setSelfInfoWhen(event.target.value)}>
                        {getSelfInfoNightOptions("seamstress").map((phase) => <option key={phase} value={phase}>{phase}</option>)}
                      </select>
                    </div>
                    <div className="claim-option-title">選んだ2人</div>
                    <div className="player-toggle-grid">
                      {getActivePlayers().map((player) => (
                        <button
                          key={player}
                          type="button"
                          className={selfInfoPlayers.includes(player) ? "player-toggle selected" : "player-toggle"}
                          onClick={() => toggleLimitedSelfInfoPlayer(player, 2)}
                        >
                          {getPlayerDisplayName(player)}
                        </button>
                      ))}
                    </div>
                    <div className="visibility-switch">
                      <button className={selfInfoYesNo === "yes" ? "visibility-button visibility-selected" : "visibility-button"} onClick={() => setSelfInfoYesNo("yes")}>同陣営</button>
                      <button className={selfInfoYesNo === "no" ? "visibility-button visibility-selected" : "visibility-button"} onClick={() => setSelfInfoYesNo("no")}>別陣営</button>
                    </div>
                    <button
                      className="menu-option confirm-claim-button"
                      disabled={selfInfoPlayers.length !== 2 || selfInfoYesNo === null}
                      onClick={saveSelfSeamstressInfo}
                    >
                      確定
                    </button>
                  </>
                )}

                {effectiveSelfAbilityRole === "artist" && (
                  <>
                    <div className="form-section">
                      <label>いつ</label>
                      <select value={selfInfoWhen} onChange={(event) => setSelfInfoWhen(event.target.value)}>
                        {getSelfInfoNightOptions("artist").map((phase) => <option key={phase} value={phase}>{phase}</option>)}
                      </select>
                    </div>
                    <div className="form-section">
                      <label>ストーリーテラーにした「はい／いいえ」質問</label>
                      <textarea value={selfArtistQuestion} onChange={(event) => setSelfArtistQuestion(event.target.value)} placeholder="例：生存している悪陣営は2人以上ですか？" />
                    </div>
                    <div className="claim-option-title">回答</div>
                    <div className="visibility-switch">
                      {(["yes", "no", "unknown"] as const).map((answer) => (
                        <button key={answer} type="button" className={selfArtistResult === answer ? "visibility-button visibility-selected" : "visibility-button"} onClick={() => setSelfArtistResult(answer)}>
                          {answer === "yes" ? "はい" : answer === "no" ? "いいえ" : "不明"}
                        </button>
                      ))}
                    </div>
                    <div className="panel-note">質問文は保存しますが、自然文を勝手に論理式へ変換しないため候補盤面では自動真偽判定しません。</div>
                    {selfInfoLog.some((entry) => entry.roleId === "artist") && <div className="panel-note">芸術家の能力は使用済みです。</div>}
                    <button className="menu-option confirm-claim-button" disabled={selfInfoLog.some((entry) => entry.roleId === "artist") || !selfArtistQuestion.trim() || selfArtistResult === null || !getSelfInfoNightOptions("artist").includes(selfInfoWhen)} onClick={saveSelfArtistInfo}>確定</button>
                  </>
                )}

                {effectiveSelfAbilityRole === "juggler" && (
                  <>
                    {getSelfInfoNightOptions("juggler").length === 0 ? (
                      <div className="panel-note">ジャグラーの結果は最初の日の後の夜に記録します。まだその夜に到達していません。</div>
                    ) : (
                      <>
                        <div className="form-section">
                          <label>結果を得た夜</label>
                          <select
                            value={selfInfoWhen}
                            onChange={(event) => {
                              const value = event.target.value;
                              setSelfInfoWhen(value);
                              setSelfJugglerGuessDay(`D${Math.max(1, Number.parseInt(value.slice(1), 10) - 1)}`);
                            }}
                          >
                            {getSelfInfoNightOptions("juggler").map((phase) => <option key={phase} value={phase}>{phase}</option>)}
                          </select>
                          <div className="panel-note">公開予想：{selfJugglerGuessDay}</div>
                        </div>
                        <div className="form-section">
                          <label>公開した予想（最大5個）</label>
                          <select value={selfJugglerDraftPlayer ?? ""} onChange={(event) => setSelfJugglerDraftPlayer(event.target.value || null)}>
                            <option value="">人を選択</option>
                            {["self", ...getActivePlayers()].map((player) => <option key={player} value={player}>{getPlayerDisplayName(player)}</option>)}
                          </select>
                          <select value={selfJugglerDraftRole ?? ""} onChange={(event) => setSelfJugglerDraftRole(event.target.value ? event.target.value as RoleId : null)}>
                            <option value="">役職を選択</option>
                            {currentScriptRoles.map((role) => <option key={role.id} value={role.id}>{role.symbol} {role.name}</option>)}
                          </select>
                          <button
                            type="button"
                            className="menu-option"
                            disabled={!selfJugglerDraftPlayer || !selfJugglerDraftRole || selfJugglerGuesses.length >= 5 || selfJugglerGuesses.some((guess) => guess.player === selfJugglerDraftPlayer && guess.roleId === selfJugglerDraftRole)}
                            onClick={() => {
                              if (!selfJugglerDraftPlayer || !selfJugglerDraftRole || selfJugglerGuesses.length >= 5) return;
                              setSelfJugglerGuesses((current) => [...current, { player: selfJugglerDraftPlayer, roleId: selfJugglerDraftRole }]);
                              setSelfJugglerDraftPlayer(null);
                              setSelfJugglerDraftRole(null);
                            }}
                          >予想を追加</button>
                          {selfJugglerGuesses.map((guess, index) => (
                            <div className="claim-history-item" key={`${guess.player}-${guess.roleId}-${index}`}>
                              <span>{getPlayerDisplayName(guess.player)}</span>
                              <span>{ROLES[guess.roleId].symbol} {ROLES[guess.roleId].name}</span>
                              <button type="button" onClick={() => setSelfJugglerGuesses((current) => current.filter((_, i) => i !== index))}>削除</button>
                            </div>
                          ))}
                        </div>
                        <div className="claim-option-title">正解数</div>
                        <div className="player-toggle-grid">
                          {Array.from({ length: selfJugglerGuesses.length + 1 }, (_, i) => i).map((value) => (
                            <button key={value} type="button" className={selfInfoNumber === value ? "player-toggle selected" : "player-toggle"} onClick={() => setSelfInfoNumber(value)}>{value}</button>
                          ))}
                        </div>
                        {selfInfoLog.some((entry) => entry.roleId === "juggler") && <div className="panel-note">曲芸師の能力は使用済みです。</div>}
                        <button className="menu-option confirm-claim-button" disabled={selfInfoLog.some((entry) => entry.roleId === "juggler") || selfJugglerGuesses.length === 0 || selfInfoNumber === null || selfInfoNumber > selfJugglerGuesses.length} onClick={saveSelfJugglerInfo}>確定</button>
                      </>
                    )}
                  </>
                )}

                {(effectiveSelfAbilityRole === "choirboy" || effectiveSelfAbilityRole === "high_priestess") && (
                  <>
                    <div className="form-section"><label>情報を得た夜</label>
                      <select value={selfInfoWhen} onChange={(e) => { setSelfInfoWhen(e.target.value); setSelfInfoPlayers([]); }}>
                        {getSelfInfoNightOptions(effectiveSelfAbilityRole).map(phase => <option key={phase} value={phase}>{phase}</option>)}
                      </select>
                    </div>
                    <div className="claim-option-title">{effectiveSelfAbilityRole === "choirboy" ? "教えられたデーモンの人" : "会話するとよいと教えられた人"}</div>
                    <div className="player-toggle-grid">
                      {["self",...getActivePlayers()].map(player => <button type="button" key={player} className={selfInfoPlayers.includes(player) ? "player-toggle selected" : "player-toggle"} onClick={() => setSelfInfoPlayers(cur => cur.includes(player) ? [] : [player])}>{getPlayerDisplayName(player)}</button>)}
                    </div>
                    <p className="panel-note">{effectiveSelfAbilityRole === "choirboy" ? "王がデーモンに殺された夜だけ結果を得ます。王の死亡も記録してください。" : "死者も選べます。これはストーリーテラーの判断であり、選ばれた人の陣営を確定しません。"}</p>
                    <button className="menu-option confirm-claim-button" disabled={selfInfoPlayers.length !== 1 || selfInfoLog.some(e => e.roleId === effectiveSelfAbilityRole && e.when === selfInfoWhen)} onClick={() => saveSelfSinglePlayerInfo(effectiveSelfAbilityRole)}>確定</button>
                  </>
                )}

                {(effectiveSelfAbilityRole === "knight" || effectiveSelfAbilityRole === "noble") && (
                  <>
                    <div className="claim-option-title">{effectiveSelfAbilityRole === "knight" ? "デーモンではないと教えられた2人" : "ちょうど1人が悪陣営の3人"}</div>
                    <div className="player-toggle-grid">{["self",...getActivePlayers()].map(player=><button type="button" key={player} className={selfInfoPlayers.includes(player)?"player-toggle selected":"player-toggle"} onClick={()=>toggleLimitedSelfInfoPlayer(player,effectiveSelfAbilityRole==="knight"?2:3)}>{getPlayerDisplayName(player)}</button>)}</div>
                    <p className="panel-note">初夜の情報です。{effectiveSelfAbilityRole === "noble" ? "スパイと隠者の登録能力にも注意してください。" : "ヴォートックスがいる場合、示された2人の中にデーモンが必要です。"}</p>
                    <button className="menu-option confirm-claim-button" disabled={selfInfoPlayers.length!==(effectiveSelfAbilityRole==="knight"?2:3)||selfInfoLog.some(e=>e.roleId===effectiveSelfAbilityRole)} onClick={()=>saveSelfKnightNobleInfo(effectiveSelfAbilityRole)}>確定</button>
                  </>
                )}

                {effectiveSelfAbilityRole === "pixie" && (
                  <>
                    <div className="form-section"><label>初夜に知らされたゲーム内の町人役職</label><select value={selfInfoShownRole ?? ""} onChange={e=>setSelfInfoShownRole(e.target.value?(e.target.value as RoleId):null)}><option value="">選択</option>{currentScriptRoles.filter(r=>r.type==="townsfolk"&&r.id!=="pixie").map(r=><option value={r.id} key={r.id}>{r.symbol} {r.name}</option>)}</select></div>
                    <p className="panel-note">役職主張の狂気を保ち、元の役職所持者が死亡したときは語り手の判断で能力を獲得できます。確定するまでは能力を増やしません。</p>
                    <button className="menu-option confirm-claim-button" disabled={!selfInfoShownRole || selfInfoLog.some(e=>e.roleId==="pixie")} onClick={saveSelfPixieInfo}>確定</button>
                  </>
                )}

                {effectiveSelfAbilityRole === "steward" && (
                  <>
                    <div className="claim-option-title">初夜に善陣営だと知らされた人</div>
                    <div className="player-toggle-grid">{getActivePlayers().map(p=><button type="button" key={p} className={selfInfoPlayers.includes(p)?"player-toggle selected":"player-toggle"} onClick={()=>setSelfInfoPlayers([p])}>{getPlayerDisplayName(p)}</button>)}</div>
                    <p className="panel-note">健康な執事が得た情報は、その人が善陣営であることを示します。登録能力には例外があります。</p>
                    <button className="menu-option confirm-claim-button" disabled={selfInfoPlayers.length!==1 || selfInfoLog.some(e=>e.roleId==="steward")} onClick={saveSelfStewardInfo}>確定</button>
                  </>
                )}
                {effectiveSelfAbilityRole === "shugenja" && (
                  <>
                    <div className="claim-option-title">最も近い悪陣営がいる方向</div>
                    <div className="visibility-switch"><button type="button" className={selfShugenjaDirection==="clockwise"?"visibility-button visibility-selected":"visibility-button"} onClick={()=>setSelfShugenjaDirection("clockwise")}>時計回り</button><button type="button" className={selfShugenjaDirection==="anticlockwise"?"visibility-button visibility-selected":"visibility-button"} onClick={()=>setSelfShugenjaDirection("anticlockwise")}>反時計回り</button></div>
                    <p className="panel-note">座席の位置に基づく初夜の情報です。等距離ならどちらの方向もあり得ます。</p>
                    <button className="menu-option confirm-claim-button" disabled={!selfShugenjaDirection || selfInfoLog.some(e=>e.roleId==="shugenja")} onClick={saveSelfShugenjaInfo}>確定</button>
                  </>
                )}
                {effectiveSelfAbilityRole === "village_idiot" && (
                  <>
                    <div className="form-section"><label>情報を得た夜</label><select value={selfInfoWhen} onChange={e=>setSelfInfoWhen(e.target.value)}>{getSelfInfoNightOptions("village_idiot").map(phase=><option key={phase} value={phase}>{phase}</option>)}</select></div>
                    <div className="claim-option-title">選んだ人</div>
                    <div className="player-toggle-grid">{["self",...getActivePlayers()].map(p=><button type="button" key={p} className={selfInfoPlayers.includes(p)?"player-toggle selected":"player-toggle"} onClick={()=>setSelfInfoPlayers([p])}>{getPlayerDisplayName(p)}</button>)}</div>
                    <div className="visibility-switch"><button type="button" className={selfVillageResult==="good"?"visibility-button visibility-selected":"visibility-button"} onClick={()=>setSelfVillageResult("good")}>善陣営</button><button type="button" className={selfVillageResult==="evil"?"visibility-button visibility-selected":"visibility-button"} onClick={()=>setSelfVillageResult("evil")}>悪陣営</button></div>
                    <p className="panel-note">本物の村の愚者は最大3人。2人以上なら開始時にそのうち1人だけが酔っています。</p>
                    <button className="menu-option confirm-claim-button" disabled={selfInfoPlayers.length!==1 || !selfVillageResult || selfInfoLog.some(e=>e.roleId==="village_idiot" && e.when===selfInfoWhen)} onClick={saveSelfVillageInfo}>確定</button>
                  </>
                )}
                {effectiveSelfAbilityRole === "king" && (
                  <>
                    <div className="form-section"><label>情報を得た夜</label><select value={selfInfoWhen} onChange={e => setSelfInfoWhen(e.target.value)}>{getSelfInfoNightOptions("king").map(phase => <option key={phase} value={phase}>{phase}</option>)}</select></div>
                    <p className="panel-note">死者数が生存者数以上になったら、毎夜、生存しているキャラクターを1つ知ります。誰が持つ役職かは分かりません。</p>
                    <div className="form-section"><label>示された生存キャラクター</label>
                      <select value={selfInfoShownRole ?? ""} onChange={e => setSelfInfoShownRole(e.target.value ? e.target.value as RoleId : null)}><option value="">選択</option>{currentScriptRoles.map(role => <option key={role.id} value={role.id}>{role.symbol} {role.name}</option>)}</select>
                    </div>
                    <button className="menu-option confirm-claim-button" disabled={!selfInfoShownRole || selfInfoLog.some(e => e.roleId === "king" && e.when === selfInfoWhen)} onClick={saveSelfKingInfo}>確定</button>
                  </>
                )}

                {effectiveSelfAbilityRole === "general" && (
                  <>
                    <div className="form-section"><label>情報を得た夜</label><select value={selfInfoWhen} onChange={e => setSelfInfoWhen(e.target.value)}>{getSelfInfoNightOptions("general").map(phase => <option key={phase} value={phase}>{phase}</option>)}</select></div>
                    <div className="claim-option-title">ストーリーテラーの戦況判断</div>
                    <div className="visibility-switch">{([ ["good","善が優勢"],["evil","悪が優勢"],["neither","互角"] ] as const).map(([value,label]) => <button type="button" key={value} className={selfGeneralResult === value ? "visibility-button visibility-selected" : "visibility-button"} onClick={() => setSelfGeneralResult(value)}>{label}</button>)}</div>
                    <p className="panel-note">戦況の主観的な判断です。実際の陣営や能力を確定する証拠にはしません。</p>
                    <button className="menu-option confirm-claim-button" disabled={!selfGeneralResult || selfInfoLog.some(e => e.roleId === "general" && e.when === selfInfoWhen)} onClick={saveSelfGeneralInfo}>確定</button>
                  </>
                )}

                {effectiveSelfAbilityRole === "fisherman" && (
                  <>
                    {selfInfoLog.some(e => e.roleId === "fisherman") ? <p className="panel-note">漁師の相談はすでに使用済みです。</p> : <>
                      <div className="form-section"><label>相談した日</label><select value={selfInfoWhen} onChange={e => setSelfInfoWhen(e.target.value)}>{getSelfInfoNightOptions("fisherman").map(phase => <option key={phase} value={phase}>{phase}</option>)}</select></div>
                      <div className="form-section"><label>ストーリーテラーからの助言</label><textarea rows={4} value={selfFisherAdvice} onChange={e => setSelfFisherAdvice(e.target.value)} placeholder="教えられた助言を記録" /></div>
                      <p className="panel-note">1ゲームに1回のみ。助言は自由記述として保存し、厳密な真偽判定はしません。</p>
                      <button className="menu-option confirm-claim-button" disabled={!selfFisherAdvice.trim()} onClick={saveSelfFisherInfo}>確定</button>
                    </>}
                  </>
                )}

                {effectiveSelfAbilityRole === "sage" && (
                  <>
                    <div className="form-section">
                      <label>デーモンに殺された夜</label>
                      <select value={selfInfoWhen} onChange={(event) => setSelfInfoWhen(event.target.value)}>
                        {getSelfInfoNightOptions("sage").map((phase) => <option key={phase} value={phase}>{phase}</option>)}
                      </select>
                    </div>
                    <div className="claim-option-title">示された2人</div>
                    <div className="player-toggle-grid">
                      {["self", ...getActivePlayers()].map((player) => (
                        <button key={player} type="button" className={selfInfoPlayers.includes(player) ? "player-toggle selected" : "player-toggle"} onClick={() => toggleLimitedSelfInfoPlayer(player, 2)}>{getPlayerDisplayName(player)}</button>
                      ))}
                    </div>
                    <div className="panel-note">健全なセージなら、この2人のうち1人がデーモンです。候補盤面は同じ夜のデーモンによる死亡記録も確認します。</div>
                    <button className="menu-option confirm-claim-button" disabled={selfInfoPlayers.length !== 2 || !getSelfInfoNightOptions("sage").includes(selfInfoWhen)} onClick={saveSelfSageInfo}>確定</button>
                  </>
                )}

                {(effectiveSelfAbilityRole === "balloonist" || effectiveSelfAbilityRole === "bounty_hunter") && (
                  <>
                    <div className="form-section">
                      <label>いつ</label>
                      <select value={selfInfoWhen} onChange={(event) => { setSelfInfoWhen(event.target.value); setSelfInfoPlayers([]); }}>
                        {getSelfInfoNightOptions(effectiveSelfAbilityRole).map((phase) => <option key={phase} value={phase}>{phase}</option>)}
                      </select>
                    </div>
                    <div className="claim-option-title">{effectiveSelfAbilityRole === "balloonist" ? "その夜に示された人" : "悪陣営として示された人"}</div>
                    <div className="player-toggle-grid">
                      {["self", ...getActivePlayers()].map((player) => {
                        const alreadyShown = effectiveSelfAbilityRole === "bounty_hunter" && selfInfoLog.some((entry) => entry.roleId === "bounty_hunter" && entry.player === player);
                        return <button key={player} type="button" disabled={alreadyShown} className={selfInfoPlayers.includes(player) ? "player-toggle selected" : "player-toggle"} onClick={() => setSelfInfoPlayers((current) => current.includes(player) ? [] : [player])}>{getPlayerDisplayName(player)}</button>;
                      })}
                    </div>
                    <p className="panel-note">{effectiveSelfAbilityRole === "balloonist" ? "健康なら前夜に示された人とは異なるキャラクター種類です。ヴォートックス下では逆になります。" : "健康ならこの人は悪陣営です。この人が死亡した後、次の悪陣営を知ります。"}</p>
                    <button className="menu-option confirm-claim-button" disabled={selfInfoPlayers.length !== 1} onClick={() => saveSelfSinglePlayerInfo(effectiveSelfAbilityRole)}>確定</button>
                  </>
                )}

                {(effectiveSelfAbilityRole === "undertaker" ||
                  effectiveSelfAbilityRole === "ravenkeeper") && (
                  <>
                    <div className="form-section">
                      <label>いつ</label>
                      <select
                        value={selfInfoWhen}
                        onChange={(event) => setSelfInfoWhen(event.target.value)}
                      >
                        {getSelfInfoNightOptions(effectiveSelfAbilityRole).map((phase) => (
                          <option key={phase} value={phase}>
                            {phase}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="claim-option-title">
                      {effectiveSelfAbilityRole === "undertaker"
                        ? "処刑された人"
                        : "選んだ人"}
                    </div>
                    <div className="player-toggle-grid">
                      {(effectiveSelfAbilityRole === "ravenkeeper"
                        ? ["self", ...getActivePlayers()]
                        : getActivePlayers()
                      ).map((player) => (
                        <button
                          key={player}
                          type="button"
                          className={
                            selfInfoPlayers[0] === player
                              ? "player-toggle selected"
                              : "player-toggle"
                          }
                          onClick={() =>
                            setSelfInfoPlayers(
                              selfInfoPlayers[0] === player ? [] : [player]
                            )
                          }
                        >
                          {getPlayerDisplayName(player)}
                        </button>
                      ))}
                    </div>
                    <div className="form-section">
                      <label>表示された役職</label>
                      <select
                        value={selfInfoShownRole ?? ""}
                        onChange={(event) =>
                          setSelfInfoShownRole(
                            event.target.value ? (event.target.value as RoleId) : null
                          )
                        }
                      >
                        <option value="">選択</option>
                        {getSelfInfoRoleOptions(effectiveSelfAbilityRole).map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.symbol} {role.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      className="menu-option confirm-claim-button"
                      disabled={
                        selfInfoPlayers.length !== 1 || !selfInfoShownRole || !getSelfInfoNightOptions(effectiveSelfAbilityRole).includes(selfInfoWhen)
                      }
                      onClick={() =>
                        saveSelfRoleRevealInfo(
                          effectiveSelfAbilityRole as "undertaker" | "ravenkeeper"
                        )
                      }
                    >
                      確定
                    </button>
                  </>
                )}

                <button
                  className="menu-option"
                  disabled={!latestSelfInfoToUndo}
                  onClick={() => latestSelfInfoToUndo && deleteHistory("selfInfoLog", latestSelfInfoToUndo.id)}
                >
                  取り消し
                </button>
                <button
                  className="menu-option"
                  onClick={() => {
                    resetSelfInfoForm();
                    setSelfPanel("menu");
                  }}
                >
                  戻る
                </button>
              </>
            )}

            {selfPanel === "action" && effectiveSelfAbilityRole && (
              <>
                <h2>自分の行動</h2>
                <div className="current-claim">
                  <strong>
                    {ROLES[effectiveSelfAbilityRole].symbol} {ROLES[effectiveSelfAbilityRole].name}
                  </strong>
                </div>

                {selfActionLog.filter((event) => event.roleId === effectiveSelfAbilityRole).length > 0 && (
                  <div className="claim-history">
                    <div className="claim-history-title">過去の行動</div>
                    {selfActionLog
                      .filter((event) => event.roleId === effectiveSelfAbilityRole)
                      .sort(compareEvents)
                      .map((event) => (
                        <div className="claim-history-item" key={event.id}>
                          <span className="claim-history-role">{ROLES[event.roleId].symbol}</span>
                          <span>{event.when}</span>
                          <span>{formatSelfActionEvent(event)}</span>
                        </div>
                      ))}
                  </div>
                )}

                {isBmrRecordedActionRole(effectiveSelfAbilityRole) && (()=>{
                  const id=effectiveSelfAbilityRole;
                  const spec=BMR_ACTION_SPECS[id];
                  const options=rolePhaseOptions(id,night,'action');
                  const previous=selfActionLog.filter((e):e is Extract<SelfActionEvent,{kind:'bmr_action'}>=>'kind' in e && e.kind==='bmr_action'&&e.roleId===id);
                  const last=[...previous].sort(compareEvents).at(-1);
                  const prevCharged=id==='po' && last?.when===`N${Number(selfActionWhen.slice(1))-1}` && last.targets.length===0;
                  const max=id==='po'?(prevCharged?3:1):spec.max;
                  const min=id==='po' && prevCharged ? 3 : spec.min;
                  const oneUsed=spec.once && previous.length>0;
                  const already=previous.some(e=>e.when===selfActionWhen);
                  const excludes=(p:string)=>{
                    // Historical target legality is checked at the chosen phase,
                    // not against the current board after later deaths/revivals.
                    if(id==='professor')return isAliveAt(snapshot,p,selfActionWhen);
                    if(id==='sailor')return !isAliveAt(snapshot,p,selfActionWhen,0);
                    if(id==='moonchild')return !isAliveAt(snapshot,p,selfActionWhen);
                    // Innkeeper may select dead players (unlike Sailor).
                    return false;
                  };
                  const invalidDA=id==='devils_advocate' && last?.when===`N${Number(selfActionWhen.slice(1))-1}` && last.targets[0]===bmrActionTargets[0];
                  const deathRequired=id==='moonchild' && !deathLog.some(d=>d.playerId==='self' && Number(d.when.slice(1))===Number(selfActionWhen.slice(1)) && (d.when.startsWith('N')||d.when===selfActionWhen));
                  const zBanned=id==='zombuul' && deathLog.some(d=>d.when===`D${Number(selfActionWhen.slice(1))-1}`);
                  const valid=bmrActionCanBeRecorded(id,selfActionWhen,night) &&
                    !oneUsed&&!already&&!invalidDA&&!deathRequired&&!zBanned &&
                    bmrActionTargets.length>=min && bmrActionTargets.length<=max &&
                    (!spec.role||!!bmrActionRole) && (id!=='gossip'||!!bmrActionNote.trim());
                  return <>
                    <div className="form-section"><label>行動した時</label><select value={selfActionWhen} onChange={e=>{setSelfActionWhen(e.target.value);setBmrActionTargets([]);}}>{options.map(phase=><option key={phase} value={phase}>{phase}</option>)}</select></div>
                    <p className="panel-note">{spec.help}</p>
                    {oneUsed ? <p className="panel-note">この能力は使用済みです。</p> : already ? <p className="panel-note">この時点の行動は記録済みです。</p> : <>
                      {max>0 && <>
                        <div className="claim-option-title">{spec.label}（{bmrActionTargets.length}/{max}）</div>
                        <div className="player-toggle-grid">{['self',...getActivePlayers()].filter(p=>!excludes(p)).map(p=><button key={p} type="button" className={bmrActionTargets.includes(p)?'player-toggle selected':'player-toggle'} onClick={()=>setBmrActionTargets(xs=>xs.includes(p)?xs.filter(x=>x!==p):xs.length<max?[...xs,p]:max===1?[p]:xs)}>{getPlayerDisplayName(p)}</button>)}</div>
                        {invalidDA&&<p className="panel-note">前の夜と同じ人は選べません。</p>}
                        {deathRequired&&<p className="panel-note">月の子は自分が死亡したことを知らされてから選びます。先に自分の死亡を記録してください。</p>}
                        {zBanned&&<p className="panel-note">前日の昼に死亡者がいるため、ゾンブールはこの夜に襲撃できません。</p>}
                      </>}
                      {spec.role&&<div className="form-section"><label>{id==='gambler'?'推測した役職':'選んだ役職'}</label><select value={bmrActionRole??''} onChange={e=>setBmrActionRole(e.target.value?(e.target.value as RoleId):null)}><option value="">選択</option>{currentScriptRoles.map(r=><option key={r.id} value={r.id}>{r.symbol} {r.name}</option>)}</select></div>}
                      <div className="form-section"><label>{id==='gossip'?'公に述べた発言':'メモ（語り手の結果など）'}</label><textarea value={bmrActionNote} onChange={e=>setBmrActionNote(e.target.value)} rows={3} placeholder={id==='gossip'?'真偽を後で検証できるように記録':'確認できた結果のみ記録します'} /></div>
                      <p className="panel-note">これは自分が選んだ行動の記録です。語り手の選択による酔い・死亡・復活は確定扱いせず、別途それぞれ記録してください。</p>
                      <button className="menu-option confirm-claim-button" disabled={!valid} onClick={saveBmrAction}>確定</button>
                    </>}
                  </>;
                })()}

                {effectiveSelfAbilityRole === "preacher" && (
                  <>
                    <div className="form-section"><label>選択した夜</label><select value={selfActionWhen} onChange={e=>setSelfActionWhen(e.target.value)}>{getNightOptions(1).map(x=><option key={x} value={x}>{x}</option>)}</select></div>
                    {selfActionLog.some(e=>e.roleId==="preacher"&&e.when===selfActionWhen)?<p className="panel-note">この夜の選択は記録済みです。</p>:<>
                      <div className="claim-option-title">能力を失わせたい人（死亡済みも可）</div>
                      <div className="player-toggle-grid">{["self",...getActivePlayers()].map(p=><button type="button" key={p} className={selfActionTarget===p?"player-toggle selected":"player-toggle"} onClick={()=>setSelfActionTarget(p)}>{getPlayerDisplayName(p)}</button>)}</div>
                      <p className="panel-note">選んだ人が手下なら能力を失います。説教師が死亡・毒・酔い状態なら抑制は解除されます。</p>
                      <button className="menu-option confirm-claim-button" disabled={!selfActionTarget} onClick={saveSelfPreacherAction}>確定</button>
                    </>}
                  </>
                )}
                {effectiveSelfAbilityRole === "princess" && (
                  <>
                    {selfActionLog.some(e=>e.roleId==="princess")?<p className="panel-note">姫の初日能力は記録済みです。</p>:<>
                      <div className="form-section"><label>姫として最初の日</label><select value={selfActionWhen} onChange={e=>setSelfActionWhen(e.target.value)}>{getDayOptions().map(x=><option key={x} value={x}>{x}</option>)}</select></div>
                      <div className="claim-option-title">自分が指名して処刑された人</div>
                      <div className="player-toggle-grid">{["self",...getActivePlayers()].filter(p=>nominationLog.some(e=>e.when===selfActionWhen&&e.nominator==="self"&&e.nominee===p)).map(p=><button type="button" key={p} className={selfActionTarget===p?"player-toggle selected":"player-toggle"} onClick={()=>setSelfActionTarget(p)}>{getPlayerDisplayName(p)}</button>)}</div>
                      <p className="panel-note">先に自分の指名を記録し、その人の処刑が実際に成立したことを確認してください。処刑された人が生存していても、能力は有効です。確認・保存すると今夜のデーモン殺害を抑えます（他の原因で死亡する場合はあります）。</p>
                      <button className="menu-option confirm-claim-button" disabled={!selfActionTarget} onClick={saveSelfPrincessAction}>確定</button>
                    </>}
                  </>
                )}
                {effectiveSelfAbilityRole === "huntsman" && (
                  <>
                    {selfActionLog.some(e=>e.roleId==="huntsman") ? <p className="panel-note">猟師の能力は使用済みです。</p> : <>
                      <div className="form-section"><label>対象を選んだ夜</label><select value={selfActionWhen} onChange={e=>setSelfActionWhen(e.target.value)}>{getNightOptions(1).map(x=><option key={x} value={x}>{x}</option>)}</select></div>
                      <div className="claim-option-title">選んだ生存者</div><div className="player-toggle-grid">{getActivePlayers().filter(p=>playerStatus[p]?.alive!==false).map(p=><button type="button" key={p} className={selfActionTarget===p?"player-toggle selected":"player-toggle"} onClick={()=>setSelfActionTarget(p)}>{getPlayerDisplayName(p)}</button>)}</div>
                      <div className="form-section"><label>乙女が変身した場合の新役職（分かる場合のみ）</label><select value={selfHuntsmanRole??""} onChange={e=>setSelfHuntsmanRole(e.target.value?(e.target.value as RoleId):null)}><option value="">不明・変身なし</option>{currentScriptRoles.filter(r=>r.type==="townsfolk").map(r=><option key={r.id} value={r.id}>{r.symbol} {r.name}</option>)}</select></div>
                      <p className="panel-note">乙女が選ばれた場合、まだゲームに存在しない町人役職へ変化します。新役職不明の場合はソルバーで分岐させます。</p>
                      <button className="menu-option confirm-claim-button" disabled={!selfActionTarget} onClick={saveSelfHuntsmanAction}>確定</button>
                    </>}
                  </>
                )}

                {effectiveSelfAbilityRole === "nightwatchman" && (
                  <>
                    {selfActionLog.some(e=>e.roleId==="nightwatchman") ? <p className="panel-note">夜警の能力は使用済みです。</p> : <>
                      <div className="form-section"><label>能力を使用した夜</label><select value={selfActionWhen} onChange={e=>setSelfActionWhen(e.target.value)}>{getNightOptions(1).map(x=><option key={x} value={x}>{x}</option>)}</select></div>
                      <div className="claim-option-title">自分が夜警であると伝える相手</div><div className="player-toggle-grid">{["self",...getActivePlayers()].map(p=><button type="button" key={p} className={selfActionTarget===p?"player-toggle selected":"player-toggle"} onClick={()=>setSelfActionTarget(p)}>{getPlayerDisplayName(p)}</button>)}</div>
                      <p className="panel-note">相手にはあなたが夜警であると知らされます。相手が言った内容は「情報を記録」から別途残せます。</p>
                      <button className="menu-option confirm-claim-button" disabled={!selfActionTarget} onClick={saveSelfNightwatchmanAction}>確定</button>
                    </>}
                  </>
                )}

                {effectiveSelfAbilityRole === "lycanthrope" && (
                  <>
                    <div className="form-section"><label>能力を使用した夜</label><select value={selfActionWhen} onChange={e=>setSelfActionWhen(e.target.value)}>{getNightOptions(2).map(x=><option key={x} value={x}>{x}</option>)}</select></div>
                    {selfActionLog.some(e=>e.roleId==="lycanthrope"&&e.when===selfActionWhen) ? <p className="panel-note">この夜の選択は記録済みです。</p> : <>
                      <div className="claim-option-title">選んだ生存者</div><div className="player-toggle-grid">{["self",...getActivePlayers()].filter(p=>playerStatus[p]?.alive!==false).map(p=><button type="button" key={p} className={selfActionTarget===p?"player-toggle selected":"player-toggle"} onClick={()=>setSelfActionTarget(p)}>{getPlayerDisplayName(p)}</button>)}</div>
                      <div className="visibility-switch"><button className={!selfLycanKilled?"visibility-button visibility-selected":"visibility-button"} onClick={()=>setSelfLycanKilled(false)}>死亡なし</button><button className={selfLycanKilled?"visibility-button visibility-selected":"visibility-button"} onClick={()=>setSelfLycanKilled(true)}>対象が夜に死亡</button></div>
                      <p className="panel-note">善陣営の対象が能力で死亡した場合、その夜のデーモン襲撃は発生しません。対象の夜死亡も記録してください。善陣営1人が悪として登録される可能性があります。</p>
                      <button className="menu-option confirm-claim-button" disabled={!selfActionTarget} onClick={saveSelfLycanAction}>確定</button>
                    </>}
                  </>
                )}

                {selfRole.shownRole === "pixie" && effectiveSelfAbilityRole === "pixie" && (
                  <>
                    {selfActionLog.some(e=>e.roleId==="pixie") ? <p className="panel-note">ピクシーの能力獲得は記録済みです。</p> : <>
                      <div className="form-section"><label>能力を受け継いだ夜</label><select value={selfActionWhen} onChange={e=>setSelfActionWhen(e.target.value)}>{getNightOptions(2).map(x=><option key={x} value={x}>{x}</option>)}</select></div>
                      <p className="panel-note">初夜に知らされた役職の持ち主が死亡し、語り手から狂気を保ったと認められた時だけ確定してください。死亡は別に記録が必要です。</p>
                      <button className="menu-option confirm-claim-button" disabled={!selfInfoLog.some(e=>e.roleId==="pixie")||!getNightOptions(2).includes(selfActionWhen)} onClick={saveSelfPixieAwakening}>語り手の認定を確定</button>
                    </>}
                  </>
                )}

                {effectiveSelfAbilityRole === "engineer" && (
                  <>
                    {selfActionLog.some(a => a.roleId === "engineer") ? <p className="panel-note">技師の能力は使用済みです。</p> : <>
                      <div className="form-section"><label>能力を使った夜</label><select value={selfActionWhen} onChange={e => setSelfActionWhen(e.target.value)}>{getNightOptions(1).map(phase => <option key={phase} value={phase}>{phase}</option>)}</select></div>
                      <div className="visibility-switch"><button type="button" className={selfEngineerMode === "demon" ? "visibility-button visibility-selected" : "visibility-button"} onClick={() => setSelfEngineerMode("demon")}>デーモンを選ぶ</button><button type="button" className={selfEngineerMode === "minions" ? "visibility-button visibility-selected" : "visibility-button"} onClick={() => setSelfEngineerMode("minions")}>手下を選ぶ</button></div>
                      {selfEngineerMode === "demon" ? <div className="form-section"><label>変更後のデーモン役職</label><select value={selfEngineerDemon ?? ""} onChange={e => setSelfEngineerDemon(e.target.value ? e.target.value as RoleId : null)}><option value="">選択</option>{currentScriptRoles.filter(r => r.type === "demon").map(r => <option key={r.id} value={r.id}>{r.symbol} {r.name}</option>)}</select></div> : <>
                        <div className="claim-option-title">変更後の手下役職 ({selfEngineerMinions.length}/{setupCounts(playerCount).minion})</div>
                        <div className="role-grid">{currentScriptRoles.filter(r => r.type === "minion").map(r => <button type="button" key={r.id} disabled={!selfEngineerMinions.includes(r.id) && selfEngineerMinions.length >= setupCounts(playerCount).minion} className={selfEngineerMinions.includes(r.id) ? "role-choice selected" : "role-choice"} onClick={() => setSelfEngineerMinions(cur => cur.includes(r.id) ? cur.filter(id => id !== r.id) : [...cur, r.id])}>{r.symbol} {r.name}</button>)}</div>
                      </>}
                      <p className="panel-note">手下の人数は変わらず、陣営も変わりません。誰がどの手下になるかはストーリーテラーが決めます。変更先はこのスクリプトから選択してください。</p>
                      <button className="menu-option confirm-claim-button" disabled={selfEngineerMode === "demon" ? !selfEngineerDemon : selfEngineerMinions.length !== setupCounts(playerCount).minion} onClick={saveSelfEngineerAction}>確定</button>
                    </>}
                  </>
                )}

                {effectiveSelfAbilityRole === "acrobat" && (
                  <>
                    <div className="form-section"><label>いつ</label><select value={selfActionWhen} onChange={(event) => setSelfActionWhen(event.target.value)}>{getNightOptions(2).map((phase) => <option key={phase} value={phase}>{phase}</option>)}</select></div>
                    <div className="claim-option-title">選んだ人</div>
                    <div className="player-toggle-grid">{["self", ...getActivePlayers()].map((player) => <button key={player} type="button" className={selfActionTarget === player ? "player-toggle selected" : "player-toggle"} onClick={() => setSelfActionTarget(selfActionTarget === player ? null : player)}>{getPlayerDisplayName(player)}</button>)}</div>
                    <div className="claim-option-title">その夜の結果</div>
                    <div className="visibility-switch"><button className={!selfAcrobatDied ? "visibility-button visibility-selected" : "visibility-button"} onClick={() => setSelfAcrobatDied(false)}>死亡なし</button><button className={selfAcrobatDied ? "visibility-button visibility-selected" : "visibility-button"} onClick={() => setSelfAcrobatDied(true)}>自分が死亡</button></div>
                    <p className="panel-note">選んだ人がその夜に酔い・毒状態なら、健康な軽業師は死亡します。</p>
                    <button className="menu-option confirm-claim-button" disabled={!selfActionTarget || !getNightOptions(2).includes(selfActionWhen)} onClick={saveSelfAcrobatAction}>確定</button>
                  </>
                )}

                {effectiveSelfAbilityRole === "alsaahir" && (
                  <>
                    <div className="form-section"><label>いつ</label><select value={selfActionWhen} onChange={(event) => { setSelfActionWhen(event.target.value); setSelfAlsaahirMinions([]); setSelfAlsaahirDemons([]); setSelfAlsaahirWon(false); }}>{getDayOptions().map((phase) => <option key={phase} value={phase}>{phase}</option>)}</select></div>
                    {selfActionLog.some((event) => event.roleId === "alsaahir" && event.when === selfActionWhen) ? <p className="panel-note">この日のアルサーヒル予想はすでに記録済みです。</p> : <>
                      <div className="claim-option-title">手下だと予想する人</div>
                      <div className="player-toggle-grid">{["self", ...getActivePlayers()].map((player) => <button key={`m-${player}`} type="button" disabled={selfAlsaahirDemons.includes(player)} className={selfAlsaahirMinions.includes(player) ? "player-toggle selected" : "player-toggle"} onClick={() => setSelfAlsaahirMinions((current) => current.includes(player) ? current.filter((p) => p !== player) : [...current, player])}>{getPlayerDisplayName(player)}</button>)}</div>
                      <div className="claim-option-title">デーモンだと予想する人</div>
                      <div className="player-toggle-grid">{["self", ...getActivePlayers()].map((player) => <button key={`d-${player}`} type="button" disabled={selfAlsaahirMinions.includes(player)} className={selfAlsaahirDemons.includes(player) ? "player-toggle selected" : "player-toggle"} onClick={() => setSelfAlsaahirDemons((current) => current.includes(player) ? current.filter((p) => p !== player) : [...current, player])}>{getPlayerDisplayName(player)}</button>)}</div>
                      <div className="claim-option-title">結果</div><div className="visibility-switch"><button className={!selfAlsaahirWon ? "visibility-button visibility-selected" : "visibility-button"} onClick={() => setSelfAlsaahirWon(false)}>不正解</button><button className={selfAlsaahirWon ? "visibility-button visibility-selected" : "visibility-button"} onClick={() => setSelfAlsaahirWon(true)}>正解・善勝利</button></div>
                      <button className="menu-option confirm-claim-button" disabled={!selfAlsaahirDemons.length} onClick={saveSelfAlsaahirGuess}>確定</button>
                    </>}
                  </>
                )}

                {effectiveSelfAbilityRole === "philosopher" && (
                  <>
                    {selfActionLog.some((event) => event.roleId === "philosopher") ? (
                      <div className="panel-note">哲学者の能力はすでに使用済みです。</div>
                    ) : (
                      <>
                        <div className="form-section">
                          <label>いつ</label>
                          <select value={selfActionWhen} onChange={(event) => setSelfActionWhen(event.target.value)}>
                            {getNightOptions(1).map((phase) => <option key={phase} value={phase}>{phase}</option>)}
                          </select>
                        </div>
                        <div className="form-section">
                          <label>獲得する善キャラクターの能力</label>
                          <select value={selfPhilosopherRole ?? ""} onChange={(event) => setSelfPhilosopherRole(event.target.value ? event.target.value as RoleId : null)}>
                            <option value="">選択</option>
                            {currentScriptRoles
                              .filter((role) => (role.type === "townsfolk" || role.type === "outsider") && role.id !== "philosopher")
                              .map((role) => <option key={role.id} value={role.id}>{role.symbol} {role.name}</option>)}
                          </select>
                        </div>
                        <div className="panel-note">キャラクター自体は哲学者のままです。同じ能力の本来の持ち主がゲーム内にいる場合、健康な哲学者が能力を持つ間その人は酔います。</div>
                        <button className="menu-option confirm-claim-button" disabled={!selfPhilosopherRole} onClick={saveSelfPhilosopherAction}>確定</button>
                      </>
                    )}
                  </>
                )}

                {effectiveSelfAbilityRole === "klutz" && (
                  <>
                    {playerStatus.self?.alive !== false ? (
                      <div className="panel-note">不器用者の選択は自分が死亡した後に記録できます。</div>
                    ) : selfActionLog.some((event) => event.roleId === "klutz") ? (
                      <div className="panel-note">不器用者の選択はすでに記録済みです。</div>
                    ) : (
                      <>
                        <div className="form-section">
                          <label>いつ</label>
                          <select value={selfActionWhen} onChange={(event) => setSelfActionWhen(event.target.value)}>
                            {getPhaseOptions().map((phase) => <option key={phase} value={phase}>{phase}</option>)}
                          </select>
                        </div>
                        <div className="claim-option-title">公開で選んだ生存者</div>
                        <div className="player-toggle-grid">
                          {getActivePlayers().filter((player) => playerStatus[player]?.alive !== false).map((player) => (
                            <button key={player} type="button" className={selfActionTarget === player ? "player-toggle selected" : "player-toggle"} onClick={() => setSelfActionTarget(selfActionTarget === player ? null : player)}>{getPlayerDisplayName(player)}</button>
                          ))}
                        </div>
                        <div className="claim-option-title">その選択で自陣営が敗北した？</div>
                        <div className="visibility-switch">
                          <button type="button" className={selfKlutzTeamLost === false ? "visibility-button visibility-selected" : "visibility-button"} onClick={() => setSelfKlutzTeamLost(false)}>いいえ</button>
                          <button type="button" className={selfKlutzTeamLost === true ? "visibility-button visibility-selected" : "visibility-button"} onClick={() => setSelfKlutzTeamLost(true)}>はい</button>
                        </div>
                        <button className="menu-option confirm-claim-button" disabled={!selfActionTarget || selfKlutzTeamLost === null} onClick={saveSelfKlutzAction}>確定</button>
                      </>
                    )}
                  </>
                )}

                {effectiveSelfAbilityRole === "monk" && (
                  <>
                    <div className="form-section">
                      <label>いつ</label>
                      <select
                        value={selfActionWhen}
                        onChange={(event) => setSelfActionWhen(event.target.value)}
                      >
                        {getNightOptions(2).map((phase) => (
                          <option key={phase} value={phase}>
                            {phase}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="claim-option-title">守った人</div>
                    <div className="player-toggle-grid">
                      {getActivePlayers().map((player) => (
                        <button
                          key={player}
                          type="button"
                          className={
                            selfActionTarget === player
                              ? "player-toggle selected"
                              : "player-toggle"
                          }
                          onClick={() =>
                            setSelfActionTarget(
                              selfActionTarget === player ? null : player
                            )
                          }
                        >
                          {getPlayerDisplayName(player)}
                        </button>
                      ))}
                    </div>
                    <button
                      className="menu-option confirm-claim-button"
                      disabled={!selfActionTarget || !getNightOptions(2).includes(selfActionWhen)}
                      onClick={saveSelfMonkAction}
                    >
                      確定
                    </button>
                  </>
                )}

                {effectiveSelfAbilityRole === "snake_charmer" && (
                  <>
                    {selfActionLog.some((event) => event.roleId === "snake_charmer" && event.swapped) ? (
                      <div className="panel-note">デーモンとの交換を記録済みです。交換後は自分は蛇使いではありません。</div>
                    ) : (
                      <>
                        <div className="form-section">
                          <label>いつ</label>
                          <select value={selfActionWhen} onChange={(event) => setSelfActionWhen(event.target.value)}>
                            {getNightOptions(1).map((phase) => <option key={phase} value={phase}>{phase}</option>)}
                          </select>
                        </div>
                        <div className="claim-option-title">選んだ人</div>
                        <div className="player-toggle-grid">
                          {["self", ...getActivePlayers()].filter((player) => playerStatus[player]?.alive !== false).map((player) => (
                            <button
                              key={player}
                              type="button"
                              className={selfActionTarget === player ? "player-toggle selected" : "player-toggle"}
                              onClick={() => setSelfActionTarget(selfActionTarget === player ? null : player)}
                            >
                              {getPlayerDisplayName(player)}
                            </button>
                          ))}
                        </div>
                        <div className="claim-option-title">結果</div>
                        <div className="visibility-switch">
                          <button
                            className={!selfSnakeSwapped ? "visibility-button visibility-selected" : "visibility-button"}
                            onClick={() => {
                              setSelfSnakeSwapped(false);
                              setSelfSnakeDemonRole(null);
                            }}
                          >
                            交換なし
                          </button>
                          <button
                            className={selfSnakeSwapped ? "visibility-button visibility-selected" : "visibility-button"}
                            onClick={() => setSelfSnakeSwapped(true)}
                          >
                            デーモンと交換
                          </button>
                        </div>
                        {selfSnakeSwapped && (
                          <div className="form-section">
                            <label>交換したデーモン役職</label>
                            <select
                              value={selfSnakeDemonRole ?? ""}
                              onChange={(event) => setSelfSnakeDemonRole(event.target.value ? event.target.value as RoleId : null)}
                            >
                              <option value="">選択</option>
                              {currentScriptRoles.filter((role) => role.type === "demon").map((role) => (
                                <option key={role.id} value={role.id}>{role.symbol} {role.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <button
                          className="menu-option confirm-claim-button"
                          disabled={!selfActionTarget || (selfSnakeSwapped && !selfSnakeDemonRole)}
                          onClick={saveSelfSnakeCharmerAction}
                        >
                          確定
                        </button>
                      </>
                    )}
                  </>
                )}

                {effectiveSelfAbilityRole === "exorcist" && (
                  <>
                    <div className="form-section">
                      <label>いつ</label>
                      <select
                        value={selfActionWhen}
                        onChange={(event) => setSelfActionWhen(event.target.value)}
                      >
                        {getNightOptions(2).map((phase) => (
                          <option key={phase} value={phase}>
                            {phase}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="claim-option-title">選んだ人</div>
                    <div className="player-toggle-grid">
                      {["self", ...getActivePlayers()].map((player) => {
                        const previous = selfActionLog
                          .filter((event): event is Extract<SelfActionEvent, { roleId: "exorcist" }> => event.roleId === "exorcist")
                          .filter((event) => compareEvents(event, { when: selfActionWhen, id: Infinity }) < 0)
                          .sort(compareEvents)
                          .at(-1);
                        const blocked = previous?.target === player;
                        return (
                          <button
                            key={player}
                            type="button"
                            disabled={blocked}
                            className={
                              selfActionTarget === player
                                ? "player-toggle selected"
                                : "player-toggle"
                            }
                            onClick={() =>
                              setSelfActionTarget(
                                selfActionTarget === player ? null : player
                              )
                            }
                          >
                            {getPlayerDisplayName(player)}
                          </button>
                        );
                      })}
                    </div>
                    <div className="panel-note">前の夜と同じ人は選べません。死亡が0人なら、選んだ相手のデーモン疑いを弱く上げます。</div>
                    <button
                      className="menu-option confirm-claim-button"
                      disabled={!selfActionTarget || !getNightOptions(2).includes(selfActionWhen)}
                      onClick={saveSelfExorcistAction}
                    >
                      確定
                    </button>
                  </>
                )}

                {effectiveSelfAbilityRole === "slayer" && (
                  <>
                    {selfActionLog.some((event) => event.roleId === "slayer") ? (
                      <div className="panel-note">処刑人の能力は既に使用済みです。</div>
                    ) : (
                      <>
                        <div className="form-section">
                          <label>いつ</label>
                          <select
                            value={selfActionWhen}
                            onChange={(event) => setSelfActionWhen(event.target.value)}
                          >
                            {getDayOptions().map((phase) => (
                              <option key={phase} value={phase}>
                                {phase}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="claim-option-title">対象</div>
                        <div className="player-toggle-grid">
                          {getActivePlayers().map((player) => (
                            <button
                              key={player}
                              type="button"
                              className={
                                selfActionTarget === player
                                  ? "player-toggle selected"
                                  : "player-toggle"
                              }
                              onClick={() =>
                                setSelfActionTarget(
                                  selfActionTarget === player ? null : player
                                )
                              }
                            >
                              {getPlayerDisplayName(player)}
                            </button>
                          ))}
                        </div>
                        <div className="claim-option-title">結果</div>
                        <div className="visibility-switch">
                          <button
                            className={
                              !selfSlayerKilled
                                ? "visibility-button visibility-selected"
                                : "visibility-button"
                            }
                            onClick={() => setSelfSlayerKilled(false)}
                          >
                            死亡なし
                          </button>
                          <button
                            className={
                              selfSlayerKilled
                                ? "visibility-button visibility-selected"
                                : "visibility-button"
                            }
                            onClick={() => setSelfSlayerKilled(true)}
                          >
                            死亡
                          </button>
                        </div>
                        <button
                          className="menu-option confirm-claim-button"
                          disabled={!selfActionTarget}
                          onClick={saveSelfSlayerAction}
                        >
                          確定
                        </button>
                      </>
                    )}
                  </>
                )}

                <button
                  className="menu-option"
                  disabled={!latestSelfActionToUndo}
                  onClick={() => latestSelfActionToUndo && deleteHistory("selfActionLog", latestSelfActionToUndo.id)}
                >
                  取り消し
                </button>
                <button
                  className="menu-option"
                  onClick={() => {
                    resetSelfActionForm();
                    setSelfPanel("menu");
                  }}
                >
                  戻る
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {endGameOpen && (
        <div className="menu-overlay" onClick={() => setEndGameOpen(false)}>
          <div className="game-menu" onClick={(event) => event.stopPropagation()}>
            <h2>ゲーム終了</h2>
            <p className="panel-note">勝敗を選択してください。選んだ結果と現在の記録をゲームログに保存して終了します。</p>
            <button className="menu-option" onClick={() => finishCurrentGame("evil")}>
              デーモン勝利
            </button>
            <button className="menu-option" onClick={() => finishCurrentGame("good")}>
              町勝利
            </button>
            <button className="menu-option" onClick={() => finishCurrentGame("special")}>
              特殊条件勝利
            </button>
            <button className="menu-option" onClick={() => setEndGameOpen(false)}>
              戻る
            </button>
          </div>
        </div>
      )}

      {exileTravellerOpen && (
        <div className="menu-overlay" onClick={() => setExileTravellerOpen(false)}>
          <div className="game-menu" onClick={(event) => event.stopPropagation()}>
            <h2>旅人を追放</h2>
            <p className="panel-note">追放された旅人は能力を失い、中央表示から外れます。死者票は1票保持します。</p>
            {getActiveTravellers().length === 0 ? (
              <p className="panel-note">追放できる旅人はいません。</p>
            ) : getActiveTravellers().map((traveller) => (
              <button key={traveller.id} className="menu-option danger-button" onClick={() => exileTraveller(traveller)}>
                {TRAVELLERS[traveller.roleId].symbol} {traveller.name || TRAVELLERS[traveller.roleId].name}
              </button>
            ))}
            <button className="menu-option" onClick={() => setExileTravellerOpen(false)}>戻る</button>
          </div>
        </div>
      )}

      {menuOpen && (
        <div className="menu-overlay" onClick={() => setMenuOpen(false)}>
          <div className="game-menu" onClick={(event) => event.stopPropagation()}>
            <h2>メニュー</h2>
            <button className="menu-option" onClick={()=>{setMenuOpen(false);openAnalysis();}}>{L.analysis} / {L.history}</button>
            <button className="menu-option" onClick={()=>{setMenuOpen(false);openAnalysis(null,"worlds");}}>候補盤面を確認</button>
            <button className="menu-option" onClick={()=>archiveCurrentGame("snapshot")}>現在のゲームをログに保存</button>
            <button className="menu-option" onClick={()=>{setMenuOpen(false);setGameLogOpen(true);}}>ゲームログ ({gameLogs.length})</button>
            <button className="menu-option" onClick={()=>downloadSnapshot(snapshot)}>{L.export}</button>
            <button className="menu-option" onClick={()=>importRef.current?.click()}>{L.import}</button>
            <p className="panel-note">{saveFailed?L.saveError:L.saved}</p>
            <button
              className="menu-option"
              onClick={confirmUndoNight}
              disabled={night <= 1 || checkpoints.length === 0}
            >
              夜を戻す
            </button>
            <button
              className="menu-option"
              disabled={getActiveTravellers().length === 0}
              onClick={()=>{setMenuOpen(false);setExileTravellerOpen(true);}}
            >
              旅人を追放
            </button>
            <button className="menu-option danger-button" onClick={confirmEndGame}>
              ゲーム終了
            </button>
            <button className="menu-option" onClick={() => setMenuOpen(false)}>
              閉じる
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
