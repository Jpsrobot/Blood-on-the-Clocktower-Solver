"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeEvidence = analyzeEvidence;
const roles_1 = require("../roles");
const game_1 = require("./game");
const scripts_1 = require("../scripts");
function analyzeEvidence(g, sample) {
    const ps = (0, game_1.seats)(g.playerCount);
    const out = { players: Object.fromEntries(ps.map(p => [p, { good: 0, evil: 0, inconsistency: 0, reasons: [], warnings: [] }])), global: {}, issues: [] };
    const add = (p, reason, good = 0, evil = 0, inconsistent = 0) => {
        const e = out.players[p];
        if (!e || e.reasons.some(r => r.code === reason.code && JSON.stringify(r.evidence) === JSON.stringify(reason.evidence)))
            return;
        e.reasons.push(reason);
        e.good += good;
        e.evil += evil;
        e.inconsistency += inconsistent;
    };
    const global = (key, points, reason) => {
        const v = out.global[key] ?? { points: 0, reasons: [] };
        if (!v.reasons.some(r => r.code === reason.code && JSON.stringify(r.evidence) === JSON.stringify(reason.evidence))) {
            v.points += points;
            v.reasons.push(reason);
        }
        out.global[key] = v;
    };
    for (const p of ps) {
        const claims = g.roleClaimLog.filter(c => c.playerId === p).sort(game_1.compareEvents);
        const explicit = claims.filter(c => c.subject.kind === 'role' && c.claimType !== 'bluff');
        const distinct = [...new Set(explicit.flatMap(c => c.subject.kind === 'role' ? [c.subject.roleId] : []))];
        if (distinct.length > 1)
            add(p, { code: "changedClaim", players: [p], roles: distinct, evidence: explicit.map(c => c.id), strength: "heuristic" }, 0, .5, 1);
        for (const tagClaim of claims.filter(c => c.subject.kind === 'tag' && c.claimType !== 'bluff')) {
            const exact = explicit.find(c => (0, game_1.compareEvents)(c, tagClaim) > 0);
            if (exact?.subject.kind === 'role' && tagClaim.subject.kind === 'tag' && !roles_1.ROLES[exact.subject.roleId].tags.includes(tagClaim.subject.tag))
                add(p, { code: "tagMismatch", players: [p], roles: [exact.subject.roleId], evidence: [tagClaim.id, exact.id], strength: "heuristic" }, 0, .25, 1);
        }
        const r = (0, game_1.exactClaim)(g, p);
        if (r === 'saint')
            add(p, { code: "saintRisk", players: [p], roles: ['saint'], evidence: explicit.slice(-1).map(c => c.id), strength: "conditional" });
    }
    const duplicates = new Map();
    for (const p of ps) {
        const r = (0, game_1.exactClaim)(g, p);
        if (r)
            duplicates.set(r, [...(duplicates.get(r) ?? []), p]);
    }
    for (const [r, people] of duplicates)
        if (people.length > 1)
            for (const p of people)
                add(p, { code: "duplicateClaim", players: people, roles: [r], evidence: g.roleClaimLog.filter(c => people.includes(c.playerId)).map(c => c.id), strength: "conditional" }, 0, 0, 1);
    for (const t of g.abilityTriggerLog) {
        if (t.triggered) {
            add(t.rolePlayerId, { code: t.roleId === 'virgin' ? 'virginConfirmed' : 'slayerConfirmed', players: [t.rolePlayerId, t.targetPlayerId], roles: [t.roleId], evidence: [t.id], phase: t.when, strength: "mechanical" }, 8);
            out.players[t.rolePlayerId].confirmedRole = t.roleId;
            if (t.roleId === 'virgin')
                add(t.targetPlayerId, { code: "virginNominator", players: [t.targetPlayerId, t.rolePlayerId], evidence: [t.id], phase: t.when, strength: "conditional" }, 2);
            else
                add(t.targetPlayerId, { code: "slayerTarget", players: [t.targetPlayerId], evidence: [t.id], phase: t.when, strength: "conditional" }, 0, 2);
        }
        else if (t.roleId === 'virgin') {
            add(t.rolePlayerId, { code: "virginNoTrigger", players: [t.rolePlayerId, t.targetPlayerId], evidence: [t.id], phase: t.when, strength: "conditional" }, 0, 0, 1);
            add(t.targetPlayerId, { code: "virginNoTrigger", players: [t.rolePlayerId, t.targetPlayerId], evidence: [t.id], phase: t.when, strength: "conditional" });
        }
    }
    // BMR: Exorcist targeting is soft evidence. A completed no-death night after an
    // Exorcist choice raises suspicion on the chosen player, but never hard-confirms
    // them because protection, Po charging, Zombuul timing, etc. can also explain it.
    const exorcistChoices = [];
    for (const a of g.selfActionLog) {
        if (a.roleId === "exorcist")
            exorcistChoices.push({ id: a.id, source: "self", when: a.when, target: a.target, direct: true });
    }
    for (const c of g.abilityClaimLog) {
        if (c.roleId !== "exorcist" || !c.targets[0])
            continue;
        exorcistChoices.push({ id: c.id, source: c.sourcePlayerId || c.playerId, when: c.when, target: c.targets[0], direct: false });
    }
    for (const choice of exorcistChoices) {
        if (!/^N[2-9]\d*$/.test(choice.when)) {
            const reason = { code: "exorcistBadTiming", players: [choice.source], roles: ["exorcist"], phase: choice.when, evidence: [choice.id], strength: "input" };
            out.issues.push(reason);
            add(choice.source, reason, 0, 0, 1);
            continue;
        }
        const n = (0, game_1.cycle)(choice.when);
        if (!g.completedNights.includes(n))
            continue;
        const noDeath = !g.deathLog.some(d => d.when === choice.when);
        if (noDeath) {
            add(choice.target, {
                code: choice.direct ? "exorcistNoDeathDirect" : "exorcistNoDeathClaim",
                players: [choice.target, choice.source], roles: ["exorcist"], phase: choice.when, evidence: [choice.id], strength: "heuristic"
            }, 0, choice.direct ? 2 : 1.25, 0);
        }
    }
    const bySource = new Map();
    for (const choice of exorcistChoices.filter(x => !x.direct))
        bySource.set(choice.source, [...(bySource.get(choice.source) ?? []), choice]);
    for (const [source, choices] of bySource) {
        const ordered = choices.sort((a, b) => (0, game_1.phaseIndex)(a.when) - (0, game_1.phaseIndex)(b.when) || a.id - b.id);
        for (let i = 1; i < ordered.length; i++) {
            if (ordered[i - 1].target !== ordered[i].target)
                continue;
            add(source, { code: "exorcistRepeatTarget", players: [source, ordered[i].target], roles: ["exorcist"], phase: ordered[i].when, evidence: [ordered[i - 1].id, ordered[i].id], strength: "input" }, 0, 0, 1.5);
        }
    }
    // BMR: Mastermind is a game-continuation risk after a Demon execution. We do
    // not call it proof: an execution followed by a no-death night has many other
    // explanations. It is surfaced prominently because the next execution can decide
    // the game if this really is the Mastermind extra day.
    if ((0, scripts_1.getSnapshotScriptRoleIds)(g).includes("mastermind")) {
        for (const d of g.deathLog.filter(d => (0, game_1.diedByExecution)(d) && d.when.startsWith("D"))) {
            const nextNight = (0, game_1.cycle)(d.when) + 1;
            if (!g.completedNights.includes(nextNight))
                continue;
            if (g.deathLog.some(x => x.when === `N${nextNight}`))
                continue;
            const demonShare = sample?.players[d.playerId]?.demon ?? 0;
            global("mastermind", 1 + demonShare * 2, {
                code: "mastermindNoDeathAfterExecution",
                players: [d.playerId], roles: ["mastermind"], phase: `N${nextNight}`, evidence: [d.id], strength: "conditional"
            });
        }
    }
    const obs = (0, game_1.observations)(g);
    for (const shift of (0, game_1.empathStableNeighbourShifts)(g)) {
        add(shift.source, {
            code: "empathShiftStableNeighbours",
            players: [shift.source, ...shift.neighbours],
            roles: ["empath"],
            phase: shift.toWhen,
            evidence: shift.evidence,
            detail: `${shift.fromWhen}:${shift.fromValue}->${shift.toWhen}:${shift.toValue}`,
            strength: "heuristic",
        });
    }
    for (const o of obs) {
        if (!(0, game_1.dataValid)(o.role, o.data, g.playerCount) || !(0, game_1.observationTimingValid)(o.role, o.when)) {
            const reason = { code: "badInfoEntry", players: [o.source], roles: [o.role], phase: o.when, evidence: o.aliases, strength: "input" };
            out.issues.push(reason);
            add(o.source, reason, 0, 0, 2);
            continue;
        }
        if (o.role === 'undertaker' && !g.deathLog.some(d => (0, game_1.diedByExecution)(d) && d.when === `D${(0, game_1.cycle)(o.when) - 1}`))
            out.issues.push({ code: "missingExecution", players: [o.source], phase: o.when, evidence: o.aliases, strength: "input" });
        if (o.role === 'ravenkeeper' && !g.deathLog.some(d => d.playerId === o.source && d.when === o.when))
            out.issues.push({ code: "missingNightDeath", players: [o.source], phase: o.when, evidence: o.aliases, strength: "input" });
        const conflict = obs.find(e => e.id !== o.id && e.source === o.source && e.role === o.role && e.when === o.when && JSON.stringify(e.data) !== JSON.stringify(o.data));
        if (conflict)
            add(o.source, { code: "conflictingReports", players: [o.source], roles: [o.role], phase: o.when, evidence: [o.id, conflict.id].sort((a, b) => a - b), strength: "input" }, 0, 0, 2);
        if (o.data.kind === 'pairRole' || o.data.kind === 'roleReveal') {
            const shown = o.data.shownRole;
            const targets = o.data.kind === 'pairRole' ? o.data.players : [o.data.player];
            const matches = targets.filter(p => (0, game_1.exactClaim)(g, p) === shown);
            if (matches.length === 1) {
                const target = matches[0];
                const claimEvent = g.abilityClaimLog.find(c => o.aliases.includes(c.id));
                const disclosed = claimEvent?.reportedWhen ?? claimEvent?.when ?? o.when;
                const hadContact = g.talkLog.some(t => t.participants.includes(o.source) && t.participants.includes(target) && (0, game_1.phaseIndex)(t.when) <= (0, game_1.phaseIndex)(disclosed));
                add(target, { code: hadContact ? 'sharedSource' : 'corroboration', players: [o.source, target], roles: [shown], phase: o.when, evidence: o.aliases, strength: "conditional" }, hadContact ? 0 : .5);
            }
            if (o.role === 'undertaker' && shown === 'imp') {
                const target = targets[0];
                const d = g.deathLog.find(d => d.playerId === target && (0, game_1.diedByExecution)(d) && d.when === `D${(0, game_1.cycle)(o.when) - 1}`);
                if (d && ps.filter(p => (0, game_1.isAliveAt)(g, p, d.when, d.id)).length >= 5)
                    global('scarlet_woman', 2, { code: "undertakerImp", players: [o.source, target], phase: o.when, evidence: [o.id, d.id], strength: "conditional" });
            }
        }
    }
    // Freeform information is valid to record; it is simply not mechanically interpreted until that role has a dedicated parser/evaluator.
    // Outsider claims remain claims. No circular feedback into their own reliability.
    const outsiders = ps.filter(p => { const r = (0, game_1.exactClaim)(g, p); return r && roles_1.ROLES[r].type === 'outsider'; });
    if (outsiders.length > (0, game_1.setupCounts)(g.playerCount).outsider)
        global('baron', Math.min(3, outsiders.length - (0, game_1.setupCounts)(g.playerCount).outsider), { code: "extraOutsiders", players: outsiders, evidence: g.roleClaimLog.filter(c => outsiders.includes(c.playerId)).map(c => c.id), strength: "heuristic" });
    // Precision kills: only pre-death claims, no claim = UNKNOWN, not secret confirmed role.
    const hiddenKills = g.deathLog.filter(d => d.reason === 'night_death' && (0, game_1.cycle)(d.when) <= 3 && (0, game_1.cycle)(d.when) >= 2).filter(d => {
        const r = (0, game_1.exactClaim)(g, d.playerId, d.when);
        if (!r || !roles_1.ROLES[r].tags.includes('HIGH_SURVIVAL_VALUE'))
            return false;
        return !g.roleClaimLog.some(c => c.playerId === d.playerId && c.subject.kind === 'role' && c.visibility === 'public' && (0, game_1.phaseIndex)(c.when) < (0, game_1.phaseIndex)(d.when));
    });
    for (const d of hiddenKills)
        global('spy', .75, { code: "hiddenKill", players: [d.playerId], roles: [(0, game_1.exactClaim)(g, d.playerId, d.when)], phase: d.when, evidence: [d.id], strength: "heuristic" });
    const nights = [...new Set(hiddenKills.map(d => (0, game_1.cycle)(d.when)))].sort((a, b) => a - b);
    if (nights.some((n, i) => i > 0 && n === nights[i - 1] + 1))
        global('spy', .5, { code: "precisionSequence", players: hiddenKills.map(d => d.playerId), evidence: hiddenKills.map(d => d.id), strength: "heuristic" });
    if (hiddenKills.length)
        global('spy', 0, { code: "missingTalksNotProof", players: [], evidence: [], strength: "heuristic" });
    // Evil-mode direct knowledge. These records come from the user's own
    // Poisoner action or from a Spy Grimoire reminder token, so they do not need
    // a sampled-world threshold before being shown on the board.
    const knownPoison = new Map();
    for (const event of g.minionActionLog ?? []) {
        if (event.roleId !== "poisoner" && event.roleId !== "spy")
            continue;
        const target = event.roleId === "poisoner" ? event.target : event.poisonTarget;
        if (!target)
            continue;
        const reason = {
            code: event.roleId === "poisoner" ? "knownPoisonTarget" : "spyPoisonSeen",
            players: [target],
            roles: ["poisoner"],
            phase: event.when,
            evidence: [event.id],
            strength: event.roleId === "poisoner" ? "mechanical" : "conditional",
        };
        knownPoison.set(target, [...(knownPoison.get(target) ?? []), reason]);
    }
    // Display-only deductions from sampled requirements. runSearch obtains raw
    // meta evidence WITHOUT a sample, so these points can never feed themselves.
    if (sample && sample.unique >= 80 && sample.effectiveWorlds >= 20) {
        for (let n = 1; n <= g.night; n++) {
            const total = ps.reduce((sum, p) => sum + (sample.players[p]?.poison[n] ?? 0), 0);
            if (total >= .6)
                global('poisoner', 1, { code: 'poisonPattern', players: ps.filter(p => (sample.players[p]?.poison[n] ?? 0) >= .2), phase: `N${n}`, evidence: obs.filter(o => o.when === `N${n}`).map(o => o.id), strength: 'conditional' });
        }
    }
    // Ordinary talking and voting never directly add evil points.
    for (const p of ps) {
        const e = out.players[p];
        for (const reason of knownPoison.get(p) ?? []) {
            e.warnings.push({ color: 'green', cycle: (0, game_1.cycle)(reason.phase ?? 'N1'), reasons: [reason] });
        }
        if (e.inconsistency > 0)
            e.warnings.push({ color: 'orange', reasons: e.reasons.filter(r => ['changedClaim', 'tagMismatch', 'duplicateClaim', 'virginNoTrigger', 'conflictingReports', 'badInfoEntry'].includes(r.code)) });
        const readFact = g.manualReads[p];
        if (e.confirmedRole && readFact && ((readFact.roleId && readFact.roleId !== e.confirmedRole) || readFact.alignment === 'evil'))
            e.warnings.push({ color: 'yellow', reasons: [{ code: 'manualPublicMismatch', players: [p], roles: [e.confirmedRole], evidence: [], strength: 'mechanical' }] });
        const share = sample?.players[p];
        const enough = !!sample && sample.unique >= 80 && sample.effectiveWorlds >= 20;
        if (enough && share) {
            const hasMechanicalEvidence = g.selfInfoLog.length + g.abilityTriggerLog.length > 0;
            if (share.evil >= .8 && !e.confirmedRole && hasMechanicalEvidence)
                e.warnings.unshift({ color: 'red', reasons: [{ code: 'sampleEvil', players: [p], evidence: [], strength: 'conditional' }] });
            if (share.drunk >= .25 && !e.confirmedRole)
                e.warnings.push({ color: 'blue', reasons: [{ code: 'sampleDrunk', players: [p], evidence: [], strength: 'conditional' }] });
            for (const [n, value] of Object.entries(share.poison))
                if (value >= .6 && !e.warnings.some(w => w.color === 'green' && w.cycle === Number(n)))
                    e.warnings.push({ color: 'green', cycle: Number(n), reasons: [{ code: 'samplePoison', players: [p], phase: `N${n}`, evidence: [], strength: 'conditional' }] });
            const read = g.manualReads[p];
            if (!e.warnings.some(w => w.color === 'yellow') && read && ((read.roleId && (share.roles[read.roleId] ?? 0) < .08) || (read.alignment === 'good' && share.evil >= .8) || (read.alignment === 'evil' && share.evil <= .2)))
                e.warnings.push({ color: 'yellow', reasons: [{ code: 'manualMismatch', players: [p], roles: read.roleId ? [read.roleId] : [], evidence: [], strength: 'conditional' }] });
        }
    }
    return out;
}
