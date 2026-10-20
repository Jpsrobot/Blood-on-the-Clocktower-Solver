import type { RoleId, RoleType, RoleTag } from "./roles";
import type { TravellerRoleId } from "./travellers";

export type Alignment = "good" | "evil";
export type Screen = "home" | "setup" | "game";
export type ClaimVisibility = "public" | "private";
export type RoleClaimType = "normal" | "bluff";
export type RoleClaimOrigin = "manual" | "ability_claim";
export type ClaimSubjectKind = "role" | "tag" | "type" | "alignment";

export type ClaimableRoleTag =
  | "FIRST_NIGHT_INFO"
  | "CONTINUOUS_INFO"
  | "LACK_OF_INFO"
  | "WANTS_DEMON_TARGET"
  | "HIGH_SURVIVAL_VALUE";

export type ClaimSubject =
  | { kind: "role"; roleId: RoleId }
  | { kind: "tag"; tag: ClaimableRoleTag }
  | { kind: "type"; roleType: RoleType }
  | { kind: "alignment"; alignment: Alignment };

export type RoleClaimEvent = {
  id: number;
  playerId: string;
  subject: ClaimSubject;
  claimType: RoleClaimType;
  origin: RoleClaimOrigin;
  sourceEventId?: number;
  visibility: ClaimVisibility;
  recipients: string[];
  when: string;
};

export type AbilityClaimEvent = {
  id: number;
  playerId: string;
  roleId: RoleId;
  /** Someone reports being selected by a Harpy; this does not claim to be the Harpy. */
  affectedByHarpy?: boolean;
  when: string;
  targets: string[];
  result: string | null;
  structured?: StructuredInfo;
  reportedWhen?: string;
  sourcePlayerId?: string;
  visibility: ClaimVisibility;
  recipients: string[];
};

export type PlayerStatus = {
  alive: boolean;
  deadVoteAvailable: boolean;
};

export type DeathReasonId =
  | "storyteller"
  | "execution"
  | "night_death"
  | "ability"
  | "gnome"
  | "gangster"
  | "other"
  | "psychopath";

export type DeathEvent = {
  id: number;
  playerId: string;
  when: string;
  reason: DeathReasonId;
  isExecution?: boolean;
  order?: number;
  sourceRoleId?: RoleId;
  sourceTravellerRoleId?: TravellerRoleId;
  sourcePlayerId?: string;
  sourceEventId?: number;
};

export type RevivalEvent = {
  id: number;
  playerId: string;
  when: string;
  order?: number;
  sourceRoleId?: RoleId;
};

export type DeathReasonDefinition = {
  id: DeathReasonId;
  label: string;
  phase: "day" | "night" | "any";
};

export type NominationEvent = {
  id: number;
  nominator: string;
  nominee: string;
  when: string;
  voters: string[];
  /** Actual signed tally after Traveller vote modifiers. Optional for old saves. */
  voteTotal?: number;
  /** Signed contribution of each raised hand. Optional for old saves. */
  voteWeights?: Record<string, number>;
  reason?: string;
  votingOccurred?: boolean;
  /** A player was executed but survived; still counts for Leviathan. */
  executed?: boolean;
  order?: number;
};

export type TravellerState = {
  id: string;
  name: string;
  roleId: TravellerRoleId;
  joinedWhen: string;
  active: boolean;
  /** Exiled Travellers are removed from play but retain one dead vote. */
  exiled?: boolean;
  exiledWhen?: string;
  alive: boolean;
  deadVoteAvailable: boolean;
  knownAlignment: Alignment | "unknown";
  /** Only used by the Beggar while alive. */
  voteTokens: number;
};

