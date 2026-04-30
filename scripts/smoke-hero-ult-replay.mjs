/**
 * Smoke-тест: серверный PvP-replay принимает новый тип хода `heroUlt`
 * и корректно режектит ульту без 4 зарядов. Запускается локально:
 *   node scripts/smoke-hero-ult-replay.mjs
 */

import { recalculatePvpBattleFromMoves } from '../server/pvpBattleReplay.mjs';
const myProgress = {
  mainHero: { id: 1, basePower: 20, level: 5, stars: 2 },
  cards: {
    collection: { 'c001_field-mouse': 1, 'c002_sparrow': 1, 'c003_hedgehog': 1 },
    squadIds: ['c001_field-mouse', 'c002_sparrow', 'c003_hedgehog'],
  },
  currencies: { rating: 1000 },
};

const fail = (msg) => {
  console.error('FAIL:', msg);
  process.exitCode = 1;
};
const pass = (msg) => console.log('PASS:', msg);

// 1) Пустой журнал — отдельная ошибка про pvpMoves.
{
  const r = recalculatePvpBattleFromMoves({
    rngSeed: 'seed-empty',
    myProgress,
    opponentRating: 1000,
    moves: [],
  });
  if (r.ok) fail('empty moves should be rejected');
  else if (!r.error.includes('журнал')) fail(`empty moves: unexpected error: ${r.error}`);
  else pass('empty moves rejected with journal error');
}

// 2) heroUlt без 4 зарядов — режект (attackerUid не задаём, чтобы внешний предчек
// не отрабатывал «attackerUid mismatch» раньше нашей логики ульты).
{
  const r = recalculatePvpBattleFromMoves({
    rngSeed: 'seed-noncharged',
    myProgress,
    opponentRating: 1000,
    moves: [
      {
        side: 'player',
        ability: 'heroUlt',
        attackerUid: null,
        targetUid: null,
        allyUid: null,
      },
    ],
  });
  if (r.ok) fail('heroUlt without charges should be rejected');
  else if (!/(\u0443\u043b\u044c\u0442|\u043e\u0447\u0435\u0440\u0435\u0434\u044c)/i.test(r.error)) {
    fail(`heroUlt no-charge: unexpected error: ${r.error}`);
  } else {
    pass(`heroUlt without charges/turn rejected (${r.error})`);
  }
}

// 3) Неизвестная ability — режект.
{
  const r = recalculatePvpBattleFromMoves({
    rngSeed: 'seed-bogus',
    myProgress,
    opponentRating: 1000,
    moves: [
      { side: 'player', ability: 'banana', attackerUid: null, targetUid: null, allyUid: null },
    ],
  });
  if (r.ok) fail('bogus ability should be rejected');
  else pass(`bogus ability rejected (${r.error})`);
}

if (process.exitCode !== 1) console.log('\nALL SMOKE CHECKS PASSED');
