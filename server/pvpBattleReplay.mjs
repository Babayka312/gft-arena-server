import { createPvpRng, createBattleCardUid } from './pvpRng.mjs';
import { CHARACTER_CARDS } from './characterCardsData.mjs';
import { getElementMatchupMultiplier } from './elementMatchup.mjs';

const MAX_MOVES = 450;
const BATTLE_DAMAGE_MULTIPLIER = 1.65;
const BATTLE_SUPPORT_MULTIPLIER = 0.7;
const BATTLE_DOT_IMMEDIATE_MULTIPLIER = 0.9;
const BATTLE_DOT_TICK_MULTIPLIER = 0.45;
const BATTLE_CRIT_CHANCE = 0.12;
const BATTLE_CRIT_MULTIPLIER = 1.5;
const BATTLE_MAX_ROUNDS = 30;

function getPvpBotMultiplierFromRatingDiff(playerRating, opponentRating) {
  const diff = opponentRating - playerRating;
  return 1 + Math.max(-0.5, Math.min(0.5, diff * 0.0008));
}

function getLeaderBonus(mainHero) {
  if (!mainHero) return { hpMultiplier: 1, powerMultiplier: 1 };
  return {
    hpMultiplier: 1 + mainHero.level * 0.025 + mainHero.stars * 0.04,
    powerMultiplier: 1 + mainHero.level * 0.018 + mainHero.stars * 0.035,
  };
}

function getBuffedCardStats(card, mainHero) {
  const leader = getLeaderBonus(mainHero);
  return {
    hp: Math.floor(card.hp * leader.hpMultiplier),
    power: Math.floor(card.power * leader.powerMultiplier),
  };
}

function toCardFighter(card, side, idx, statMultiplier, mainHero) {
  const baseStats =
    side === 'player'
      ? getBuffedCardStats(card, mainHero)
      : { hp: Math.floor(card.hp * 0.95), power: card.power };
  const buffed = {
    hp: Math.max(1, Math.floor(baseStats.hp * statMultiplier)),
    power: Math.max(1, Math.floor(baseStats.power * statMultiplier)),
  };
  return {
    uid: createBattleCardUid(side, idx, card.id),
    name: card.name,
    role: `${card.element} • ${card.kind}`,
    emoji: side === 'player' ? '🟦' : '🟥',
    element: card.element,
    maxHP: buffed.hp,
    hp: buffed.hp,
    power: buffed.power,
    speed: card.speed,
    abilities: { basic: card.abilities[0], skill: card.abilities[1] },
    cooldowns: { basic: 0, skill: 0 },
    shield: 0,
    stunnedTurns: 0,
    dotDamage: 0,
    dotTurns: 0,
  };
}

const getAlive = (team) => team.filter((c) => c.hp > 0);
const getFighterSide = (uid, playerTeam, botTeam) => {
  if (!uid) return null;
  if (playerTeam.some((c) => c.uid === uid)) return 'player';
  if (botTeam.some((c) => c.uid === uid)) return 'bot';
  return null;
};
const getFighterByUid = (uid, playerTeam, botTeam) => {
  if (!uid) return undefined;
  return [...playerTeam, ...botTeam].find((c) => c.uid === uid);
};

function createTurnOrder(playerTeam, botTeam) {
  return [...playerTeam, ...botTeam]
    .sort((a, b) => {
      if (b.speed !== a.speed) return b.speed - a.speed;
      return b.power - a.power;
    })
    .map((c) => c.uid);
}

function getLowestHpAlly(team) {
  return getAlive(team).sort((a, b) => a.hp / a.maxHP - b.hp / b.maxHP)[0];
}

function applyDamageToFighter(target, amount) {
  const absorbed = Math.min(target.shield, amount);
  target.shield -= absorbed;
  target.hp = Math.max(0, target.hp - (amount - absorbed));
  return absorbed;
}

function decCooldowns(team, actedUid) {
  return team.map((c) => ({
    ...c,
    cooldowns:
      c.uid === actedUid
        ? { basic: Math.max(0, c.cooldowns.basic - 1), skill: Math.max(0, c.cooldowns.skill - 1) }
        : c.cooldowns,
  }));
}

function tickDots(team) {
  for (const fighter of team) {
    if (fighter.hp <= 0 || fighter.dotTurns <= 0) continue;
    const damage = fighter.dotDamage;
    applyDamageToFighter(fighter, damage);
    fighter.dotTurns -= 1;
    if (fighter.dotTurns <= 0) fighter.dotDamage = 0;
  }
}