export type TravellerActionEvent =
  | { id: number; roleId: "bureaucrat" | "thief"; kind: "vote_modifier"; travellerId: string; when: string; target: string }
  | { id: number; roleId: "beggar"; kind: "donation"; travellerId: string; when: string; donor: string; learnedAlignment: Alignment | "unknown" }
  | { id: number; roleId: "gunslinger"; kind: "shot"; travellerId: string; when: string; target: string; killed: boolean }
  | { id: number; roleId: "scapegoat"; kind: "replacement"; travellerId: string; when: string; savedPlayer: string }
  | { id: number; roleId: "apprentice"; kind: "apprentice_ability"; travellerId: string; when: string; abilityRoleId: RoleId }
  | { id: number; roleId: "matron"; kind: "seat_swap"; travellerId: string; when: string; playerA: string; playerB: string }
  | { id: number; roleId: "judge"; kind: "judge_ruling"; travellerId: string; when: string; nominationId: number; result: "pass" | "fail" }
  | { id: number; roleId: "butcher"; kind: "butcher_nomination"; travellerId: string; when: string; nominationId: number }
  | { id: number; roleId: "bone_collector"; kind: "restore_ability"; travellerId: string; when: string; target: string }
  | { id: number; roleId: "harlot"; kind: "harlot_visit"; travellerId: string; when: string; target: string; agreed: boolean; shownRole?: RoleId; bothDied: boolean }
  | { id: number; roleId: "barista"; kind: "barista_effect"; travellerId: string; when: string; target: string; effect: "sober_healthy" | "acts_twice" }
  | { id: number; roleId: "deviant"; kind: "deviant_funny"; travellerId: string; when: string; funny: boolean }
  | { id: number; roleId: "cacklejack"; kind: "cacklejack_protect"; travellerId: string; when: string; target: string }
  | { id: number; roleId: "cacklejack"; kind: "cacklejack_change"; travellerId: string; when: string; target: string; newRole: RoleId }
  | { id: number; roleId: "gnome"; kind: "gnome_friend"; travellerId: string; when: string; friend: string }
  | { id: number; roleId: "gnome"; kind: "gnome_kill"; travellerId: string; when: string; nominationId: number; target: string; killed: boolean }
  | { id: number; roleId: "gangster"; kind: "gangster_kill"; travellerId: string; when: string; agreedPlayer: string; target: string; killed: boolean };

export type TalkTopic =
  | "role_claim"
  | "ability_claim"
  | "info"
  | "strategy"
  | "other";

export type TalkEvent = {
  id: number;
  participants: string[];
  when: string;
  topic: TalkTopic | null;
  details: string | null;
};

export type AbilityTriggerEvent = {
  id: number;
  roleId: "virgin" | "slayer";
  rolePlayerId: string;
  when: string;
  targetPlayerId: string;
  triggered: boolean;
  sourceEventId?: number;
};

export type TriggerDraft = {
  kind: "virgin" | "slayer";
  rolePlayerId: string;
  targetPlayerId: string | null;
  when: string;
  sourceEventId?: number;
  result: boolean | null;
};

export type SelfRoleState = {
  shownRole: RoleId | null;
};

export type KnownMinionSource = "demon_info" | "minion_info" | "confirmed_later";

export type KnownMinion = {
  playerId: string;
  source: KnownMinionSource;
  /** Optional exact character learned later from the teammate. Initial Demon info only reveals the player. */
  roleId?: RoleId | null;
};

export type DemonState = {
  knownMinions: KnownMinion[];
  storytellerBluffs: RoleId[];
  /** Starting evil-team introduction: unknown for pre-update saves. */
  evilTeamIntro?: "shown" | "blocked";
  /** Night when a dead Poppy Grower allowed evil-team introductions, if observed. */
  evilTeamLearnedWhen?: string | null;
  /** King seat shown to the Demon at the start of the game. */
  knownKing?: string | null;
  bluffPlans: Record<string, RoleId | null>;
  /** Lord of Typhon pre-introduction *guesses*, not confirmed teammates or solver locks. */
  typhonPredictions?: Record<string, RoleId | null>;
  /** Known Legion teammates; separate from Minions and not inferred from bluff predictions. */
  legionAllies?: string[];
  /** Self-mode notes only: visible Lil' Monsta babysitter history, not a solver lock. */
  lilMonstaBabysitters?: { when: string; playerId: string }[];
  /** Lleech self-mode: secretly selected host, a factual self-observed target. */
  lleechHost?: string | null;
  /** Private confirmation learned by the Demon: the Marionette is this adjacent seat. */
  knownMarionette?: string | null;
  /** Not-in-play good ability granted by Boffin; known to both evil players. */
  boffinGrantedAbility?: RoleId | null;
};

