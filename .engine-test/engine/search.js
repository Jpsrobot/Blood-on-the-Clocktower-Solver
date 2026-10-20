"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rng = rng;
exports.empathShiftLogBonus = empathShiftLogBonus;
exports.hardLocks = hardLocks;
exports.drawAssignment = drawAssignment;
exports.runSearch = runSearch;
const roles_1 = require("../roles");
const scripts_1 = require("../scripts");
const model_1 = require("./model");
const game_1 = require("./game");
const mechanics_1 = require("./mechanics");
const evidence_1 = require("./evidence");
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function empathShiftLogBonus(w, signals, g) {
    if (!signals.length)
        return 0;
    const allowed = new Set((0, scripts_1.getSnapshotScriptRoleIds)(g));
    const rolesInWorld = new Set([...Object.values(w.initial), ...Object.values(w.current)]);
    const hasImpairmentRole = [...rolesInWorld].some(id => allowed.has(id) && roles_1.ROLES[id].tags.includes("POISON_DRUNK_ABILITY"));
    const hasAlignmentChanger = [...rolesInWorld].some(id => allowed.has(id) && roles_1.ROLES[id].tags.includes("ALIGNMENT_CHANGING"));
    let bonus = 0;
    for (const signal of signals) {
        const drunkExplanation = w.initial[signal.source] === "drunk" || w.current[signal.source] === "drunk";
        const exactPoisonExplanation = signal.nights.some(n => w.requiredPoison[n] === signal.source);
        const base = signal.direct ? 0.9 : 0.55;
        const explanation = drunkExplanation || exactPoisonExplanation ? 1 : hasImpairmentRole ? 0.35 : hasAlignmentChanger ? 0.12 : 0;
        bonus += base * explanation;
    }
    return Math.min(bonus, 1.8);
}
function shuffle(a, random) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
} return b; }
function combinations(a, n) { if (n === 0)
    return [[]]; return a.flatMap((v, i) => combinations(a.slice(i + 1), n - 1).map(rest => [v, ...rest])); }