/**
 * Полный серверный пересчёт PvP по журналу ходов и сиду сессии (исход боя и награды — только отсюда).
 *
 * @param {object} param0
 * @param {string} param0.rngSeed
 * @param {import('./pvpRng.mjs').PvpRngApi | null} [param0._rng] — для тестов
 * @param {object} param0.myProgress — normalized
 * @param {number} param0.opponentRating
 * @param {Array<{ side: 'player'|'bot', ability: 'basic'|'skill', attackerUid: string, targetUid: string | null, allyUid: string | null }>} param0.moves
 */
export function recalculatePvpBattleFromMoves({ rngSeed, _rng, myProgress, opponentRating, moves }) {
  if (!Array.isArray(moves) || moves.length === 0) {
    return { ok: false, error: 'PvP: передай pvpMoves (журнал ходов) для начисления рейтинга' };
  }
  if (moves.length > MAX_MOVES) {
    return { ok: false, error: 'PvP: слишком длинный журнал' };
  }

  const rng = _rng ?? createPvpRng(rngSeed);
  const collection = myProgress?.cards?.collection && typeof myProgress.cards.collection === 'object' ? myProgress.cards.collection : {};
  const squadIds = Array.isArray(myProgress?.cards?.squadIds) ? myProgress.cards.squadIds : [];
  const mainHero = myProgress?.mainHero ?? null;
  const myRating = Number.isFinite(Number(myProgress?.currencies?.rating)) ? Number(myProgress.currencies.rating) : 1000;
  const botMult = getPvpBotMultiplierFromRatingDiff(myRating, Number(opponentRating) || 1000);

  const playerCards = resolveActiveSquad(squadIds, collection);
  const playerTeam = playerCards.map((c, i) => toCardFighter(c, 'player', i, 1, mainHero));

  const botPicks = [0, 1, 2].map(() => rng.randomItem(CHARACTER_CARDS));
  const botTeam = botPicks.map((c, i) => toCardFighter(c, 'bot', i, botMult, null));

  const turnOrder = createTurnOrder(playerTeam, botTeam);
  const activeFighterUid = turnOrder[0] ?? null;
  const firstTurn = getFighterSide(activeFighterUid, playerTeam, botTeam) ?? 'player';

  const state = {
    playerTeam: playerTeam.map(cloneFighter),
    botTeam: botTeam.map(cloneFighter),
    turnOrder: [...turnOrder],
    turn: firstTurn,
    round: 1,
    activeFighterUid,
    selectedAttackerUid: firstTurn === 'player' ? activeFighterUid : playerTeam[0]?.uid ?? null,
    selectedTargetUid: botTeam[0]?.uid ?? null,
    selectedAllyUid: playerTeam[0]?.uid ?? null,
  };

  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    if (!m || (m.side !== 'player' && m.side !== 'bot')) {
      return { ok: false, error: 'PvP: неверный ход' };
    }
    if (m.ability !== 'basic' && m.ability !== 'skill') {
      return { ok: false, error: 'PvP: неверная способность' };
    }
    if (typeof m.attackerUid === 'string' && m.attackerUid !== state.activeFighterUid) {
      return { ok: false, error: 'PvP: неверный активный боец в ходе' };
    }
    const r = applyOneMove(state, m, rng, i, moves.length);
    if (r.err) {
      return { ok: false, error: r.err };
    }
    if (r.ended) {
      if (i !== moves.length - 1) {
        return { ok: false, error: 'PvP: лишние ходы после окончания' };
      }
      return {
        ok: true,
        result: r.result,
        stats: {
          movesApplied: moves.length,
          endedAtMoveIndex: i,
          roundAtEnd: state.round,
          playerAlive: getAlive(state.playerTeam).length,
          botAlive: getAlive(state.botTeam).length,
        },
      };
    }
  }

  const pA = getAlive(state.playerTeam).length;
  const bA = getAlive(state.botTeam).length;
  if (pA > 0 && bA > 0) {
    return { ok: false, error: 'PvP: неполный журнал — бой не доведён' };
  }
  if (bA === 0) {
    return {
      ok: true,
      result: 'win',
      stats: {
        movesApplied: moves.length,
        endedAtMoveIndex: moves.length - 1,
        roundAtEnd: state.round,
        playerAlive: pA,
        botAlive: bA,
      },
    };
  }
  if (pA === 0) {
    return {
      ok: true,
      result: 'lose',
      stats: {
        movesApplied: moves.length,
        endedAtMoveIndex: moves.length - 1,
        roundAtEnd: state.round,
        playerAlive: pA,
        botAlive: bA,
      },
    };
  }
  return { ok: false, error: 'PvP: невозможный исход' };
}

/**
 * @param {Parameters<typeof recalculatePvpBattleFromMoves>[0]} args
 */