export type DemonActionEvent = {
  id: number;
  roleId: "imp" | "fang_gu" | "vigormortis" | "no_dashii" | "vortox" | "lord_of_typhon" | "kazali" | "lleech" | "ojo";
  /** Ojo selects a character rather than a particular player. */
  targetRole?: RoleId;
  when: string;
  target: string;
  note: string | null;
};

export type KnownDemonSource = "minion_info" | "confirmed_later";

export type KnownDemon = {
  playerId: string;
  source: KnownDemonSource;
};

export type MinionState = {
  /** Starting Minion info in 7+ players, or a Demon identified later in Teensyville. */
  knownDemon: KnownDemon | null;
  /** Other Minion players. Starting info only reveals seats, not exact Minion characters. */
  knownMinions: KnownMinion[];
  evilTeamIntro?: "shown" | "blocked";
  evilTeamLearnedWhen?: string | null;
  /** Two seats shown as possible Demons when the Magician is in play. */
  demonCandidates?: string[];
  /** Storyteller bluffs explicitly shared by the real Demon. These are out of play. */
  sharedStorytellerBluffs: RoleId[];
  /** Team bluff plan only; never used as a mechanical solver constraint. */
  bluffPlans: Record<string, RoleId | null>;
  /** Spy-only: exact starting characters copied from the N1 Grimoire. Partial entry is allowed. */
  spyInitialRoles: Record<string, RoleId | null>;
  /** Spy-only: Fortune Teller red herring if copied from the Grimoire. */
  spyRedHerring: string | null;
  /** Snitch first-night bluffs: three actual out-of-play character identities. */
  snitchBluffs?: RoleId[];
  /** Boffin's observed not-in-play good ability given to the Demon. */
  boffinGrantedAbility?: RoleId | null;
  /** Summoner may select the N3 Demon and target without prior Demon introductions. */
  summonedDemon?: { when: string; playerId: string; demonRole: RoleId } | null;
  /** Organ Grinder can choose drunkenness each night; missing entry remains unknown. */
  organGrinderDrunkNights?: string[];
  /** Widow private N1 poisoning target. */
  widowPoisonedPlayer?: string | null;
  /** Wizard wish recording; freeform wishes never impose guessed mechanics. */
  wizardWish?: { when: string; wish: string; granted: boolean; price: string; clue: string } | null;
  /** Wraith observations are intentionally private notes rather than solver locks. */
  wraithNotes?: { when: string; note: string }[];
  /** Direct self-observation that this Minion became the Imp. */
  becameDemonAt: string | null;
  /** Evil Twin-only: the opposing good Twin and the character shown on the first night. */
  evilTwin?: { playerId: string; roleId: RoleId } | null;
};

export type MinionActionEvent =
  | { id: number; roleId: "mezepheles"; kind: "secret_word"; when: string; target: string; word: string; transformed: boolean }
  | { id: number; roleId: "psychopath"; kind: "public_kill"; when: string; target: string; killed: boolean }
  | { id: number; roleId: "fearmonger"; kind: "choose"; when: string; target: string; note: string | null }
  | { id: number; roleId: "harpy"; kind: "madness_pair"; when: string; target: string; accuse: string; note: string | null }
  | {
      id: number;
      roleId: "poisoner";
      kind: "poison";
      when: string;
      target: string;
      note: string | null;
    }
  | {
      id: number;
      roleId: "spy";
      kind: "grimoire";
      when: string;
      poisonTarget: string | null;
      note: string | null;
    }
  | {
      id: number;
      roleId: "witch";
      kind: "curse";
      when: string;
      target: string;
      /** Filled only when the cursed player actually nominates and the user resolves the outcome. */
      triggered: boolean | null;
      note: string | null;
    }
  | {
      id: number;
      roleId: "cerenovus";
      kind: "madness";
      when: string;
      target: string;
      madRole: RoleId;
      note: string | null;
    }
  | {
      id: number;
      roleId: "pit_hag";
      kind: "transform";
      when: string;
      target: string;
      newRole: RoleId;
      note: string | null;
    };

