import type { Alignment, GameSnapshot, StructuredInfo } from "../types";
import type { RoleId } from "../roles";
export type Snapshot = GameSnapshot;
export type Severity = "red" | "orange" | "yellow" | "green" | "blue";
export type Reason = { code: string; players: string[]; phase?: string; roles?: RoleId[]; evidence: number[]; detail?: string; strength: "mechanical" | "conditional" | "heuristic" | "input" };
export type Warning = { color: Severity; cycle?: number; reasons: Reason[] };
export type PlayerEvidence = { good: number; evil: number; inconsistency: number; reasons: Reason[]; warnings: Warning[]; confirmedRole?: RoleId };
export type EvidenceAnalysis = { players: Record<string, PlayerEvidence>; global: Record<string, { points: number; reasons: Reason[] }>; issues: Reason[] };
export type Observation = { id: number; aliases: number[]; source: string; role: RoleId; when: string; direct: boolean; data: StructuredInfo };
export type InfoDisposition = "works" | "registration" | "poison" | "drunk" | "vortox" | "bluff" | "lie" | "missing";
export type HistoryWorld = {
  /** Character identity and team alignment are independent. Pit-Hag can change the character without changing alignment. */
  initial: Record<string, RoleId>; current: Record<string, RoleId>;
  initialAlignment: Record<string, Alignment>; currentAlignment: Record<string, Alignment>;
  believedRoles: Record<string, RoleId>;
  alive: string[]; redHerring: string | null;
  poison: Record<number, string | null>;
  /** Poison that persists across nights, currently used by Snake Charmer swaps. */
  permanentPoison: string[];
  /** Drunkenness that persists from a Sweetheart death. */
  permanentDrunk: string[];
  /** The global Fang Gu once-per-game jump has already occurred. */
  fangGuJumped: boolean;
  /** The unseen good character ability lent to a Demon by a living healthy Boffin. */
  boffinGrantedAbility: RoleId | null;
  /** One-use Mezepheles word has been consumed, even if the power was impaired. */
  mezephelesUsed: boolean;
  /** Widow's long-term target. Poison stops when her ability stops. */
  widowTarget: string | null;
  /** Xaan effect triggered at night X and lasts until dusk X. */
  xaanTriggered: number | null;
  /** A Fearmonger success ends the game for their target's team. */
  fearmongerWinner?: "good" | "evil";
  /** Number of observed good executions while Leviathan is in play. */
  leviathanGoodExecutions: number;
  /** Lleech host (one fixed poisoned player); set on N1 and never retargeted. */
  lleechHost: string | null;
  /** Phase in which the poisoned host died; the Lleech dies simultaneously. */
  lleechDiedAt: string | null;
  /** Lleech/Mastermind: when the host dies by execution, the Lleech survives but permanently loses their ability. */
  lleechAbilityLost: boolean;
  /** The seat currently holding Lil' Monsta, registration can change nightly. */
  lilMonstaHolder: string | null;
  /** The true Minion ability of the placeholder Lil' Monsta holder. */
  lilMonstaUnderlyingRole: RoleId | null;
  /** Vigormortis-killed Minions retain their ability and poison a Townsfolk in the chosen direction. */
  vigormortisPoisonDirections: Record<string, -1 | 1>;
  /** Ability currently gained by a direct self Philosopher, after it is used. */
  philosopherAbility: RoleId | null;
  /** Ability the Cannibal is currently mimicking from the most recent player who died by execution. */
  cannibalAbilities: Record<string, RoleId | null>;
  /** Cannibals that ate an evil executee are poisoned until a good player dies by execution. */
  cannibalPoisoned: string[];
  /** Banshees whose Demon-kill trigger successfully fired. */
  bansheeActive: string[];
  /** King-kill confirmations keyed by Choirboy seat and night (for information consistency). */
  choirboyDemonInfo: Record<string, string>;
  /** Lycanthrope's one good player who registers as evil (only for its attack). */
  fauxPaw: string | null;
  pixieAbilities: Record<string, RoleId>;
  /** A permanent drunkenness source distinct from the Drunk character, may survive Puzzlemaster death. */
  puzzlemasterDrunk: string | null;
  /** Ogre chooses an alignment on N1 regardless of impaired state. */
  ogreFriend: string | null;
  /** Granting a Minion ability does not add a Minion player. */
  storytellerMinionAbilities: {when:string; role:RoleId}[];
  /** True when Politician received the Storyteller's end-of-game award. */
  politicianRewarded: boolean;
  /** Effective winner after Heretic inversion, when the game actually ends. */
  effectiveWinner?: Alignment;
  /** The Storyteller selects exactly one drunk Village Idiot when 2-3 are in play. */
  villageIdiotDrunk: string | null;
  /** Minions previously selected by a healthy Preacher (suppression pauses when Preacher impaired/dead). */
  preachedMinions: string[];
  /** The night the evil team learns one another after a healthy Poppy Grower dies. */
  poppyRevealNight: string | null;
  damselGuessed: boolean;
  huntsmanUsed: string[];
  nightwatchmanUsed: string[];
  engineerUsed: string[];
  /** Hidden Barber swap may have occurred at/after these phases. Kept conservative rather than branching every pair. */
  unresolvedBarberFrom: string[];
  requiredPoison: Record<number, string>;
  info: Record<number, InfoDisposition>;
  changes: (
    | { when: string; from: string; to: string; kind: "scarlet" | "starpass" }
    | { when: string; playerId: string; fromRole: RoleId; toRole: RoleId; kind: "riot" }
    | { when: string; playerId: string; fromRole: RoleId; toRole: RoleId; kind: "pit_hag" }
    | { when: string; playerId: string; fromRole: RoleId; toRole: RoleId; kind: "cacklejack" }
    | { when: string; kind: "mezepheles"; playerId: string }
    | { when: string; kind: "hatter"; playerId: string; fromRole: RoleId; toRole: RoleId }
    | { when: string; kind: "snake_charmer"; snake: string; demon: string; demonRole: RoleId }
    | { when: string; kind: "fang_gu"; oldDemon: string; newDemon: string; fromRole: RoleId }
    | { when: string; kind: "engineer" | "farmer" | "huntsman" | "summoner"; playerId: string; fromRole: RoleId; toRole: RoleId }
  )[];
  /** Nights where a newly-created Demon makes deaths mechanically arbitrary. */
  arbitraryDeathNights: number[];
  jinxWinner?: 'good' | 'evil'; jinxPair?: import('./jinxVictory').JinxVictoryPair;
  logScore: number; assumptions: string[]; ended: boolean; endReason?: "fearmonger" | "boomdandy" | "saint" | "mayor" | "demonDeath" | "twoAlive" | "klutz" | "vortox" | "evilTwin" | "summoner" | "alsaahir" | "damsel" | "leviathan" | "jinx";
};
export type SearchOptions = { attempts: number; seed: number; maxMillis: number; beamWidth: number; meta: boolean; worldLimit: number };
export const DEFAULT_SEARCH_OPTIONS: SearchOptions = { attempts: 2400, seed: 71347, maxMillis: 4500, beamWidth: 3, meta: false, worldLimit: 40 };
export type PlayerShare = { evil: number; demon: number; drunk: number; roles: Partial<Record<RoleId, number>>; poison: Record<number, number> };
export type SearchResult = {
  kind: "sample"; checked: number; accepted: number; unique: number; elapsedMs: number;
  exhaustive: false; beamWidth: number; seed: number; meta: boolean;
  effectiveWorlds: number; truncated: boolean;
  players: Record<string, PlayerShare>; presence: Partial<Record<RoleId, number>>;
  info: Record<number, { works: number; registration: number; poison: number; drunk: number; vortox: number; bluff: number; lie: number; missing: number }>;
  worlds: HistoryWorld[];
  /** Normalized search weights aligned with `worlds`. Optional for backward compatibility. */
  worldWeights?: number[];
  /** Seat probabilities CONDITIONAL ON the game being Legion, not across all worlds. */
  legionConditionalSeats?: Record<string,number>;
  /** Poisoned host, conditional on the demon being Lleech. */
  lleechHostConditionalSeats?: Record<string,number>;
  /** Riot team candidates conditional on Riot, separate from ordinary good/evil percentages. */
  riotConditionalSeats?: Record<string,number>;
  /** Puzzlemaster's unique fixed drunk, conditional on that character in sampled worlds. */
  puzzlemasterDrunkConditionalSeats?: Record<string,number>;
  examples: Record<string, {good?:HistoryWorld;evil?:HistoryWorld}>; issues: Reason[];
};
