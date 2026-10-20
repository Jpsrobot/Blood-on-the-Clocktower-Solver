import { useState } from 'react';
import type { GameSnapshot, AbilityClaimEvent, StructuredInfo, SavantStatement, JugglerGuess } from '../types';
import { ROLES, type RoleId } from '../roles';
import { getSnapshotScriptRoleIds } from '../scripts';
import { exactClaim, seats } from '../engine/game';
import { eventId } from '../storage';
import { L, person } from './text';
import { rolePhaseOptions, isBmrRole } from '../abilityTiming';

const STRUCTURED_INFO_ROLES: RoleId[] = [
  'grandmother', 'chambermaid', 'godfather',
  'washerwoman',
  'librarian',
  'investigator',
  'chef',
  'empath',
  'fortune_teller',
  'undertaker',
  'ravenkeeper',
  'clockmaker',
  'dreamer',
  'mathematician',
  'flowergirl',
  'town_crier',
  'oracle',
  'savant',
  'seamstress',
  'artist',
  'juggler',
  'sage',
  'klutz',
  'balloonist',
  'bounty_hunter',
  'choirboy', 'king', 'fisherman', 'general', 'high_priestess', 'knight', 'noble', 'pixie', 'steward', 'shugenja', 'village_idiot',
];

export function ReportedInfoForm({
  g,
  speaker,
  onSave,
  onUndo,
  onBack,
}: {
  g: GameSnapshot;
  speaker: string;
  onSave: (event: AbilityClaimEvent) => void;
  onUndo?: () => void;
  onBack: () => void;
}) {
  const scriptRoleIds = getSnapshotScriptRoleIds(g);
  const scriptRoles = scriptRoleIds.map((id) => ROLES[id]).filter(Boolean);
  const players = seats(g.playerCount);

  const initial = exactClaim(g, speaker);
  const [source, setSource] = useState(speaker);
  const [role, setRole] = useState<RoleId | null>(
    initial && scriptRoleIds.includes(initial) ? initial : null,
  );
  const [firstNumber, setFirstNumber] = useState<number | null>(null);
  const [targets, setTargets] = useState<string[]>([]);
  const [seen, setSeen] = useState<RoleId | null>(null);
  const [seen2, setSeen2] = useState<RoleId | null>(null);
  const [yes, setYes] = useState<'yes' | 'no' | null>(null);
  const [savantKind1, setSavantKind1] = useState<'roleInPlay' | 'roleAmong'>('roleInPlay');
  const [savantKind2, setSavantKind2] = useState<'roleInPlay' | 'roleAmong'>('roleInPlay');
  const [savantRole1, setSavantRole1] = useState<RoleId | null>(null);
  const [savantRole2, setSavantRole2] = useState<RoleId | null>(null);
  const [savantPlayers1, setSavantPlayers1] = useState<string[]>([]);
  const [savantPlayers2, setSavantPlayers2] = useState<string[]>([]);
  const [generalAssessment, setGeneralAssessment] = useState<'good' | 'evil' | 'neither' | null>(null);
  const [fisherAdvice, setFisherAdvice] = useState('');
  const [shugenjaDirection, setShugenjaDirection] = useState<'clockwise'|'anticlockwise'|null>(null);
  const [idiotResult, setIdiotResult] = useState<'good'|'evil'|null>(null);
  const [artistQuestion, setArtistQuestion] = useState('');
  const [artistResult, setArtistResult] = useState<'yes' | 'no' | 'unknown' | null>(null);
  const [jugglerGuessDay, setJugglerGuessDay] = useState(g.night >= 2 ? `D${g.night - 1}` : 'D1');
  const [jugglerGuesses, setJugglerGuesses] = useState<JugglerGuess[]>([]);
  const [jugglerDraftPlayer, setJugglerDraftPlayer] = useState<string | null>(null);
  const [jugglerDraftRole, setJugglerDraftRole] = useState<RoleId | null>(null);
  const [klutzTeamLost, setKlutzTeamLost] = useState<boolean | null>(null);
  const [zero, setZero] = useState(false);
  const [genericResult, setGenericResult] = useState('');
  const [godfatherRoles,setGodfatherRoles] = useState<RoleId[]>([]);
  // A previously claimed BMR night role must open at a valid night. Otherwise
  // the select visually shows N2 but its React value remains D2 and saving fails.
  const [when, setWhen] = useState(() => {
    if(initial && isBmrRole(initial)) {
      const category=STRUCTURED_INFO_ROLES.includes(initial)?'info':'action';
      const phases=rolePhaseOptions(initial,g.night,category);
      return phases[phases.length-1] ?? `N${g.night}`;
    }
    return `D${g.night}`;
  });
  const [reported, setReported] = useState(`D${g.night}`);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [recipients, setRecipients] = useState<string[]>([]);

  const structured = !!role && STRUCTURED_INFO_ROLES.includes(role);
  const grandmother = role === 'grandmother';
  const chambermaid = role === 'chambermaid';
  const godfather = role === 'godfather';
  const pair = role === 'washerwoman' || role === 'librarian' || role === 'investigator' || role === 'fortune_teller' || role === 'seamstress';
  const number = role === 'chef' || role === 'empath' || role === 'clockmaker' || role === 'oracle' || role === 'mathematician';
  const reveal = role === 'undertaker' || role === 'ravenkeeper';
  const simpleYesNo = role === 'flowergirl' || role === 'town_crier';
  const dreamer = role === 'dreamer';
  const savant = role === 'savant';
  const artist = role === 'artist';
  const juggler = role === 'juggler';
  const sage = role === 'sage';
  const klutz = role === 'klutz';
  const singlePlayerInfo = role === 'balloonist' || role === 'bounty_hunter' || role === 'choirboy' || role === 'high_priestess' || role === 'steward';
  const shugenja = role === 'shugenja';
  const villageIdiot = role === 'village_idiot';
  const knight = role === 'knight';
  const noble = role === 'noble';
  const pixie = role === 'pixie';
  const king = role === 'king';
  const general = role === 'general';
  const fisherman = role === 'fisherman';
  const first = structured && role !== null && ROLES[role].tags.includes('FIRST_NIGHT_INFO');
  const minInfoNight = role === 'undertaker' || role === 'ravenkeeper' || role === 'flowergirl' || role === 'town_crier' || role === 'oracle' || role === 'sage' || role === 'choirboy' ? 2 : 1;
  const dayInfo = savant || artist || fisherman;
  const jugglerDayOptions = Array.from({ length: Math.max(0, g.night - 1) }, (_, i) => `D${i + 1}`);
  const phaseOptions = Array.from({ length: g.night }, (_, i) => [`N${i + 1}`, `D${i + 1}`]).flat();
  const infoNightOptions = role && isBmrRole(role)
    ? rolePhaseOptions(role,g.night,'info')
    : klutz
    ? phaseOptions
    : juggler
      ? jugglerDayOptions.map((d) => `N${Number(d.slice(1)) + 1}`)
      : dayInfo
        ? Array.from({ length: g.night }, (_, i) => `D${i + 1}`)
        : first
          ? ['N1']
          : Array.from({ length: g.night }, (_, i) => `N${i + 1}`).filter((p) => Number(p.slice(1)) >= minInfoNight);
  const effectiveWhen = structured
    ? klutz
      ? when
      : juggler
        ? `N${Number(jugglerGuessDay.slice(1)) + 1}`
        : dayInfo
          ? (when.startsWith('D') ? when : `D${g.night}`)
          : first
            ? 'N1'
            : when.startsWith('N') ? when : `N${g.night}`
    : when;
  const validWhenOptions = structured ? infoNightOptions : role && isBmrRole(role) ? rolePhaseOptions(role,g.night,'action') : phaseOptions;
  const showRoles = scriptRoles.filter((r) =>
    role === 'washerwoman'
      ? r.type === 'townsfolk'
      : role === 'librarian'
        ? r.type === 'outsider'
        : role === 'investigator'
          ? r.type === 'minion'
          : true,
  );
  const max = noble ? 3 : (pair || sage || knight || chambermaid ? 2 : 1);
  const selectablePlayers = (dreamer || role === 'seamstress' || klutz || grandmother || chambermaid) ? players.filter((p) => p !== source) : players;

  const resetRoleSpecific = (nextRole: RoleId | null) => {
    setFirstNumber(null);
    setTargets([]);
    setSeen(null);
    setSeen2(null);
    setYes(null);
    setSavantKind1('roleInPlay'); setSavantKind2('roleInPlay');
    setSavantRole1(null); setSavantRole2(null); setSavantPlayers1([]); setSavantPlayers2([]);
    setArtistQuestion(''); setArtistResult(null); setGeneralAssessment(null); setFisherAdvice('');
    setShugenjaDirection(null); setIdiotResult(null);
    setJugglerGuesses([]); setJugglerDraftPlayer(null); setJugglerDraftRole(null);
    setJugglerGuessDay(g.night >= 2 ? `D${g.night - 1}` : 'D1');
    setKlutzTeamLost(null);
    setZero(false);
    setGenericResult(''); setGodfatherRoles([]);
    if (!nextRole) {
      setWhen(`D${g.night}`);
      return;
    }
    if (STRUCTURED_INFO_ROLES.includes(nextRole)) {
      if (nextRole === 'savant' || nextRole === 'artist' || nextRole === 'fisherman') {
        setWhen(`D${g.night}`);
      } else if (nextRole === 'klutz') {
        setWhen(`D${g.night}`);
      } else if (nextRole === 'juggler') {
        const d = g.night >= 2 ? g.night - 1 : 1;
        setJugglerGuessDay(`D${d}`);
        setWhen(`N${d + 1}`);
      } else if (nextRole === 'undertaker' || nextRole === 'ravenkeeper' || nextRole === 'sage') {
        setWhen(g.night >= 2 ? `N${g.night}` : 'N2');
      } else {
        setWhen(`N${g.night}`);
      }
    } else if(nextRole && isBmrRole(nextRole)) {
      const allowed=rolePhaseOptions(nextRole,g.night,'action');
      setWhen(allowed[allowed.length-1]??`N${Math.max(1,g.night)}`);
    } else {
      setWhen(`D${g.night}`);
    }
  };

  const chooseSource = (nextSource: string) => {
    setSource(nextSource);
    const claimed = exactClaim(g, nextSource);
    const nextRole = claimed && scriptRoleIds.includes(claimed) ? claimed : null;
    setRole(nextRole);
    resetRoleSpecific(nextRole);
  };

  const chooseRole = (nextRole: RoleId | null) => {
    setRole(nextRole);
    resetRoleSpecific(nextRole);
  };

  const toggle = (p: string) => {
    if (!structured) {
      setTargets((xs) => (xs.includes(p) ? xs.filter((x) => x !== p) : [...xs, p]));
      return;
    }
    setTargets((xs) =>
      xs.includes(p) ? xs.filter((x) => x !== p) : xs.length >= max ? (max === 1 ? [p] : xs) : [...xs, p],
    );
  };

  const toggleSavantPlayer = (index: 1 | 2, p: string) => {
    const setter = index === 1 ? setSavantPlayers1 : setSavantPlayers2;
    setter((xs) => xs.includes(p) ? xs.filter((x) => x !== p) : [...xs, p]);
  };
  const buildSavantStatement = (kind: 'roleInPlay' | 'roleAmong', roleId: RoleId | null, players: string[]): SavantStatement | null => {
    if (!roleId) return null;
    return kind === 'roleInPlay' ? { kind, roleId } : players.length ? { kind, roleId, players } : null;
  };

  let data: StructuredInfo | null = null;
  if (grandmother && targets.length === 1 && seen) data = {kind:'grandmotherRead',player:targets[0],shownRole:seen};
  else if (chambermaid && targets.length === 2 && firstNumber !== null && firstNumber <= 2) data = {kind:'chambermaidRead',players:[targets[0],targets[1]],number:firstNumber as 0|1|2};
  else if (godfather) data = {kind:'godfatherOutsiders',roles:godfatherRoles};
  else if (role === 'librarian' && zero) data = { kind: 'noOutsiders' };
  else if (number && firstNumber !== null) data = { kind: 'number', value: firstNumber };
  else if (role === 'fortune_teller' && targets.length === 2 && yes) {
    data = { kind: 'pairYesNo', players: [targets[0], targets[1]], result: yes };
  } else if (simpleYesNo && yes) {
    data = { kind: 'singleYesNo', result: yes };
  } else if (dreamer && targets.length === 1 && seen && seen2) {
    data = { kind: 'dreamer', player: targets[0], shownRoles: [seen, seen2] };
  } else if (savant) {
    const a = buildSavantStatement(savantKind1, savantRole1, savantPlayers1);
    const b = buildSavantStatement(savantKind2, savantRole2, savantPlayers2);
    if (a && b) data = { kind: 'savantPair', statements: [a, b] };
  } else if (artist && artistQuestion.trim() && artistResult) {
    data = { kind: 'artistAnswer', question: artistQuestion.trim(), result: artistResult };
  } else if (juggler && jugglerGuesses.length > 0 && firstNumber !== null && firstNumber <= jugglerGuesses.length) {
    data = { kind: 'juggler', guessDay: jugglerGuessDay, guesses: jugglerGuesses, number: firstNumber };
  } else if (sage && targets.length === 2) {
    data = { kind: 'sage', players: [targets[0], targets[1]] };
  } else if (knight && targets.length === 2) {
    data = {kind:'knight',players:[targets[0], targets[1]]};
  } else if (noble && targets.length === 3) {
    data = {kind:'noble',players:[targets[0], targets[1], targets[2]]};
  } else if (pixie && seen && ROLES[seen].type === 'townsfolk') {
    data = {kind:'singleRole',shownRole:seen};
  } else if (king && seen) {
    data = {kind:'singleRole', shownRole:seen};
  } else if (general && generalAssessment) {
    data = {kind:'storytellerAssessment',result:generalAssessment};
  } else if (fisherman && fisherAdvice.trim()) {
    data = {kind:'storytellerAdvice',advice:fisherAdvice.trim()};
  } else if(shugenja && shugenjaDirection) {
    data = {kind:'shugenjaDirection',direction:shugenjaDirection};
  } else if(villageIdiot && targets.length===1 && idiotResult) {
    data = {kind:'alignmentRead',player:targets[0],result:idiotResult};
  } else if (singlePlayerInfo && targets.length === 1) {
    data = { kind: 'singlePlayer', player: targets[0] };
  } else if (klutz && targets.length === 1 && klutzTeamLost !== null) {
    data = { kind: 'klutzChoice', target: targets[0], teamLost: klutzTeamLost };
  } else if (role === 'seamstress' && targets.length === 2 && yes) {
    data = { kind: 'pairAlignment', players: [targets[0], targets[1]], result: yes === 'yes' ? 'same' : 'different' };
  } else if (pair && role !== 'fortune_teller' && role !== 'seamstress' && targets.length === 2 && seen) {
    data = { kind: 'pairRole', players: [targets[0], targets[1]], shownRole: seen };
  } else if (reveal && targets.length === 1 && seen) {
    data = { kind: 'roleReveal', player: targets[0], shownRole: seen };
  }

  const canSave = !!role && validWhenOptions.includes(effectiveWhen) && (!structured || !!data);

  return (
    <>
      <h2>{person(g, speaker)} — 情報を記録</h2>
      <p className="panel-note">
        今タップした人が話している内容として記録します。伝聞の場合は「元の人」に実際の能力・情報の本人を選んでください。
      </p>

      <div className="form-section">
        <label>元の人</label>
        <select value={source} onChange={(e) => chooseSource(e.target.value)}>
          {players.map((p) => (
            <option key={p} value={p}>{person(g, p)}</option>
          ))}
        </select>
      </div>

      <div className="form-section">
        <label>元の人の役職</label>
        <select value={role ?? ''} onChange={(e) => chooseRole((e.target.value as RoleId) || null)}>
          <option value="">{L.select}</option>
          {scriptRoles.map((r) => (
            <option key={r.id} value={r.id}>{r.symbol} {r.name}</option>
          ))}
        </select>
      </div>

      {role && structured && (
        <>
          <div className="form-section">
            <label>{L.infoWhen}</label>
            <select
              value={effectiveWhen}
              disabled={first || juggler || infoNightOptions.length === 0}
              onChange={(e) => setWhen(e.target.value)}
            >
              {infoNightOptions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            {infoNightOptions.length === 0 && (
              <p className="panel-note history-missing-detail">この役職の情報はN2以降に記録できます。</p>
            )}
          </div>

          {role === 'librarian' && (
            <label className="check-label">
              <input
                type="checkbox"
                checked={zero}
                onChange={(e) => {
                  setZero(e.target.checked);
                  setTargets([]);
                  setSeen(null);
                }}
              />
              {L.noOutsiders}
            </label>
          )}

          {(grandmother || chambermaid) && (
            <>
              <p className="panel-note">{grandmother ? '初夜に教えられた善陣営の人とその役職を記録します。' : '自分以外の生存者を2人選び、夜に能力で起きた人数を記録します。'}</p>
              <div className="player-toggle-grid">{selectablePlayers.map(p=><button key={p} type="button" className={targets.includes(p)?'player-toggle selected':'player-toggle'} onClick={()=>toggle(p)}>{person(g,p)}</button>)}</div>
              {grandmother && <div className="form-section"><label>教えられた役職</label><select value={seen??''} onChange={e=>setSeen(e.target.value as RoleId || null)}><option value="">選択</option>{scriptRoles.map(r=><option key={r.id} value={r.id}>{r.symbol} {r.name}</option>)}</select></div>}
              {chambermaid && <div className="player-toggle-grid">{([0,1,2] as const).map(n=><button key={n} type="button" className={firstNumber===n?'player-toggle selected':'player-toggle'} onClick={()=>setFirstNumber(n)}>{n}</button>)}</div>}
            </>
          )}
          {godfather && <>
            <p className="panel-note">初夜に知らされた、ゲーム中のアウトサイダー役職をすべて選択します。0人なら未選択のまま保存します。</p>
            <div className="player-toggle-grid">{scriptRoles.filter(r=>r.type==='outsider').map(r=><button key={r.id} type="button" className={godfatherRoles.includes(r.id)?'player-toggle selected':'player-toggle'} onClick={()=>setGodfatherRoles(xs=>xs.includes(r.id)?xs.filter(x=>x!==r.id):[...xs,r.id])}>{r.symbol} {r.name}</button>)}</div>
          </>}
          {number && (
            <div className="form-section">
              <label>{L.result}</label>
              <div className="player-toggle-grid">
                {Array.from({ length: role === 'empath' ? 3 : role === 'clockmaker' ? Math.floor(g.playerCount / 2) + 1 : role === 'mathematician' ? g.playerCount : g.playerCount + 1 }, (_, i) => i).map((n) => (
                  <button
                    type="button"
                    key={n}
                    aria-pressed={firstNumber === n}
                    className={`player-toggle ${firstNumber === n ? 'selected' : ''}`}
                    onClick={() => setFirstNumber(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {simpleYesNo && (
            <>
              <div className="claim-option-title">結果</div>
              <div className="visibility-switch">
                {(['yes', 'no'] as const).map((x) => (
                  <button
                    key={x}
                    type="button"
                    className={`visibility-button ${yes === x ? 'visibility-selected' : ''}`}
                    onClick={() => setYes(x)}
                  >
                    {L[x]}
                  </button>
                ))}
              </div>
            </>
          )}

          {dreamer && (
            <>
              <div className="form-section">
                <label>選んだ人</label>
                <div className="player-toggle-grid">
                  {selectablePlayers.map((p) => (
                    <button
                      type="button"
                      key={p}
                      aria-pressed={targets.includes(p)}
                      className={`player-toggle ${targets.includes(p) ? 'selected' : ''}`}
                      onClick={() => toggle(p)}
                    >
                      {person(g, p)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-section">
                <label>表示された善役職</label>
                <select value={seen ?? ''} onChange={(e) => setSeen((e.target.value as RoleId) || null)}>
                  <option value="">{L.select}</option>
                  {scriptRoles.filter((r) => r.type === 'townsfolk' || r.type === 'outsider').map((r) => <option key={r.id} value={r.id}>{r.symbol} {r.name}</option>)}
                </select>
              </div>
              <div className="form-section">
                <label>表示された悪役職</label>
                <select value={seen2 ?? ''} onChange={(e) => setSeen2((e.target.value as RoleId) || null)}>
                  <option value="">{L.select}</option>
                  {scriptRoles.filter((r) => r.type === 'minion' || r.type === 'demon').map((r) => <option key={r.id} value={r.id}>{r.symbol} {r.name}</option>)}
                </select>
              </div>
            </>
          )}

          {savant && (
            <>
              {([1, 2] as const).map((index) => {
                const kind = index === 1 ? savantKind1 : savantKind2;
                const setKind = index === 1 ? setSavantKind1 : setSavantKind2;
                const factRole = index === 1 ? savantRole1 : savantRole2;
                const setFactRole = index === 1 ? setSavantRole1 : setSavantRole2;
                const factPlayers = index === 1 ? savantPlayers1 : savantPlayers2;
                return (
                  <div className="form-section" key={index}>
                    <label>情報 {index}</label>
                    <select value={kind} onChange={(e) => setKind(e.target.value as 'roleInPlay' | 'roleAmong')}>
                      <option value="roleInPlay">この役職がゲーム内にいる</option>
                      <option value="roleAmong">選んだ人の中にこの役職がいる</option>
                    </select>
                    <select value={factRole ?? ''} onChange={(e) => setFactRole((e.target.value as RoleId) || null)}>
                      <option value="">{L.select}</option>
                      {scriptRoles.map((r) => <option key={r.id} value={r.id}>{r.symbol} {r.name}</option>)}
                    </select>
                    {kind === 'roleAmong' && (
                      <div className="player-toggle-grid">
                        {players.map((p) => (
                          <button type="button" key={p} aria-pressed={factPlayers.includes(p)} className={`player-toggle ${factPlayers.includes(p) ? 'selected' : ''}`} onClick={() => toggleSavantPlayer(index, p)}>
                            {person(g, p)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <p className="panel-note">健全な賢者なら、2つの情報のうち正しいのはちょうど1つです。</p>
            </>
          )}

          {artist && (
            <>
              <div className="form-section">
                <label>質問</label>
                <textarea
                  value={artistQuestion}
                  placeholder="例：生存している悪陣営は2人以上ですか？"
                  onChange={(e) => setArtistQuestion(e.target.value)}
                />
              </div>
              <div className="claim-option-title">回答</div>
              <div className="visibility-switch">
                {(['yes', 'no', 'unknown'] as const).map((x) => (
                  <button
                    key={x}
                    type="button"
                    className={`visibility-button ${artistResult === x ? 'visibility-selected' : ''}`}
                    onClick={() => setArtistResult(x)}
                  >
                    {x === 'yes' ? 'はい' : x === 'no' ? 'いいえ' : '不明'}
                  </button>
                ))}
              </div>
              <p className="panel-note">質問文はそのまま保存します。自然文を勝手に論理式へ変換しないため、候補盤面では回答内容を自動で真偽判定しません。</p>
            </>
          )}

          {juggler && (
            <>
              <div className="form-section">
                <label>ジャグリングした日</label>
                <select
                  value={jugglerGuessDay}
                  disabled={jugglerDayOptions.length === 0}
                  onChange={(e) => {
                    setJugglerGuessDay(e.target.value);
                    setWhen(`N${Number(e.target.value.slice(1)) + 1}`);
                  }}
                >
                  {jugglerDayOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                {jugglerDayOptions.length === 0 && <p className="panel-note history-missing-detail">結果はD1後のN2以降に記録できます。</p>}
              </div>
              <div className="form-section">
                <label>公開した予想（最大5個）</label>
                <select value={jugglerDraftPlayer ?? ''} onChange={(e) => setJugglerDraftPlayer(e.target.value || null)}>
                  <option value="">人を選択</option>
                  {players.map((p) => <option key={p} value={p}>{person(g, p)}</option>)}
                </select>
                <select value={jugglerDraftRole ?? ''} onChange={(e) => setJugglerDraftRole((e.target.value as RoleId) || null)}>
                  <option value="">役職を選択</option>
                  {scriptRoles.map((r) => <option key={r.id} value={r.id}>{r.symbol} {r.name}</option>)}
                </select>
                <button
                  type="button"
                  className="menu-option"
                  disabled={!jugglerDraftPlayer || !jugglerDraftRole || jugglerGuesses.length >= 5 || jugglerGuesses.some((g0) => g0.player === jugglerDraftPlayer && g0.roleId === jugglerDraftRole)}
                  onClick={() => {
                    if (!jugglerDraftPlayer || !jugglerDraftRole || jugglerGuesses.length >= 5) return;
                    setJugglerGuesses((xs) => [...xs, { player: jugglerDraftPlayer, roleId: jugglerDraftRole }]);
                    setJugglerDraftPlayer(null);
                    setJugglerDraftRole(null);
                  }}
                >
                  予想を追加
                </button>
                {jugglerGuesses.map((guess, i) => (
                  <div className="history-row" key={`${guess.player}-${guess.roleId}-${i}`}>
                    <span>{person(g, guess.player)} = {ROLES[guess.roleId]?.symbol} {ROLES[guess.roleId]?.name}</span>
                    <button type="button" onClick={() => setJugglerGuesses((xs) => xs.filter((_, j) => j !== i))}>削除</button>
                  </div>
                ))}
              </div>
              <div className="form-section">
                <label>正解数</label>
                <div className="player-toggle-grid">
                  {Array.from({ length: jugglerGuesses.length + 1 }, (_, i) => i).map((n) => (
                    <button type="button" key={n} className={`player-toggle ${firstNumber === n ? 'selected' : ''}`} aria-pressed={firstNumber === n} onClick={() => setFirstNumber(n)}>{n}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {(knight || noble) && (
            <div className="form-section">
              <label>{knight ? 'デーモンではないと知らされた2人' : 'ちょうど1人が悪陣営の3人'}</label>
              <div className="player-toggle-grid">{players.map(player => <button type="button" key={player} aria-pressed={targets.includes(player)} className={`player-toggle ${targets.includes(player) ? 'selected' : ''}`} onClick={() => toggle(player)}>{person(g,player)}</button>)}</div>
              <p className="panel-note">{knight ? '健康な騎士なら2人ともデーモンではありません。ヴォートックス下では少なくとも1人がデーモンです。' : '健康な貴族なら3人のうちちょうど1人が悪として登録されます。スパイや隠者の登録も考慮します。'}</p>
            </div>
          )}

          {pixie && (
            <div className="form-section">
              <label>初夜に知らされたゲーム内の町人役職</label>
              <select value={seen ?? ''} onChange={e => setSeen((e.target.value as RoleId) || null)}><option value="">選択</option>{scriptRoles.filter(r => r.type === 'townsfolk' && r.id !== 'pixie').map(r => <option key={r.id} value={r.id}>{r.symbol} {r.name}</option>)}</select>
              <p className="panel-note">その役職の人が死亡し、ストーリーテラーがあなたの役職主張を十分だと判断すると能力を得ます。</p>
            </div>
          )}

          {king && (
            <div className="form-section">
              <label>生存していると教えられた役職</label>
              <select value={seen ?? ''} onChange={e => setSeen((e.target.value as RoleId) || null)}><option value="">選択</option>{scriptRoles.map(r => <option key={r.id} value={r.id}>{r.symbol} {r.name}</option>)}</select>
              <p className="panel-note">死者数が生存者数以上になった夜から使える情報です。</p>
            </div>
          )}

          {general && (
            <>
              <div className="claim-option-title">戦況の判断</div>
              <div className="visibility-switch">{([['good','善が優勢'],['evil','悪が優勢'],['neither','互角']] as const).map(([value,label]) => <button key={value} type="button" className={generalAssessment === value ? 'visibility-button visibility-selected' : 'visibility-button'} onClick={() => setGeneralAssessment(value)}>{label}</button>)}</div>
              <p className="panel-note">ストーリーテラーの主観的な評価です。陣営を機械的に確定しません。</p>
            </>
          )}

          {fisherman && (
            <div className="form-section"><label>ストーリーテラーの助言</label><textarea rows={3} value={fisherAdvice} onChange={e => setFisherAdvice(e.target.value)} placeholder="言われた助言を記録"/><p className="panel-note">この助言は参考として保存し、候補盤面の硬い条件にしません。</p></div>
          )}

          {sage && (
            <div className="form-section">
              <label>デーモン候補として示された2人</label>
              <div className="player-toggle-grid">
                {players.map((p) => (
                  <button type="button" key={p} aria-pressed={targets.includes(p)} className={`player-toggle ${targets.includes(p) ? 'selected' : ''}`} onClick={() => toggle(p)}>
                    {person(g, p)}
                  </button>
                ))}
              </div>
              <p className="panel-note">健全なセージなら、デーモンに殺された時、この2人のうち1人がデーモンです。</p>
            </div>
          )}

          {shugenja && (
            <div className="form-section">
              <label>最も近い悪陣営がいる方向</label>
              <div className="visibility-switch"><button type="button" className={shugenjaDirection==='clockwise'?'visibility-button visibility-selected':'visibility-button'} onClick={()=>setShugenjaDirection('clockwise')}>時計回り</button><button type="button" className={shugenjaDirection==='anticlockwise'?'visibility-button visibility-selected':'visibility-button'} onClick={()=>setShugenjaDirection('anticlockwise')}>反時計回り</button></div>
              <p className="panel-note">座席順の最短距離で判定します。同距離ならどちらも示される可能性があります。</p>
            </div>
          )}
          {villageIdiot && (
            <div className="form-section">
              <label>占った人と陣営結果</label>
              <div className="player-toggle-grid">{players.map(p=><button type="button" key={p} aria-pressed={targets.includes(p)} className={`player-toggle ${targets.includes(p)?'selected':''}`} onClick={()=>toggle(p)}>{person(g,p)}</button>)}</div>
              <div className="visibility-switch"><button type="button" className={idiotResult==='good'?'visibility-button visibility-selected':'visibility-button'} onClick={()=>setIdiotResult('good')}>善陣営</button><button type="button" className={idiotResult==='evil'?'visibility-button visibility-selected':'visibility-button'} onClick={()=>setIdiotResult('evil')}>悪陣営</button></div>
              <p className="panel-note">開始時に複数いる村の愚者のうち、ちょうど1人が酔っています。</p>
            </div>
          )}
          {singlePlayerInfo && (
            <div className="form-section">
              <label>{role === 'balloonist' ? 'その夜に示された人' : role === 'bounty_hunter' ? '悪陣営として示された人' : role === 'choirboy' ? 'デーモンだと知らされた人' : role === 'steward' ? '善陣営だと知らされた人' : '会話するとよいと教えられた人'}</label>
              <div className="player-toggle-grid">
                {players.map((p) => (
                  <button type="button" key={p} aria-pressed={targets.includes(p)} className={`player-toggle ${targets.includes(p) ? 'selected' : ''}`} onClick={() => toggle(p)}>
                    {person(g, p)}
                  </button>
                ))}
              </div>
              {role === 'balloonist' && <p className="panel-note">健康なら前夜に示された人とは異なるキャラクター種類です。ヴォートックス下では逆になります。</p>}
              {role === 'bounty_hunter' && <p className="panel-note">健康なら示された人は悪陣営です。その人が死亡すると、次に別の悪陣営を知ります。</p>}
              {role === 'choirboy' && <p className="panel-note">王がデーモンに殺された時のみ発動します。王の死亡記録が必要です。</p>}
              {role === 'steward' && <p className="panel-note">健康な執事の初夜情報は善陣営1人です。スパイの登録能力も考慮されます。</p>}
              {role === 'high_priestess' && <p className="panel-note">死者を含め誰でも選べます。ストーリーテラーの主観的な判断です。</p>}
            </div>
          )}

          {klutz && (
            <>
              <div className="form-section">
                <label>死亡後に選んだ生存者</label>
                <div className="player-toggle-grid">
                  {selectablePlayers.map((p) => (
                    <button type="button" key={p} aria-pressed={targets.includes(p)} className={`player-toggle ${targets.includes(p) ? 'selected' : ''}`} onClick={() => toggle(p)}>
                      {person(g, p)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="claim-option-title">その選択で自陣営が敗北した？</div>
              <div className="visibility-switch">
                <button type="button" className={`visibility-button ${klutzTeamLost === false ? 'visibility-selected' : ''}`} onClick={() => setKlutzTeamLost(false)}>いいえ</button>
                <button type="button" className={`visibility-button ${klutzTeamLost === true ? 'visibility-selected' : ''}`} onClick={() => setKlutzTeamLost(true)}>はい</button>
              </div>
            </>
          )}

          {(pair || reveal) && !dreamer && !zero && (
            <>
              <div className="form-section">
                <label>{L.choosePlayers} ({max})</label>
                <div className="player-toggle-grid">
                  {selectablePlayers.map((p) => (
                    <button
                      type="button"
                      key={p}
                      aria-pressed={targets.includes(p)}
                      className={`player-toggle ${targets.includes(p) ? 'selected' : ''}`}
                      onClick={() => toggle(p)}
                    >
                      {person(g, p)}
                    </button>
                  ))}
                </div>
              </div>
              {role === 'fortune_teller' || role === 'seamstress' ? (
                <div className="visibility-switch">
                  {(['yes', 'no'] as const).map((x) => (
                    <button
                      key={x}
                      type="button"
                      className={`visibility-button ${yes === x ? 'visibility-selected' : ''}`}
                      onClick={() => setYes(x)}
                    >
                      {role === 'seamstress' ? (x === 'yes' ? '同陣営' : '別陣営') : L[x]}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="form-section">
                  <label>{L.shownRole}</label>
                  <select value={seen ?? ''} onChange={(e) => setSeen((e.target.value as RoleId) || null)}>
                    <option value="">{L.select}</option>
                    {showRoles.map((r) => <option key={r.id} value={r.id}>{r.symbol} {r.name}</option>)}
                  </select>
                </div>
              )}
            </>
          )}
        </>
      )}

      {role && !structured && (
        <>
          <div className="form-section">
            <label>能力・情報の時点</label>
            <select value={effectiveWhen} onChange={(e) => setWhen(e.target.value)}>
              {validWhenOptions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="claim-option-title">対象（分かる場合）</div>
          <div className="player-toggle-grid">
            {players.map((p) => (
              <button
                type="button"
                key={p}
                aria-pressed={targets.includes(p)}
                className={`player-toggle ${targets.includes(p) ? 'selected' : ''}`}
                onClick={() => toggle(p)}
              >
                {person(g, p)}
              </button>
            ))}
          </div>

          <div className="form-section">
            <label>情報 / 内容（任意）</label>
            <textarea
              value={genericResult}
              placeholder="例：3Lを守った、4Rを選んだ、能力は発動しなかった など"
              onChange={(e) => setGenericResult(e.target.value)}
            />
          </div>
          <p className="panel-note">自由記述は保存されますが、専用ロジックがない内容は候補盤面では自動解釈しません。</p>
        </>
      )}

      <div className="form-section">
        <label>{L.saidWhen}</label>
        <select value={reported} onChange={(e) => setReported(e.target.value)}>
          {validWhenOptions.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="visibility-switch">
        {(['public', 'private'] as const).map((v) => (
          <button
            type="button"
            key={v}
            className={`visibility-button ${visibility === v ? 'visibility-selected' : ''}`}
            onClick={() => {
              setVisibility(v);
              if (v === 'public') setRecipients([]);
            }}
          >
            {L[v]}
          </button>
        ))}
      </div>

      {visibility === 'private' && (
        <div className="form-section">
          <label>{L.audience}</label>
          <div className="player-toggle-grid">
            {players.filter((p) => p !== speaker).map((p) => (
              <button
                type="button"
                key={p}
                aria-pressed={recipients.includes(p)}
                className={`player-toggle ${recipients.includes(p) ? 'selected' : ''}`}
                onClick={() => setRecipients((xs) => xs.includes(p) ? xs.filter((x) => x !== p) : [...xs, p])}
              >
                {person(g, p)}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        className="menu-option confirm-claim-button"
        disabled={!canSave}
        onClick={() => {
          if (!role || !canSave) return;
          onSave({
            id: eventId(),
            playerId: speaker,
            sourcePlayerId: source,
            roleId: role,
            when: effectiveWhen,
            reportedWhen: reported,
            structured: structured ? data ?? undefined : undefined,
            targets,
            result: structured ? null : genericResult.trim() || null,
            visibility,
            recipients: visibility === 'private' ? recipients : [],
          });
        }}
      >
        {L.confirm}
      </button>
      <button type="button" className="menu-option" disabled={!onUndo} onClick={() => onUndo?.()}>取り消し</button>
      <button type="button" className="menu-option" onClick={onBack}>{L.back}</button>
    </>
  );
}