export type JugglerGuess = { player: string; roleId: RoleId };

export type SelfInfoEvent =
  | { id: number; roleId: "grandmother"; when: string; player: string; shownRole: RoleId }
  | { id: number; roleId: "chambermaid"; when: string; players: [string,string]; number: 0 | 1 | 2 }
  | { id: number; roleId: "godfather"; when: string; shownOutsiders: RoleId[] }
  | {
      id: number;
      roleId: "washerwoman" | "investigator";
      when: string;
      players: [string, string];
      shownRole: RoleId;
    }
  | {
      id: number;
      roleId: "clockmaker" | "oracle" | "mathematician";
      when: string;
      number: number;
    }
  | {
      id: number;
      roleId: "dreamer";
      when: string;
      player: string;
      shownRoles: [RoleId, RoleId];
    }
  | {
      id: number;
      roleId: "flowergirl" | "town_crier";
      when: string;
      result: "yes" | "no";
    }
  | {
      id: number;
      roleId: "savant";
      when: string;
      statements: [SavantStatement, SavantStatement];
    }
  | {
      id: number;
      roleId: "seamstress";
      when: string;
      players: [string, string];
      result: "same" | "different";
    }
  | {
      id: number;
      roleId: "artist";
      when: string;
      question: string;
      result: "yes" | "no" | "unknown";
    }
  | {
      id: number;
      roleId: "juggler";
      when: string;
      guessDay: string;
      guesses: JugglerGuess[];
      number: number;
    }
  | {
      id: number;
      roleId: "sage";
      when: string;
      players: [string, string];
    }
  | {
      id: number;
      roleId: "librarian";
      when: string;
      noOutsiders: boolean;
      players?: [string, string];
      shownRole?: RoleId;
    }
  | {
      id: number;
      roleId: "chef";
      when: string;
      number: number;
    }
  | {
      id: number;
      roleId: "empath";
      when: string;
      number: 0 | 1 | 2;
    }
  | {
      id: number;
      roleId: "fortune_teller";
      when: string;
      players: [string, string];
      result: "yes" | "no";
    }
  | {
      id: number;
      roleId: "undertaker";
      when: string;
      player: string;
      shownRole: RoleId;
    }
  | {
      id: number;
      roleId: "ravenkeeper";
      when: string;
      player: string;
      shownRole: RoleId;
    }
  | {
      id: number;
      roleId: "balloonist" | "bounty_hunter" | "high_priestess" | "choirboy";
      when: string;
      player: string;
    }
  | { id: number; roleId: "king"; when: string; shownRole: RoleId }
  | { id: number; roleId: "general"; when: string; result: "good" | "evil" | "neither" }
  | { id: number; roleId: "fisherman"; when: string; advice: string }
  | { id: number; roleId: "knight"; when: string; players: [string, string] }
  | { id: number; roleId: "noble"; when: string; players: [string, string, string] }
  | { id: number; roleId: "pixie"; when: string; shownRole: RoleId }
  | { id: number; roleId: "steward"; when: string; player: string }
  | { id: number; roleId: "shugenja"; when: string; direction: "clockwise" | "anticlockwise" }
  | { id: number; roleId: "village_idiot"; when: string; player: string; result: Alignment };

/** A source-observed BMR action. The actual outcome is always a separate
 * death/revival/poison event; no Storyteller decisions are invented. */
export type BmrRecordedActionEvent = {
  id: number;
  kind: 'bmr_action';
  roleId: import('./abilityTiming').BmrRecordedActionRoleId;
  when: string;
  targets: string[];
  chosenRole: RoleId | null;
  note: string | null;
};