export function verifyPvpBattleMoves(args) {
  const r = recalculatePvpBattleFromMoves(args);
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, result: r.result };
}

function cloneFighter(f) {
  return {
    ...f,
    cooldowns: { ...f.cooldowns },
    abilities: { basic: { ...f.abilities.basic }, skill: { ...f.abilities.skill } },
  };
}

function resolveActiveSquad(squadIds, collection) {
  const ownedOrdered = CHARACTER_CARDS.filter((c) => (collection[c.id] ?? 0) > 0);
  const picked = [];
  for (const id of squadIds) {
    if (picked.length >= 3) break;
    if ((collection[id] ?? 0) < 1) continue;
    const c = CHARACTER_CARDS.find((x) => x.id === id);
    if (c) picked.push(c);
  }
  if (picked.length > 0) {
    return picked.slice(0, 3);
  }
  return ownedOrdered.slice(0, 3);
}

function applyOneMove(state, move, rng, i, moveCount) {
  if (getAlive(state.playerTeam).length === 0 || getAlive(state.botTeam).length === 0) {
    return { ended: true, result: getAlive(state.playerTeam).length ? 'win' : 'lose' };
  }
  if (state.turn === 'ended') {
    return { err: 'PvP: бой уже окончен' };
  }

  if (state.turn !== move.side) {
    return { err: 'PvP: очередь хода не совпала' };
  }
  if (getFighterSide(state.activeFighterUid, state.playerTeam, state.botTeam) !== move.side) {
    return { err: 'PvP: неверный сторона хода' };
  }
  if (state.activeFighterUid !== move.attackerUid) {
    return { err: 'PvP: attackerUid не совпал с бимом' };
  }

  if (move.side === 'bot') {
    const atk = getFighterByUid(state.activeFighterUid, state.playerTeam, state.botTeam);
    if (!atk || atk.hp <= 0) return { err: 'PvP: нет атакующего' };
    const skillReady = atk.cooldowns.skill === 0;
    const picked = rng.rollBotAbility(skillReady);
    if (picked !== move.ability) {
      return { err: 'PvP: бот-ролл не совпал' };
    }
  }

  let res;
  try {
    res = stepApply(
      { ...state, playerTeam: state.playerTeam.map(cloneFighter), botTeam: state.botTeam.map(cloneFighter) },
      move,
      rng,
    );
  } catch (e) {
    return { err: String(e?.message || e) };
  }
  if (res.turn === 'ended') {
    Object.assign(state, res);
    if (i !== moveCount - 1) {
      return { err: 'PvP: бой закончился раньше конца списка' };
    }
    const w = getAlive(res.playerTeam).length > 0;
    return { ended: true, result: w ? 'win' : 'lose' };
  }
  Object.assign(state, res);
  return { ended: false };
}

