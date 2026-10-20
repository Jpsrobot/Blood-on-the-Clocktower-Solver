import type { Alignment } from "./types";

export type TravellerRoleId =
  | "bureaucrat"
  | "beggar"
  | "gunslinger"
  | "scapegoat"
  | "thief"
  | "apprentice"
  | "matron"
  | "voudon"
  | "judge"
  | "bishop"
  | "butcher"
  | "bone_collector"
  | "harlot"
  | "barista"
  | "deviant"
  | "cacklejack"
  | "gnome"
  | "gangster";

export type TravellerTag =
  | "PUBLIC_CHARACTER"
  | "HIDDEN_ALIGNMENT"
  | "NIGHT_ACTION"
  | "DAY_ACTION"
  | "VOTE_TRIPLE"
  | "VOTE_TOKEN_ONLY"
  | "SOBER_HEALTHY"
  | "DAY_KILL"
  | "EXECUTION_REPLACEMENT"
  | "NEGATIVE_VOTE"
  | "EXILE_ONLY"
  | "ABILITY_COPY"
  | "SEAT_SWAP"
  | "PRIVATE_TALK_RESTRICTION"
  | "DEAD_VOTE_CONTROL"
  | "EXECUTION_OVERRIDE"
  | "STORYTELLER_NOMINATION"
  | "EXTRA_EXECUTION"
  | "RESTORE_ABILITY"
  | "ROLE_INFO"
  | "ACTS_TWICE"
  | "EXILE_PROTECTION"
  | "STORYTELLER_JUDGEMENT"
  | "CHARACTER_CHANGE"
  | "SAME_ALIGNMENT_FRIEND"
  | "SPECIAL_DEATH_CAUSE"
  | "NEIGHBOR_KILL";

export type TravellerDefinition = {
  id: TravellerRoleId;
  symbol: string;
  name: string;
  edition: "tb" | "bmr" | "snv" | "experimental";
  tags: TravellerTag[];
  ability: string;
};