export type SelfActionEvent =
  | BmrRecordedActionEvent
  | {
      id: number;
      roleId: "monk";
      when: string;
      target: string;
    }
  | {
      id: number;
      roleId: "exorcist";
      when: string;
      target: string;
    }
  | {
      id: number;
      roleId: "slayer";
      when: string;
      target: string;
      killed: boolean;
    }
  | {
      id: number;
      roleId: "snake_charmer";
      when: string;
      target: string;
      swapped: boolean;
      newDemonRole: RoleId | null;
    }
  | {
      id: number;
      roleId: "philosopher";
      when: string;
      gainedRole: RoleId;
    }
  | {
      id: number;
      roleId: "klutz";
      when: string;
      target: string;
      teamLost: boolean;
    }
  | {
      id: number;
      roleId: "acrobat";
      when: string;
      target: string;
      died: boolean;
    }
  | {
      id: number;
      roleId: "alchemist";
      kind: "minion_ability";
      when: string;
      minionRole: RoleId;
    }
  | {
      id: number;
      roleId: "alsaahir";
      when: string;
      minions: string[];
      demons: string[];
      won: boolean;
    }
  | {
      id: number;
      roleId: "amnesiac";
      kind: "tag_answer";
      when: string;
      tag: RoleTag;
      matches: boolean;
    }
  | {
      id: number;
      roleId: "amnesiac";
      kind: "lock_role";
      when: string;
      chosenRole: RoleId;
    }
  | { id: number; roleId: "engineer"; when: string; kind: "demon"; demonRole: RoleId }
  | { id: number; roleId: "engineer"; when: string; kind: "minions"; minionRoles: RoleId[] }
  /** A direct observation that the player became Farmer after a named Farmer died. */
  | { id: number; roleId: "farmer"; kind: "became_farmer"; when: string; deceasedFarmer: string }
  | { id: number; roleId: "huntsman"; when: string; target: string; rescuedRole?: RoleId | null }
  | { id: number; roleId: "nightwatchman"; when: string; target: string }
  | { id: number; roleId: "lycanthrope"; when: string; target: string; killed: boolean }
  | { id: number; roleId: "pixie"; kind: "madness_confirmed"; when: string; shownRole: RoleId }
  | { id: number; roleId: "damsel"; kind: "minion_guess"; when: string; minion: string; target: string; won: boolean }
  | { id: number; roleId: "preacher"; when: string; target: string }
  /** Storyteller-confirmed outcome; requires matching nomination/execution data. */
  | { id: number; roleId: "princess"; kind: "first_day_execution"; when: string; nominee: string };

export type PlayerPanel =
  | "menu"
  | "identity"
  | "claim"
  | "ability_claim"
  | "nomination"
  | "status"
  | "death"
  | "talk"
  | "trigger_choice"
  | "trigger"
  | "read"
  | "reported_info";

export type SelfPanel = "menu" | "role" | "info" | "action" | "alchemist" | "amnesiac" | "demon" | "minion" | "advice" | "farmer" | "damsel";


export type SavantStatement =
  | { kind: "roleInPlay"; roleId: RoleId }
  | { kind: "roleAmong"; roleId: RoleId; players: string[] };

export type StructuredInfo =
  | { kind: "grandmotherRead"; player: string; shownRole: RoleId }
  | { kind: "chambermaidRead"; players: [string,string]; number: 0 | 1 | 2 }
  | { kind: "godfatherOutsiders"; roles: RoleId[] }
  | { kind: "pairRole"; players: [string, string]; shownRole: RoleId }
  | { kind: "noOutsiders" }
  | { kind: "number"; value: number }
  | { kind: "pairYesNo"; players: [string, string]; result: "yes" | "no" }
  | { kind: "singleYesNo"; result: "yes" | "no" }
  | { kind: "dreamer"; player: string; shownRoles: [RoleId, RoleId] }
  | { kind: "savantPair"; statements: [SavantStatement, SavantStatement] }
  | { kind: "pairAlignment"; players: [string, string]; result: "same" | "different" }
  | { kind: "artistAnswer"; question: string; result: "yes" | "no" | "unknown" }
  | { kind: "juggler"; guessDay: string; guesses: JugglerGuess[]; number: number }
  | { kind: "sage"; players: [string, string] }
  | { kind: "knight"; players: [string, string] }
  | { kind: "noble"; players: [string, string, string] }
  | { kind: "singlePlayer"; player: string }
  | { kind: "shugenjaDirection"; direction: "clockwise" | "anticlockwise" }
  | { kind: "alignmentRead"; player: string; result: Alignment }
  | { kind: "singleRole"; shownRole: RoleId }
  | { kind: "storytellerAdvice"; advice: string }
  | { kind: "storytellerAssessment"; result: "good" | "evil" | "neither" }
  | { kind: "klutzChoice"; target: string; teamLost: boolean }
  | { kind: "roleReveal"; player: string; shownRole: RoleId }
  | { kind: "action"; target: string };
