export type RoleId =
  | "washerwoman"
  | "librarian"
  | "investigator"
  | "chef"
  | "empath"
  | "fortune_teller"
  | "undertaker"
  | "monk"
  | "ravenkeeper"
  | "virgin"
  | "slayer"
  | "soldier"
  | "mayor"
  | "butler"
  | "drunk"
  | "recluse"
  | "saint"
  | "poisoner"
  | "spy"
  | "scarlet_woman"
  | "baron"
  | "imp"
  | "grandmother"
  | "sailor"
  | "chambermaid"
  | "exorcist"
  | "innkeeper"
  | "gambler"
  | "gossip"
  | "courtier"
  | "professor"
  | "minstrel"
  | "tea_lady"
  | "pacifist"
  | "fool"
  | "goon"
  | "lunatic"
  | "tinker"
  | "moonchild"
  | "godfather"
  | "devils_advocate"
  | "assassin"
  | "mastermind"
  | "zombuul"
  | "pukka"
  | "shabaloth"
  | "po"
  | "clockmaker"
  | "dreamer"
  | "snake_charmer"
  | "mathematician"
  | "flowergirl"
  | "town_crier"
  | "oracle"
  | "savant"
  | "seamstress"
  | "philosopher"
  | "artist"
  | "juggler"
  | "sage"
  | "mutant"
  | "sweetheart"
  | "barber"
  | "klutz"
  | "evil_twin"
  | "witch"
  | "cerenovus"
  | "pit_hag"
  | "fang_gu"
  | "vigormortis"
  | "no_dashii"
  | "vortox"
  | "goblin"
  | "acrobat"
  | "alchemist"
  | "alsaahir"
  | "amnesiac"
  | "balloonist"
  | "banshee"
  | "bounty_hunter"
  | "cannibal"
  | "choirboy"
  | "king"
  | "engineer"
  | "farmer"
  | "fisherman"
  | "general"
  | "high_priestess"
  | "huntsman" | "knight" | "lycanthrope" | "magician" | "nightwatchman" | "noble" | "pixie" | "damsel"
  | "poppy_grower" | "preacher" | "princess" | "shugenja" | "steward" | "village_idiot"
  | "lord_of_typhon" | "kazali" | "legion" | "leviathan"
  | "lil_monsta" | "lleech" | "al_hadikhia" | "ojo" | "riot" | "yaggababble"
  | "boffin" | "boomdandy" | "fearmonger" | "harpy" | "marionette"
  | "mezepheles" | "organ_grinder" | "psychopath" | "summoner" | "widow" | "wizard" | "wraith" | "xaan"
  | "golem" | "hatter" | "heretic" | "hermit" | "ogre" | "plague_doctor" | "politician" | "puzzlemaster" | "snitch" | "zealot";

export type RoleType = "townsfolk" | "outsider" | "minion" | "demon";

export type RoleTag =
  // Information / claim categories
  | "INFO_SOURCE"
  | "FIRST_NIGHT_INFO"
  | "CONTINUOUS_INFO"
  | "NIGHT_INFORMATION"
  | "NIGHT_ABILITY"
  | "DAY_INFORMATION"
  | "LACK_OF_INFO"

  // Night waking
  | "WAKES_FIRST_NIGHT"
  | "WAKES_OTHER_NIGHTS"
  | "CONDITIONAL_NIGHT_WAKE"

  // Ability timing / triggers
  | "ONE_TIME_ABILITY"
  | "DAY_ABILITY"
  | "PASSIVE"
  | "ON_NIGHT_DEATH"
  | "ON_EXECUTION"
  | "ON_NOMINATION"
  | "ON_DEATH"
  | "ON_DEMON_EXECUTION"

  // Targeting / effects
  | "TARGETS_PLAYER"
  | "TARGETS_CHARACTER"
  | "PREVENTS_DEATH"
  | "PREVENTS_EXECUTION_DEATH"
  | "KILLS"
  | "CAUSES_OWN_DEATH"
  | "BYPASSES_DEATH_PREVENTION"
  | "REVIVES"
  | "POISON_DRUNK_ABILITY"

  // Strategic claim categories
  | "HIGH_SURVIVAL_VALUE"
  | "WANTS_DEMON_TARGET"
  | "AVOIDS_DEMON_TARGET"
  | "AVOIDS_EXECUTION"
  | "OUTSIDER_EARLY_CLAIM"
  | "OUTSIDER_HIDDEN_CLAIM"

  // Special mechanics
  | "REGISTRATION_CHANGING"
  | "SECRET_INFORMATION_ACCESS"
  | "ROLE_HIDDEN_FROM_SELF"
  | "THINKS_TOWNSFOLK"
  | "THINKS_OUTSIDER"
  | "THINKS_MINION"
  | "THINKS_DEMON"
  | "VOTE_RESTRICTED"
  | "SETUP_EFFECT"
  | "OUTSIDER_COUNT_MODIFIER"
  | "DEMON_CHANGE"
  | "ALIGNMENT_CHANGING"
  | "ROLE_CHANGING"
  | "EVIL_TOWNSFOLK_SETUP"
  | "DEMON_KILL_TRIGGER"
  | "DOUBLE_NOMINATION_AFTER_DEMON_KILL"
  | "DOUBLE_VOTE_AFTER_DEMON_KILL"
  | "GAINS_EXECUTEE_ABILITY"
  | "GRANTS_DEMON_GOOD_ABILITY" | "EXPLODES_ON_EXECUTION" | "FEARMONGER_TARGET" | "HARPY_MADNESS"
  | "SECRET_WORD_ALIGNMENT" | "HIDDEN_VOTING" | "PUBLIC_DAY_KILL" | "NO_DEMON_SETUP" | "GRIMOIRE_ONCE" | "WISH_ABILITY" | "NIGHT_PEEK" | "GLOBAL_TOWNSFOLK_POISON"
  | "GAME_CONTINUATION"
  | "EXECUTION_LOSS"
  | "ALTERNATE_WIN_CONDITION"

  | "STORYTELLER_JUDGEMENT"
  | "CREATES_FARMER"
  | "DEMON_KNOWS_IDENTITY"
  | "CREATES_DAMSEL" | "MINION_DAMSEL_GUESS" | "MISDIRECTS_EVIL_TEAM" | "SUPPRESSES_DEMON_KILL" | "MADNESS_ABILITY_INHERITANCE"

  // Confirmation
  | "HIDES_EVIL_TEAM" | "DISABLES_MINION_ABILITY" | "BLOCKS_DEMON_KILL" | "DUPLICATE_TOWNSFOLK"
  | "FORCED_VOTE" | "DRUNKS_PLAYER" | "OUTSIDER_COMBINED_ABILITIES" | "STORYTELLER_MINION_ABILITY" | "OUTSIDER_EARNS_EVIL_WIN" | "REVERSES_WINNER" | "EVIL_ROLE_CHANGE"
  | "HIGH_CONFIRMABILITY"
  | "CONDITIONAL_CONFIRMABILITY"
  | "EXTRA_MINION_SETUP" | "EVIL_LINE_SETUP" | "DEMON_CHOOSES_MINIONS"
  | "MANY_DEMONS" | "PUBLIC_DEMON_ANNOUNCEMENT" | "LIMITED_EXECUTIONS";

export type NightSpeed = {
  first: number | null;
  other: number | null;
};

export type Role = {
  id: RoleId;
  symbol: string;
  name: string;
  type: RoleType;
  tags: RoleTag[];
  nightSpeed: NightSpeed;
  /** full = mechanically modelled by the current solver; generic = script/world support only. */
  solverSupport: "full" | "generic";
  /** Maximum number of players this Demon can kill in one night from its own ability. */
  maxKillsPerNight?: number;
  /** Setup-only Outsider delta for roles tagged OUTSIDER_COUNT_MODIFIER. Positive adds Outsiders; negative removes them. */
  outsiderCountDelta?: number;
  /** Setup-only optional Outsider deltas. Used when the Storyteller may choose among multiple legal setup counts. */
  outsiderCountOptions?: number[];
};