function selfIsMinion(g) {
    const shown = g.selfRole.shownRole;
    return !!shown && roles_1.ROLES[shown].type === 'minion';
}
function knownMinionPlayers(g) {
    if (g.selfRole.shownRole && roles_1.ROLES[g.selfRole.shownRole].type === 'demon')
        return (g.demonState?.knownMinions ?? []).map(m => m.playerId);
    if (selfIsMinion(g)) {
        return (g.minionState?.knownMinions ?? []).map(m => m.playerId);
    }
    return [];
}
function knownDemonPlayer(g) {
    if (!selfIsMinion(g))
        return null;
    const state = g.minionState;
    if (state?.knownDemon?.playerId)
        return state.knownDemon.playerId;
    return null;
}
function knownDemonBluffs(g) {
    if (g.playerCount <= 6)
        return new Set();
    if (g.selfRole.shownRole && roles_1.ROLES[g.selfRole.shownRole].type === 'demon')
        return new Set(g.demonState?.storytellerBluffs ?? []);
    if (selfIsMinion(g))
        return new Set(g.minionState?.sharedStorytellerBluffs ?? []);
    return new Set();
}
function hiddenTagForShown(roleId) {
    const type = roles_1.ROLES[roleId].type;
    return type === 'townsfolk' ? 'THINKS_TOWNSFOLK' : type === 'outsider' ? 'THINKS_OUTSIDER' : type === 'minion' ? 'THINKS_MINION' : 'THINKS_DEMON';
}
function hiddenSelfRoles(g, shown) {
    const tag = hiddenTagForShown(shown), allowed = new Set((0, scripts_1.getSnapshotScriptRoleIds)(g));
    return [...allowed].filter(id => roles_1.ROLES[id].tags.includes(tag));
}
function hardLocks(g) {
    const locks = {}, issues = [];
    for (const t of g.abilityTriggerLog.filter(t => t.triggered)) {
        if (locks[t.rolePlayerId] && locks[t.rolePlayerId] !== t.roleId)
            issues.push({ code: 'incompatiblePublicEvents', players: [t.rolePlayerId], evidence: [t.id], strength: 'input' });
        locks[t.rolePlayerId] = t.roleId;
    }
    const shown = g.selfRole.shownRole;
    if (shown && roles_1.ROLES[shown].type === 'minion') {
        if (locks.self && locks.self !== shown)
            issues.push({ code: 'selfRoleConflict', players: ['self'], evidence: [], strength: 'input' });
        locks.self = shown;
    }
    if (shown && roles_1.ROLES[shown].type === 'demon' && hiddenSelfRoles(g, shown).length === 0) {
        if (locks.self && locks.self !== shown)
            issues.push({ code: 'selfRoleConflict', players: ['self'], evidence: [], strength: 'input' });
        locks.self = shown;
    }
    for (const m of g.demonState?.knownMinions ?? []) {
        if (!g.selfRole.shownRole || roles_1.ROLES[g.selfRole.shownRole].type !== 'demon')
            break;
        const p = m.playerId;
        if (locks[p] && roles_1.ROLES[locks[p]].type !== 'minion')
            issues.push({ code: 'knownMinionConflict', players: [p], evidence: [], strength: 'input' });
        if (m.roleId) {
            if (locks[p] && locks[p] !== m.roleId)
                issues.push({ code: 'knownMinionConflict', players: [p], evidence: [], strength: 'input' });
            locks[p] = m.roleId;
        }
    }
    if (selfIsMinion(g)) {
        const state = g.minionState;
        const demon = state?.knownDemon?.playerId;
        if (demon && locks[demon] && roles_1.ROLES[locks[demon]].type !== 'demon')
            issues.push({ code: 'knownDemonConflict', players: [demon], evidence: [], strength: 'input' });
        for (const m of state?.knownMinions ?? []) {
            const p = m.playerId;
            if (locks[p] && roles_1.ROLES[locks[p]].type !== 'minion')
                issues.push({ code: 'knownMinionConflict', players: [p], evidence: [], strength: 'input' });
            if (m.roleId) {
                if (locks[p] && locks[p] !== m.roleId)
                    issues.push({ code: 'knownMinionConflict', players: [p], roles: [m.roleId], evidence: [], strength: 'input' });
                locks[p] = m.roleId;
            }
        }
    }
    const values = Object.values(locks);
    if (new Set(values).size !== values.length)
        issues.push({ code: 'duplicatePublicRole', players: Object.keys(locks), evidence: [], strength: 'input' });
    if (shown && locks.self && locks.self !== shown && !hiddenSelfRoles(g, shown).includes(locks.self))
        issues.push({ code: 'selfRoleConflict', players: ['self'], evidence: [], strength: 'input' });
    return { locks, issues };
}
function drawAssignment(g, random, locks) {
    const ps = (0, game_1.seats)(g.playerCount), fixed = { ...locks };
    const scriptIds = (0, scripts_1.getSnapshotScriptRoleIds)(g), all = scriptIds.map(id => roles_1.ROLES[id]);
    const knownMinions = knownMinionPlayers(g);
    const selfMinion = selfIsMinion(g);
    const m = (0, game_1.setupCounts)(g.playerCount).minion;
    const knownMinionTotal = knownMinions.length + (selfMinion ? 1 : 0);
    if (knownMinionTotal > m || knownMinions.some(p => p === 'self' || !ps.includes(p)))
        return null;
    const knownDemon = knownDemonPlayer(g);
    if (knownDemon && (knownDemon === 'self' || !ps.includes(knownDemon) || knownMinions.includes(knownDemon)))
        return null;
    const fixedMinionRoles = new Set(Object.values(fixed).filter(r => roles_1.ROLES[r]?.type === 'minion'));
    const minionPool = all.filter(r => r.type === 'minion').map(r => r.id);
    const minions = shuffle(combinations(minionPool, m).filter(set => [...fixedMinionRoles].every(r => set.includes(r))), random)[0];
    if (!minions)
        return null;
    const counts = (0, game_1.setupCounts)(g.playerCount, minions.includes('baron'));
    const shown = g.selfRole.shownRole;
    if (shown && !fixed.self) {
        const hidden = hiddenSelfRoles(g, shown).filter(id => scriptIds.includes(id));
        const pickHidden = hidden.length > 0 && random() < .2;
        fixed.self = pickHidden ? hidden[Math.floor(random() * hidden.length)] : shown;
    }
    // A healthy Spy's Grimoire is extremely informative, so most samples are
    // guided toward the entered display. It is NOT a hard lock when the Spy may be poisoned.
    if (shown === 'spy' && g.minionState && random() < .82) {
        for (const [p, r] of Object.entries(g.minionState.spyInitialRoles)) {
            if (!r || !ps.includes(p) || !scriptIds.includes(r))
                continue;
            if (fixed[p] && fixed[p] !== r)
                return null;
            fixed[p] = r;
        }
    }
    const occupiedMinionRoles = new Set(Object.values(fixed).filter(r => roles_1.ROLES[r]?.type === 'minion'));
    const remainingMinionRoles = shuffle(minions.filter(r => !occupiedMinionRoles.has(r)), random);
    for (const p of shuffle(knownMinions, random)) {
        if (fixed[p]) {
            if (roles_1.ROLES[fixed[p]].type !== 'minion')
                return null;
            continue;
        }
        const role = remainingMinionRoles.shift();
        if (!role)
            return null;
        fixed[p] = role;
    }
    const knownSet = new Set(knownMinions);
    if (selfMinion)
        knownSet.add('self');
    for (const [p, r] of Object.entries(fixed))
        if (roles_1.ROLES[r]?.type === 'minion' && !knownSet.has(p) && knownMinionTotal === m)
            return null;
    const required = Object.values(fixed);
    if (required.some(r => !scriptIds.includes(r)) || new Set(required).size !== required.length)
        return null;
    const demonBluffs = knownDemonBluffs(g);
    const outPool = all.filter(r => r.type === 'outsider' && !demonBluffs.has(r.id)).map(r => r.id);
    const outSets = combinations(outPool, counts.outsider).filter(set => required.filter(r => roles_1.ROLES[r].type === 'outsider').every(r => set.includes(r)));
    if (!outSets.length)
        return null;
    const outs = outSets[Math.floor(random() * outSets.length)];
    const tfRequired = required.filter(r => roles_1.ROLES[r].type === 'townsfolk');
    if (tfRequired.length > counts.townsfolk)
        return null;
    const excluded = shown && fixed.self === 'drunk' ? shown : null;
    const pool = all.filter(r => r.type === 'townsfolk' && !tfRequired.includes(r.id) && r.id !== excluded && !demonBluffs.has(r.id)).map(r => r.id);
    if (pool.length < counts.townsfolk - tfRequired.length)
        return null;
    const tfs = [...tfRequired];
    while (tfs.length < counts.townsfolk) {
        const available = pool.filter(r => !tfs.includes(r));
        const weights = available.map(r => 1 + ps.filter(p => (0, game_1.priorRole)(g, p) === r).length * 2);
        let x = random() * weights.reduce((a, b) => a + b, 0), pick = available[0];
        for (let i = 0; i < available.length; i++) {
            x -= weights[i];
            if (x <= 0) {
                pick = available[i];
                break;
            }
        }
        tfs.push(pick);
    }
    const demonRequired = required.filter(r => roles_1.ROLES[r].type === 'demon');
    if (demonRequired.length > 1)
        return null;
    const demonPool = all.filter(r => r.type === 'demon').map(r => r.id);
    if (!demonPool.length)
        return null;
    const demon = demonRequired[0] ?? demonPool[Math.floor(random() * demonPool.length)];
    let roles = [...minions, ...outs, ...tfs, demon];
    if (required.some(r => !roles.includes(r)))
        return null;
    for (const r of required) {
        const i = roles.indexOf(r);
        if (i < 0)
            return null;
        roles.splice(i, 1);
    }
    const result = { ...fixed };
    for (const p of shuffle(ps.filter(p => !fixed[p]), random)) {
        const claim = (0, game_1.priorRole)(g, p);
        const weights = roles.map(r => r === claim ? 12 : r === 'drunk' && claim && roles_1.ROLES[claim].type === 'townsfolk' && !Object.values({ ...fixed }).includes(claim) ? 3 : 1);
        let x = random() * weights.reduce((a, b) => a + b, 0), index = 0;
        for (let i = 0; i < roles.length; i++) {
            x -= weights[i];
            if (x <= 0) {
                index = i;
                break;
            }
        }
        result[p] = roles[index];
        roles.splice(index, 1);
    }
    if (knownMinionTotal === m && ps.some(p => !knownSet.has(p) && roles_1.ROLES[result[p]].type === 'minion'))
        return null;
    if (knownDemon && roles_1.ROLES[result[knownDemon]].type !== 'demon')
        return null;
    return result;
}
function runSearch(g, options = {}, progress) {
    const opts = { ...model_1.DEFAULT_SEARCH_OPTIONS, ...options }, start = Date.now(), random = rng(opts.seed), ps = (0, game_1.seats)(g.playerCount);
    const { locks, issues } = hardLocks(g);
    const evidence = (0, evidence_1.analyzeEvidence)(g);
    const empathShifts = (0, game_1.empathStableNeighbourShifts)(g);
    const candidates = new Map();
    let checked = 0, accepted = 0;
    if (!issues.length)
        for (; checked < opts.attempts; checked++) {
            if (Date.now() - start > opts.maxMillis)
                break;
            const assignment = drawAssignment(g, random, locks);
            if (!assignment)
                continue;
            const key = ps.map(p => assignment[p]).join('|');
            if (candidates.has(key))
                continue;
            const worlds = (0, mechanics_1.evaluateAssignment)(assignment, g, opts.beamWidth);
            if (worlds.length) {
                accepted++;
                candidates.set(key, worlds);
            }
            if (progress && checked % 100 === 0)
                progress(checked, candidates.size);
        }
    const shares = Object.fromEntries(ps.map(p => [p, { evil: 0, demon: 0, drunk: 0, roles: {}, poison: {} }]));
    const result = { kind: 'sample', checked, accepted, unique: candidates.size, elapsedMs: Date.now() - start, exhaustive: false, beamWidth: opts.beamWidth, seed: opts.seed, meta: opts.meta, effectiveWorlds: 0, truncated: checked < opts.attempts, players: shares, presence: {}, info: {}, worlds: [], examples: {}, issues: [...issues, ...evidence.issues] };
    const weighted = [];
    for (const histories of candidates.values())
        for (const w of histories) {
            let log = w.logScore - Math.log(histories.length);
            log += empathShiftLogBonus(w, empathShifts, g);
            if (opts.meta)
                for (const [r, e] of Object.entries(evidence.global))
                    if (Object.values(w.initial).includes(r))
                        log += Math.min(e.points, 2) * .15;
            weighted.push({ w, log });
        }
    if (!weighted.length)
        return result;
    const max = weighted.reduce((m, x) => Math.max(m, x.log), -Infinity);
    let total = 0, sq = 0;
    const assignWeights = new Map();
    for (const { w, log } of weighted) {
        const weight = Math.exp(log - max);
        total += weight;
        const key = ps.map(p => w.initial[p]).join('|');
        assignWeights.set(key, (assignWeights.get(key) ?? 0) + weight);
        for (const p of ps) {
            const s = shares[p], r = w.current[p];
            if (w.currentAlignment[p] === "evil")
                s.evil += weight;
            if (roles_1.ROLES[r].type === 'demon' && w.alive.includes(p))
                s.demon += weight;
            if (w.current[p] === 'drunk')
                s.drunk += weight;
            s.roles[r] = (s.roles[r] ?? 0) + weight;
            for (const [n, who] of Object.entries(w.requiredPoison))
                if (who === p)
                    s.poison[Number(n)] = (s.poison[Number(n)] ?? 0) + weight;
        }
        for (const role of new Set(Object.values(w.initial)))
            result.presence[role] = (result.presence[role] ?? 0) + weight;
        for (const [id, state] of Object.entries(w.info)) {
            const slot = result.info[Number(id)] ?? { works: 0, registration: 0, poison: 0, drunk: 0, bluff: 0, lie: 0, missing: 0 };
            slot[state] += weight;
            result.info[Number(id)] = slot;
        }
    }
    for (const w of assignWeights.values())
        sq += w * w;
    result.effectiveWorlds = total * total / sq;
    for (const s of Object.values(shares)) {
        s.evil /= total;
        s.demon /= total;
        s.drunk /= total;
        for (const r of Object.keys(s.roles))
            s.roles[r] /= total;
        for (const n of Object.keys(s.poison))
            s.poison[Number(n)] /= total;
    }
    for (const r of Object.keys(result.presence))
        result.presence[r] /= total;
    for (const v of Object.values(result.info)) {
        const sum = Object.values(v).reduce((a, b) => a + b, 0);
        for (const k of Object.keys(v))
            v[k] /= sum;
    }
    weighted.sort((a, b) => b.log - a.log);
    const topWorlds = weighted.slice(0, opts.worldLimit);
    result.worlds = topWorlds.map(x => x.w);
    result.worldWeights = topWorlds.map(x => Math.exp(x.log - max) / total);
    for (const p of ps) {
        const good = weighted.find(x => x.w.currentAlignment[p] === "good")?.w;
        const evil = weighted.find(x => x.w.currentAlignment[p] === "evil")?.w;
        result.examples[p] = { ...(good ? { good } : {}), ...(evil ? { evil } : {}) };
    }
    result.elapsedMs = Date.now() - start;
    return result;
}