export type ManualRead = { playerId: string; roleId: RoleId | null; alignment: Alignment | "unknown"; note: string; updatedAt: number };
export type WidowReport = { id: number; when: string; playerId: string };
export type EvilBehaviorReport = { id: number; when: string; playerId: string; note: string };
export type PsychopathPublicEvent = { id: number; when: string; playerId: string; target: string; killed: boolean };
export type OrganGrinderVoteEvent = { id: number; when: string; hidden: boolean };
export type BoomdandyEvent = {
  id: number;
  when: string;
  executedPlayer: string;
  /** Storyteller's living shortlist immediately after the explosion. */
  survivors: string[];
  /** Final pointed player, or null when tied / unresolved. */
  pointedPlayer: string | null;
  tied: boolean;
};

/** A publicly confirmed exceptional ending. It does not assert that a role
 * is in play merely because the two characters share a script. */
export type JinxVictoryEvent = {
  id: number;
  when: string; // Triggering execution day, including a Mastermind follow-up on the next night.
  pair: import('./engine/jinxVictory').JinxVictoryPair;
  actor?: string; // Demon who nominated, or Mayor choosing to stop Riot.
  target?: string; // Executed target or confirmed Grandchild.
  allLive?: boolean; // Al-Hadikhia/Mastermind's three choices, as confirmed by Storyteller.
};

/** Storyteller-confirmed Outsider interactions. Public claims alone do not prove these roles. */
export type OutsiderEvent =
 | { id:number; when:string; kind:"puzzlemaster_guess"; playerId:string; target:string; shownDemon:string }
 | { id:number; when:string; kind:"golem_nomination"; playerId:string; target:string; killed:boolean }
 | { id:number; when:string; kind:"ogre_choice"; playerId:string; target:string }
 | { id:number; when:string; kind:"hatter_change"; playerId:string; target:string; newRole:RoleId }
 | { id:number; when:string; kind:"plague_grant"; playerId:string; abilityRole:RoleId }
 | { id:number; when:string; kind:"politician_reward"; playerId:string }
 | { id:number; when:string; kind:"politician_suspicion"; playerId:string };