/*
 * SPEED BANDS
 *
 * 10000s = Game-start / alignment effects
 *  9000s = Poison / drunk effects
 *  8000s = Protection effects
 *  7000s = Non-killing Minion effects
 *  6000s = Demon effects
 *  5000s = Non-Demon killing effects
 *  4000s = Reactive / response effects
 *  3000s = Information effects
 *  2000s = Reserved
 *  1000s = Slow / maintenance effects
 *
 * Higher speed resolves first.
 * A non-null speed does not automatically mean a player wakes every night;
 * the WAKES_* / CONDITIONAL_NIGHT_WAKE tags describe that separately.
 */

export const ROLES: Record<RoleId, Role> = {
  washerwoman: {
    id: "washerwoman",
    symbol: "洗",
    name: "洗濯婦",
    type: "townsfolk",
    tags: [
      "INFO_SOURCE",
      "FIRST_NIGHT_INFO",
      "WAKES_FIRST_NIGHT",
      "HIGH_CONFIRMABILITY",
    ],
    nightSpeed: { first: 3900, other: null },
    solverSupport: "full",
  },

  librarian: {
    id: "librarian",
    symbol: "図",
    name: "司書",
    type: "townsfolk",
    tags: ["INFO_SOURCE", "FIRST_NIGHT_INFO", "WAKES_FIRST_NIGHT"],
    nightSpeed: { first: 3800, other: null },
    solverSupport: "full",
  },

  investigator: {
    id: "investigator",
    symbol: "探",
    name: "捜査官",
    type: "townsfolk",
    tags: ["INFO_SOURCE", "FIRST_NIGHT_INFO", "WAKES_FIRST_NIGHT"],
    nightSpeed: { first: 3700, other: null },
    solverSupport: "full",
  },

  chef: {
    id: "chef",
    symbol: "料",
    name: "料理人",
    type: "townsfolk",
    tags: ["INFO_SOURCE", "FIRST_NIGHT_INFO", "WAKES_FIRST_NIGHT"],
    nightSpeed: { first: 3600, other: null },
    solverSupport: "full",
  },

  empath: {
    id: "empath",
    symbol: "感",
    name: "共感者",
    type: "townsfolk",
    tags: [
      "INFO_SOURCE",
      "CONTINUOUS_INFO",
      "WAKES_FIRST_NIGHT",
      "WAKES_OTHER_NIGHTS",
      "HIGH_SURVIVAL_VALUE",
    ],
    nightSpeed: { first: 3400, other: 3400 },
    solverSupport: "full",
  },

  fortune_teller: {
    id: "fortune_teller",
    symbol: "占",
    name: "占い師",
    type: "townsfolk",
    tags: [
      "INFO_SOURCE",
      "CONTINUOUS_INFO",
      "WAKES_FIRST_NIGHT",
      "WAKES_OTHER_NIGHTS",
      "TARGETS_PLAYER",
      "HIGH_SURVIVAL_VALUE",
    ],
    nightSpeed: { first: 3300, other: 3300 },
    solverSupport: "full",
  },

  undertaker: {
    id: "undertaker",
    symbol: "墓",
    name: "葬儀屋",
    type: "townsfolk",
    tags: [
      "INFO_SOURCE",
      "CONTINUOUS_INFO",
      "WAKES_OTHER_NIGHTS",
      "HIGH_SURVIVAL_VALUE",
    ],
    nightSpeed: { first: null, other: 3500 },
    solverSupport: "full",
  },

  monk: {
    id: "monk",
    symbol: "僧",
    name: "僧侶",
    type: "townsfolk",
    tags: [
      "LACK_OF_INFO",
      "WAKES_OTHER_NIGHTS",
      "TARGETS_PLAYER",
      "PREVENTS_DEATH",
      "HIGH_SURVIVAL_VALUE",
      "AVOIDS_DEMON_TARGET",
    ],
    nightSpeed: { first: null, other: 8900 },
    solverSupport: "full",
  },

  ravenkeeper: {
    id: "ravenkeeper",
    symbol: "烏",
    name: "鴉飼い",
    type: "townsfolk",
    tags: [
      "INFO_SOURCE",
      "ONE_TIME_ABILITY",
      "CONDITIONAL_NIGHT_WAKE",
      "ON_NIGHT_DEATH",
      "TARGETS_PLAYER",
      "WANTS_DEMON_TARGET",
    ],
    nightSpeed: { first: null, other: 4800 },
    solverSupport: "full",
  },

  virgin: {
    id: "virgin",
    symbol: "生",
    name: "処女",
    type: "townsfolk",
    tags: [
      "LACK_OF_INFO",
      "PASSIVE",
      "ONE_TIME_ABILITY",
      "ON_NOMINATION",
      "CONDITIONAL_CONFIRMABILITY",
    ],
    nightSpeed: { first: null, other: null },
    solverSupport: "full",
  },

  slayer: {
    id: "slayer",
    symbol: "殺",
    name: "処刑人",
    type: "townsfolk",
    tags: [
      "LACK_OF_INFO",
      "DAY_ABILITY",
      "ONE_TIME_ABILITY",
      "TARGETS_PLAYER",
      "KILLS",
      "CONDITIONAL_CONFIRMABILITY",
    ],
    nightSpeed: { first: null, other: null },
    solverSupport: "full",
  },

  soldier: {
    id: "soldier",
    symbol: "兵",
    name: "兵士",
    type: "townsfolk",
    tags: ["LACK_OF_INFO", "PASSIVE", "PREVENTS_DEATH", "WANTS_DEMON_TARGET"],
    nightSpeed: { first: null, other: null },
    solverSupport: "full",
  },

  mayor: {
    id: "mayor",
    symbol: "市",
    name: "市長",
    type: "townsfolk",
    tags: [
      "LACK_OF_INFO",
      "PASSIVE",
      "HIGH_SURVIVAL_VALUE",
      "AVOIDS_DEMON_TARGET",
      "AVOIDS_EXECUTION",
      "ALTERNATE_WIN_CONDITION",
    ],
    nightSpeed: { first: null, other: null },
    solverSupport: "full",
  },

  butler: {
    id: "butler",
    symbol: "召",
    name: "執事",
    type: "outsider",
    tags: [
      "LACK_OF_INFO",
      "OUTSIDER_EARLY_CLAIM",
      "WAKES_FIRST_NIGHT",
      "WAKES_OTHER_NIGHTS",
      "TARGETS_PLAYER",
      "VOTE_RESTRICTED",
    ],
    nightSpeed: { first: 1900, other: 1900 },
    solverSupport: "full",
  },

  drunk: {
    id: "drunk",
    symbol: "酒",
    name: "酔っ払い",
    type: "outsider",
    tags: ["LACK_OF_INFO", "ROLE_HIDDEN_FROM_SELF", "THINKS_TOWNSFOLK", "OUTSIDER_EARLY_CLAIM"],
    nightSpeed: { first: null, other: null },
    solverSupport: "full",
  },

  recluse: {
    id: "recluse",
    symbol: "篭",
    name: "隠者",
    type: "outsider",
    tags: ["LACK_OF_INFO", "PASSIVE", "REGISTRATION_CHANGING", "OUTSIDER_EARLY_CLAIM"],
    nightSpeed: { first: null, other: null },
    solverSupport: "full",
  },

  saint: {
    id: "saint",
    symbol: "聖",
    name: "聖人",
    type: "outsider",
    tags: [
      "LACK_OF_INFO",
      "PASSIVE",
      "ON_EXECUTION",
      "EXECUTION_LOSS",
      "ALTERNATE_WIN_CONDITION",
      "AVOIDS_EXECUTION",
      "OUTSIDER_HIDDEN_CLAIM",
    ],
    nightSpeed: { first: null, other: null },
    solverSupport: "full",
  },

  poisoner: {
    id: "poisoner",
    symbol: "毒",
    name: "毒殺者",
    type: "minion",
    tags: [
      "LACK_OF_INFO",
      "WAKES_FIRST_NIGHT",
      "WAKES_OTHER_NIGHTS",
      "TARGETS_PLAYER",
      "POISON_DRUNK_ABILITY",
    ],
    nightSpeed: { first: 9900, other: 9900 },
    solverSupport: "full",
  },

  spy: {
    id: "spy",
    symbol: "密",
    name: "スパイ",
    type: "minion",
    tags: [
      "WAKES_FIRST_NIGHT",
      "WAKES_OTHER_NIGHTS",
      "REGISTRATION_CHANGING",
      "SECRET_INFORMATION_ACCESS",
    ],
    nightSpeed: { first: 7900, other: 7900 },
    solverSupport: "full",
  },

  scarlet_woman: {
    id: "scarlet_woman",
    symbol: "紅",
    name: "緋色の女",
    type: "minion",
    tags: [
      "LACK_OF_INFO",
      "PASSIVE",
      "CONDITIONAL_NIGHT_WAKE",
      "DEMON_CHANGE",
    ],
    nightSpeed: { first: null, other: 4900 },
    solverSupport: "full",
  },

  baron: {
    id: "baron",
    symbol: "爵",
    name: "男爵",
    type: "minion",
    tags: ["LACK_OF_INFO", "SETUP_EFFECT", "OUTSIDER_COUNT_MODIFIER"],
    nightSpeed: { first: null, other: null },
    solverSupport: "full",
    outsiderCountDelta: 2,
  },

  imp: {
    id: "imp",
    symbol: "戯",
    name: "インプ",
    type: "demon",
    tags: [
      "LACK_OF_INFO",
      "WAKES_OTHER_NIGHTS",
      "TARGETS_PLAYER",
      "KILLS",
      "DEMON_CHANGE",
    ],
    nightSpeed: { first: null, other: 6900 },
    solverSupport: "full",
    maxKillsPerNight: 1,
  },
  grandmother: {
    id: "grandmother",
    symbol: "祖",
    name: "祖母",
    type: "townsfolk",
    tags: [
      "INFO_SOURCE",
      "FIRST_NIGHT_INFO",
      "WAKES_FIRST_NIGHT",
      "KILLS",
      "CAUSES_OWN_DEATH",
    ],
    nightSpeed: { first: null, other: null },
    solverSupport: "generic",
  },
  sailor: {
    id: "sailor",
    symbol: "船",
    name: "船乗り",
    type: "townsfolk",
    tags: [
      "LACK_OF_INFO",
      "WAKES_FIRST_NIGHT",
      "WAKES_OTHER_NIGHTS",
      "TARGETS_PLAYER",
      "PREVENTS_DEATH",
      "PREVENTS_EXECUTION_DEATH",
      "POISON_DRUNK_ABILITY",
    ],
    nightSpeed: { first: null, other: null },
    solverSupport: "generic",
  },
  chambermaid: {
    id: "chambermaid",
    symbol: "婢",
    name: "侍女",
    type: "townsfolk",
    tags: [
      "INFO_SOURCE",
      "CONTINUOUS_INFO",
      "WAKES_FIRST_NIGHT",
      "WAKES_OTHER_NIGHTS",
      "TARGETS_PLAYER",
    ],
    nightSpeed: { first: null, other: null },
    solverSupport: "generic",
  },
  exorcist: {
    id: "exorcist",
    symbol: "祓",
    name: "祓魔師",
    type: "townsfolk",
    tags: [
      "LACK_OF_INFO",
      "WAKES_OTHER_NIGHTS",
      "TARGETS_PLAYER",
      "PREVENTS_DEATH",
    ],
    nightSpeed: { first: null, other: null },
    solverSupport: "generic",
  },
  innkeeper: {
    id: "innkeeper",
    symbol: "宿",
    name: "宿屋の主人",
    type: "townsfolk",
    tags: [
      "LACK_OF_INFO",
      "WAKES_OTHER_NIGHTS",
      "TARGETS_PLAYER",
      "PREVENTS_DEATH",
      "POISON_DRUNK_ABILITY",
    ],
    nightSpeed: { first: null, other: null },
    solverSupport: "generic",
  },
  gambler: {
    id: "gambler",
    symbol: "賭",
    name: "賭博師",
    type: "townsfolk",
    tags: [
      "LACK_OF_INFO",
      "WAKES_OTHER_NIGHTS",
      "TARGETS_PLAYER",
      "TARGETS_CHARACTER",
      "KILLS",
      "CAUSES_OWN_DEATH",
      "CONDITIONAL_CONFIRMABILITY",
    ],
    nightSpeed: { first: null, other: null },
    solverSupport: "generic",
  },
  gossip: {
    id: "gossip",
    symbol: "噂",
    name: "噂好き",
    type: "townsfolk",
    tags: ["LACK_OF_INFO", "DAY_ABILITY", "KILLS"],
    nightSpeed: { first: null, other: null },
    solverSupport: "generic",
  },
  courtier: {
    id: "courtier",
    symbol: "廷",
    name: "廷臣",
    type: "townsfolk",
    tags: [
      "LACK_OF_INFO",
      "ONE_TIME_ABILITY",
      "WAKES_FIRST_NIGHT",
      "WAKES_OTHER_NIGHTS",
      "TARGETS_CHARACTER",
      "POISON_DRUNK_ABILITY",
    ],
    nightSpeed: { first: null, other: null },
    solverSupport: "generic",
  },
  professor: {
    id: "professor",
    symbol: "教",
    name: "教授",
    type: "townsfolk",
    tags: [
      "LACK_OF_INFO",
      "ONE_TIME_ABILITY",
      "WAKES_OTHER_NIGHTS",
      "TARGETS_PLAYER",
      "REVIVES",
    ],
    nightSpeed: { first: null, other: null },
    solverSupport: "generic",
  },
  minstrel: {
    id: "minstrel",
    symbol: "吟",
    name: "吟遊詩人",
    type: "townsfolk",
    tags: ["LACK_OF_INFO", "PASSIVE", "POISON_DRUNK_ABILITY"],
    nightSpeed: { first: null, other: null },
    solverSupport: "generic",
  },
  tea_lady: {
    id: "tea_lady",
    symbol: "茶",
    name: "茶店の女主人",
    type: "townsfolk",
    tags: ["LACK_OF_INFO", "PASSIVE", "PREVENTS_DEATH", "PREVENTS_EXECUTION_DEATH"],
    nightSpeed: { first: null, other: null },
    solverSupport: "generic",
  },
  pacifist: {
    id: "pacifist",
    symbol: "和",
    name: "平和主義者",
    type: "townsfolk",
    tags: ["LACK_OF_INFO", "PASSIVE", "PREVENTS_EXECUTION_DEATH"],
    nightSpeed: { first: null, other: null },
    solverSupport: "generic",
  },
  fool: {
    id: "fool",
    symbol: "愚",
    name: "道化師",
    type: "townsfolk",
    tags: ["LACK_OF_INFO", "PASSIVE", "ONE_TIME_ABILITY", "PREVENTS_DEATH", "PREVENTS_EXECUTION_DEATH"],
    nightSpeed: { first: null, other: null },
    solverSupport: "generic",
  },
  goon: {
    id: "goon",
    symbol: "暴",
    name: "用心棒",
    type: "outsider",
    tags: [
      "LACK_OF_INFO",
      "PASSIVE",
      "CONDITIONAL_NIGHT_WAKE",
      "POISON_DRUNK_ABILITY",
      "ALIGNMENT_CHANGING",
    ],
    nightSpeed: { first: null, other: null },
    solverSupport: "generic",
  },
  lunatic: {
    id: "lunatic",
    symbol: "狂",
    name: "狂人",
    type: "outsider",
    tags: [
      "ROLE_HIDDEN_FROM_SELF",
      "THINKS_DEMON",
      "WAKES_FIRST_NIGHT",
      "WAKES_OTHER_NIGHTS",
      "TARGETS_PLAYER",
      "OUTSIDER_HIDDEN_CLAIM",
    ],
    nightSpeed: { first: null, other: null },
    solverSupport: "generic",
  },
  tinker: {
    id: "tinker",
    symbol: "工",
    name: "修理屋",
    type: "outsider",
    tags: ["LACK_OF_INFO", "PASSIVE", "KILLS", "CAUSES_OWN_DEATH", "OUTSIDER_EARLY_CLAIM"],
    nightSpeed: { first: null, other: null },
    solverSupport: "generic",
  },
  moonchild: {
    id: "moonchild",
    symbol: "月",
    name: "月の子",
    type: "outsider",
    tags: ["LACK_OF_INFO", "ON_DEATH", "TARGETS_PLAYER", "KILLS"],
    nightSpeed: { first: null, other: null },
    solverSupport: "generic",
  },
  godfather: {
    id: "godfather",
    symbol: "父",
    name: "親分",
    type: "minion",
    tags: [
      "INFO_SOURCE",
      "FIRST_NIGHT_INFO",
      "WAKES_FIRST_NIGHT",
      "CONDITIONAL_NIGHT_WAKE",
      "TARGETS_PLAYER",
      "KILLS",
      "SETUP_EFFECT",
      "OUTSIDER_COUNT_MODIFIER",
    ],
    outsiderCountOptions: [-1, 1],
    nightSpeed: { first: null, other: null },
    solverSupport: "generic",
  },
  devils_advocate: {
    id: "devils_advocate",
    symbol: "弁",
    name: "悪魔の代弁者",
    type: "minion",
    tags: [
      "LACK_OF_INFO",
      "WAKES_FIRST_NIGHT",
      "WAKES_OTHER_NIGHTS",
      "TARGETS_PLAYER",
      "PREVENTS_EXECUTION_DEATH",
    ],
    nightSpeed: { first: null, other: null },
    solverSupport: "generic",
  },
  assassin: {
    id: "assassin",
    symbol: "暗",
    name: "暗殺者",
    type: "minion",
    tags: [
      "LACK_OF_INFO",
      "ONE_TIME_ABILITY",
      "WAKES_OTHER_NIGHTS",
      "TARGETS_PLAYER",
      "KILLS",
      "BYPASSES_DEATH_PREVENTION",
    ],
    nightSpeed: { first: null, other: null },
    solverSupport: "generic",
  },
  mastermind: {
    id: "mastermind",
    symbol: "策",
    name: "策士",
    type: "minion",
    tags: [
      "LACK_OF_INFO",
      "PASSIVE",
      "ON_DEMON_EXECUTION",
      "GAME_CONTINUATION",
      "ALTERNATE_WIN_CONDITION",
    ],
    nightSpeed: { first: null, other: null },
    solverSupport: "generic",
  },
  zombuul: {
    id: "zombuul",
    symbol: "屍",
    name: "ゾンブール",
    type: "demon",
    tags: [
      "LACK_OF_INFO",
      "CONDITIONAL_NIGHT_WAKE",
      "TARGETS_PLAYER",
      "KILLS",
      "PREVENTS_DEATH",
      "REGISTRATION_CHANGING",
    ],
    nightSpeed: { first: null, other: null },
    solverSupport: "generic",
    maxKillsPerNight: 1,
  },
  pukka: {
    id: "pukka",
    symbol: "病",
    name: "プッカ",
    type: "demon",
    tags: [
      "LACK_OF_INFO",
      "WAKES_FIRST_NIGHT",
      "WAKES_OTHER_NIGHTS",
      "TARGETS_PLAYER",
      "KILLS",
      "POISON_DRUNK_ABILITY",
    ],
    nightSpeed: { first: null, other: null },
    solverSupport: "generic",
    maxKillsPerNight: 1,
  },
  shabaloth: {
    id: "shabaloth",
    symbol: "喰",
    name: "シャバロス",
    type: "demon",
    tags: [
      "LACK_OF_INFO",
      "WAKES_OTHER_NIGHTS",
      "TARGETS_PLAYER",
      "KILLS",
      "REVIVES",
    ],
    nightSpeed: { first: null, other: null },
    solverSupport: "generic",
    maxKillsPerNight: 2,
  },
  po: {
    id: "po",
    symbol: "爆",
    name: "ポー",
    type: "demon",
    tags: ["LACK_OF_INFO", "WAKES_OTHER_NIGHTS", "TARGETS_PLAYER", "KILLS"],
    nightSpeed: { first: null, other: null },
    solverSupport: "generic",
    maxKillsPerNight: 3,
  },
  clockmaker: {
    id: "clockmaker",
    symbol: "時",
    name: "時計師",
    type: "townsfolk",
    tags: ["INFO_SOURCE", "FIRST_NIGHT_INFO", "WAKES_FIRST_NIGHT", "HIGH_CONFIRMABILITY"],
    nightSpeed: { first: 3950, other: null },
    solverSupport: "full",
  },
  dreamer: {
    id: "dreamer",
    symbol: "夢",
    name: "夢見人",
    type: "townsfolk",
    tags: ["INFO_SOURCE", "CONTINUOUS_INFO", "WAKES_FIRST_NIGHT", "WAKES_OTHER_NIGHTS", "TARGETS_PLAYER", "HIGH_SURVIVAL_VALUE"],
    nightSpeed: { first: 3500, other: 3500 },
    solverSupport: "full",
  },
  snake_charmer: {
    id: "snake_charmer",
    symbol: "蛇",
    name: "蛇使い",
    type: "townsfolk",
    tags: ["WAKES_FIRST_NIGHT", "WAKES_OTHER_NIGHTS", "TARGETS_PLAYER", "ROLE_CHANGING", "ALIGNMENT_CHANGING", "POISON_DRUNK_ABILITY"],
    nightSpeed: { first: 9050, other: 9050 },
    solverSupport: "full",
  },
  mathematician: {
    id: "mathematician",
    symbol: "数",
    name: "数学者",
    type: "townsfolk",
    tags: ["INFO_SOURCE", "CONTINUOUS_INFO", "WAKES_FIRST_NIGHT", "WAKES_OTHER_NIGHTS"],
    nightSpeed: { first: 3000, other: 3000 },
    solverSupport: "full",
  },
  flowergirl: {
    id: "flowergirl",
    symbol: "花",
    name: "花売り娘",
    type: "townsfolk",
    tags: ["INFO_SOURCE", "CONTINUOUS_INFO", "WAKES_OTHER_NIGHTS", "HIGH_SURVIVAL_VALUE"],
    nightSpeed: { first: null, other: 3200 },
    solverSupport: "full",
  },
  town_crier: {
    id: "town_crier",
    symbol: "告",
    name: "触れ役",
    type: "townsfolk",
    tags: ["INFO_SOURCE", "CONTINUOUS_INFO", "WAKES_OTHER_NIGHTS", "HIGH_SURVIVAL_VALUE"],
    nightSpeed: { first: null, other: 3100 },
    solverSupport: "full",
  },
  oracle: {
    id: "oracle",
    symbol: "神",
    name: "神託者",
    type: "townsfolk",
    tags: ["INFO_SOURCE", "CONTINUOUS_INFO", "WAKES_OTHER_NIGHTS", "HIGH_SURVIVAL_VALUE"],
    nightSpeed: { first: null, other: 3000 },
    solverSupport: "full",
  },
  savant: {
    id: "savant",
    symbol: "賢",
    name: "博学者",
    type: "townsfolk",
    tags: ["INFO_SOURCE", "CONTINUOUS_INFO", "DAY_ABILITY", "HIGH_SURVIVAL_VALUE"],
    nightSpeed: { first: null, other: null },
    solverSupport: "full",
  },
  seamstress: {
    id: "seamstress",
    symbol: "縫",
    name: "裁縫師",
    type: "townsfolk",
    tags: ["INFO_SOURCE", "ONE_TIME_ABILITY", "WAKES_FIRST_NIGHT", "WAKES_OTHER_NIGHTS", "TARGETS_PLAYER", "CONDITIONAL_CONFIRMABILITY"],
    nightSpeed: { first: 3050, other: 3050 },
    solverSupport: "full",
  },
  philosopher: {
    id: "philosopher",
    symbol: "哲",
    name: "哲学者",
    type: "townsfolk",
    tags: ["ONE_TIME_ABILITY", "WAKES_FIRST_NIGHT", "WAKES_OTHER_NIGHTS", "TARGETS_CHARACTER", "POISON_DRUNK_ABILITY", "HIGH_SURVIVAL_VALUE"],
    nightSpeed: { first: 9300, other: 9300 },
    solverSupport: "full",
  },
  artist: {
    id: "artist",
    symbol: "芸",
    name: "芸術家",
    type: "townsfolk",
    tags: ["INFO_SOURCE", "ONE_TIME_ABILITY", "DAY_ABILITY", "HIGH_SURVIVAL_VALUE"],
    nightSpeed: { first: null, other: null },
    solverSupport: "full",
  },
  juggler: {
    id: "juggler",
    symbol: "曲",
    name: "曲芸師",
    type: "townsfolk",
    tags: ["INFO_SOURCE", "ONE_TIME_ABILITY", "DAY_ABILITY", "CONDITIONAL_NIGHT_WAKE", "HIGH_CONFIRMABILITY"],
    nightSpeed: { first: null, other: 2950 },
    solverSupport: "full",
  },
  sage: {
    id: "sage",
    symbol: "慧",
    name: "賢人",
    type: "townsfolk",
    tags: ["INFO_SOURCE", "ONE_TIME_ABILITY", "CONDITIONAL_NIGHT_WAKE", "ON_NIGHT_DEATH", "WANTS_DEMON_TARGET", "CONDITIONAL_CONFIRMABILITY"],
    nightSpeed: { first: null, other: 4100 },
    solverSupport: "full",
  },
  mutant: {
    id: "mutant",
    symbol: "変",
    name: "突然変異者",
    type: "outsider",
    tags: ["PASSIVE", "CAUSES_OWN_DEATH", "CONDITIONAL_CONFIRMABILITY", "OUTSIDER_HIDDEN_CLAIM"],
    nightSpeed: { first: null, other: null },
    solverSupport: "full",
  },
  sweetheart: {
    id: "sweetheart",
    symbol: "恋",
    name: "恋人",
    type: "outsider",
    tags: ["PASSIVE", "ON_DEATH", "POISON_DRUNK_ABILITY", "AVOIDS_DEMON_TARGET"],
    nightSpeed: { first: null, other: null },
    solverSupport: "full",
  },
  barber: {
    id: "barber",
    symbol: "髪",
    name: "床屋",
    type: "outsider",
    tags: ["PASSIVE", "ON_DEATH", "ROLE_CHANGING", "DEMON_CHANGE", "AVOIDS_DEMON_TARGET"],
    nightSpeed: { first: null, other: null },
    solverSupport: "full",
  },
  klutz: {
    id: "klutz",
    symbol: "鈍",
    name: "不器用者",
    type: "outsider",
    tags: ["PASSIVE", "ON_DEATH", "ALTERNATE_WIN_CONDITION", "AVOIDS_DEMON_TARGET", "CONDITIONAL_CONFIRMABILITY"],
    nightSpeed: { first: null, other: null },
    solverSupport: "full",
  },
  evil_twin: {
    id: "evil_twin",
    symbol: "双",
    name: "悪の双子",
    type: "minion",
    tags: ["WAKES_FIRST_NIGHT", "ALTERNATE_WIN_CONDITION", "CONDITIONAL_CONFIRMABILITY"],
    nightSpeed: { first: 7450, other: null },
    solverSupport: "full",
  },
  witch: {
    id: "witch",
    symbol: "魔",
    name: "魔女",
    type: "minion",
    tags: ["WAKES_FIRST_NIGHT", "WAKES_OTHER_NIGHTS", "TARGETS_PLAYER", "KILLS", "CONDITIONAL_CONFIRMABILITY"],
    nightSpeed: { first: 7350, other: 7350 },
    solverSupport: "full",
  },
  cerenovus: {
    id: "cerenovus",
    symbol: "脳",
    name: "セレノヴス",
    type: "minion",
    tags: ["WAKES_FIRST_NIGHT", "WAKES_OTHER_NIGHTS", "TARGETS_PLAYER", "TARGETS_CHARACTER", "CONDITIONAL_CONFIRMABILITY"],
    nightSpeed: { first: 7500, other: 7500 },
    solverSupport: "full",
  },
  pit_hag: {
    id: "pit_hag",
    symbol: "釜",
    name: "穴の老婆",
    type: "minion",
    tags: ["WAKES_OTHER_NIGHTS", "TARGETS_PLAYER", "TARGETS_CHARACTER", "ROLE_CHANGING"],
    nightSpeed: { first: null, other: 7600 },
    solverSupport: "full",
  },
  fang_gu: {
    id: "fang_gu",
    symbol: "牙",
    name: "ファン・グー",
    type: "demon",
    tags: ["LACK_OF_INFO", "WAKES_OTHER_NIGHTS", "TARGETS_PLAYER", "KILLS", "DEMON_CHANGE", "ROLE_CHANGING", "ALIGNMENT_CHANGING", "SETUP_EFFECT", "OUTSIDER_COUNT_MODIFIER"],
    nightSpeed: { first: null, other: 6700 },
    solverSupport: "full",
    maxKillsPerNight: 1,
    outsiderCountDelta: 1,
  },
  vigormortis: {
    id: "vigormortis",
    symbol: "死",
    name: "ヴィゴモルティス",
    type: "demon",
    tags: ["LACK_OF_INFO", "WAKES_OTHER_NIGHTS", "TARGETS_PLAYER", "KILLS", "POISON_DRUNK_ABILITY", "SETUP_EFFECT", "OUTSIDER_COUNT_MODIFIER"],
    nightSpeed: { first: null, other: 6600 },
    solverSupport: "full",
    maxKillsPerNight: 1,
    outsiderCountDelta: -1,
  },
  no_dashii: {
    id: "no_dashii",
    symbol: "触",
    name: "ノー・ダシイ",
    type: "demon",
    tags: ["LACK_OF_INFO", "WAKES_OTHER_NIGHTS", "TARGETS_PLAYER", "KILLS", "POISON_DRUNK_ABILITY"],
    nightSpeed: { first: null, other: 6500 },
    solverSupport: "full",
    maxKillsPerNight: 1,
  },
  vortox: {
    id: "vortox",
    symbol: "渦",
    name: "ヴォートックス",
    type: "demon",
    tags: ["LACK_OF_INFO", "WAKES_OTHER_NIGHTS", "TARGETS_PLAYER", "KILLS", "ALTERNATE_WIN_CONDITION"],
    nightSpeed: { first: null, other: 6400 },
    solverSupport: "full",
    maxKillsPerNight: 1,
  },
  lord_of_typhon: { id:"lord_of_typhon", symbol:"卿", name:"タイフォン卿", type:"demon",
    tags:["SETUP_EFFECT","EXTRA_MINION_SETUP","EVIL_LINE_SETUP","OUTSIDER_COUNT_MODIFIER","WAKES_OTHER_NIGHTS","TARGETS_PLAYER","KILLS"],
    nightSpeed:{first:null,other:6550},solverSupport:"full",maxKillsPerNight:1 },
  kazali: { id:"kazali", symbol:"傀", name:"カザリ", type:"demon",
    tags:["SETUP_EFFECT","DEMON_CHOOSES_MINIONS","OUTSIDER_COUNT_MODIFIER","WAKES_FIRST_NIGHT","WAKES_OTHER_NIGHTS","TARGETS_PLAYER","KILLS"],
    nightSpeed:{first:9940,other:6540},solverSupport:"full",maxKillsPerNight:1 },
  legion: { id:"legion", symbol:"群", name:"レギオン", type:"demon",
    tags:["SETUP_EFFECT","MANY_DEMONS","REGISTRATION_CHANGING","VOTE_RESTRICTED","CONDITIONAL_NIGHT_WAKE","KILLS"],
    nightSpeed:{first:9950,other:null},solverSupport:"full",maxKillsPerNight:1 },
  leviathan: { id:"leviathan", symbol:"巨", name:"リヴァイアサン", type:"demon",
    tags:["PUBLIC_DEMON_ANNOUNCEMENT","LIMITED_EXECUTIONS","ALTERNATE_WIN_CONDITION","PASSIVE"],
    nightSpeed:{first:null,other:null},solverSupport:"full",maxKillsPerNight:0 },
  lil_monsta: { id:"lil_monsta", symbol:"赤", name:"リル・モンスター", type:"demon",
    tags:["SETUP_EFFECT","EXTRA_MINION_SETUP","REGISTRATION_CHANGING","CONDITIONAL_NIGHT_WAKE","KILLS"],
    nightSpeed:{first:9960,other:6500},solverSupport:"full",maxKillsPerNight:1 },
  lleech: { id:"lleech", symbol:"蛭", name:"リーチ", type:"demon",
    tags:["WAKES_FIRST_NIGHT","WAKES_OTHER_NIGHTS","TARGETS_PLAYER","KILLS","POISON_DRUNK_ABILITY","PREVENTS_EXECUTION_DEATH"],
    nightSpeed:{first:9965,other:6560},solverSupport:"full",maxKillsPerNight:1 },
  al_hadikhia: { id:"al_hadikhia", symbol:"蘇", name:"アル・ハディキア", type:"demon",
    tags:["WAKES_OTHER_NIGHTS","TARGETS_PLAYER","KILLS","REVIVES","PUBLIC_DEMON_ANNOUNCEMENT"],
    nightSpeed:{first:null,other:6550},solverSupport:"full",maxKillsPerNight:3 },
  ojo: { id:"ojo", symbol:"眼", name:"オジョ", type:"demon",
    tags:["WAKES_OTHER_NIGHTS","TARGETS_CHARACTER","KILLS"],
    nightSpeed:{first:null,other:6540},solverSupport:"full",maxKillsPerNight:1 },
  riot: { id:"riot", symbol:"乱", name:"ライオット", type:"demon",
    tags:["SETUP_EFFECT","ALTERNATE_WIN_CONDITION","ON_NOMINATION","KILLS"],
    nightSpeed:{first:null,other:null},solverSupport:"full",maxKillsPerNight:0 },
  yaggababble: { id:"yaggababble", symbol:"詠", name:"ヤガバブル", type:"demon",
    tags:["WAKES_FIRST_NIGHT","CONDITIONAL_NIGHT_WAKE","KILLS"],
    nightSpeed:{first:9955,other:null},solverSupport:"generic" },
  boffin: { id: "boffin", symbol: "博", name: "ボフィン", type: "minion",
    tags: ["PASSIVE", "GRANTS_DEMON_GOOD_ABILITY", "HIGH_SURVIVAL_VALUE"],
    nightSpeed: {first: 9975, other: null}, solverSupport: "full" },
  boomdandy: { id: "boomdandy", symbol: "炸", name: "ブームダンディ", type: "minion",
    tags: ["ON_EXECUTION", "EXPLODES_ON_EXECUTION", "ALTERNATE_WIN_CONDITION", "AVOIDS_EXECUTION"],
    nightSpeed: {first: null, other: null}, solverSupport: "full" },
  fearmonger: { id: "fearmonger", symbol: "恐", name: "フィアモンガー", type: "minion",
    tags: ["WAKES_FIRST_NIGHT", "WAKES_OTHER_NIGHTS", "TARGETS_PLAYER", "FEARMONGER_TARGET", "ALTERNATE_WIN_CONDITION"],
    nightSpeed: {first: 9590, other: 9580}, solverSupport: "full" },
  harpy: { id: "harpy", symbol: "鳥", name: "ハーピー", type: "minion",
    tags: ["WAKES_FIRST_NIGHT", "WAKES_OTHER_NIGHTS", "TARGETS_PLAYER", "HARPY_MADNESS", "KILLS"],
    nightSpeed: {first: 7540, other: 7540}, solverSupport: "full" },
  marionette: { id: "marionette", symbol: "糸", name: "マリオネット", type: "minion",
    tags: ["PASSIVE", "ROLE_HIDDEN_FROM_SELF", "THINKS_TOWNSFOLK", "THINKS_OUTSIDER", "SETUP_EFFECT"],
    nightSpeed: {first: null, other: null}, solverSupport: "full" },
  mezepheles: { id: "mezepheles", symbol: "言", name: "メゼフェレス", type: "minion", tags: ["WAKES_FIRST_NIGHT", "ALIGNMENT_CHANGING", "SECRET_WORD_ALIGNMENT", "ONE_TIME_ABILITY", "HIGH_SURVIVAL_VALUE"], nightSpeed: { first: 9360, other: 7300 }, solverSupport: "full" },
  organ_grinder: { id: "organ_grinder", symbol: "奏", name: "オルガングラインダー", type: "minion", tags: ["WAKES_FIRST_NIGHT", "WAKES_OTHER_NIGHTS", "HIDDEN_VOTING", "POISON_DRUNK_ABILITY"], nightSpeed: { first: 9361, other: 7301 }, solverSupport: "full" },
  psychopath: { id: "psychopath", symbol: "凶", name: "サイコパス", type: "minion", tags: ["DAY_ABILITY", "KILLS", "PUBLIC_DAY_KILL", "PREVENTS_EXECUTION_DEATH"], nightSpeed: { first: null, other: null }, solverSupport: "full" },
  summoner: { id: "summoner", symbol: "喚", name: "召喚者", type: "minion", tags: ["WAKES_FIRST_NIGHT", "WAKES_OTHER_NIGHTS", "SETUP_EFFECT", "NO_DEMON_SETUP", "ROLE_CHANGING", "ALIGNMENT_CHANGING", "HIGH_SURVIVAL_VALUE"], nightSpeed: { first: 9362, other: 7302 }, solverSupport: "full" },
  widow: { id: "widow", symbol: "寡", name: "ウィドウ", type: "minion", tags: ["WAKES_FIRST_NIGHT", "SECRET_INFORMATION_ACCESS", "GRIMOIRE_ONCE", "POISON_DRUNK_ABILITY", "HIGH_SURVIVAL_VALUE"], nightSpeed: { first: 9363, other: null }, solverSupport: "full" },
  wizard: { id: "wizard", symbol: "願", name: "ウィザード", type: "minion", tags: ["ONE_TIME_ABILITY", "WISH_ABILITY", "STORYTELLER_JUDGEMENT"], nightSpeed: { first: null, other: null }, solverSupport: "generic" },
  wraith: { id: "wraith", symbol: "幽", name: "レイス", type: "minion", tags: ["WAKES_FIRST_NIGHT", "WAKES_OTHER_NIGHTS", "SECRET_INFORMATION_ACCESS", "NIGHT_PEEK", "HIGH_SURVIVAL_VALUE"], nightSpeed: { first: 9364, other: 7303 }, solverSupport: "generic" },
  xaan: { id: "xaan", symbol: "惨", name: "ザーン", type: "minion", tags: ["SETUP_EFFECT", "OUTSIDER_COUNT_MODIFIER", "POISON_DRUNK_ABILITY", "GLOBAL_TOWNSFOLK_POISON", "HIGH_SURVIVAL_VALUE"], nightSpeed: { first: null, other: null }, solverSupport: "full" },
  goblin: {
    id: "goblin",
    symbol: "鬼",
    name: "ゴブリン",
    type: "minion",
    tags: ["LACK_OF_INFO", "PASSIVE", "ON_EXECUTION", "EXECUTION_LOSS", "ALTERNATE_WIN_CONDITION"],
    nightSpeed: { first: null, other: null },
    solverSupport: "generic",
  },
  acrobat: {
    id: "acrobat",
    symbol: "軽",
    name: "軽業師",
    type: "townsfolk",
    tags: ["WAKES_OTHER_NIGHTS", "TARGETS_PLAYER", "CAUSES_OWN_DEATH", "CONDITIONAL_CONFIRMABILITY"],
    nightSpeed: { first: null, other: 4850 },
    solverSupport: "full",
  },
  alchemist: {
    id: "alchemist",
    symbol: "錬",
    name: "錬金術師",
    type: "townsfolk",
    tags: ["WAKES_FIRST_NIGHT", "TARGETS_CHARACTER", "SETUP_EFFECT", "HIGH_SURVIVAL_VALUE"],
    nightSpeed: { first: 9950, other: null },
    solverSupport: "generic",
  },
  alsaahir: {
    id: "alsaahir",
    symbol: "ア",
    name: "アルサーヒル",
    type: "townsfolk",
    tags: ["DAY_ABILITY", "ALTERNATE_WIN_CONDITION", "HIGH_SURVIVAL_VALUE", "HIGH_CONFIRMABILITY"],
    nightSpeed: { first: null, other: null },
    solverSupport: "full",
  },
  amnesiac: {
    id: "amnesiac",
    symbol: "記",
    name: "記憶喪失者",
    type: "townsfolk",
    tags: ["ROLE_HIDDEN_FROM_SELF", "HIGH_SURVIVAL_VALUE"],
    nightSpeed: { first: null, other: null },
    solverSupport: "generic",
  },
  balloonist: {
    id: "balloonist",
    symbol: "気",
    name: "気球乗り",
    type: "townsfolk",
    tags: ["INFO_SOURCE", "CONTINUOUS_INFO", "WAKES_FIRST_NIGHT", "WAKES_OTHER_NIGHTS", "SETUP_EFFECT", "OUTSIDER_COUNT_MODIFIER", "HIGH_SURVIVAL_VALUE"],
    nightSpeed: { first: 3150, other: 3150 },
    solverSupport: "full",
    outsiderCountOptions: [0, 1],
  },
  banshee: {
    id: "banshee",
    symbol: "叫",
    name: "バンシー",
    type: "townsfolk",
    tags: ["ON_NIGHT_DEATH", "DEMON_KILL_TRIGGER", "DOUBLE_NOMINATION_AFTER_DEMON_KILL", "DOUBLE_VOTE_AFTER_DEMON_KILL", "GAME_CONTINUATION", "WANTS_DEMON_TARGET", "HIGH_CONFIRMABILITY"],
    nightSpeed: { first: null, other: null },
    solverSupport: "full",
  },
  bounty_hunter: {
    id: "bounty_hunter",
    symbol: "賞",
    name: "賞金稼ぎ",
    type: "townsfolk",
    tags: ["INFO_SOURCE", "CONTINUOUS_INFO", "WAKES_FIRST_NIGHT", "CONDITIONAL_NIGHT_WAKE", "SETUP_EFFECT", "ALIGNMENT_CHANGING", "EVIL_TOWNSFOLK_SETUP", "HIGH_SURVIVAL_VALUE"],
    nightSpeed: { first: 3200, other: 3200 },
    solverSupport: "full",
  },
  cannibal: {
    id: "cannibal",
    symbol: "貪",
    name: "カニバル",
    type: "townsfolk",
    tags: ["ON_EXECUTION", "CONDITIONAL_NIGHT_WAKE", "ROLE_HIDDEN_FROM_SELF", "GAINS_EXECUTEE_ABILITY", "HIGH_SURVIVAL_VALUE"],
    nightSpeed: { first: null, other: 3050 },
    solverSupport: "full",
  },
  choirboy: { id: "choirboy", symbol: "唱", name: "聖歌隊", type: "townsfolk",
    tags: ["INFO_SOURCE", "CONDITIONAL_NIGHT_WAKE", "SETUP_EFFECT", "DEMON_KILL_TRIGGER", "HIGH_SURVIVAL_VALUE", "HIGH_CONFIRMABILITY"],
    nightSpeed: { first: null, other: 3980 }, solverSupport: "full" },
  king: { id: "king", symbol: "王", name: "王", type: "townsfolk",
    tags: ["INFO_SOURCE", "CONTINUOUS_INFO", "CONDITIONAL_NIGHT_WAKE", "DEMON_KNOWS_IDENTITY", "HIGH_SURVIVAL_VALUE"],
    nightSpeed: { first: 9955, other: 3250 }, solverSupport: "full" },
  engineer: { id: "engineer", symbol: "技", name: "技師", type: "townsfolk",
    tags: ["ONE_TIME_ABILITY", "WAKES_FIRST_NIGHT", "WAKES_OTHER_NIGHTS", "TARGETS_CHARACTER", "ROLE_CHANGING", "HIGH_SURVIVAL_VALUE"],
    nightSpeed: { first: 7800, other: 7800 }, solverSupport: "full" },
  farmer: { id: "farmer", symbol: "農", name: "農夫", type: "townsfolk",
    tags: ["ON_NIGHT_DEATH", "CREATES_FARMER", "ROLE_CHANGING", "WANTS_DEMON_TARGET", "CONDITIONAL_CONFIRMABILITY"],
    nightSpeed: { first: null, other: 4020 }, solverSupport: "full" },
  fisherman: { id: "fisherman", symbol: "漁", name: "漁師", type: "townsfolk",
    tags: ["INFO_SOURCE", "ONE_TIME_ABILITY", "DAY_ABILITY", "STORYTELLER_JUDGEMENT"],
    nightSpeed: { first: null, other: null }, solverSupport: "full" },
  general: { id: "general", symbol: "将", name: "将軍", type: "townsfolk",
    tags: ["INFO_SOURCE", "CONTINUOUS_INFO", "WAKES_FIRST_NIGHT", "WAKES_OTHER_NIGHTS", "STORYTELLER_JUDGEMENT"],
    nightSpeed: { first: 3000, other: 3000 }, solverSupport: "full" },
  high_priestess: { id: "high_priestess", symbol: "巫", name: "女教皇", type: "townsfolk",
    tags: ["INFO_SOURCE", "CONTINUOUS_INFO", "WAKES_FIRST_NIGHT", "WAKES_OTHER_NIGHTS", "STORYTELLER_JUDGEMENT"],
    nightSpeed: { first: 2995, other: 2995 }, solverSupport: "full" },
  huntsman: { id: "huntsman", symbol: "狩", name: "猟師", type: "townsfolk",
    tags: ["ONE_TIME_ABILITY", "WAKES_FIRST_NIGHT", "WAKES_OTHER_NIGHTS", "TARGETS_PLAYER", "ROLE_CHANGING", "SETUP_EFFECT", "OUTSIDER_COUNT_MODIFIER", "CREATES_DAMSEL"],
    outsiderCountOptions: [0, 1], nightSpeed: { first: 7850, other: 7850 }, solverSupport: "full" },
  knight: { id: "knight", symbol: "騎", name: "騎士", type: "townsfolk",
    tags: ["INFO_SOURCE", "FIRST_NIGHT_INFO", "WAKES_FIRST_NIGHT", "HIGH_CONFIRMABILITY"],
    nightSpeed: { first: 3070, other: null }, solverSupport: "full" },
  lycanthrope: { id: "lycanthrope", symbol: "狼", name: "人狼", type: "townsfolk",
    tags: ["WAKES_OTHER_NIGHTS", "TARGETS_PLAYER", "KILLS", "REGISTRATION_CHANGING", "SUPPRESSES_DEMON_KILL", "HIGH_SURVIVAL_VALUE"],
    nightSpeed: { first: null, other: 6100 }, solverSupport: "full" },
  magician: { id: "magician", symbol: "幻", name: "魔術師", type: "townsfolk",
    tags: ["PASSIVE", "MISDIRECTS_EVIL_TEAM", "HIGH_SURVIVAL_VALUE"],
    nightSpeed: { first: 9900, other: null }, solverSupport: "full" },
  nightwatchman: { id: "nightwatchman", symbol: "夜", name: "夜警", type: "townsfolk",
    tags: ["ONE_TIME_ABILITY", "WAKES_FIRST_NIGHT", "WAKES_OTHER_NIGHTS", "TARGETS_PLAYER", "HIGH_CONFIRMABILITY"],
    nightSpeed: { first: 3100, other: 3100 }, solverSupport: "full" },
  noble: { id: "noble", symbol: "貴", name: "貴族", type: "townsfolk",
    tags: ["INFO_SOURCE", "FIRST_NIGHT_INFO", "WAKES_FIRST_NIGHT"],
    nightSpeed: { first: 3055, other: null }, solverSupport: "full" },
  pixie: { id: "pixie", symbol: "妖", name: "ピクシー", type: "townsfolk",
    tags: ["INFO_SOURCE", "FIRST_NIGHT_INFO", "WAKES_FIRST_NIGHT", "MADNESS_ABILITY_INHERITANCE", "HIGH_SURVIVAL_VALUE"],
    nightSpeed: { first: 3050, other: null }, solverSupport: "full" },
  damsel: { id: "damsel", symbol: "乙", name: "乙女", type: "outsider",
    tags: ["SETUP_EFFECT", "ALTERNATE_WIN_CONDITION", "MINION_DAMSEL_GUESS", "ROLE_CHANGING", "OUTSIDER_HIDDEN_CLAIM", "AVOIDS_EXECUTION"],
    nightSpeed: { first: 9850, other: null }, solverSupport: "full" },
  golem: { id: "golem", symbol: "岩", name: "ゴーレム", type: "outsider",
    tags: ["ON_NOMINATION", "ONE_TIME_ABILITY", "DAY_ABILITY", "KILLS", "HIGH_CONFIRMABILITY"],
    nightSpeed: { first: null, other: null }, solverSupport: "full" },
  hatter: { id: "hatter", symbol: "帽", name: "帽子屋", type: "outsider",
    tags: ["ON_DEATH", "ROLE_CHANGING", "EVIL_ROLE_CHANGE", "CONDITIONAL_NIGHT_WAKE"],
    nightSpeed: { first: null, other: 4100 }, solverSupport: "full" },
  heretic: { id: "heretic", symbol: "異", name: "異端者", type: "outsider",
    tags: ["ALTERNATE_WIN_CONDITION", "REVERSES_WINNER", "PASSIVE", "OUTSIDER_HIDDEN_CLAIM"],
    nightSpeed: { first: null, other: null }, solverSupport: "full" },
  hermit: { id: "hermit", symbol: "庵", name: "隠者", type: "outsider",
    tags: ["SETUP_EFFECT", "OUTSIDER_COUNT_MODIFIER", "OUTSIDER_COMBINED_ABILITIES", "ROLE_HIDDEN_FROM_SELF"],
    outsiderCountOptions: [-1, 0], nightSpeed: { first: 9800, other: 3000 }, solverSupport: "generic" },
  ogre: { id: "ogre", symbol: "怪", name: "オーガ", type: "outsider",
    tags: ["WAKES_FIRST_NIGHT", "ALIGNMENT_CHANGING", "TARGETS_PLAYER"],
    nightSpeed: { first: 9960, other: null }, solverSupport: "full" },
  plague_doctor: { id: "plague_doctor", symbol: "疫", name: "疫病医師", type: "outsider",
    tags: ["ON_DEATH", "STORYTELLER_MINION_ABILITY", "CONDITIONAL_CONFIRMABILITY"],
    nightSpeed: { first: null, other: 4020 }, solverSupport: "full" },
  politician: { id: "politician", symbol: "政", name: "政治家", type: "outsider",
    tags: ["ALTERNATE_WIN_CONDITION", "OUTSIDER_EARNS_EVIL_WIN"],
    nightSpeed: { first: null, other: null }, solverSupport: "full" },
  puzzlemaster: { id: "puzzlemaster", symbol: "謎", name: "パズルマスター", type: "outsider",
    tags: ["ONE_TIME_ABILITY", "DAY_ABILITY", "DRUNKS_PLAYER", "INFO_SOURCE", "HIGH_SURVIVAL_VALUE"],
    nightSpeed: { first: 9970, other: null }, solverSupport: "full" },
  snitch: { id: "snitch", symbol: "報", name: "密告者", type: "outsider",
    tags: ["SETUP_EFFECT", "SECRET_INFORMATION_ACCESS"],
    nightSpeed: { first: 9940, other: null }, solverSupport: "full" },
  zealot: { id: "zealot", symbol: "熱", name: "狂信者", type: "outsider",
    tags: ["FORCED_VOTE", "VOTE_RESTRICTED", "PASSIVE"],
    nightSpeed: { first: null, other: null }, solverSupport: "full" },
  poppy_grower: { id: "poppy_grower", symbol: "芥", name: "ケシ栽培者", type: "townsfolk",
    tags: ["PASSIVE", "HIDES_EVIL_TEAM", "ON_DEATH", "HIGH_SURVIVAL_VALUE"],
    nightSpeed: { first: 9950, other: 4000 }, solverSupport: "full" },
  preacher: { id: "preacher", symbol: "説", name: "説教師", type: "townsfolk",
    tags: ["WAKES_FIRST_NIGHT", "WAKES_OTHER_NIGHTS", "TARGETS_PLAYER", "DISABLES_MINION_ABILITY", "HIGH_SURVIVAL_VALUE"],
    nightSpeed: { first: 9050, other: 9050 }, solverSupport: "full" },
  princess: { id: "princess", symbol: "姫", name: "姫", type: "townsfolk",
    tags: ["ON_NOMINATION", "DAY_ABILITY", "BLOCKS_DEMON_KILL", "HIGH_SURVIVAL_VALUE"],
    nightSpeed: { first: null, other: null }, solverSupport: "full" },
  shugenja: { id: "shugenja", symbol: "修", name: "修験者", type: "townsfolk",
    tags: ["INFO_SOURCE", "FIRST_NIGHT_INFO", "WAKES_FIRST_NIGHT"],
    nightSpeed: { first: 3080, other: null }, solverSupport: "full" },
  steward: { id: "steward", symbol: "執", name: "執事", type: "townsfolk",
    tags: ["INFO_SOURCE", "FIRST_NIGHT_INFO", "WAKES_FIRST_NIGHT", "HIGH_CONFIRMABILITY"],
    nightSpeed: { first: 3085, other: null }, solverSupport: "full" },
  village_idiot: { id: "village_idiot", symbol: "村", name: "村の愚者", type: "townsfolk",
    tags: ["INFO_SOURCE", "CONTINUOUS_INFO", "WAKES_FIRST_NIGHT", "WAKES_OTHER_NIGHTS", "SETUP_EFFECT", "DUPLICATE_TOWNSFOLK"],
    nightSpeed: { first: 3090, other: 3090 }, solverSupport: "full" },
};

export const TROUBLE_BREWING_ROLE_IDS: RoleId[] = [
  "washerwoman",
  "librarian",
  "investigator",
  "chef",
  "empath",
  "fortune_teller",
  "undertaker",
  "monk",
  "ravenkeeper",
  "virgin",
  "slayer",
  "soldier",
  "mayor",
  "butler",
  "drunk",
  "recluse",
  "saint",
  "poisoner",
  "spy",
  "scarlet_woman",
  "baron",
  "imp"
];

export function hasTag(roleId: RoleId, tag: RoleTag): boolean {
  return ROLES[roleId].tags.includes(tag);
}

export function getRolesWithTag(tag: RoleTag): Role[] {
  return Object.values(ROLES).filter((role) => role.tags.includes(tag));
}

export function getRolesByType(type: RoleType): Role[] {
  return Object.values(ROLES).filter((role) => role.type === type);
}

export function getNightSpeed(roleId: RoleId, nightNumber: number): number | null {
  return nightNumber === 1
    ? ROLES[roleId].nightSpeed.first
    : ROLES[roleId].nightSpeed.other;
}
