export function detectWithdrawSpike(transactions, now = Date.now()) {
  const dayMs = 24 * 60 * 60 * 1000;
  const last24 = transactions.filter((t) => t.type === 'withdraw' && now - t.ts <= dayMs);
  const prev24 = transactions.filter((t) => t.type === 'withdraw' && now - t.ts > dayMs && now - t.ts <= 2 * dayMs);
  const lastSum = last24.reduce((s, t) => s + Math.max(0, Number(t.amount || 0)), 0);
  const prevSum = prev24.reduce((s, t) => s + Math.max(0, Number(t.amount || 0)), 0);
  if (lastSum > 300 && (prevSum === 0 || lastSum > prevSum * 1.4)) {
    return {
      type: 'withdraw_spike',
      severity: 'high',
      involvedPlayers: [...new Set(last24.map((t) => String(t.playerId)))],
      details: { last24: lastSum, prev24: prevSum, txCount: last24.length },
    };
  }
  return null;
}

export function detectSameDestinationMassWithdraw(transactions, now = Date.now()) {
  const dayMs = 24 * 60 * 60 * 1000;
  const rows = transactions.filter((t) => t.type === 'withdraw' && now - t.ts <= dayMs);
  const byDest = new Map();
  for (const t of rows) {
    const dest = String(t.destination || '').trim();
    if (!dest) continue;
    const bucket = byDest.get(dest) || { dest, players: new Set(), total: 0, count: 0 };
    bucket.players.add(String(t.playerId));
    bucket.total += Math.max(0, Number(t.amount || 0));
    bucket.count += 1;
    byDest.set(dest, bucket);
  }
  const hit = [...byDest.values()].find((b) => b.players.size >= 3 && b.total >= 150);
  if (!hit) return null;
  return {
    type: 'multi_account_same_destination',
    severity: 'critical',
    involvedPlayers: [...hit.players],
    details: { destination: hit.dest, total: hit.total, count: hit.count },
  };
}

export function detectAccountHyperActivity(transactions, now = Date.now()) {
  const hourMs = 60 * 60 * 1000;
  const rows = transactions.filter((t) => now - t.ts <= hourMs);
  const byPlayer = new Map();
  for (const t of rows) {
    const pid = String(t.playerId || '');
    if (!pid) continue;
    byPlayer.set(pid, (byPlayer.get(pid) || 0) + 1);
  }
  const hit = [...byPlayer.entries()].find(([, count]) => count >= 40);
  if (!hit) return null;
  return {
    type: 'account_hyper_activity',
    severity: 'high',
    involvedPlayers: [hit[0]],
    details: { txCountLastHour: hit[1] },
  };
}

export function detectEmissionBurst(transactions, now = Date.now()) {
  const winMs = 30 * 60 * 1000;
  const rows = transactions.filter((t) => t.type === 'reward' && now - t.ts <= winMs);
  const gft = rows.reduce((s, t) => s + Math.max(0, Number(t.amount || 0)), 0);
  if (gft >= 250) {
    return {
      type: 'gft_emission_burst',
      severity: 'medium',
      involvedPlayers: [...new Set(rows.map((r) => String(r.playerId)))],
      details: { gftInWindow: gft, txCount: rows.length, windowMin: 30 },
    };
  }
  return null;
}

export function runAnomalyDetectors(transactions, now = Date.now()) {
  const out = [
    detectWithdrawSpike(transactions, now),
    detectSameDestinationMassWithdraw(transactions, now),
    detectAccountHyperActivity(transactions, now),
    detectEmissionBurst(transactions, now),
  ].filter(Boolean);
  return out;
}

