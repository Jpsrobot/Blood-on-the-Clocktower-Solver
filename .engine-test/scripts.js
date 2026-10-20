"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_CORE_ROLE_IDS = exports.BUILT_IN_SCRIPTS = exports.SECTS_AND_VIOLETS_ROLE_IDS = exports.BAD_MOON_RISING_ROLE_IDS = void 0;
exports.validateCustomScript = validateCustomScript;
exports.loadCustomScripts = loadCustomScripts;
exports.saveCustomScripts = saveCustomScripts;
exports.createCustomScript = createCustomScript;
exports.allScripts = allScripts;
exports.getScriptById = getScriptById;
exports.getSnapshotScriptRoleIds = getSnapshotScriptRoleIds;
exports.getSnapshotScriptName = getSnapshotScriptName;
const roles_1 = require("./roles");
exports.BAD_MOON_RISING_ROLE_IDS = [
    "grandmother", "sailor", "chambermaid", "exorcist", "innkeeper", "gambler", "gossip", "courtier", "professor", "minstrel", "tea_lady", "pacifist", "fool",
    "goon", "lunatic", "tinker", "moonchild",
    "godfather", "devils_advocate", "assassin", "mastermind",
    "zombuul", "pukka", "shabaloth", "po",
];
exports.SECTS_AND_VIOLETS_ROLE_IDS = [
    "clockmaker", "dreamer", "snake_charmer", "mathematician", "flowergirl", "town_crier", "oracle", "savant", "seamstress", "philosopher", "artist", "juggler", "sage",
    "mutant", "sweetheart", "barber", "klutz",
    "evil_twin", "witch", "cerenovus", "pit_hag",
    "fang_gu", "vigormortis", "no_dashii", "vortox",
];
exports.BUILT_IN_SCRIPTS = [
    { id: "trouble_brewing", name: "Trouble Brewing", roleIds: roles_1.TROUBLE_BREWING_ROLE_IDS, builtIn: true },
    { id: "bad_moon_rising", name: "Bad Moon Rising", roleIds: exports.BAD_MOON_RISING_ROLE_IDS, builtIn: true },
    { id: "sects_and_violets", name: "Sects and Violets", roleIds: exports.SECTS_AND_VIOLETS_ROLE_IDS, builtIn: true },
];
const CUSTOM_SCRIPTS_KEY = "clocktower.customScripts.v1";
function uniqueValidRoleIds(values) {
    if (!Array.isArray(values))
        return [];
    const out = [];
    for (const value of values) {
        if (typeof value !== "string" || !Object.hasOwn(roles_1.ROLES, value))
            continue;
        const roleId = value;
        if (!out.includes(roleId))
            out.push(roleId);
    }
    return out;
}
function validateCustomScript(value) {
    if (!value || typeof value !== "object")
        return false;
    const script = value;
    return typeof script.id === "string" && script.id.startsWith("custom:") &&
        typeof script.name === "string" && script.name.trim().length > 0 &&
        script.builtIn === false && uniqueValidRoleIds(script.roleIds).length === (script.roleIds?.length ?? -1);
}
function loadCustomScripts() {
    try {
        const raw = localStorage.getItem(CUSTOM_SCRIPTS_KEY);
        if (!raw)
            return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed))
            return [];
        return parsed.filter(validateCustomScript).map(script => ({
            ...script,
            roleIds: uniqueValidRoleIds(script.roleIds),
        }));
    }
    catch {
        return [];
    }
}
function saveCustomScripts(scripts) {
    try {
        const clean = scripts
            .filter(script => !script.builtIn && script.id.startsWith("custom:") && script.name.trim())
            .map(script => ({ ...script, name: script.name.trim(), roleIds: uniqueValidRoleIds(script.roleIds), builtIn: false }));
        localStorage.setItem(CUSTOM_SCRIPTS_KEY, JSON.stringify(clean));
        return true;
    }
    catch {
        return false;
    }
}
function createCustomScript(name, roleIds) {
    return {
        id: `custom:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`,
        name: name.trim(),
        roleIds: uniqueValidRoleIds(roleIds),
        builtIn: false,
    };
}
function allScripts(customScripts) {
    return [...exports.BUILT_IN_SCRIPTS, ...customScripts];
}
function getScriptById(id, customScripts = []) {
    return allScripts(customScripts).find(script => script.id === id) ?? null;
}
function getSnapshotScriptRoleIds(g) {
    const embedded = uniqueValidRoleIds(g.scriptRoleIds);
    if (embedded.length)
        return embedded;
    return exports.BUILT_IN_SCRIPTS.find(script => script.id === g.playset)?.roleIds ?? roles_1.TROUBLE_BREWING_ROLE_IDS;
}
function getSnapshotScriptName(g) {
    if (g.scriptName?.trim())
        return g.scriptName.trim();
    return exports.BUILT_IN_SCRIPTS.find(script => script.id === g.playset)?.name ?? "Custom Script";
}
exports.ALL_CORE_ROLE_IDS = [
    ...roles_1.TROUBLE_BREWING_ROLE_IDS,
    ...exports.BAD_MOON_RISING_ROLE_IDS,
    ...exports.SECTS_AND_VIOLETS_ROLE_IDS,
];