function stepApply(prev, move, rng) {
  const attackerSide = move.side;
  if (getFighterSide(prev.activeFighterUid, prev.playerTeam, prev.botTeam) !== attackerSide) {
    throw new Error('PvP: turn');
  }

  const playerTeam = prev.playerTeam.map((c) => ({ ...c, cooldowns: { ...c.cooldowns } }));
  const botTeam = prev.botTeam.map((c) => ({ ...c, cooldowns: { ...c.cooldowns } }));
  const atkTeam = attackerSide === 'player' ? playerTeam : botTeam;
  const defTeam = attackerSide === 'player' ? botTeam : playerTeam;

  const attacker = atkTeam.find((c) => c.uid === prev.activeFighterUid && c.hp > 0);
  if (!attacker) throw new Error('PvP: нет атакующего');
  if (attacker.stunnedTurns > 0) {
    attacker.stunnedTurns -= 1;
  } else {
    const ability = move.ability;
    const abilityData = attacker.abilities[ability];
    if (ability === 'skill' && attacker.cooldowns.skill > 0) {
      throw new Error('PvP: скилл на кд');
    }

    const target = move.targetUid
      ? defTeam.find((c) => c.uid === move.targetUid && c.hp > 0)
      : defTeam.find((c) => c.hp > 0);
    const baseEffectValue = Math.max(1, Math.floor(attacker.power * abilityData.power * rng.randomRange(0.9, 0.25)));
    const effectValue =
      abilityData.kind === 'heal' || abilityData.kind === 'shield'
        ? Math.max(1, Math.floor(baseEffectValue * BATTLE_SUPPORT_MULTIPLIER))
        : Math.max(1, Math.floor(baseEffectValue * BATTLE_DAMAGE_MULTIPLIER));

    if (abilityData.kind === 'heal') {
      const ally = move.allyUid
        ? atkTeam.find((c) => c.uid === move.allyUid && c.hp > 0)
        : getLowestHpAlly(atkTeam);
      if (!ally) throw new Error('PvP: цель хила');
      ally.hp = Math.min(ally.maxHP, ally.hp + effectValue);
    } else if (abilityData.kind === 'shield') {
      const ally = move.allyUid
        ? atkTeam.find((c) => c.uid === move.allyUid && c.hp > 0)
        : getLowestHpAlly(atkTeam);
      if (!ally) throw new Error('PvP: цель щита');
      ally.shield += effectValue;
    } else {
      if (!target) throw new Error('PvP: нет цели');
      const matchupMult = getElementMatchupMultiplier(attacker.element, target.element);
      const isCrit = rng.rollCrit(BATTLE_CRIT_CHANCE);
      const critMult = isCrit ? BATTLE_CRIT_MULTIPLIER : 1;
      const baseDamage =
        abilityData.kind === 'dot'
          ? Math.max(1, Math.floor(effectValue * BATTLE_DOT_IMMEDIATE_MULTIPLIER))
          : effectValue;
      const damage = Math.max(1, Math.floor(baseDamage * matchupMult * critMult));
      applyDamageToFighter(target, damage);
      if (abilityData.kind === 'dot') {
        const dotTick = Math.max(1, Math.floor(effectValue * BATTLE_DOT_TICK_MULTIPLIER * matchupMult));
        target.dotDamage = Math.max(target.dotDamage, dotTick);
        target.dotTurns = Math.max(target.dotTurns, 2);
      }
      if (abilityData.kind === 'stun') {
        target.stunnedTurns = Math.max(target.stunnedTurns, 1);
      }
    }

    if (ability === 'skill') attacker.cooldowns.skill = abilityData.cooldownTurns;
  }

  const newPlayerTeam = attackerSide === 'player' ? atkTeam : defTeam;
  const newBotTeam = attackerSide === 'player' ? defTeam : atkTeam;
  tickDots(newPlayerTeam);
  tickDots(newBotTeam);

  const pAlive = getAlive(newPlayerTeam).length;
  const bAlive = getAlive(newBotTeam).length;
  const decP = decCooldowns(newPlayerTeam, attacker.uid);
  const decB = decCooldowns(newBotTeam, attacker.uid);
  if (bAlive === 0) {
    return { ...prev, playerTeam: decP, botTeam: decB, turn: 'ended' };
  }
  if (pAlive === 0) {
    return { ...prev, playerTeam: decP, botTeam: decB, turn: 'ended' };
  }

  const aliveOrder = prev.turnOrder.filter((uid) => {
    const fighter = getFighterByUid(uid, decP, decB);
    return Boolean(fighter && fighter.hp > 0);
  });
  const currentIndex = aliveOrder.indexOf(attacker.uid);
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % aliveOrder.length : 0;
  const nextActiveUid = aliveOrder[nextIndex] ?? null;
  const nextTurn = getFighterSide(nextActiveUid, decP, decB) ?? 'player';
  const nextRound = currentIndex >= 0 && nextIndex <= currentIndex ? prev.round + 1 : prev.round;
  if (nextRound > BATTLE_MAX_ROUNDS) {
    const playerHpSum = decP.reduce((s, c) => s + c.hp + c.shield, 0);
    const botHpSum = decB.reduce((s, c) => s + c.hp + c.shield, 0);
    const finalP = decP.map((c) => ({ ...c }));
    const finalB = decB.map((c) => ({ ...c }));
    if (playerHpSum > botHpSum) {
      for (const c of finalB) c.hp = 0;
    } else {
      for (const c of finalP) c.hp = 0;
    }
    return { ...prev, playerTeam: finalP, botTeam: finalB, turn: 'ended', round: nextRound };
  }
  const nextSelected =
    nextTurn === 'player' ? getAlive(decB)[0]?.uid ?? null : prev.selectedTargetUid;
  const nextAttacker =
    nextTurn === 'player'
      ? nextActiveUid
      : getAlive(decP).find((c) => c.uid === prev.selectedAttackerUid)?.uid ?? getAlive(decP)[0]?.uid ?? null;
  const nextAlly =
    nextTurn === 'player' ? getAlive(decP).find((c) => c.uid === prev.selectedAllyUid)?.uid ?? nextAttacker : prev.selectedAllyUid;

  return {
    ...prev,
    playerTeam: decP,
    botTeam: decB,
    turn: nextTurn,
    round: nextRound,
    activeFighterUid: nextActiveUid,
    selectedAttackerUid: nextAttacker,
    selectedTargetUid: nextSelected,
    selectedAllyUid: nextAlly,
  };
}
