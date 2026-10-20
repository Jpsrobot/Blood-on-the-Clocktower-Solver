import { ROLES, TROUBLE_BREWING_ROLE_IDS, type RoleId } from "./roles";
import type { GameSnapshot } from "./types";

export type ScriptDefinition = {
  id: string;
  name: string;
  roleIds: RoleId[];
  builtIn: boolean;
};

export const BAD_MOON_RISING_ROLE_IDS: RoleId[] = [
  "grandmother","sailor","chambermaid","exorcist","innkeeper","gambler","gossip","courtier","professor","minstrel","tea_lady","pacifist","fool",
  "goon","lunatic","tinker","moonchild",
  "godfather","devils_advocate","assassin","mastermind",
  "zombuul","pukka","shabaloth","po",
];

export const SECTS_AND_VIOLETS_ROLE_IDS: RoleId[] = [
  "clockmaker","dreamer","snake_charmer","mathematician","flowergirl","town_crier","oracle","savant","seamstress","philosopher","artist","juggler","sage",
  "mutant","sweetheart","barber","klutz",
  "evil_twin","witch","cerenovus","pit_hag",
  "fang_gu","vigormortis","no_dashii","vortox",
];

export const BUILT_IN_SCRIPTS: ScriptDefinition[] = [
  { id: "trouble_brewing", name: "トラブル・ブリューイング", roleIds: TROUBLE_BREWING_ROLE_IDS, builtIn: true },
  { id: "bad_moon_rising", name: "バッド・ムーン・ライジング", roleIds: BAD_MOON_RISING_ROLE_IDS, builtIn: true },
  { id: "sects_and_violets", name: "セクツ・アンド・ヴァイオレッツ", roleIds: SECTS_AND_VIOLETS_ROLE_IDS, builtIn: true },
];

const CUSTOM_SCRIPTS_KEY = "clocktower.customScripts.v1";

function uniqueValidRoleIds(values: unknown): RoleId[] {
  if (!Array.isArray(values)) return [];
  const out: RoleId[] = [];
  for (const value of values) {
    if (typeof value !== "string" || !Object.hasOwn(ROLES, value)) continue;
    const roleId = value as RoleId;
    if (!out.includes(roleId)) out.push(roleId);
  }
  // Dependencies are normalized on load and when a script is created.
  if (out.includes("choirboy") && !out.includes("king")) out.push("king");
  if (out.includes("huntsman") && !out.includes("damsel")) out.push("damsel");
  return out;
}

export function validateCustomScript(value: unknown): value is ScriptDefinition {
  if (!value || typeof value !== "object") return false;
  const script = value as Partial<ScriptDefinition>;
  return typeof script.id === "string" && script.id.startsWith("custom:") &&
    typeof script.name === "string" && script.name.trim().length > 0 &&
    script.builtIn === false && Array.isArray(script.roleIds) && script.roleIds.every(id => typeof id === "string" && Object.hasOwn(ROLES, id)) && new Set(script.roleIds).size === script.roleIds.length;
}

export function loadCustomScripts(): ScriptDefinition[] {
  try {
    const raw = localStorage.getItem(CUSTOM_SCRIPTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(validateCustomScript).map(script => ({
      ...script,
      roleIds: uniqueValidRoleIds(script.roleIds),
    }));
  } catch {
    return [];
  }
}

export function saveCustomScripts(scripts: ScriptDefinition[]): boolean {
  try {
    const clean = scripts
      .filter(script => !script.builtIn && script.id.startsWith("custom:") && script.name.trim())
      .map(script => ({ ...script, name: script.name.trim(), roleIds: uniqueValidRoleIds(script.roleIds), builtIn: false }));
    localStorage.setItem(CUSTOM_SCRIPTS_KEY, JSON.stringify(clean));
    return true;
  } catch {
    return false;
  }
}

export function createCustomScript(name: string, roleIds: RoleId[]): ScriptDefinition {
  return {
    id: `custom:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    roleIds: uniqueValidRoleIds(roleIds),
    builtIn: false,
  };
}

export function allScripts(customScripts: ScriptDefinition[]): ScriptDefinition[] {
  return [...BUILT_IN_SCRIPTS, ...customScripts];
}

export function getScriptById(id: string, customScripts: ScriptDefinition[] = []): ScriptDefinition | null {
  return allScripts(customScripts).find(script => script.id === id) ?? null;
}

export function getSnapshotScriptRoleIds(g: Pick<GameSnapshot, "playset" | "scriptRoleIds">): RoleId[] {
  const embedded = uniqueValidRoleIds(g.scriptRoleIds);
  const roles = embedded.length ? embedded : (BUILT_IN_SCRIPTS.find(script => script.id === g.playset)?.roleIds ?? TROUBLE_BREWING_ROLE_IDS);
  // Choirboy's [+the King] also works for legacy scripts where the dependency wasn't selected.
  return uniqueValidRoleIds(roles);
}

export function getSnapshotScriptName(g: Pick<GameSnapshot, "playset" | "scriptName">): string {
  if (g.scriptName?.trim()) return g.scriptName.trim();
  return BUILT_IN_SCRIPTS.find(script => script.id === g.playset)?.name ?? "カスタムスクリプト";
}

export const ALL_CORE_ROLE_IDS: RoleId[] = [
  ...TROUBLE_BREWING_ROLE_IDS,
  ...BAD_MOON_RISING_ROLE_IDS,
  ...SECTS_AND_VIOLETS_ROLE_IDS,
  // Experimental role currently used by the Spy framing objective.
  "goblin",
  // Experimental characters are intentionally absent from built-in scripts,
  // but are available to the custom script maker.
  "acrobat",
  "alchemist",
  "alsaahir",
  "amnesiac",
  "balloonist",
  "banshee",
  "bounty_hunter",
  "cannibal",
  "choirboy", "king", "engineer", "farmer", "fisherman", "general", "high_priestess",
  "huntsman", "knight", "lycanthrope", "magician", "nightwatchman", "noble", "pixie", "damsel",
  "poppy_grower", "preacher", "princess", "shugenja", "steward", "village_idiot",
  "golem", "hatter", "heretic", "hermit", "ogre", "plague_doctor", "politician", "puzzlemaster", "snitch", "zealot",
  // Experimental Demons must be present in the script maker, not merely in ROLES.
  "lord_of_typhon", "kazali", "legion", "leviathan",
  "lil_monsta", "lleech", "al_hadikhia", "ojo", "riot", "yaggababble",
  "boffin", "boomdandy", "fearmonger", "harpy", "marionette",
  "mezepheles", "organ_grinder", "psychopath", "summoner", "widow", "wizard", "wraith", "xaan",
];