export const TRAVELLERS: Record<TravellerRoleId, TravellerDefinition> = {
  bureaucrat: {
    id: "bureaucrat",
    symbol: "官",
    name: "官僚",
    edition: "tb",
    tags: ["PUBLIC_CHARACTER", "HIDDEN_ALIGNMENT", "NIGHT_ACTION", "VOTE_TRIPLE", "EXILE_ONLY"],
    ability: "毎夜、自分以外の1人を選ぶ。翌日、その人の投票は3票として数える。",
  },
  beggar: {
    id: "beggar",
    symbol: "乞",
    name: "物乞い",
    edition: "tb",
    tags: ["PUBLIC_CHARACTER", "HIDDEN_ALIGNMENT", "VOTE_TOKEN_ONLY", "SOBER_HEALTHY", "EXILE_ONLY"],
    ability: "投票トークンを使わないと投票できない。死亡者から受け取ると、その人の陣営を知る。酔い・毒にならない。",
  },
  gunslinger: {
    id: "gunslinger",
    symbol: "銃",
    name: "ガンスリンガー",
    edition: "tb",
    tags: ["PUBLIC_CHARACTER", "HIDDEN_ALIGNMENT", "DAY_KILL", "EXILE_ONLY"],
    ability: "毎日、最初の投票集計後、その投票で挙手した1人を選んで死亡させてもよい。",
  },
  scapegoat: {
    id: "scapegoat",
    symbol: "贄",
    name: "スケープゴート",
    edition: "tb",
    tags: ["PUBLIC_CHARACTER", "HIDDEN_ALIGNMENT", "EXECUTION_REPLACEMENT", "EXILE_ONLY"],
    ability: "自分と同じ陣営のプレイヤーが処刑されるとき、代わりに処刑されることがある。",
  },
  thief: {
    id: "thief",
    symbol: "盗",
    name: "泥棒",
    edition: "tb",
    tags: ["PUBLIC_CHARACTER", "HIDDEN_ALIGNMENT", "NIGHT_ACTION", "NEGATIVE_VOTE", "EXILE_ONLY"],
    ability: "毎夜、自分以外の1人を選ぶ。翌日、その人の投票はマイナス1票として数える。",
  },
  apprentice: {
    id: "apprentice",
    symbol: "習",
    name: "見習い",
    edition: "bmr",
    tags: ["PUBLIC_CHARACTER", "HIDDEN_ALIGNMENT", "ABILITY_COPY", "EXILE_ONLY"],
    ability: "最初の夜、善なら町人、悪なら手下の能力を1つ得る。死亡するまでその能力を持つ。",
  },
  matron: {
    id: "matron",
    symbol: "寮",
    name: "寮母",
    edition: "bmr",
    tags: ["PUBLIC_CHARACTER", "HIDDEN_ALIGNMENT", "DAY_ACTION", "SEAT_SWAP", "PRIVATE_TALK_RESTRICTION", "EXILE_ONLY"],
    ability: "毎日、最大3回まで2人の席を入れ替えられる。プレイヤーは席を離れて私談できない。",
  },
  voudon: {
    id: "voudon",
    symbol: "呪",
    name: "ブードゥー師",
    edition: "bmr",
    tags: ["PUBLIC_CHARACTER", "HIDDEN_ALIGNMENT", "DEAD_VOTE_CONTROL", "EXILE_ONLY"],
    ability: "自分と死亡者だけが投票できる。死亡者は死者票を消費せず何度でも投票でき、通常の過半数は不要。",
  },
  judge: {
    id: "judge",
    symbol: "判",
    name: "判事",
    edition: "bmr",
    tags: ["PUBLIC_CHARACTER", "HIDDEN_ALIGNMENT", "DAY_ACTION", "EXECUTION_OVERRIDE", "EXILE_ONLY"],
    ability: "ゲーム中1回、他のプレイヤーが指名した現在の処刑を、投票数に関係なく成功または失敗にできる。",
  },
  bishop: {
    id: "bishop",
    symbol: "司",
    name: "司教",
    edition: "bmr",
    tags: ["PUBLIC_CHARACTER", "HIDDEN_ALIGNMENT", "STORYTELLER_NOMINATION", "EXILE_ONLY"],
    ability: "語り手だけが指名できる。毎日、司教と反対陣営のプレイヤーが少なくとも1人は指名される。",
  },
  butcher: {
    id: "butcher",
    symbol: "肉",
    name: "肉屋",
    edition: "snv",
    tags: ["PUBLIC_CHARACTER", "HIDDEN_ALIGNMENT", "DAY_ACTION", "EXTRA_EXECUTION", "EXILE_ONLY"],
    ability: "毎日、最初の処刑後にもう一度指名できる。その指名ではその日2回目の処刑が起こり得る。",
  },
  bone_collector: {
    id: "bone_collector",
    symbol: "骨",
    name: "骨拾い",
    edition: "snv",
    tags: ["PUBLIC_CHARACTER", "HIDDEN_ALIGNMENT", "NIGHT_ACTION", "RESTORE_ABILITY", "EXILE_ONLY"],
    ability: "ゲーム中1回、最初の夜を除く夜に死亡者1人を選ぶ。その人は夕暮れまで能力を取り戻す。",
  },
  harlot: {
    id: "harlot",
    symbol: "娼",
    name: "娼婦",
    edition: "snv",
    tags: ["PUBLIC_CHARACTER", "HIDDEN_ALIGNMENT", "NIGHT_ACTION", "ROLE_INFO", "EXILE_ONLY"],
    ability: "毎夜、最初の夜を除き、生存者1人を選ぶ。相手が同意すればその役職を知るが、2人とも死亡することがある。",
  },
  barista: {
    id: "barista",
    symbol: "珈",
    name: "バリスタ",
    edition: "snv",
    tags: ["PUBLIC_CHARACTER", "HIDDEN_ALIGNMENT", "NIGHT_ACTION", "SOBER_HEALTHY", "ACTS_TWICE", "EXILE_ONLY"],
    ability: "毎夜、語り手が1人を選び、夕暮れまで『酔い・毒なしで真情報』または『能力が2回働く』のどちらかを与える。対象者はどちらかを知る。",
  },
  deviant: {
    id: "deviant",
    symbol: "奇",
    name: "変人",
    edition: "snv",
    tags: ["PUBLIC_CHARACTER", "HIDDEN_ALIGNMENT", "EXILE_PROTECTION", "STORYTELLER_JUDGEMENT", "EXILE_ONLY"],
    ability: "その日に面白かったと語り手が判断したなら、追放で死亡しない。",
  },
  cacklejack: {
    id: "cacklejack",
    symbol: "笑",
    name: "カックルジャック",
    edition: "experimental",
    tags: ["PUBLIC_CHARACTER", "HIDDEN_ALIGNMENT", "DAY_ACTION", "CHARACTER_CHANGE", "EXILE_ONLY"],
    ability: "毎日1人を選ぶ。その人以外の別の1人が今夜、別の役職に変わる。最初の夜には役職変更は起こらない。",
  },
  gnome: {
    id: "gnome",
    symbol: "小",
    name: "ノーム",
    edition: "experimental",
    tags: ["PUBLIC_CHARACTER", "HIDDEN_ALIGNMENT", "SAME_ALIGNMENT_FRIEND", "DAY_KILL", "SPECIAL_DEATH_CAUSE", "EXILE_ONLY"],
    ability: "全員が自分と同じ陣営の1人を知る。その人が指名されたとき、その指名者を死亡させてもよい。",
  },
  gangster: {
    id: "gangster",
    symbol: "組",
    name: "ギャングスター",
    edition: "experimental",
    tags: ["PUBLIC_CHARACTER", "HIDDEN_ALIGNMENT", "DAY_ACTION", "DAY_KILL", "NEIGHBOR_KILL", "SPECIAL_DEATH_CAUSE", "EXILE_ONLY"],
    ability: "毎日1回、生存している隣人の一方が同意すれば、もう一方の生存隣人を死亡させてもよい。死亡者は隣人判定で飛ばす。",
  },
};

