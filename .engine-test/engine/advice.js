"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nominationAdvice = nominationAdvice;
exports.recommendations = recommendations;
const game_1 = require("./game");
const scripts_1 = require("../scripts");
const roles_1 = require("../roles");
function nominationAdvice(g, r, p, nominator = 'self') {
    const s = r?.players[p], alive = (0, game_1.seats)(g.playerCount).filter(x => (0, game_1.isAliveAt)(g, x, `D${g.night}`));
    const out = { player: p, verdict: 'hold', score: 0, reasons: [], risks: [] };
    const reason = (code) => ({ code, players: [p, nominator], evidence: [], strength: 'conditional' });
    if (!(0, game_1.isAliveAt)(g, nominator, `D${g.night}`)) {
        out.risks.push(reason('deadNominator'));
        return out;
    }
    if (g.nominationLog.some(n => n.nominator === nominator && n.when === `D${g.night}`)) {
        out.risks.push(reason('alreadyNominated'));
        return out;
    }
    if (g.nominationLog.some(n => n.nominee === p && n.when === `D${g.night}`)) {
        out.risks.push(reason('alreadyNominee'));
        return out;
    }
    if (!alive.includes(p)) {
        out.risks.push(reason('deadTarget'));
        return out;
    }
    const role = (0, game_1.exactClaim)(g, p);
    if (role === 'saint' || (s?.roles.saint ?? 0) > .08)
        out.risks.push(reason('saintRisk'));
    if (role === 'virgin' && !g.nominationLog.some(n => n.nominee === p))
        out.risks.push(reason('virginTestRisk'));
    if (alive.length === 3 && alive.some(x => (0, game_1.exactClaim)(g, x) === 'mayor'))
        out.risks.push(reason('mayorFinalThree'));
    if (alive.length === 3)
        out.risks.push(reason('finalThreeRisk'));
    const mastermindRisk = (0, scripts_1.getSnapshotScriptRoleIds)(g).includes('mastermind') && g.night >= 2 &&
        g.completedNights.includes(g.night) &&
        !g.deathLog.some(d => d.when === `N${g.night}`) &&
        g.deathLog.some(d => d.when === `D${g.night - 1}` && (0, game_1.diedByExecution)(d));
    if (mastermindRisk)
        out.risks.push(reason('mastermindRisk'));
    if (alive.length >= 5)
        out.risks.push(reason('scarletBuffer'));
    if (!r || r.unique < 80 || r.effectiveWorlds < 20 || !s) {
        out.reasons.push(reason('notEnoughWorlds'));
        return out;
    }
    out.score = s.demon * 3 + s.evil * .5 - (s.roles.saint ?? 0) * 8;
    if (s.demon > .3) {
        out.verdict = 'support';
        out.reasons.push(reason('demonCandidate'));
    }
    else if (s.evil < .2 && s.demon < .08) {
        out.verdict = 'defend';
        out.reasons.push(reason('goodCandidate'));
    }
    else
        out.reasons.push(reason('mixedWorlds'));
    if (role && roles_1.ROLES[role].tags.includes('HIGH_SURVIVAL_VALUE'))
        out.risks.push(reason('valuableGoodRisk'));
    if (out.risks.some(x => ['saintRisk', 'virginTestRisk', 'mayorFinalThree'].includes(x.code)))
        out.verdict = 'hold';
    if (mastermindRisk && (!s || s.evil < .7))
        out.verdict = 'hold';
    out.reasons.push(reason('executionNoFlip'));
    return out;
}
function recommendations(g, r) {
    const nominations = (0, game_1.seats)(g.playerCount).filter(p => p !== 'self' && (0, game_1.isAliveAt)(g, p, `D${g.night}`)).map(p => nominationAdvice(g, r, p)).sort((a, b) => b.score - a.score).slice(0, 3);
    const talks = (0, game_1.seats)(g.playerCount).filter(p => p !== 'self' && !(0, game_1.exactClaim)(g, p)).slice(0, 3);
    const own = g.selfRole.shownRole;
    const candidates = (0, game_1.seats)(g.playerCount).filter(p => p !== 'self' && (0, game_1.isAliveAt)(g, p, `D${g.night}`));
    let targets = [];
    if (own === 'monk')
        targets = candidates.sort((a, b) => {
            const ar = (0, game_1.exactClaim)(g, a), br = (0, game_1.exactClaim)(g, b);
            const v = (p, rr) => (rr && roles_1.ROLES[rr].tags.includes('HIGH_SURVIVAL_VALUE') ? 1 : 0) * (1 - (r?.players[p]?.evil ?? .4));
            return v(b, br) - v(a, ar);
        }).slice(0, 2);
    if (own === 'fortune_teller' && r && r.unique >= 80) {
        let best = -1;
        for (let i = 0; i < candidates.length; i++)
            for (let j = i + 1; j < candidates.length; j++) {
                const a = candidates[i], b = candidates[j];
                const yes = r.worlds.filter(w => w.current[a] === 'imp' || w.current[b] === 'imp' || w.redHerring === a || w.redHerring === b).length;
                const f = yes / Math.max(1, r.worlds.length);
                let score = f * (1 - f);
                const prior = g.selfInfoLog.filter(e => e.roleId === 'fortune_teller').sort(game_1.compareEvents).at(-1);
                if (prior?.roleId === 'fortune_teller' && prior.players.includes(a) && prior.players.includes(b))
                    score *= .6;
                if (score > best) {
                    best = score;
                    targets = [a, b];
                }
            }
    }
    return { nominations, talks, targets };
}
