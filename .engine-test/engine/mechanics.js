"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canRegisterRole = canRegisterRole;
exports.alignmentOptions = alignmentOptions;
exports.chefRange = chefRange;
exports.infoMatches = infoMatches;
exports.validSetup = validSetup;
exports.evaluateAssignment = evaluateAssignment;
/**
 * Timeline mechanics. Trouble Brewing has the deepest coverage; later scripts
 * add exact mechanics incrementally. Tags alone never resolve an ability.
 * References and explicit model limits are in docs/RULES_AND_LIMITS.md.
 */
const roles_1 = require("../roles");
const scripts_1 = require("../scripts");
const game_1 = require("./game");
function canRegisterRole(actual, seen, impaired = false) {
    if (actual === seen)
        return true;
    if (impaired)
        return false;
    const type = roles_1.ROLES[seen].type;
    return actual === "spy" ? type === "townsfolk" || type === "outsider" : actual === "recluse" ? type === "minion" || type === "demon" : false;
}
function alignmentOptions(p, c) {
    const literalAlignment = c.alignment?.[p] ?? (0, game_1.defaultAlignmentForRole)(c.roles[p] ?? c.initial[p]);
    const literal = literalAlignment === "evil" ? 1 : 0;
    if (c.poisonTarget !== p && (c.roles[p] === "spy" || c.roles[p] === "recluse"))
        return [0, 1];
    return [literal];
}
function chefRange(c) {
    let min = 0, max = 0;
    for (let i = 0; i < c.order.length; i++) {
        const a = alignmentOptions(c.order[i], c), b = alignmentOptions(c.order[(i + 1) % c.order.length], c);
        // Registration may differ per PAIR. Do not give Recluse one global nightly alignment.
        const values = a.flatMap(x => b.map(y => x * y));
        min += Math.min(...values);
        max += Math.max(...values);
    }
    return [min, max];
}
function infoMatches(role, source, data, c) {
    if (data.kind === "pairRole")
        return data.players.some(p => !!c.roles[p] && canRegisterRole(c.roles[p], data.shownRole, c.poisonTarget === p));
    if (data.kind === "noOutsiders")
        return Object.entries(c.roles).every(([p, r]) => roles_1.ROLES[r].type !== "outsider" || (r === "recluse" && c.poisonTarget !== p));
    if (data.kind === "number" && role === "chef") {
        const [lo, hi] = chefRange(c);
        return data.value >= lo && data.value <= hi;
    }
    if (data.kind === "number" && role === "empath") {
        const ns = (0, game_1.livingNeighbours)(c.order, source, c.alive);
        if (ns.length === 0)
            return false;
        const opts = ns.map(p => alignmentOptions(p, c));
        return data.value >= opts.reduce((a, b) => a + Math.min(...b), 0) && data.value <= opts.reduce((a, b) => a + Math.max(...b), 0);
    }
    if (data.kind === "pairYesNo") {
        const definitelyYes = data.players.some(p => c.roles[p] === "imp" || p === c.redHerring);
        const optionallyYes = data.players.some(p => c.roles[p] === "recluse" && c.poisonTarget !== p);
        // A dead Imp remains the Imp. Death does not remove Demon registration.
        return data.result === "yes" ? definitelyYes || optionallyYes : !definitelyYes;
    }
    if (data.kind === "roleReveal")
        return !!c.roles[data.player] && canRegisterRole(c.roles[data.player], data.shownRole, c.poisonTarget === data.player);
    return true;
}
function literalMatches(role, source, data, c) {
    if (data.kind === "pairRole")
        return data.players.some(p => c.roles[p] === data.shownRole);
    if (data.kind === "noOutsiders")
        return !Object.values(c.roles).some(r => roles_1.ROLES[r].type === "outsider");
    if (data.kind === "roleReveal")
        return c.roles[data.player] === data.shownRole;
    if (data.kind === "pairYesNo")
        return (data.result === "yes") === data.players.some(p => c.roles[p] === "imp" || p === c.redHerring);
    if (data.kind === "number" && role === "chef")
        return data.value === c.order.reduce((n, p, i) => {
            const a = c.alignment?.[p] ?? (0, game_1.defaultAlignmentForRole)(c.roles[p] ?? c.initial[p]);
            const q = c.order[(i + 1) % c.order.length];
            const b = c.alignment?.[q] ?? (0, game_1.defaultAlignmentForRole)(c.roles[q] ?? c.initial[q]);
            return n + Number(a === "evil" && b === "evil");
        }, 0);
    if (data.kind === "number" && role === "empath")
        return data.value === (0, game_1.livingNeighbours)(c.order, source, c.alive).filter(p => (c.alignment?.[p] ?? (0, game_1.defaultAlignmentForRole)(c.roles[p] ?? c.initial[p])) === "evil").length;
    return true;
}
function validSetup(initial, g) {
    const ps = (0, game_1.seats)(g.playerCount), values = ps.map(p => initial[p]);
    const scriptRoles = new Set((0, scripts_1.getSnapshotScriptRoleIds)(g));
    if (values.some(v => !roles_1.ROLES[v] || !scriptRoles.has(v)) || new Set(values).size !== values.length)
        return false;
    const expected = (0, game_1.setupCounts)(g.playerCount, values.includes("baron"));
    for (const type of ["townsfolk", "outsider", "minion", "demon"])
        if (values.filter(r => roles_1.ROLES[r].type === type).length !== expected[type])
            return false;
    const shown = g.selfRole.shownRole;
    if (shown) {
        const shownType = roles_1.ROLES[shown].type;
        const hiddenTag = shownType === "townsfolk" ? "THINKS_TOWNSFOLK" : shownType === "outsider" ? "THINKS_OUTSIDER" : shownType === "minion" ? "THINKS_MINION" : "THINKS_DEMON";
        if (initial.self !== shown && !roles_1.ROLES[initial.self].tags.includes(hiddenTag))
            return false;
        if (initial.self === "drunk" && values.includes(shown))
            return false;
    }
    if (shown && roles_1.ROLES[shown].type === "demon" && initial.self === shown) {
        for (const m of g.demonState?.knownMinions ?? []) {
            if (roles_1.ROLES[initial[m.playerId]]?.type !== "minion")
                return false;
            if (m.roleId && initial[m.playerId] !== m.roleId)
                return false;
        }
        if (g.playerCount >= 7) {
            const bluffs = new Set(g.demonState?.storytellerBluffs ?? []);
            for (const role of values)
                if (bluffs.has(role))
                    return false;
        }
    }
    if (shown && roles_1.ROLES[shown].type === "minion") {
        const state = g.minionState;
        if (initial.self !== shown)
            return false;
        if (state?.knownDemon && roles_1.ROLES[initial[state.knownDemon.playerId]]?.type !== "demon")
            return false;
        for (const m of state?.knownMinions ?? []) {
            if (roles_1.ROLES[initial[m.playerId]]?.type !== "minion")
                return false;
            if (m.roleId && initial[m.playerId] !== m.roleId)
                return false;
        }
        if (g.playerCount >= 7) {
            const bluffs = new Set(state?.sharedStorytellerBluffs ?? []);
            for (const role of values)
                if (bluffs.has(role))
                    return false;
        }
    }
    return true;
}
function copyWorld(w) { return { ...w, current: { ...w.current }, initialAlignment: { ...w.initialAlignment }, currentAlignment: { ...w.currentAlignment }, believedRoles: { ...w.believedRoles }, alive: [...w.alive], poison: { ...w.poison }, requiredPoison: { ...w.requiredPoison }, info: { ...w.info }, changes: [...w.changes], arbitraryDeathNights: [...w.arbitraryDeathNights], assumptions: [...w.assumptions] }; }
function activePoison(w, choice) {
    if (!choice)
        return null;
    const p = Object.keys(w.current).find(p => w.current[p] === "poisoner" && w.alive.includes(p));
    return p && p !== choice ? choice : null;
}
function context(w, choice, g) { return { roles: w.current, initial: w.initial, alignment: w.currentAlignment, alive: new Set(w.alive), poisonTarget: activePoison(w, choice), redHerring: w.redHerring, order: (0, game_1.seats)(g.playerCount) }; }
function requirePoison(w, n, target) { w.requiredPoison[n] = target; }
function addAssumption(w, key, cost) { if (!w.assumptions.includes(key)) {
    w.assumptions.push(key);
    w.logScore -= cost;
} }
function processPitHagAction(w, action, n, poisonChoice) {
    if (n < 2 || action.when !== `N${n}`)
        return [w];
    if (!w.alive.includes("self") || w.current.self !== "pit_hag")
        return [];
    const next = copyWorld(w);
    if (activePoison(next, poisonChoice) === "self") {
        addAssumption(next, `pitHagImpaired:N${n}:${action.target}:${action.newRole}`, .15);
        return [next];
    }
    // Pit-Hag can only create a character that is not currently in play.
    if (Object.values(next.current).includes(action.newRole)) {
        addAssumption(next, `pitHagInPlay:N${n}:${action.target}:${action.newRole}`, 0);
        return [next];
    }
    const fromRole = next.current[action.target];
    next.current[action.target] = action.newRole;
    next.changes.push({ when: action.when, playerId: action.target, fromRole, toRole: action.newRole, kind: "pit_hag" });
    // Character changes do not change alignment. If a Demon is created, deaths
    // for this night are arbitrary rather than being validated as normal attacks.
    if (roles_1.ROLES[action.newRole].type === "demon" && !next.arbitraryDeathNights.includes(n)) {
        next.arbitraryDeathNights.push(n);
    }
    return [next];
}
function informationStatus(w, o, c, g) {
    if (!(0, game_1.dataValid)(o.role, o.data, g.playerCount) || !(0, game_1.observationTimingValid)(o.role, o.when))
        return o.direct ? null : "lie";
    const actual = w.current[o.source];
    const pretending = actual === "drunk" && w.believedRoles[o.source] === o.role;
    if (actual !== o.role && !pretending)
        return o.direct ? null : "bluff";
    if (o.role === "ravenkeeper") {
        if (!g.deathLog.some(d => d.playerId === o.source && d.when === o.when))
            return o.direct ? (g.completedNights.includes((0, game_1.cycle)(o.when)) ? null : "missing") : "lie";
    }
    else if (!c.alive.has(o.source))
        return o.direct ? null : "lie";
    if (o.role === "undertaker") {
        const d = g.deathLog.find(d => (0, game_1.diedByExecution)(d) && d.when === `D${(0, game_1.cycle)(o.when) - 1}`);
        if (d && o.data.kind === "roleReveal" && d.playerId !== o.data.player)
            return o.direct ? null : "lie";
        if (!d && g.noExecutionDays.includes((0, game_1.cycle)(o.when) - 1))
            return o.direct ? null : "lie";
        // A missing execution is missing input, not proof that no execution happened.
    }
    if (pretending)
        return "drunk";
    if (c.poisonTarget === o.source)
        return "poison";
    if (!infoMatches(o.role, o.source, o.data, c))
        return o.direct ? null : "lie";
    return literalMatches(o.role, o.source, o.data, c) ? "works" : "registration";
}
function processRevival(w, e) {
    if (w.alive.includes(e.playerId))
        return [];
    const reviver = w.alive.find(p => roles_1.ROLES[w.current[p]]?.tags.includes("REVIVES"));
    if (!reviver)
        return [];
    const next = copyWorld(w);
    next.alive = [...next.alive, e.playerId];
    addAssumption(next, `genericRevival:${e.when}:${e.playerId}`, .08);
    return [next];
}
function processDeath(w, d, n, poisonChoice, selfKill) {
    if (!w.alive.includes(d.playerId))
        return [];
    const before = w.alive.length, role = w.current[d.playerId], poison = activePoison(w, poisonChoice);
    const next = copyWorld(w);
    next.alive = next.alive.filter(p => p !== d.playerId);
    if (role === "saint" && (0, game_1.diedByExecution)(d) && poison !== d.playerId) {
        next.ended = true;
        next.endReason = "saint";
    }
    if (roles_1.ROLES[role].type !== "demon") {
        const livingDemon = next.alive.find(p => roles_1.ROLES[next.current[p]].type === "demon");
        if (!next.ended && next.alive.length <= 2 && livingDemon && roles_1.ROLES[next.current[livingDemon]].solverSupport === "full") {
            next.ended = true;
            next.endReason = "twoAlive";
        }
        return [next];
    }
    const anotherLivingDemon = next.alive.find(p => roles_1.ROLES[next.current[p]].type === "demon");
    if (role !== "imp") {
        // Multiple Demons can exist after a Pit-Hag transformation. Losing one of
        // them does not end the game while another Demon character remains alive.
        if (anotherLivingDemon)
            return [next];
        // Generic-script fallback: keep the history alive rather than falsely ruling out
        // a world when a non-TB Demon has an unimplemented survival/change mechanic.
        addAssumption(next, `genericDemonDeath:${d.when}:${role}`, .05);
        return [next];
    }
    if (anotherLivingDemon)
        return [next];
    const sw = next.alive.find(p => next.current[p] === "scarlet_woman" && p !== activePoison(next, poisonChoice));
    if (sw && before >= 5) {
        next.current[sw] = "imp";
        next.changes.push({ when: d.when, from: d.playerId, to: sw, kind: "scarlet" });
        return [next];
    }
    if (selfKill) {
        const successors = next.alive.filter(p => roles_1.ROLES[next.current[p]].type === "minion");
        if (successors.length)
            return successors.map(to => { const branch = copyWorld(next); branch.current[to] = "imp"; branch.changes.push({ when: d.when, from: d.playerId, to, kind: "starpass" }); if (branch.alive.length <= 2) {
                branch.ended = true;
                branch.endReason = "twoAlive";
            } return branch; });
    }
    next.ended = true;
    next.endReason = "demonDeath";
    // The UI explicitly labels rare Recluse-as-successor interactions as outside this model.
    void n;
    return [next];
}
function scoreClaims(w, g) {
    for (const p of (0, game_1.seats)(g.playerCount)) {
        if (p === "self" && g.selfRole.shownRole)
            continue;
        const entries = g.roleClaimLog.filter(c => c.playerId === p && c.claimType !== "bluff").sort(game_1.compareEvents);
        const c = entries.at(-1);
        if (!c)
            continue;
        const role = w.initial[p];
        if (c.subject.kind === "role") {
            if (role === c.subject.roleId)
                w.logScore += 1.5;
            else if (w.believedRoles[p] === c.subject.roleId)
                w.logScore += 1.1;
        }
        else if (c.subject.kind === "tag") {
            if (roles_1.ROLES[role].tags.includes(c.subject.tag))
                w.logScore += .6;
        }
        else if (c.subject.kind === "type") {
            if (roles_1.ROLES[role].type === c.subject.roleType)
                w.logScore += .6;
        }
        else if (c.subject.alignment === w.initialAlignment[p])
            w.logScore += .3;
    }
}
/** Returns representative compatible histories, not an exhaustive world set. */
function evaluateAssignment(initial, g, beamWidth = 3) {
    if (!validSetup(initial, g))
        return [];
    const obs = (0, game_1.observations)(g), order = (0, game_1.seats)(g.playerCount);
    const initialAlignment = Object.fromEntries(order.map(p => [p, (0, game_1.defaultAlignmentForRole)(initial[p])]));
    const hasFT = Object.values(initial).includes("fortune_teller");
    const herrings = hasFT ? order.filter(p => initialAlignment[p] === "good") : [null];
    const drunk = order.find(p => initial[p] === "drunk");
    const scriptRoles = (0, scripts_1.getSnapshotScriptRoleIds)(g).map(id => roles_1.ROLES[id]);
    const unselectedTownsfolk = scriptRoles.filter(r => r.type === "townsfolk" && !Object.values(initial).includes(r.id)).map(r => r.id);
    const relevantBeliefs = drunk ? [...new Set([
            ...obs.filter(o => o.source === drunk).map(o => o.role),
            ...g.roleClaimLog.filter(c => c.playerId === drunk && c.subject.kind === "role").flatMap(c => c.subject.kind === "role" ? [c.subject.roleId] : []),
        ])].filter(r => unselectedTownsfolk.includes(r)) : [];
    const beliefs = drunk === "self" && g.selfRole.shownRole ? [g.selfRole.shownRole] : drunk ? (relevantBeliefs.length ? relevantBeliefs : unselectedTownsfolk.slice(0, 1)) : [null];
    const selfBelief = g.selfRole.shownRole && initial.self !== g.selfRole.shownRole ? g.selfRole.shownRole : null;
    let worlds = herrings.flatMap(redHerring => beliefs.map(belief => ({ initial, current: { ...initial }, initialAlignment: { ...initialAlignment }, currentAlignment: { ...initialAlignment }, believedRoles: { ...(drunk && belief ? { [drunk]: belief } : {}), ...(selfBelief ? { self: selfBelief } : {}) }, alive: order, redHerring, poison: {}, requiredPoison: {}, info: {}, changes: [], arbitraryDeathNights: [], logScore: 0, assumptions: [], ended: false })));
    for (const w of worlds)
        scoreClaims(w, g);
    const lastPhase = Math.max((g.night - 1) * 2, ...[...g.roleClaimLog, ...g.abilityClaimLog, ...g.deathLog, ...(g.revivalLog ?? []), ...g.nominationLog, ...g.abilityTriggerLog, ...g.selfInfoLog, ...g.selfActionLog, ...(g.demonActionLog ?? []), ...(g.minionActionLog ?? []), ...g.talkLog].map(e => (0, game_1.phaseIndex)(e.when)), ...g.noExecutionDays.map(n => (0, game_1.phaseIndex)(`D${n}`)));
    for (let n = 1; n <= g.night; n++) {
        const nextWorlds = [];
        const nw = `N${n}`, dw = `D${n}`;
        const nightDeaths = g.deathLog.filter(d => d.when === nw).sort(game_1.compareEvents);
        const nightLifeEvents = [
            ...nightDeaths.map(e => ({ ...e, kind: "death" })),
            ...(g.revivalLog ?? []).filter(e => e.when === nw).map(e => ({ ...e, kind: "revival" })),
        ].sort(game_1.compareEvents);
        const normalDeaths = nightDeaths.filter(d => d.reason === "night_death" || d.sourceRoleId === "imp");
        const demonActions = (g.demonActionLog ?? []).filter(a => a.when === nw).sort(game_1.compareEvents);
        const demonAction = demonActions.at(-1);
        const pitHagAction = (g.minionActionLog ?? []).find((a) => a.roleId === "pit_hag" && a.when === nw);
        const initialImpRules = Object.values(initial).includes("imp");
        if (initialImpRules && (demonActions.length > 1 || (n === 1 && (normalDeaths.length || demonActions.length))))
            return [];
        const dayEvents = [
            ...g.nominationLog.filter(e => e.when === dw).map(e => ({ ...e, kind: "nomination" })),
            ...g.abilityTriggerLog.filter(e => e.when === dw).map(e => ({ ...e, kind: "trigger" })),
            ...g.deathLog.filter(e => e.when === dw).map(e => ({ ...e, kind: "death" })),
        ].sort(game_1.compareEvents);
        for (const previous of worlds) {
            if (previous.ended)
                continue;
            if (g.selfActionLog.some(a => a.roleId === "monk" && a.when === nw) && (!previous.alive.includes("self") || n === 1))
                continue;
            const pk = previous.alive.find(p => previous.current[p] === "poisoner");
            const recordedPoison = (g.minionActionLog ?? []).find((a) => a.roleId === "poisoner" && a.when === nw);
            const spyRecord = (g.minionActionLog ?? []).find((a) => a.roleId === "spy" && a.when === nw);
            const forcedPoison = recordedPoison?.target ?? null;
            if (recordedPoison && (pk !== "self" || !previous.alive.includes("self")))
                continue;
            if (spyRecord && (previous.current.self !== "spy" || !previous.alive.includes("self")))
                continue;
            if (forcedPoison && !pk)
                continue;
            const choices = forcedPoison ? [forcedPoison] : pk ? [null, ...order.filter(p => p !== pk)] : [null];
            for (const poisonChoice of choices) {
                // Spy information is an ability result. A healthy Spy's N1 Grimoire
                // must match the entered display, but a Spy poisoned by a teammate may
                // have been shown arbitrary information instead.
                if (g.selfRole.shownRole === "spy" && n === 1 && poisonChoice !== "self") {
                    const mismatch = Object.entries(g.minionState?.spyInitialRoles ?? {}).some(([p, role]) => !!role && initial[p] !== role);
                    if (mismatch)
                        continue;
                    const shownHerring = g.minionState?.spyRedHerring ?? null;
                    if (shownHerring && previous.redHerring !== shownHerring)
                        continue;
                }
                // The same applies to a poison reminder seen on later Grimoire views.
                // If the Spy is healthy, the displayed poison target must be the real
                // target. If the Spy itself is the real poison target, the display may
                // be misinformation and therefore does not constrain the target.
                if (g.selfRole.shownRole === "spy" &&
                    spyRecord?.poisonTarget &&
                    poisonChoice !== "self" &&
                    poisonChoice !== spyRecord.poisonTarget)
                    continue;
                let branches = [copyWorld(previous)];
                for (const b of branches)
                    b.poison[n] = poisonChoice;
                if (pitHagAction)
                    branches = branches.flatMap(b => processPitHagAction(b, pitHagAction, n, poisonChoice));
                if (!branches.length)
                    continue;
                const phaseWorld = branches[0];
                const c = context(phaseWorld, poisonChoice, g);
                const demon = phaseWorld.alive.find(p => roles_1.ROLES[phaseWorld.current[p]].type === "demon");
                const impDemon = phaseWorld.alive.find(p => phaseWorld.current[p] === "imp");
                const impRules = !!impDemon;
                const arbitraryDeaths = phaseWorld.arbitraryDeathNights.includes(n);
                const scriptAllowsExtraDeaths = (0, scripts_1.getSnapshotScriptRoleIds)(g).some(id => id !== "imp" && id !== "slayer" && roles_1.ROLES[id].type !== "demon" && roles_1.ROLES[id].tags.includes("KILLS"));
                const strictImpDeathCount = impRules && !arbitraryDeaths && !scriptAllowsExtraDeaths;
                const monk = phaseWorld.alive.find(p => phaseWorld.current[p] === "monk" && c.poisonTarget !== p);
                const monkAction = monk === "self" ? g.selfActionLog.find(a => a.roleId === "monk" && a.when === nw) : undefined;
                if (demonAction && (impDemon !== "self" || !phaseWorld.alive.includes("self")))
                    continue;
                if (strictImpDeathCount && normalDeaths.length > 1)
                    continue;
                if (strictImpDeathCount && normalDeaths.length) {
                    const victim = normalDeaths[0].playerId;
                    if (!demon || demon === c.poisonTarget)
                        continue;
                    let mayorRedirect = false;
                    if (demonAction) {
                        const target = demonAction.target;
                        if (!phaseWorld.alive.includes(target))
                            continue;
                        if (victim !== target) {
                            // The only ordinary TB way for an Imp attack to kill a different player is Mayor redirection.
                            if (phaseWorld.current[target] !== "mayor" || c.poisonTarget === target || !phaseWorld.alive.includes(victim))
                                continue;
                            mayorRedirect = true;
                            for (const b of branches)
                                addAssumption(b, `mayorRedirect:${nw}:${target}:${victim}`, .12);
                        }
                    }
                    if (!mayorRedirect) {
                        if (phaseWorld.current[victim] === "soldier" && c.poisonTarget !== victim)
                            continue;
                        if (monkAction?.target === victim)
                            continue;
                        if (phaseWorld.current[victim] === "soldier")
                            requirePoison(branches[0], n, victim);
                        if (g.selfRole.shownRole === "monk" && initial.self === "monk" && g.selfActionLog.some(a => a.roleId === "monk" && a.when === nw && a.target === victim) && c.poisonTarget === "self")
                            requirePoison(branches[0], n, "self");
                    }
                }
                else if (strictImpDeathCount && n >= 2 && g.completedNights.includes(n)) {
                    if (!impDemon)
                        continue;
                    if (demonAction) {
                        const target = demonAction.target;
                        if (!phaseWorld.alive.includes(target)) {
                            // Deliberately attacking a dead player causes no new death and can support a bluff.
                        }
                        else if (c.poisonTarget === impDemon) {
                            requirePoison(branches[0], n, impDemon);
                        }
                        else if (target === impDemon) {
                            // A healthy Imp that targets themself must die and attempt a starpass.
                            continue;
                        }
                        else if (phaseWorld.current[target] === "soldier" && c.poisonTarget !== target) {
                            // Soldier survives a healthy Demon attack.
                        }
                        else if (monkAction?.target === target) {
                            // A directly recorded self-Monk protection explains the no-death night.
                        }
                        else if (monk && monk !== target) {
                            // Another living Monk could have protected the selected target. This is an inferred choice.
                            for (const b of branches)
                                addAssumption(b, `monkProtect:${nw}:${target}`, .2);
                        }
                        else {
                            continue;
                        }
                    }
                    else {
                        const alreadyDead = phaseWorld.alive.length < order.length;
                        const soldier = phaseWorld.alive.some(p => phaseWorld.current[p] === "soldier" && c.poisonTarget !== p);
                        const canProtect = !!monk;
                        if (!alreadyDead && !soldier && !canProtect && c.poisonTarget !== impDemon)
                            continue;
                        if (!alreadyDead && !soldier && !canProtect && c.poisonTarget === impDemon)
                            requirePoison(branches[0], n, impDemon);
                    }
                }
                for (const e of nightLifeEvents) {
                    if (e.kind === "death") {
                        const impSelfKill = !arbitraryDeaths && !!impDemon && e.playerId === impDemon && (e.reason === "night_death" || e.sourceRoleId === "imp");
                        branches = branches.flatMap(b => processDeath(b, e, n, poisonChoice, impSelfKill));
                    }
                    else {
                        branches = branches.flatMap(b => processRevival(b, e));
                    }
                }
                for (const b of branches) {
                    if (b.ended && (lastPhase > (0, game_1.phaseIndex)(nw) || obs.some(o => o.when === nw && o.direct)))
                        continue;
                    let valid = true;
                    for (const o of obs.filter(o => o.when === nw)) {
                        const now = context(b, poisonChoice, g);
                        const disposition = informationStatus(b, o, now, g);
                        if (!disposition) {
                            valid = false;
                            break;
                        }
                        for (const id of o.aliases)
                            b.info[id] = disposition;
                        if (disposition === "lie")
                            addAssumption(b, `lie:${o.source}`, 3.3);
                        if (disposition === "bluff")
                            addAssumption(b, `cover:${o.source}`, .6);
                        if (disposition === "works")
                            b.logScore += o.direct ? 0 : .22;
                        if (disposition === "poison") {
                            const unpoisoned = { ...now, poisonTarget: null };
                            if (!infoMatches(o.role, o.source, o.data, unpoisoned)) {
                                requirePoison(b, n, o.source);
                                addAssumption(b, `poison:${n}:${o.source}`, .3);
                            }
                        }
                    }
                    if (!valid)
                        continue;
                    let days = [b];
                    for (const e of dayEvents) {
                        const progressed = [];
                        for (const d of days) {
                            if (d.ended)
                                continue;
                            const ctx = context(d, poisonChoice, g);
                            if (e.kind === "trigger") {
                                const actor = e.rolePlayerId, target = e.targetPlayerId;
                                const role = d.current[actor];
                                const earlier = g.abilityTriggerLog.filter(t => t.roleId === e.roleId && t.rolePlayerId === actor && (0, game_1.compareEvents)(t, e) < 0);
                                let possible = true;
                                if (e.roleId === "virgin") {
                                    const nominations = g.nominationLog.filter(t => t.nominee === actor).sort(game_1.compareEvents);
                                    const isFirst = !nominations.length || nominations[0].id === e.sourceEventId;
                                    const functional = role === "virgin" && d.alive.includes(actor) && ctx.poisonTarget !== actor && isFirst && earlier.length === 0;
                                    const targetTF = roles_1.ROLES[d.current[target]]?.type === "townsfolk";
                                    const spy = d.current[target] === "spy" && ctx.poisonTarget !== target;
                                    possible = e.triggered ? functional && (targetTF || spy) : !functional || !targetTF;
                                    if (!e.triggered && role === "virgin" && isFirst && targetTF && ctx.poisonTarget === actor)
                                        requirePoison(d, n, actor);
                                }
                                else {
                                    const functional = role === "slayer" && d.alive.includes(actor) && ctx.poisonTarget !== actor && earlier.length === 0;
                                    const targetDemon = roles_1.ROLES[d.current[target]]?.type === "demon";
                                    const targetRecluse = d.current[target] === "recluse" && ctx.poisonTarget !== target;
                                    possible = e.triggered ? functional && d.alive.includes(target) && (targetDemon || targetRecluse) : !functional || !d.alive.includes(target) || !targetDemon;
                                    if (!e.triggered && role === "slayer" && targetDemon && earlier.length === 0 && ctx.poisonTarget === actor)
                                        requirePoison(d, n, actor);
                                }
                                if (possible)
                                    progressed.push(d);
                            }
                            else if (e.kind === "death") {
                                if (d.current[e.playerId] === "saint" && (0, game_1.diedByExecution)(e) && ctx.poisonTarget === e.playerId)
                                    requirePoison(d, n, e.playerId);
                                progressed.push(...processDeath(d, e, n, poisonChoice, false));
                            }
                            else
                                progressed.push(d);
                        }
                        days = progressed;
                        if (!days.length)
                            break;
                    }
                    for (const d of days) {
                        if (g.noExecutionDays.includes(n) && d.alive.length === 3 && d.alive.some(p => d.current[p] === "mayor" && p !== activePoison(d, poisonChoice))) {
                            d.ended = true;
                            d.endReason = "mayor";
                        }
                        if (d.ended && lastPhase > (0, game_1.phaseIndex)(dw))
                            continue;
                        nextWorlds.push(d);
                    }
                }
            }
        }
        // Keep a bounded representative beam PER red herring / role-transition history.
        // This is search pruning, not a mechanical impossibility proof.
        const groups = new Map();
        for (const w of nextWorlds) {
            const key = JSON.stringify([w.redHerring, w.believedRoles, w.current, w.ended]);
            const a = groups.get(key) ?? [];
            a.push(w);
            groups.set(key, a);
        }
        worlds = [];
        for (const group of groups.values()) {
            group.sort((a, b) => b.logScore - a.logScore || Object.keys(a.requiredPoison).length - Object.keys(b.requiredPoison).length);
            const seen = new Set();
            for (const w of group) {
                const k = JSON.stringify([w.info, w.requiredPoison]);
                if (seen.has(k))
                    continue;
                seen.add(k);
                worlds.push(w);
                if (seen.size >= beamWidth)
                    break;
            }
        }
        if (!worlds.length)
            return [];
        worlds.sort((a, b) => b.logScore - a.logScore);
        worlds = worlds.slice(0, Math.max(12, beamWidth * 12));
    }
    // If the Minion player explicitly recorded becoming the Imp, keep only histories
    // with that direct self-observed transition at the recorded phase.
    const becameDemonAt = g.minionState?.becameDemonAt ?? null;
    if (becameDemonAt && g.selfRole.shownRole && roles_1.ROLES[g.selfRole.shownRole].type === "minion") {
        worlds = worlds.filter((w) => w.changes.some((c) => c.kind !== "pit_hag" && c.to === "self" && c.when === becameDemonAt));
    }
    // Avoid returning multiple redundant poison guesses as separate worlds.
    return worlds;
}
