/**
 * Подбор соперников PvP: близкий / средний / дальний рейтинг + квоты и детерминированное перемешивание.
 * Результат — не «топ N по absDiff» (он слишком однообразен), а разнообразная выборка с приоритетом равных матчей.
 */

const DEFAULT_LIST_SIZE = 12;
const MIN_LIST_SIZE = 4;
const MAX_LIST_SIZE = 24;

/** В пределах этого окна — «приоритетные» соперники */
export const PVP_MM_RATING_NEAR = 120;
/** Дальше — «средняя дистанция» по рейтингу */
export const PVP_MM_RATING_MID = 380;

function clampListSize(n) {
  const x = Math.floor(Number(n));
  if (!Number.isFinite(x)) return DEFAULT_LIST_SIZE;
  return Math.min(MAX_LIST_SIZE, Math.max(MIN_LIST_SIZE, x));
}

/** FNV-1a + имитация PRNG для стабильного shuffle от строки */
function hashStringToUint32(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededShuffle(arr, seedStr) {
  let state = hashStringToUint32(String(seedStr));
  if (state === 0) state = 2463534242;
  const rand01 = () => {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    return state / 4294967296;
  };
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand01() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Квоты по полосам: ~50% близкие, ~35% средние, ~15% дальние (дополняются при нехватке).
 *
 * @param {number} myRating
 * @param {Array<object>} candidates Строки с полями playerId, name, rating, power, maxHP, zodiac, ...
 * @param {object} [opts]
 * @param {number} [opts.listSize]
 * @param {string} [opts.seed] Сид для shuffle (день + playerId + vary от клиента).
 */
export function pickPvpOpponentsMatchmaking(myRating, candidates, opts = {}) {
  const listSize = clampListSize(opts.listSize ?? DEFAULT_LIST_SIZE);
  const mr = Number.isFinite(Number(myRating)) ? Number(myRating) : 1000;

  const enriched = candidates.map((c) => ({
    ...c,
    _diff: Math.abs(Number(c.rating) - mr),
  }));

  const near = enriched.filter((c) => c._diff <= PVP_MM_RATING_NEAR);
  const mid = enriched.filter((c) => c._diff > PVP_MM_RATING_NEAR && c._diff <= PVP_MM_RATING_MID);
  const far = enriched.filter((c) => c._diff > PVP_MM_RATING_MID);

  let qNear = Math.max(1, Math.round(listSize * 0.5));
  let qMid = Math.max(1, Math.round(listSize * 0.35));
  let qFar = Math.max(0, listSize - qNear - qMid);
  if (qNear + qMid + qFar > listSize) {
    qMid = Math.max(0, listSize - qNear - qFar);
    if (qNear + qMid + qFar > listSize) {
      qNear = Math.max(1, listSize - qMid - qFar);
    }
  }

  const seedBase = String(opts.seed ?? 'default');
  const sn = seededShuffle(near, `${seedBase}:near`);
  const sm = seededShuffle(mid, `${seedBase}:mid`);
  const sf = seededShuffle(far, `${seedBase}:far`);

  const out = [];
  const used = new Set();

  const pushSlice = (list, quota) => {
    let n = 0;
    for (const row of list) {
      if (n >= quota) break;
      if (!used.has(row.playerId)) {
        used.add(row.playerId);
        out.push(row);
        n += 1;
      }
    }
  };

  pushSlice(sn, qNear);
  pushSlice(sm, qMid);
  pushSlice(sf, qFar);

  if (out.length < listSize) {
    const restPool = seededShuffle(
      enriched.filter((c) => !used.has(c.playerId)),
      `${seedBase}:fill`,
    );
    for (const row of restPool) {
      if (out.length >= listSize) break;
      if (!used.has(row.playerId)) {
        used.add(row.playerId);
        out.push(row);
      }
    }
  }

  const strip = ({ _diff, ...row }) => row;
  return {
    opponents: out.slice(0, listSize).map(strip),
    meta: {
      listSize,
      pools: { near: near.length, mid: mid.length, far: far.length },
      quotas: { near: qNear, mid: qMid, far: qFar },
    },
  };
}
