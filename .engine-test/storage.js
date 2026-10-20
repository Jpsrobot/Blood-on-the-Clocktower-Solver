"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOG_KEYS = exports.MAX_GAME_LOGS = exports.GAME_LOG_KEY = exports.CHECKPOINT_KEY = exports.SAVE_KEY = void 0;
exports.eventId = eventId;
exports.validateSnapshot = validateSnapshot;
exports.loadSnapshot = loadSnapshot;
exports.saveSnapshot = saveSnapshot;
exports.loadCheckpoints = loadCheckpoints;
exports.downloadSnapshot = downloadSnapshot;
exports.deleteEventGroup = deleteEventGroup;
exports.loadGameLogs = loadGameLogs;
exports.saveGameLogs = saveGameLogs;
exports.createGameLogEntry = createGameLogEntry;
exports.updateGameLogEntry = updateGameLogEntry;
exports.downloadGameLogEntry = downloadGameLogEntry;
exports.downloadGameLogs = downloadGameLogs;
const roles_1 = require("./roles");
const game_1 = require("./engine/game");
const scripts_1 = require("./scripts");
exports.SAVE_KEY = "clocktower.ja.snapshot.v2";
exports.CHECKPOINT_KEY = "clocktower.ja.checkpoints.v2";
exports.GAME_LOG_KEY = "clocktower.ja.gameLogs.v1";
exports.MAX_GAME_LOGS = 40;
exports.LOG_KEYS = ["roleClaimLog", "abilityClaimLog", "deathLog", "revivalLog", "nominationLog", "abilityTriggerLog", "talkLog", "selfInfoLog", "selfActionLog", "demonActionLog", "minionActionLog"];
let lastId = 0;
function eventId() { lastId = Math.max(Date.now() * 16, lastId + 16); return lastId; }
function record(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
function role(v) { return typeof v === 'string' && Object.hasOwn(roles_1.ROLES, v); }
function validateSnapshot(value) {
    if (!record(value) || value.schemaVersion !== 2 || typeof value.playset !== 'string' || !value.playset || !Number.isInteger(value.playerCount) || Number(value.playerCount) < 5 || Number(value.playerCount) > 15 || !Number.isInteger(value.night) || Number(value.night) < 1 || Number(value.night) > 99)
        return false;
    if (value.scriptName !== undefined && typeof value.scriptName !== 'string')
        return false;
    if (value.scriptRoleIds !== undefined) {
        if (!Array.isArray(value.scriptRoleIds) || value.scriptRoleIds.length === 0 || new Set(value.scriptRoleIds).size !== value.scriptRoleIds.length || value.scriptRoleIds.some((r) => !role(r)))
            return false;
    }
    if (String(value.playset).startsWith('custom:') && !Array.isArray(value.scriptRoleIds))
        return false;
    const scriptRoles = new Set((0, scripts_1.getSnapshotScriptRoleIds)(value));
    if (!record(value.selfRole) || (value.selfRole.shownRole !== null && (!role(value.selfRole.shownRole) || !scriptRoles.has(value.selfRole.shownRole))))
        return false;
    if (!record(value.playerNames) || Object.values(value.playerNames).some(v => typeof v !== 'string') || !record(value.playerStatus) || !record(value.manualReads))
        return false;
    if (value.demonState !== undefined) {
        const d = value.demonState;
        if (!record(d) || !Array.isArray(d.knownMinions) || !Array.isArray(d.storytellerBluffs) || !record(d.bluffPlans))
            return false;
        const activeDemon = new Set((0, game_1.seats)(Number(value.playerCount)));
        if (d.knownMinions.length > (0, game_1.setupCounts)(Number(value.playerCount)).minion)
            return false;
        const seenMinions = new Set();
        for (const item of d.knownMinions) {
            if (!record(item) || typeof item.playerId !== 'string' || item.playerId === 'self' || !activeDemon.has(item.playerId) || !['demon_info', 'minion_info', 'confirmed_later'].includes(String(item.source)) || seenMinions.has(item.playerId))
                return false;
            if (item.roleId !== undefined && item.roleId !== null && (!role(item.roleId) || roles_1.ROLES[item.roleId].type !== 'minion'))
                return false;
            seenMinions.add(item.playerId);
        }
        if (d.storytellerBluffs.length > 3 || Number(value.playerCount) <= 6 && d.storytellerBluffs.length > 0)
            return false;
        const seenBluffs = new Set();
        for (const r of d.storytellerBluffs) {
            if (!role(r) || roles_1.ROLES[r].type === 'minion' || roles_1.ROLES[r].type === 'demon' || seenBluffs.has(String(r)))
                return false;
            seenBluffs.add(String(r));
        }
        for (const [player, r] of Object.entries(d.bluffPlans)) {
            if (!activeDemon.has(player) || !(r === null || role(r)) || (r !== null && (roles_1.ROLES[r].type === 'minion' || roles_1.ROLES[r].type === 'demon')))
                return false;
        }
    }
    if (value.minionState !== undefined) {
        const d = value.minionState;
        if (!record(d) || !(d.knownDemon === null || record(d.knownDemon)) || !Array.isArray(d.knownMinions) || !Array.isArray(d.sharedStorytellerBluffs) || !record(d.bluffPlans) || !record(d.spyInitialRoles) || !(d.spyRedHerring === null || typeof d.spyRedHerring === 'string') || !(d.becameDemonAt === null || typeof d.becameDemonAt === 'string'))
            return false;
        const activeMinion = new Set((0, game_1.seats)(Number(value.playerCount)));
        const minionSlots = Math.max(0, (0, game_1.setupCounts)(Number(value.playerCount)).minion - 1);
        if (d.knownDemon !== null) {
            const kd = d.knownDemon;
            if (!record(kd) || typeof kd.playerId !== 'string' || kd.playerId === 'self' || !activeMinion.has(kd.playerId) || !['minion_info', 'confirmed_later'].includes(String(kd.source)))
                return false;
        }
        if (d.knownMinions.length > minionSlots)
            return false;
        const seenTeam = new Set();
        if (d.knownDemon !== null && record(d.knownDemon))
            seenTeam.add(String(d.knownDemon.playerId));
        const seenRoles = new Set();
        for (const item of d.knownMinions) {
            if (!record(item) || typeof item.playerId !== 'string' || item.playerId === 'self' || !activeMinion.has(item.playerId) || !['demon_info', 'minion_info', 'confirmed_later'].includes(String(item.source)) || seenTeam.has(item.playerId))
                return false;
            if (item.roleId !== undefined && item.roleId !== null) {
                if (!role(item.roleId) || roles_1.ROLES[item.roleId].type !== 'minion' || seenRoles.has(String(item.roleId)))
                    return false;
                seenRoles.add(String(item.roleId));
            }
            seenTeam.add(item.playerId);
        }
        if (d.sharedStorytellerBluffs.length > 3 || Number(value.playerCount) <= 6 && d.sharedStorytellerBluffs.length > 0)
            return false;
        const seenBluffs = new Set();
        for (const r of d.sharedStorytellerBluffs) {
            if (!role(r) || roles_1.ROLES[r].type === 'minion' || roles_1.ROLES[r].type === 'demon' || seenBluffs.has(String(r)))
                return false;
            seenBluffs.add(String(r));
        }
        for (const [player, r] of Object.entries(d.bluffPlans)) {
            if (!activeMinion.has(player) || !(r === null || role(r)) || (r !== null && (roles_1.ROLES[r].type === 'minion' || roles_1.ROLES[r].type === 'demon')))
                return false;
        }
        const spyRoles = new Set();
        for (const [player, r] of Object.entries(d.spyInitialRoles)) {
            if (!activeMinion.has(player) || !(r === null || role(r)))
                return false;
            if (r !== null) {
                if (spyRoles.has(String(r)))
                    return false;
                spyRoles.add(String(r));
            }
        }
        if (d.spyRedHerring !== null && !activeMinion.has(String(d.spyRedHerring)))
            return false;
        if (d.becameDemonAt !== null && (!(0, game_1.validPhase)(String(d.becameDemonAt)) || Number(String(d.becameDemonAt).slice(1)) > Number(value.night)))
            return false;
    }
    for (const v of Object.values(value.playerStatus))
        if (!record(v) || typeof v.alive !== 'boolean' || typeof v.deadVoteAvailable !== 'boolean')
            return false;
    for (const v of Object.values(value.manualReads))
        if (!record(v) || typeof v.playerId !== 'string' || (v.roleId !== null && !role(v.roleId)) || !['unknown', 'good', 'evil'].includes(String(v.alignment)) || typeof v.note !== 'string')
            return false;
    for (const k of ['completedNights', 'noExecutionDays'])
        if (!Array.isArray(value[k]) || value[k].some((n) => !Number.isInteger(n) || Number(n) < 1 || Number(n) > 99))
            return false;
    const active = new Set((0, game_1.seats)(Number(value.playerCount)));
    const allIds = new Set();
    for (const key of exports.LOG_KEYS) {
        const list = value[key] ?? [];
        if (!Array.isArray(list) || list.length > 5000)
            return false;
        for (const e of list) {
            if (!record(e) || typeof e.id !== 'number' || !Number.isSafeInteger(e.id) || e.id < 0 || typeof e.when !== 'string' || !(0, game_1.validPhase)(e.when) || Number(e.when.slice(1)) > Number(value.night))
                return false;
            if (allIds.has(e.id))
                return false;
            allIds.add(e.id);
            for (const field of ['playerId', 'sourcePlayerId', 'rolePlayerId', 'targetPlayerId', 'nominator', 'nominee', 'player', 'target'])
                if (e[field] !== undefined && (!active.has(String(e[field]))))
                    return false;
            if (e.order !== undefined && (typeof e.order !== 'number' || !Number.isFinite(e.order)))
                return false;
            if (e.sourceEventId !== undefined && (typeof e.sourceEventId !== 'number' || !Number.isFinite(e.sourceEventId)))
                return false;
            if (e.roleId !== undefined && (!role(e.roleId) || !scriptRoles.has(e.roleId)))
                return false;
            if (e.sourceRoleId !== undefined && !role(e.sourceRoleId))
                return false;
            if (e.shownRole !== undefined && (!role(e.shownRole) || !scriptRoles.has(e.shownRole)))
                return false;
            if (key === 'roleClaimLog') {
                if (typeof e.playerId !== 'string' || !record(e.subject) || !['public', 'private'].includes(String(e.visibility)) || !['normal', 'bluff'].includes(String(e.claimType)))
                    return false;
                const s = e.subject;
                if (s.kind === 'role' && (!role(s.roleId) || !scriptRoles.has(s.roleId)))
                    return false;
                if (s.kind === 'tag' && !['FIRST_NIGHT_INFO', 'CONTINUOUS_INFO', 'LACK_OF_INFO', 'WANTS_DEMON_TARGET', 'HIGH_SURVIVAL_VALUE'].includes(String(s.tag)))
                    return false;
                if (s.kind === 'type' && !['townsfolk', 'outsider', 'minion', 'demon'].includes(String(s.roleType)))
                    return false;
                if (s.kind === 'alignment' && !['good', 'evil'].includes(String(s.alignment)))
                    return false;
                if (!['role', 'tag', 'type', 'alignment'].includes(String(s.kind)))
                    return false;
            }
            for (const field of ['recipients', 'targets', 'voters', 'participants', 'players'])
                if (e[field] !== undefined && (!Array.isArray(e[field]) || e[field].some(v => typeof v !== 'string' || !active.has(v)) || Array.isArray(e[field]) && new Set(e[field]).size !== e[field].length))
                    return false;
            if ((key === 'roleClaimLog' || key === 'abilityClaimLog') && !Array.isArray(e.recipients))
                return false;
            if (key === 'abilityClaimLog' && (!Array.isArray(e.targets) || typeof e.playerId !== 'string' || !(e.result === null || typeof e.result === 'string')))
                return false;
            if (key === 'nominationLog' && (!Array.isArray(e.voters) || typeof e.nominator !== 'string' || typeof e.nominee !== 'string'))
                return false;
            if (key === 'talkLog' && (!Array.isArray(e.participants) || e.participants.length < 2 || !(e.topic === null || typeof e.topic === 'string')))
                return false;
            if (key === 'deathLog' && (typeof e.playerId !== 'string' || !['storyteller', 'execution', 'night_death', 'ability', 'other'].includes(String(e.reason))))
                return false;
            if (key === 'revivalLog' && (typeof e.playerId !== 'string' || !e.when.startsWith('N')))
                return false;
            if (key === 'abilityTriggerLog' && (!['virgin', 'slayer'].includes(String(e.roleId)) || typeof e.rolePlayerId !== 'string' || typeof e.targetPlayerId !== 'string' || typeof e.triggered !== 'boolean'))
                return false;
            if (key === 'selfInfoLog') {
                if (['washerwoman', 'investigator'].includes(String(e.roleId)) && (!Array.isArray(e.players) || e.players.length !== 2 || !role(e.shownRole)))
                    return false;
                if (e.roleId === 'librarian' && (typeof e.noOutsiders !== 'boolean' || (!e.noOutsiders && (!Array.isArray(e.players) || e.players.length !== 2 || !role(e.shownRole)))))
                    return false;
                if (['chef', 'empath'].includes(String(e.roleId)) && !Number.isInteger(e.number))
                    return false;
                if (e.roleId === 'fortune_teller' && (!Array.isArray(e.players) || e.players.length !== 2 || !['yes', 'no'].includes(String(e.result))))
                    return false;
                if (['undertaker', 'ravenkeeper'].includes(String(e.roleId)) && (typeof e.player !== 'string' || !role(e.shownRole)))
                    return false;
            }
            if (key === 'selfActionLog' && (typeof e.target !== 'string' || !['monk', 'exorcist', 'slayer'].includes(String(e.roleId))))
                return false;
            if (key === 'demonActionLog' && (e.roleId !== 'imp' || typeof e.target !== 'string' || !e.when.startsWith('N') || Number(e.when.slice(1)) < 2 || !(e.note === null || typeof e.note === 'string')))
                return false;
            if (key === 'minionActionLog') {
                if (!['poisoner', 'spy', 'pit_hag'].includes(String(e.roleId)) || !['poison', 'grimoire', 'transform'].includes(String(e.kind)) || !e.when.startsWith('N') || !(e.note === null || typeof e.note === 'string'))
                    return false;
                if (e.roleId === 'poisoner' && (e.kind !== 'poison' || typeof e.target !== 'string'))
                    return false;
                if (e.roleId === 'spy' && (e.kind !== 'grimoire' || !(e.poisonTarget === null || typeof e.poisonTarget === 'string') || (e.poisonTarget !== null && !active.has(String(e.poisonTarget)))))
                    return false;
                if (e.roleId === 'pit_hag' && (e.kind !== 'transform' || typeof e.target !== 'string' || Number(e.when.slice(1)) < 2 || !role(e.newRole) || !scriptRoles.has(e.newRole)))
                    return false;
            }
            if (e.structured !== undefined) {
                const d = e.structured;
                if (!record(d) || !['pairRole', 'noOutsiders', 'number', 'pairYesNo', 'roleReveal', 'action'].includes(String(d.kind)))
                    return false;
                if (['pairRole', 'pairYesNo'].includes(String(d.kind)) && (!Array.isArray(d.players) || d.players.length !== 2 || d.players.some(v => typeof v !== 'string' || !active.has(v)) || Array.isArray(d.players) && new Set(d.players).size !== d.players.length))
                    return false;
                if (['pairRole', 'roleReveal'].includes(String(d.kind)) && (!role(d.shownRole) || !scriptRoles.has(d.shownRole)))
                    return false;
                if (d.kind === 'number' && !Number.isInteger(d.value))
                    return false;
                if (d.kind === 'pairYesNo' && !['yes', 'no'].includes(String(d.result)))
                    return false;
                if (d.kind === 'roleReveal' && (typeof d.player !== 'string' || !active.has(d.player)))
                    return false;
                if (d.kind === 'action' && (typeof d.target !== 'string' || !active.has(d.target)))
                    return false;
            }
        }
    }
    return true;
}
function loadSnapshot() { try {
    const s = localStorage.getItem(exports.SAVE_KEY);
    if (!s)
        return null;
    const parsed = JSON.parse(s);
    return validateSnapshot(parsed) ? parsed : null;
}
catch {
    return null;
} }
function saveSnapshot(g) { try {
    localStorage.setItem(exports.SAVE_KEY, JSON.stringify(g));
    return true;
}
catch {
    return false;
} }
function loadCheckpoints() { try {
    const v = JSON.parse(localStorage.getItem(exports.CHECKPOINT_KEY) || '[]');
    return Array.isArray(v) ? v.filter(validateSnapshot) : [];
}
catch {
    return [];
} }
function downloadSnapshot(g) {
    const blob = new Blob([JSON.stringify(g, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url;
    a.download = `clocktower-N${g.night}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function deleteEventGroup(g, key, id) {
    const all = exports.LOG_KEYS.flatMap(k => (g[k] ?? []));
    let root = id;
    const seen = new Set();
    while (!seen.has(root)) {
        seen.add(root);
        const e = all.find(e => e.id === root);
        if (e?.sourceEventId === undefined)
            break;
        root = e.sourceEventId;
    }
    const remove = new Set([root]);
    let changed = true;
    while (changed) {
        changed = false;
        for (const e of all)
            if (e.sourceEventId !== undefined && remove.has(e.sourceEventId) && !remove.has(e.id)) {
                remove.add(e.id);
                changed = true;
            }
    }
    remove.add(id);
    const next = { ...g };
    for (const k of exports.LOG_KEYS)
        next[k] = (g[k] ?? []).filter(e => !remove.has(e.id));
    next.playerStatus = (0, game_1.rebuildStatus)(next);
    void key;
    return next;
}
function validateGameLogEntry(value) {
    if (!record(value) || value.schemaVersion !== 1 || typeof value.id !== "string" || !Number.isFinite(value.savedAt))
        return false;
    if (!["snapshot", "finished"].includes(String(value.status)) || !["unknown", "good", "evil", "special"].includes(String(value.outcome)))
        return false;
    if (typeof value.label !== "string" || typeof value.note !== "string" || !validateSnapshot(value.game))
        return false;
    if (value.reasoning === null)
        return true;
    const r = value.reasoning;
    if (!record(r) || !Number.isFinite(r.generatedAt) || !Number.isFinite(r.checked) || !Number.isFinite(r.unique) || !Number.isFinite(r.effectiveWorlds) || typeof r.meta !== "boolean")
        return false;
    if (!record(r.playerShares) || !record(r.presence) || !Array.isArray(r.topWorlds))
        return false;
    for (const share of Object.values(r.playerShares)) {
        if (!record(share) || !Number.isFinite(share.evil) || !Number.isFinite(share.demon) || !Number.isFinite(share.drunk))
            return false;
    }
    return true;
}
function loadGameLogs() {
    try {
        const value = JSON.parse(localStorage.getItem(exports.GAME_LOG_KEY) || "[]");
        return Array.isArray(value) ? value.filter(validateGameLogEntry).sort((a, b) => b.savedAt - a.savedAt) : [];
    }
    catch {
        return [];
    }
}
function saveGameLogs(logs) {
    try {
        localStorage.setItem(exports.GAME_LOG_KEY, JSON.stringify([...logs].sort((a, b) => b.savedAt - a.savedAt).slice(0, exports.MAX_GAME_LOGS)));
        return true;
    }
    catch {
        return false;
    }
}
function createGameLogEntry(g, result, status = "snapshot") {
    const savedAt = Date.now();
    const reasoning = result ? {
        generatedAt: savedAt, checked: result.checked, unique: result.unique, effectiveWorlds: result.effectiveWorlds, meta: result.meta,
        playerShares: Object.fromEntries(Object.entries(result.players).map(([p, s]) => [p, { evil: s.evil, demon: s.demon, drunk: s.drunk }])),
        presence: { ...result.presence },
        topWorlds: result.worlds.slice(0, 8).map(w => ({ initial: { ...w.initial }, current: { ...w.current }, initialAlignment: { ...w.initialAlignment }, currentAlignment: { ...w.currentAlignment }, requiredPoison: { ...w.requiredPoison }, assumptions: [...w.assumptions], changes: w.changes.map(c => ({ ...c })) })),
    } : null;
    return { schemaVersion: 1, id: `${savedAt.toString(36)}-${Math.random().toString(36).slice(2, 8)}`, savedAt, status, outcome: "unknown", label: `${(0, scripts_1.getSnapshotScriptName)(g)} ${g.playerCount}人 / N${g.night}`, note: "", game: JSON.parse(JSON.stringify(g)), reasoning };
}
function updateGameLogEntry(logs, id, patch) {
    return logs.map(log => log.id === id ? { ...log, ...patch } : log);
}
function downloadGameLogEntry(log) {
    const blob = new Blob([JSON.stringify(log, null, 2)], { type: "application/json" }), url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url;
    a.download = `clocktower-log-${new Date(log.savedAt).toISOString().slice(0, 10)}-${log.id.slice(-6)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function downloadGameLogs(logs) {
    const payload = { schemaVersion: 1, exportedAt: Date.now(), games: logs };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url;
    a.download = `clocktower-game-logs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