export type GameSnapshot = {
  schemaVersion: 2;
  playerCount: number;
  playset: string;
  /** Frozen script metadata so custom games remain valid even if the saved custom script is later edited/deleted. */
  scriptName?: string;
  scriptRoleIds?: RoleId[];
  night: number;
  playerNames: Record<string, string>;
  playerStatus: Record<string, PlayerStatus>;
  roleClaimLog: RoleClaimEvent[];
  abilityClaimLog: AbilityClaimEvent[];
  deathLog: DeathEvent[];
  /** Optional for backward compatibility with saves created before revival tracking. */
  revivalLog?: RevivalEvent[];
  nominationLog: NominationEvent[];
  /** Travellers are public characters outside normal setup counts. Optional for old saves. */
  travellers?: TravellerState[];
  /** Public/recorded Traveller ability events. Optional for old saves. */
  travellerActionLog?: TravellerActionEvent[];
  abilityTriggerLog: AbilityTriggerEvent[];
  talkLog: TalkEvent[];
  selfRole: SelfRoleState;
  selfInfoLog: SelfInfoEvent[];
  selfActionLog: SelfActionEvent[];
  /** Optional for backward compatibility with pre-demon-mode saves. */
  demonState?: DemonState;
  /** Optional for backward compatibility with pre-demon-mode saves. */
  demonActionLog?: DemonActionEvent[];
  /** Optional for backward compatibility with pre-minion-mode saves. */
  minionState?: MinionState;
  /** Optional for backward compatibility with pre-minion-mode saves. */
  minionActionLog?: MinionActionEvent[];
  manualReads: Record<string, ManualRead>;
  completedNights: number[];
  noExecutionDays: number[];
  /** Explicit public Leviathan announcement; absent/false means exclude from sampled worlds. */
  leviathanConfirmed?: boolean;
  /** Publicly identified Al-Hadikhia game (not a probability inference). */
  alHadikhiaConfirmed?: boolean;
  /** Day-3 Riot confirmed by the Storyteller or the public nomination chain. */
  riotConfirmed?: boolean;
  /** Caution toggle in 推理; never hard-locks Fearmonger worlds. */
  fearmongerActive?: boolean;
  /** A player reports receiving a Widow notification. Soft claim; can be false. */
  widowReports?: WidowReport[];
  /** Someone who appeared good starts behaving like evil; soft Mezepheles clue. */
  evilBehaviorReports?: EvilBehaviorReport[];
  /** Public Psychopath declaration and target, with optional death outcome. */
  psychopathEvents?: PsychopathPublicEvent[];
  /** Storyteller voting format: closed eyes/tally hidden, or open. */
  organGrinderVotes?: OrganGrinderVoteEvent[];
  /** Executed Boomdandy explosion, selected survivors, and countdown resolution. */
  boomdandyLog?: BoomdandyEvent[];
  /** Explicitly confirmed game-ending Djinn exception; old saves omit this. */
  jinxVictoryLog?: JinxVictoryEvent[];
  /** Optional for old saves. All entries are manually confirmed rather than inferred role claims. */
  outsiderEvents?: OutsiderEvent[];
};

export type GameLogOutcome = "unknown" | "good" | "evil" | "special";
export type GameLogStatus = "snapshot" | "finished";

export type GameLogReasoningSummary = {
  generatedAt: number;
  checked: number;
  unique: number;
  effectiveWorlds: number;
  meta: boolean;
  playerShares: Record<string, { evil: number; demon: number; drunk: number }>;
  presence: Partial<Record<RoleId, number>>;
  topWorlds: Array<{
    initial: Record<string, RoleId>;
    current: Record<string, RoleId>;
    /** Added in the S&V role/alignment split. Optional so old archived logs still load. */
    initialAlignment?: Record<string, Alignment>;
    currentAlignment?: Record<string, Alignment>;
    requiredPoison: Record<number, string>;
    assumptions: string[];
    changes: Array<
      | { when: string; from: string; to: string; kind: "scarlet" | "starpass" }
      | { when: string; playerId: string; fromRole: RoleId; toRole: RoleId; kind: "riot" }
      | { when: string; playerId: string; fromRole: RoleId; toRole: RoleId; kind: "pit_hag" }
      | { when: string; playerId: string; fromRole: RoleId; toRole: RoleId; kind: "cacklejack" }
      | { when: string; kind: "mezepheles"; playerId: string }
      | { when: string; kind: "snake_charmer"; snake: string; demon: string; demonRole: RoleId }
      | { when: string; kind: "fang_gu"; oldDemon: string; newDemon: string; fromRole: RoleId }
      | { when: string; kind: "engineer" | "farmer" | "huntsman" | "summoner" | "hatter"; playerId: string; fromRole: RoleId; toRole: RoleId }
    >;
  }>;
};

export type GameLogEntry = {
  schemaVersion: 1;
  id: string;
  savedAt: number;
  status: GameLogStatus;
  outcome: GameLogOutcome;
  label: string;
  note: string;
  game: GameSnapshot;
  reasoning: GameLogReasoningSummary | null;
};
