import { memo, useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { BalanceCard } from '../components/gft/BalanceCard';
import { StakeCard } from '../components/gft/StakeCard';
import { WithdrawCard } from '../components/gft/WithdrawCard';
import {
  gftCreateWithdraw,
  gftGetStakingInfo,
  gftGetWithdrawRules,
  gftStake,
  gftUnstake,
  type GftStakeEntry,
  type GftStakeTier,
} from '../xaman';
import { Background } from '../components/ui/Background';

type GFTWalletScreenProps = {
  background: string;
  contentInset: CSSProperties;
  bottomInsetPx: number;
  playerId: string | null;
  balance: number;
  xrplAccount: string | null;
  onProgressSync: (progress: unknown) => void;
};

export const GFTWalletScreen = memo(function GFTWalletScreen({
  background,
  contentInset,
  bottomInsetPx,
  playerId,
  balance,
  xrplAccount,
  onProgressSync,
}: GFTWalletScreenProps) {
  const [tiers, setTiers] = useState<GftStakeTier[]>([]);
  const [stakes, setStakes] = useState<GftStakeEntry[]>([]);
  const [currentTierId, setCurrentTierId] = useState<string | null>(null);
  const [totalStaked, setTotalStaked] = useState(0);
  const [stakeAmount, setStakeAmount] = useState('500');
  const [stakeBusy, setStakeBusy] = useState(false);
  const [unstakeBusy, setUnstakeBusy] = useState(false);
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('50');
  const [destination, setDestination] = useState('');
  const [withdrawFeePct, setWithdrawFeePct] = useState(5);
  const [withdrawMin, setWithdrawMin] = useState(50);
  const [nextWithdrawAt, setNextWithdrawAt] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState('');
  const [globalError, setGlobalError] = useState('');

  useEffect(() => {
    if (xrplAccount) setDestination(prev => prev || xrplAccount);
  }, [xrplAccount]);

  const refresh = useCallback(async () => {
    if (!playerId) return;
    try {
      setGlobalError('');
      const [stakingInfo, withdrawRules] = await Promise.all([
        gftGetStakingInfo(playerId),
        gftGetWithdrawRules(playerId),
      ]);
      setTiers(stakingInfo.tiers ?? []);
      setStakes(stakingInfo.staking?.stakes ?? []);
      setCurrentTierId(stakingInfo.staking?.currentTier?.id ?? null);
      setTotalStaked(stakingInfo.staking?.totalStaked ?? 0);
      setWithdrawFeePct(Number(withdrawRules.rules?.feePct ?? 5));
      setWithdrawMin(Number(withdrawRules.rules?.minAmount ?? 50));
      setNextWithdrawAt(withdrawRules.nextAvailableAt ?? null);
      setWithdrawError((withdrawRules.reasons ?? []).join(' '));
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : 'Не удалось загрузить данные кошелька.');
    }
  }, [playerId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const availableToWithdraw = useMemo(
    () => Math.max(0, Math.floor(balance - totalStaked)),
    [balance, totalStaked],
  );

  const submitStake = useCallback(async () => {
    if (!playerId) return;
    const value = Number(stakeAmount);
    if (!Number.isFinite(value) || value <= 0) {
      setGlobalError('Введите корректную сумму для стейкинга.');
      return;
    }
    setStakeBusy(true);
    setGlobalError('');
    try {
      const out = await gftStake(playerId, Math.floor(value));
      if ('progress' in out) onProgressSync(out.progress);
      await refresh();
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : 'Не удалось выполнить стейкинг.');
    } finally {
      setStakeBusy(false);
    }
  }, [onProgressSync, playerId, refresh, stakeAmount]);

  const submitUnstake = useCallback(
    async (stakeId?: string) => {
      if (!playerId) return;
      setUnstakeBusy(true);
      setGlobalError('');
      try {
        const out = await gftUnstake(playerId, stakeId);
        if ('progress' in out) onProgressSync(out.progress);
        await refresh();
      } catch (e) {
        setGlobalError(e instanceof Error ? e.message : 'Не удалось вывести стейк.');
      } finally {
        setUnstakeBusy(false);
      }
    },
    [onProgressSync, playerId, refresh],
  );

  const submitWithdraw = useCallback(async () => {
    if (!playerId) return;
    const amount = Number(withdrawAmount);
    const dest = destination.trim();
    setWithdrawError('');
    if (!Number.isFinite(amount) || amount < withdrawMin) {
      setWithdrawError(`Минимальный вывод: ${withdrawMin} GFT.`);
      return;
    }
    if (!/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(dest)) {
      setWithdrawError('Некорректный XRPL адрес.');
      return;
    }
    setWithdrawBusy(true);
    try {
      const out = await gftCreateWithdraw(playerId, Math.floor(amount), dest);
      onProgressSync(out.progress);
      if (out.rules?.feePct != null) setWithdrawFeePct(Number(out.rules.feePct));
      await refresh();
    } catch (e) {
      setWithdrawError(e instanceof Error ? e.message : 'Не удалось отправить заявку на вывод.');
    } finally {
      setWithdrawBusy(false);
    }
  }, [destination, onProgressSync, playerId, refresh, withdrawAmount, withdrawMin]);

  return (
    <Background
      background={background}
      gradient="linear-gradient(180deg, rgba(2,6,23,0.78) 0%, rgba(15,23,42,0.45) 40%, rgba(2,6,23,0.82) 100%)"
      style={{
        ...contentInset,
        paddingBottom: `${bottomInsetPx}px`,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 12px' }}>
        <h2 style={{ margin: '0 0 12px', color: '#fde68a', fontSize: 'clamp(22px, 5vw, 34px)', fontWeight: 950, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          GFT Wallet
        </h2>
        <p style={{ margin: '0 0 14px', color: '#cbd5e1', fontSize: 'clamp(12px, 2.8vw, 14px)', lineHeight: 1.45 }}>
          Стейкинг блокирует GFT на 30 дней и даёт бонусы к фарму/дропу. Вывод учитывает анти-дамп правила: минималка, комиссия и cooldown.
        </p>
        {globalError && (
          <div style={{ marginBottom: '10px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.45)', background: 'rgba(127,29,29,0.25)', color: '#fecaca', fontSize: '12px', fontWeight: 700, padding: '8px 10px' }}>
            {globalError}
          </div>
        )}
        <div
          style={{
            display: 'grid',
            gap: '10px',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
            alignItems: 'start',
          }}
        >
          <BalanceCard
            balance={balance}
            availableToWithdraw={availableToWithdraw}
            stakedAmount={totalStaked}
          />
          <StakeCard
            tiers={tiers}
            currentTierId={currentTierId}
            stakes={stakes}
            stakeAmount={stakeAmount}
            stakeBusy={stakeBusy}
            unstakeBusy={unstakeBusy}
            onStakeAmountChange={setStakeAmount}
            onStake={submitStake}
            onUnstake={submitUnstake}
          />
          <WithdrawCard
            amount={withdrawAmount}
            feePct={withdrawFeePct}
            minAmount={withdrawMin}
            nextAvailableAt={nextWithdrawAt}
            destination={destination}
            withdrawBusy={withdrawBusy}
            errorText={withdrawError}
            onAmountChange={setWithdrawAmount}
            onDestinationChange={setDestination}
            onWithdraw={submitWithdraw}
          />
        </div>
      </div>
    </Background>
  );
});

