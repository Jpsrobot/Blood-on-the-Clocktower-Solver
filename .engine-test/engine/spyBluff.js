"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSpyOpponentProjection = buildSpyOpponentProjection;
exports.rankSpyBluffsFromSearch = rankSpyBluffsFromSearch;
exports.runSpyBluffAdvisor = runSpyBluffAdvisor;
const roles_1 = require("../roles");
const scripts_1 = require("../scripts");
const game_1 = require("./game");
const search_1 = require("./search");
function knownEvilPlayers(g) {
    const result = new Set(["self"]);
    const state = g.minionState;
    if (state?.knownDemon?.playerId)
        result.add(state.knownDemon.playerId);
    for (const minion of state?.knownMinions ?? [])
        result.add(minion.playerId);
    return result;
}
function collectiveGoodCanKnow(visibility, recipients, knownEvil) {
    if (visibility === "public")
        return true;
    return recipients.some((player) => player !== "self" && !knownEvil.has(player));
}
/**
 * Build a counterfactual "good team" view of the current game.
 * Secret evil-role knowledge, Grimoire contents, evil actions, our private reads,
 * and our current planned bluff are deliberately removed. Public mechanical
 * events remain. Private claims are kept only if at least one known-good/unknown
 * player received them, approximating a fully cooperating good team.
 */
