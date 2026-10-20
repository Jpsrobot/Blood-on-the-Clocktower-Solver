"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cycle = cycle;
exports.phaseIndex = phaseIndex;
exports.validPhase = validPhase;
exports.compareEvents = compareEvents;
exports.seats = seats;
exports.setupCounts = setupCounts;
exports.defaultAlignmentForRole = defaultAlignmentForRole;
exports.evilRole = evilRole;
exports.evilAlignment = evilAlignment;
exports.latestClaim = latestClaim;
exports.exactClaim = exactClaim;
exports.priorRole = priorRole;
exports.diedByExecution = diedByExecution;
exports.isAliveAt = isAliveAt;
exports.livingNeighbours = livingNeighbours;
exports.rebuildStatus = rebuildStatus;
exports.selfData = selfData;
exports.observations = observations;
exports.empathStableNeighbourShifts = empathStableNeighbourShifts;
exports.dataValid = dataValid;
exports.observationTimingValid = observationTimingValid;
const roles_1 = require("../roles");
function cycle(when) { return Number(when.slice(1)); }
function phaseIndex(when) { return (cycle(when) - 1) * 2 + (when.startsWith("D") ? 1 : 0); }
function validPhase(when) { return /^[ND][1-9]\d*$/.test(when); }
function compareEvents(a, b) {
    return phaseIndex(a.when) - phaseIndex(b.when) || (a.order ?? a.id) - (b.order ?? b.id);
}
function seats(count) {
    const left = Math.ceil((count - 1) / 2), right = Math.floor((count - 1) / 2);
    // Circular order, NOT the two columns concatenated. First and last are neighbours.
    return ["self", ...Array.from({ length: left }, (_, i) => `${i + 1}L`), ...Array.from({ length: right }, (_, i) => `${right - i}R`)];
}
function setupCounts(count, baron = false) {
    const table = { 5: [3, 0, 1], 6: [3, 1, 1], 7: [5, 0, 1], 8: [5, 1, 1], 9: [5, 2, 1], 10: [7, 0, 2], 11: [7, 1, 2], 12: [7, 2, 2], 13: [9, 0, 3], 14: [9, 1, 3], 15: [9, 2, 3] };
    const v = table[count];
    if (!v)
        throw new Error("Only standard 5-15 player games are supported.");
    return { townsfolk: v[0] - (baron ? 2 : 0), outsider: v[1] + (baron ? 2 : 0), minion: v[2], demon: 1 };
}
function defaultAlignmentForRole(role) { return roles_1.ROLES[role].type === "minion" || roles_1.ROLES[role].type === "demon" ? "evil" : "good"; }
function evilRole(role) { return defaultAlignmentForRole(role) === "evil"; }
function evilAlignment(alignment) { return alignment === "evil"; }
function latestClaim(g, player, before) {
    return g.roleClaimLog.filter(c => c.playerId === player && (!before || phaseIndex(c.when) <= phaseIndex(before))).sort(compareEvents).at(-1) ?? null;
}
function exactClaim(g, player, before) {
    if (player === "self" && g.selfRole.shownRole)
        return g.selfRole.shownRole;
    const c = g.roleClaimLog.filter(c => c.playerId === player && c.subject.kind === "role" && (!before || phaseIndex(c.when) <= phaseIndex(before))).sort(compareEvents).at(-1);
    return c?.subject.kind === "role" ? c.subject.roleId : null;
}
function priorRole(g, player) {
    if (player === "self" && g.selfRole.shownRole)
        return g.selfRole.shownRole;
    const c = g.roleClaimLog.filter(c => c.playerId === player && c.claimType !== "bluff" && c.subject.kind === "role").sort(compareEvents).at(-1);
    return c?.subject.kind === "role" ? c.subject.roleId : null;
}
function diedByExecution(d) { return d.reason === "execution" || d.isExecution === true || d.sourceRoleId === "virgin"; }
function isAliveAt(g, player, when, id = Infinity) {
    let alive = true;
    const events = [
        ...g.deathLog.map(d => ({ ...d, kind: "death" })),
        ...(g.revivalLog ?? []).map(r => ({ ...r, kind: "revival" })),
    ].sort(compareEvents);
    for (const e of events) {
        if (e.playerId !== player)
            continue;
        const before = phaseIndex(e.when) < phaseIndex(when) || (e.when === when && (e.order ?? e.id) < id);
        if (!before)
            continue;
        alive = e.kind === "revival";
    }
    return alive;
}
function livingNeighbours(order, player, alive) {
    const i = order.indexOf(player);
    if (i < 0)
        return [];
    const result = [];
    for (const dir of [-1, 1])
        for (let d = 1; d < order.length; d++) {
            const p = order[(i + dir * d + order.length) % order.length];
            if (alive.has(p)) {
                result.push(p);
                break;
            }
        }
    return [...new Set(result)];
}
function rebuildStatus(g) {
    const result = Object.fromEntries(seats(g.playerCount).map(p => [p, { alive: true, deadVoteAvailable: true }]));
    const events = [
        ...g.deathLog.map(d => ({ ...d, kind: "death" })),
        ...(g.revivalLog ?? []).map(r => ({ ...r, kind: "revival" })),
        ...g.nominationLog.map(n => ({ ...n, kind: "nomination" })),
    ].sort(compareEvents);
    for (const e of events) {
        if (e.kind === "death" && result[e.playerId])
            result[e.playerId] = { alive: false, deadVoteAvailable: true };
        if (e.kind === "revival" && result[e.playerId])
            result[e.playerId] = { alive: true, deadVoteAvailable: true };
        if (e.kind === "nomination" && e.votingOccurred !== false)
            for (const p of e.voters)
                if (result[p] && !result[p].alive)
                    result[p].deadVoteAvailable = false;
    }
    return result;
}
function selfData(e) {
    switch (e.roleId) {
        case "washerwoman":
        case "investigator": return { kind: "pairRole", players: e.players, shownRole: e.shownRole };
        case "librarian": return e.noOutsiders ? { kind: "noOutsiders" } : e.players && e.shownRole ? { kind: "pairRole", players: e.players, shownRole: e.shownRole } : null;
        case "chef":
        case "empath": return { kind: "number", value: e.number };
        case "fortune_teller": return { kind: "pairYesNo", players: e.players, result: e.result };
        case "undertaker":
        case "ravenkeeper": return { kind: "roleReveal", player: e.player, shownRole: e.shownRole };
    }
}
function observations(g) {
    const entries = [];
    for (const e of g.selfInfoLog) {
        const data = selfData(e);
        if (data)
            entries.push({ id: e.id, aliases: [e.id], source: "self", role: e.roleId, when: e.when, data, direct: true });
    }
    for (const e of g.abilityClaimLog)
        if (e.structured && e.structured.kind !== "action")
            entries.push({ id: e.id, aliases: [e.id], source: e.sourcePlayerId || e.playerId, role: e.roleId, when: e.when, data: e.structured, direct: false });
    // Repeating the same report does NOT create additional evidence.
    const unique = new Map();
    for (const e of entries) {
        const normalized = e.data.kind === "pairRole" || e.data.kind === "pairYesNo" ? { ...e.data, players: [...e.data.players].sort() } : e.data;
        const key = JSON.stringify([e.source, e.role, e.when, normalized]);
        const old = unique.get(key);
        if (old) {
            old.aliases.push(...e.aliases);
            old.direct ||= e.direct;
        }
        else
            unique.set(key, e);
    }
    return [...unique.values()].sort(compareEvents);
}
/**
 * Finds consecutive Empath reads that changed even though the Empath had the
 * same two living neighbours and neither neighbour died between those reads.
 * This is only a heuristic signal: drunkenness/poison are strong explanations,
 * but custom scripts may contain alignment-changing effects or unimplemented
 * mechanics that can also explain the change.
 */