export const TB_TRAVELLER_IDS: TravellerRoleId[] = ["bureaucrat", "beggar", "gunslinger", "scapegoat", "thief"];
export const BMR_TRAVELLER_IDS: TravellerRoleId[] = ["apprentice", "matron", "voudon", "judge", "bishop"];
export const SNV_TRAVELLER_IDS: TravellerRoleId[] = ["butcher", "bone_collector", "harlot", "barista", "deviant"];
export const EXPERIMENTAL_TRAVELLER_IDS: TravellerRoleId[] = ["cacklejack", "gnome", "gangster"];
export const BASE_TRAVELLER_IDS = TB_TRAVELLER_IDS;
export const ALL_TRAVELLER_IDS: TravellerRoleId[] = [...TB_TRAVELLER_IDS, ...BMR_TRAVELLER_IDS, ...SNV_TRAVELLER_IDS, ...EXPERIMENTAL_TRAVELLER_IDS];

export const TRAVELLER_TAG_LABELS: Record<TravellerTag, string> = {
  PUBLIC_CHARACTER: "役職公開",
  HIDDEN_ALIGNMENT: "陣営非公開",
  NIGHT_ACTION: "夜行動",
  DAY_ACTION: "昼行動",
  VOTE_TRIPLE: "3票化",
  VOTE_TOKEN_ONLY: "投票トークン制",
  SOBER_HEALTHY: "酔い・毒無効",
  DAY_KILL: "昼死亡",
  EXECUTION_REPLACEMENT: "処刑身代わり",
  NEGATIVE_VOTE: "マイナス票",
  EXILE_ONLY: "追放対象",
  ABILITY_COPY: "能力獲得",
  SEAT_SWAP: "席交換",
  PRIVATE_TALK_RESTRICTION: "私談制限",
  DEAD_VOTE_CONTROL: "死亡者投票",
  EXECUTION_OVERRIDE: "処刑上書き",
  STORYTELLER_NOMINATION: "語り手指名",
  EXTRA_EXECUTION: "追加処刑",
  RESTORE_ABILITY: "死亡者能力復帰",
  ROLE_INFO: "役職情報",
  ACTS_TWICE: "能力2回",
  EXILE_PROTECTION: "追放耐性",
  STORYTELLER_JUDGEMENT: "語り手判定",
  CHARACTER_CHANGE: "役職変更",
  SAME_ALIGNMENT_FRIEND: "同陣営の友人",
  SPECIAL_DEATH_CAUSE: "特殊死亡原因",
  NEIGHBOR_KILL: "隣人死亡",
};

export function isTravellerRoleId(value: unknown): value is TravellerRoleId {
  return typeof value === "string" && Object.hasOwn(TRAVELLERS, value);
}

export function alignmentLabel(value: Alignment | "unknown"): string {
  return value === "good" ? "善" : value === "evil" ? "悪" : "不明";
}