function buildSpyOpponentProjection(g) {
    const knownEvil = knownEvilPlayers(g);
    const roleClaimLog = g.roleClaimLog
        .filter((claim) => claim.playerId !== "self")
        .filter((claim) => collectiveGoodCanKnow(claim.visibility, claim.recipients, knownEvil))
        .map((claim) => ({ ...claim, claimType: "normal" }));
    const abilityClaimLog = g.abilityClaimLog
        .filter((claim) => claim.playerId !== "self" && claim.sourcePlayerId !== "self")
        .filter((claim) => collectiveGoodCanKnow(claim.visibility, claim.recipients, knownEvil));
    return {
        ...g,
        selfRole: { shownRole: null },
        selfInfoLog: [],
        selfActionLog: [],
        demonState: { knownMinions: [], storytellerBluffs: [], bluffPlans: {} },
        demonActionLog: [],
        minionState: {
            knownDemon: null,
            knownMinions: [],
            sharedStorytellerBluffs: [],
            bluffPlans: {},
            spyInitialRoles: {},
            spyRedHerring: null,
            becameDemonAt: null,
        },
        minionActionLog: [],
        manualReads: {},
        roleClaimLog,
        abilityClaimLog,
    };
}
function assignmentKey(world, order) {
    return order.map((player) => world.initial[player]).join("|");
}
function supportKind(world, roleId) {
    const actual = world.current.self;
    if (actual === roleId)
        return "actual";
    if (actual === "drunk" &&
        roles_1.ROLES[roleId].type === "townsfolk" &&
        !Object.values(world.current).includes(roleId))
        return "drunk";
    if (world.currentAlignment.self === "evil")
        return "evil";
    return null;
}
function latestCollectiveClaimers(g, roleId) {
    const projection = buildSpyOpponentProjection(g);
    const order = (0, game_1.seats)(g.playerCount);
    return order.filter((player) => player !== "self" && (0, game_1.exactClaim)(projection, player) === roleId);
}
function advisorFlags(g, roleId) {
    const state = g.minionState;
    const entered = {
        self: "spy",
        ...Object.fromEntries(Object.entries(state?.spyInitialRoles ?? {}).filter(([, role]) => !!role)),
    };
    const coverage = Object.keys(entered).filter((player) => (0, game_1.seats)(g.playerCount).includes(player)).length;
    const complete = coverage === g.playerCount;
    const inPlayAt = Object.entries(entered).find(([, role]) => role === roleId)?.[0] ?? null;
    const allyUsers = Object.entries(state?.bluffPlans ?? {})
        .filter(([player, role]) => player !== "self" && role === roleId)
        .map(([player]) => player);
    const opponentClaimers = latestCollectiveClaimers(g, roleId);
    const shared = (state?.sharedStorytellerBluffs ?? []).includes(roleId);
    const shownAbsent = complete && !inPlayAt;
    const safeEligible = allyUsers.length === 0 && opponentClaimers.length === 0 && !inPlayAt;
    return {
        coverage,
        complete,
        inPlayAt,
        allyUsers,
        opponentClaimers,
        shared,
        shownAbsent,
        safeEligible,
    };
}
function rankSpyBluffsFromSearch(g, worlds, worldWeights) {
    const order = (0, game_1.seats)(g.playerCount);
    if (!worlds.length)
        return [];
    const rawWeights = worlds.map((world, index) => {
        const supplied = worldWeights?.[index];
        return supplied && supplied > 0 ? supplied : Math.exp(world.logScore);
    });
    const representedTotal = rawWeights.reduce((sum, value) => sum + value, 0) || 1;
    const GOOD_ROLE_IDS = (0, scripts_1.getSnapshotScriptRoleIds)(g).filter(roleId => {
        const role = roles_1.ROLES[roleId];
        return role.type === "townsfolk" || role.type === "outsider";
    });
    return GOOD_ROLE_IDS.map((roleId) => {
        const byAssignment = new Map();
        worlds.forEach((world, index) => {
            const kind = supportKind(world, roleId);
            if (!kind)
                return;
            const key = assignmentKey(world, order);
            const slot = byAssignment.get(key) ?? { total: 0, actual: 0, drunk: 0, evil: 0 };
            const weight = rawWeights[index];
            slot.total += weight;
            slot[kind] += weight;
            byAssignment.set(key, slot);
        });
        const assignmentWeights = [...byAssignment.values()].map((entry) => entry.total);
        const total = assignmentWeights.reduce((sum, value) => sum + value, 0);
        const square = assignmentWeights.reduce((sum, value) => sum + value * value, 0);
        const actual = [...byAssignment.values()].reduce((sum, entry) => sum + entry.actual, 0);
        const drunk = [...byAssignment.values()].reduce((sum, entry) => sum + entry.drunk, 0);
        const evil = [...byAssignment.values()].reduce((sum, entry) => sum + entry.evil, 0);
        const flags = advisorFlags(g, roleId);
        return {
            roleId,
            supportedAssignments: byAssignment.size,
            effectiveWorlds: square > 0 ? (total * total) / square : 0,
            supportWeight: total / representedTotal,
            goodFacadeWeight: total > 0 ? (actual + drunk) / total : 0,
            actualRoleWeight: total > 0 ? actual / total : 0,
            drunkWeight: total > 0 ? drunk / total : 0,
            evilBluffWeight: total > 0 ? evil / total : 0,
            sharedStorytellerBluff: flags.shared,
            spyShownAbsent: flags.shownAbsent,
            spyShownInPlayAt: flags.inPlayAt,
            opponentClaimers: flags.opponentClaimers,
            allyUsers: flags.allyUsers,
            safeEligible: flags.safeEligible,
        };
    }).sort((a, b) => b.effectiveWorlds - a.effectiveWorlds ||
        b.supportedAssignments - a.supportedAssignments ||
        b.goodFacadeWeight - a.goodFacadeWeight ||
        roles_1.ROLES[a.roleId].name.localeCompare(roles_1.ROLES[b.roleId].name, "ja"));
}
function runSpyBluffAdvisor(g, deep = false, progress) {
    if (g.selfRole.shownRole !== "spy") {
        return {
            generatedAt: Date.now(),
            baseChecked: 0,
            baseUnique: 0,
            baseEffectiveWorlds: 0,
            representedWorlds: 0,
            representedWeight: 0,
            truncated: false,
            deep,
            spyDisplayComplete: false,
            spyDisplayCoverage: 0,
            recommendedRoleId: null,
            rawWorldWinnerRoleId: null,
            candidates: [],
        };
    }
    const projected = buildSpyOpponentProjection(g);
    const options = deep
        ? { attempts: 12000, maxMillis: 11000, beamWidth: 4, seed: 81173, meta: false, worldLimit: 1800 }
        : { attempts: 4200, maxMillis: 4200, beamWidth: 3, seed: 81173, meta: false, worldLimit: 900 };
    const base = (0, search_1.runSearch)(projected, options, progress);
    const candidates = rankSpyBluffsFromSearch(g, base.worlds, base.worldWeights);
    const rawWinner = candidates[0]?.roleId ?? null;
    const safeWinner = candidates.find((candidate) => candidate.safeEligible)?.roleId ?? rawWinner;
    const state = g.minionState;
    const entered = {
        self: "spy",
        ...Object.fromEntries(Object.entries(state?.spyInitialRoles ?? {}).filter(([, role]) => !!role)),
    };
    const coverage = Object.keys(entered).filter((player) => (0, game_1.seats)(g.playerCount).includes(player)).length;
    return {
        generatedAt: Date.now(),
        baseChecked: base.checked,
        baseUnique: base.unique,
        baseEffectiveWorlds: base.effectiveWorlds,
        representedWorlds: base.worlds.length,
        representedWeight: (base.worldWeights ?? []).reduce((sum, value) => sum + value, 0),
        truncated: base.truncated,
        deep,
        spyDisplayComplete: coverage === g.playerCount,
        spyDisplayCoverage: coverage / g.playerCount,
        recommendedRoleId: safeWinner,
        rawWorldWinnerRoleId: rawWinner,
        candidates,
    };
}
