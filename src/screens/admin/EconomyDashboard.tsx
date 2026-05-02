import { memo, useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { API_BASE } from '../../apiConfig';
import { EconomyCard } from '../../components/admin/EconomyCard';
import { EconomyChart } from '../../components/admin/EconomyChart';
import { EconomyTable } from '../../components/admin/EconomyTable';
import { Background } from '../../components/ui/Background';

type EconomyDashboardProps = {
  background: string;
  contentInset: CSSProperties;
  bottomInsetPx: number;
};

type AdminPayloads = {
  emission?: any;
  rewards?: any;
  staking?: any;
  withdrawals?: any;
  settings?: any;
  players?: any;
};

const TOKEN_KEY = 'gft_admin_token_v1';

async function adminGet(path: string, token: string) {
  const r = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: token.trim() ? { 'x-admin-token': token } : {},
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function adminPost(path: string, token: string, body: unknown) {
  const r = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...(token.trim() ? { 'x-admin-token': token } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export const EconomyDashboard = memo(function EconomyDashboard({
  background,
  contentInset,
  bottomInsetPx,
}: EconomyDashboardProps) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<AdminPayloads>({});
  const [settingsDraft, setSettingsDraft] = useState({
    rewardMultiplierManual: '1',
    feeOverridePct: '',
    minAmount: '',
    maxAmount: '',
    cooldownDays: '',
    elasticRewardsEnabled: true,
    gftDifficultyScale: '1',
  });

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const [emission, rewards, staking, withdrawals, settings, players] = await Promise.all([
        adminGet('/api/admin/economy/emission', token),
        adminGet('/api/admin/economy/rewards', token),
        adminGet('/api/admin/economy/staking', token),
        adminGet('/api/admin/economy/withdrawals', token),
        adminGet('/api/admin/economy/settings', token),
        adminGet('/api/admin/economy/players', token),
      ]);
      setData({ emission, rewards, staking, withdrawals, settings, players });
      const s = settings?.settings ?? {};
      setSettingsDraft({
        rewardMultiplierManual: String(s.rewardMultiplierManual ?? 1),
        feeOverridePct: s.feeOverridePct == null ? '' : String(s.feeOverridePct),
        minAmount: s.withdrawLimits?.minAmount == null ? '' : String(s.withdrawLimits.minAmount),
        maxAmount: s.withdrawLimits?.maxAmount == null ? '' : String(s.withdrawLimits.maxAmount),
        cooldownDays: s.withdrawLimits?.cooldownDays == null ? '' : String(s.withdrawLimits.cooldownDays),
        elasticRewardsEnabled: s.elasticRewardsEnabled !== false,
        gftDifficultyScale: String(s.gftDifficultyScale ?? 1),
      });
      localStorage.setItem(TOKEN_KEY, token.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить dashboard.');
    } finally {
      setBusy(false);
    }
  }, [token]);

  useEffect(() => {
    if (token.trim()) void load();
  }, [load, token]);

  const applySettings = useCallback(async () => {
    if (!token.trim()) return;
    setBusy(true);
    setError('');
    try {
      await adminPost('/api/admin/economy/settings', token, {
        rewardMultiplierManual: Number(settingsDraft.rewardMultiplierManual || 1),
        feeOverridePct: settingsDraft.feeOverridePct.trim() === '' ? null : Number(settingsDraft.feeOverridePct),
        withdrawLimits: {
          minAmount: settingsDraft.minAmount.trim() === '' ? null : Number(settingsDraft.minAmount),
          maxAmount: settingsDraft.maxAmount.trim() === '' ? null : Number(settingsDraft.maxAmount),
          cooldownDays: settingsDraft.cooldownDays.trim() === '' ? null : Number(settingsDraft.cooldownDays),
        },
        elasticRewardsEnabled: settingsDraft.elasticRewardsEnabled,
        gftDifficultyScale: Number(settingsDraft.gftDifficultyScale || 1),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось обновить настройки.');
    } finally {
      setBusy(false);
    }
  }, [load, settingsDraft, token]);

  const playerColumns = useMemo(
    () => [
      { key: 'playerId', label: 'Player' },
      { key: 'userName', label: 'Name' },
      { key: 'gft', label: 'GFT', numeric: true },
      { key: 'staked', label: 'Staked', numeric: true },
      { key: 'spent', label: 'Spent', numeric: true },
      { key: 'suspiciousScore', label: 'Risk', numeric: true },
    ],
    [],
  );

  return (
    <Background
      background={background}
      gradient="linear-gradient(180deg, rgba(2,6,23,0.9) 0%, rgba(15,23,42,0.72) 40%, rgba(2,6,23,0.95) 100%)"
      style={{
        ...contentInset,
        paddingBottom: `${bottomInsetPx}px`,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: '1220px', margin: '0 auto', padding: '0 12px 14px' }}>
        <h2 style={{ margin: '0 0 10px', color: '#f8fafc', fontSize: 'clamp(22px, 4.5vw, 34px)', fontWeight: 950, letterSpacing: '0.04em' }}>
          Economy Dashboard
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', marginBottom: '10px' }}>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ADMIN_TOKEN"
            style={{ borderRadius: '10px', border: '1px solid #334155', background: '#0f172a', color: '#fff', padding: '10px 12px', fontSize: '13px' }}
          />
          <button
            type="button"
            onClick={() => void load()}
            disabled={busy}
            style={{ borderRadius: '10px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 800, padding: '10px 14px', cursor: busy ? 'wait' : 'pointer' }}
          >
            {busy ? '...' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem(TOKEN_KEY);
              setToken('');
            }}
            style={{ borderRadius: '10px', border: '1px solid #475569', background: '#0b1220', color: '#cbd5e1', fontWeight: 700, padding: '10px 14px', cursor: 'pointer' }}
          >
            Clear
          </button>
        </div>
        {error && <div style={{ marginBottom: '10px', borderRadius: '10px', border: '1px solid rgba(248,113,113,0.45)', background: 'rgba(127,29,29,0.32)', color: '#fecaca', fontSize: '12px', fontWeight: 700, padding: '8px 10px' }}>{error}</div>}

        <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))' }}>
          <EconomyCard
            title="Emission Monitor"
            value={`${Math.round(data.emission?.totals?.month ?? 0).toLocaleString()} GFT / month`}
            subtitle={`Day ${Math.round(data.emission?.totals?.day ?? 0)} · Week ${Math.round(data.emission?.totals?.week ?? 0)}`}
            warning={(data.emission?.warnings?.monthExceeded || data.emission?.warnings?.weekExceeded || data.emission?.warnings?.dayExceeded) ? 'Emission limit exceeded' : null}
          >
            <EconomyChart
              type="pie"
              data={Object.entries(data.emission?.sources ?? {}).map(([label, value]) => ({ label, value: Number(value) }))}
              height={150}
            />
          </EconomyCard>

          <EconomyCard
            title="Rewards Monitor"
            value={`${Math.round(data.rewards?.totals?.gft ?? 0).toLocaleString()} GFT issued`}
            subtitle={`Gold ${Math.round(data.rewards?.totals?.coins ?? 0).toLocaleString()} · Crystals ${Math.round(data.rewards?.totals?.crystals ?? 0).toLocaleString()}`}
          >
            <EconomyChart
              type="line"
              data={(data.rewards?.trend ?? []).map((x: any) => ({ label: String(x.day).slice(5), value: Number(x.value || 0) }))}
            />
          </EconomyCard>

          <EconomyCard
            title="Staking Monitor"
            value={`${Math.round(data.staking?.totalStaked ?? 0).toLocaleString()} GFT staked`}
            subtitle={`Avg lock left ${Number(data.staking?.averageStakingDaysLeft ?? 0).toFixed(1)} days`}
          >
            <EconomyChart
              type="bar"
              data={(data.staking?.tierDistribution ?? []).map((x: any) => ({ label: x.tierId, value: Number(x.amount || 0) }))}
            />
          </EconomyCard>

          <EconomyCard
            title="Withdrawal Monitor"
            value={`${Math.round(data.withdrawals?.outflowGft ?? 0).toLocaleString()} GFT outflow`}
            subtitle={`Req ${data.withdrawals?.counts?.total ?? 0} · Paid ${data.withdrawals?.counts?.paid ?? 0} · Rejected ${data.withdrawals?.counts?.rejected ?? 0}`}
            warning={data.withdrawals?.warning ? 'Withdraw volume is growing too fast' : null}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
              <div style={{ borderRadius: '10px', background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(71,85,105,0.55)', padding: '8px', fontSize: '12px', color: '#cbd5e1' }}>
                Avg size: <strong style={{ color: '#f8fafc' }}>{Number(data.withdrawals?.averageWithdrawSize ?? 0).toFixed(1)}</strong>
              </div>
              <div style={{ borderRadius: '10px', background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(71,85,105,0.55)', padding: '8px', fontSize: '12px', color: '#cbd5e1' }}>
                Success: <strong style={{ color: '#86efac' }}>{Math.round((Number(data.withdrawals?.successRate ?? 0) || 0) * 100)}%</strong>
              </div>
            </div>
          </EconomyCard>

          <EconomyCard title="Dynamic Economy Controls" subtitle="Reward/fee/limit tuning with elastic toggle">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
              <label style={{ display: 'grid', gap: '4px', fontSize: '11px', color: '#94a3b8' }}>
                Reward Mult
                <input value={settingsDraft.rewardMultiplierManual} onChange={(e) => setSettingsDraft((s) => ({ ...s, rewardMultiplierManual: e.target.value }))} style={{ borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff', padding: '8px' }} />
              </label>
              <label style={{ display: 'grid', gap: '4px', fontSize: '11px', color: '#94a3b8' }}>
                Fee Override %
                <input value={settingsDraft.feeOverridePct} onChange={(e) => setSettingsDraft((s) => ({ ...s, feeOverridePct: e.target.value }))} style={{ borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff', padding: '8px' }} />
              </label>
              <label style={{ display: 'grid', gap: '4px', fontSize: '11px', color: '#94a3b8' }}>
                Min Withdraw
                <input value={settingsDraft.minAmount} onChange={(e) => setSettingsDraft((s) => ({ ...s, minAmount: e.target.value }))} style={{ borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff', padding: '8px' }} />
              </label>
              <label style={{ display: 'grid', gap: '4px', fontSize: '11px', color: '#94a3b8' }}>
                Max Withdraw
                <input value={settingsDraft.maxAmount} onChange={(e) => setSettingsDraft((s) => ({ ...s, maxAmount: e.target.value }))} style={{ borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff', padding: '8px' }} />
              </label>
              <label style={{ display: 'grid', gap: '4px', fontSize: '11px', color: '#94a3b8' }}>
                Cooldown Days
                <input value={settingsDraft.cooldownDays} onChange={(e) => setSettingsDraft((s) => ({ ...s, cooldownDays: e.target.value }))} style={{ borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff', padding: '8px' }} />
              </label>
              <label style={{ display: 'grid', gap: '4px', fontSize: '11px', color: '#94a3b8' }}>
                GFT Difficulty
                <input value={settingsDraft.gftDifficultyScale} onChange={(e) => setSettingsDraft((s) => ({ ...s, gftDifficultyScale: e.target.value }))} style={{ borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff', padding: '8px' }} />
              </label>
            </div>
            <label style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#cbd5e1' }}>
              <input
                type="checkbox"
                checked={settingsDraft.elasticRewardsEnabled}
                onChange={(e) => setSettingsDraft((s) => ({ ...s, elasticRewardsEnabled: e.target.checked }))}
              />
              Elastic rewards enabled
            </label>
            <button
              type="button"
              onClick={() => void applySettings()}
              disabled={busy}
              style={{ marginTop: '6px', borderRadius: '10px', border: 'none', background: busy ? '#475569' : '#22c55e', color: '#052e16', fontWeight: 900, padding: '10px 12px', cursor: busy ? 'wait' : 'pointer' }}
            >
              Apply Settings
            </button>
          </EconomyCard>

          <EconomyCard title="Player Economy Stats" subtitle="Top balances / staking / spending and suspicious accounts">
            <EconomyTable columns={playerColumns} rows={data.players?.topByGft ?? []} />
          </EconomyCard>
        </div>

        <div style={{ marginTop: '10px', display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))' }}>
          <EconomyCard title="Top By Staking">
            <EconomyTable columns={playerColumns} rows={data.players?.topByStaking ?? []} />
          </EconomyCard>
          <EconomyCard title="Top By Spending">
            <EconomyTable columns={playerColumns} rows={data.players?.topBySpending ?? []} />
          </EconomyCard>
          <EconomyCard title="Suspicious Accounts" warning={(data.players?.suspicious?.length ?? 0) > 0 ? 'Risk accounts detected' : null}>
            <EconomyTable columns={playerColumns} rows={data.players?.suspicious ?? []} />
          </EconomyCard>
        </div>
      </div>
    </Background>
  );
});