function empathStableNeighbourShifts(g) {
    const order = seats(g.playerCount);
    const grouped = new Map();
    for (const o of observations(g)) {
        if (o.role !== "empath" || o.data.kind !== "number")
            continue;
        const byWhen = grouped.get(o.source) ?? new Map();
        byWhen.set(o.when, [...(byWhen.get(o.when) ?? []), o]);
        grouped.set(o.source, byWhen);
    }
    const aliveSetAt = (when) => new Set(order.filter(p => isAliveAt(g, p, when, Infinity)));
    const out = [];
    for (const [source, byWhen] of grouped) {
        const records = [...byWhen.entries()].flatMap(([when, entries]) => {
            const values = [...new Set(entries.map(o => o.data.kind === "number" ? o.data.value : NaN))];
            if (values.length !== 1 || !Number.isFinite(values[0]))
                return [];
            return [{
                    when,
                    value: values[0],
                    evidence: [...new Set(entries.flatMap(o => o.aliases))],
                    direct: entries.some(o => o.direct),
                }];
        }).sort((a, b) => phaseIndex(a.when) - phaseIndex(b.when));
        for (let i = 1; i < records.length; i++) {
            const prev = records[i - 1], curr = records[i];
            if (prev.value === curr.value || phaseIndex(prev.when) === phaseIndex(curr.when))
                continue;
            if (!isAliveAt(g, source, prev.when, Infinity) || !isAliveAt(g, source, curr.when, Infinity))
                continue;
            const prevNeighbours = livingNeighbours(order, source, aliveSetAt(prev.when));
            const currNeighbours = livingNeighbours(order, source, aliveSetAt(curr.when));
            if (prevNeighbours.length !== 2 || currNeighbours.length !== 2)
                continue;
            const sameNeighbours = [...prevNeighbours].sort().join("|") === [...currNeighbours].sort().join("|");
            if (!sameNeighbours)
                continue;
            const start = phaseIndex(prev.when), end = phaseIndex(curr.when);
            const nearbyDeath = g.deathLog.some(d => prevNeighbours.includes(d.playerId) && phaseIndex(d.when) > start && phaseIndex(d.when) <= end);
            if (nearbyDeath)
                continue;
            out.push({
                source, fromWhen: prev.when, toWhen: curr.when,
                fromValue: prev.value, toValue: curr.value, neighbours: prevNeighbours,
                evidence: [...new Set([...prev.evidence, ...curr.evidence])],
                direct: prev.direct || curr.direct,
                nights: [...new Set([cycle(prev.when), cycle(curr.when)])],
            });
        }
    }
    return out;
}
function dataValid(role, data, playerCount) {
    if (role === "washerwoman" || role === "librarian" || role === "investigator") {
        if (role === "librarian" && data.kind === "noOutsiders")
            return true;
        return data.kind === "pairRole" && data.players[0] !== data.players[1] && roles_1.ROLES[data.shownRole].type === (role === "washerwoman" ? "townsfolk" : role === "librarian" ? "outsider" : "minion");
    }
    if (role === "chef" || role === "empath")
        return data.kind === "number" && Number.isInteger(data.value) && data.value >= 0 && data.value <= (role === "empath" ? 2 : playerCount);
    if (role === "fortune_teller")
        return data.kind === "pairYesNo" && data.players[0] !== data.players[1];
    if (role === "undertaker" || role === "ravenkeeper")
        return data.kind === "roleReveal";
    return data.kind === "action";
}
function observationTimingValid(role, when) {
    if (!validPhase(when) || !when.startsWith("N"))
        return false;
    if (["washerwoman", "librarian", "investigator", "chef"].includes(role))
        return when === "N1";
    if (role === "undertaker" || role === "monk" || role === "imp")
        return cycle(when) >= 2;
    return true;
}
