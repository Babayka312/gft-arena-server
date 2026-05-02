import { useEffect, useMemo, useState, type CSSProperties, type Dispatch, type SetStateAction } from 'react';
import type { ReferralEntryDetails, ReferralSnapshot, ReferralTier } from '../playerProgress';
import { openExternalLink } from '../telegram';
import { Background } from '../components/ui/Background';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { SectionTitle } from '../components/ui/SectionTitle';

const cardTitleStyle = (color = '#eab308'): CSSProperties => ({
  color,
  fontWeight: 950,
  letterSpacing: '0.035em',
  textTransform: 'uppercase',
  textShadow: `0 0 12px ${color}66, 0 2px 8px rgba(0,0,0,0.75)`,
});

const mutedTextStyle: CSSProperties = {
  color: '#cbd5e1',
  fontWeight: 650,
  letterSpacing: '0.015em',
  lineHeight: 1.35,
};

export type ReferralsScreenProps = {
  background: string;
  contentInset: CSSProperties;
  bottomInsetPx: number;
  referralData: ReferralSnapshot | null;
  playerId: string | null;
  /** Telegram bot username для построения deep-link `https://t.me/<bot>?start=ref_<id>`. */
  shareBotUsername?: string | null;
  referralCodeInput: string;
  setReferralCodeInput: Dispatch<SetStateAction<string>>;
  referralBusy: boolean;
  onBindReferralCode: () => void;
  onClaimTierReward: (invites: number) => void;
  onClaimCommissions: () => void;
};

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}ч ${m.toString().padStart(2, '0')}м`;
  if (m > 0) return `${m}м ${s.toString().padStart(2, '0')}с`;
  return `${s}с`;
}

function formatDateShort(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString();
}

function findNextTier(tiers: ReferralTier[] | undefined, activatedCount: number): ReferralTier | null {
  if (!tiers || tiers.length === 0) return null;
  const sorted = [...tiers].sort((a, b) => a.invites - b.invites);
  const next = sorted.find((t) => !t.claimed && activatedCount < t.invites);
  if (next) return next;
  const firstUnclaimed = sorted.find((t) => !t.claimed);
  return firstUnclaimed ?? null;
}

export function ReferralsScreen({
  background,
  contentInset,
  bottomInsetPx,
  referralData,
  playerId,
  shareBotUsername,
  referralCodeInput,
  setReferralCodeInput,
  referralBusy,
  onBindReferralCode,
  onClaimTierReward,
  onClaimCommissions,
}: ReferralsScreenProps) {
  const code = referralData?.code ?? playerId ?? '';
  const activatedCount = referralData?.activatedCount ?? 0;
  const pendingCount = referralData?.pendingCount ?? 0;
  const nextTier = useMemo(() => findNextTier(referralData?.tiers, activatedCount), [referralData?.tiers, activatedCount]);
  const progressPercent = nextTier ? Math.min(100, Math.round((activatedCount / nextTier.invites) * 100)) : 100;

  // Обратный отсчёт по баффу «Лидер отряда».
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!referralData?.leaderBuff?.until) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [referralData?.leaderBuff?.until]);

  const buffUntil = Number(referralData?.leaderBuff?.until ?? 0);
  const buffActive = buffUntil > now;

  const commissions = referralData?.commissions ?? {
    pendingCoins: 0,
    pendingCrystals: 0,
    pendingGft: 0,
    lifetimeCoins: 0,
    lifetimeCrystals: 0,
    lifetimeGft: 0,
  };
  const hasPendingCommissions =
    (commissions.pendingCoins ?? 0) > 0 ||
    (commissions.pendingCrystals ?? 0) > 0 ||
    (commissions.pendingGft ?? 0) > 0;

  const referralsDetails: ReferralEntryDetails[] = referralData?.referralsDetails ?? [];
  const activatedList = referralsDetails.filter((r) => r.status === 'activated');
  const pendingList = referralsDetails.filter((r) => r.status === 'pending');

  const shareUrl = useMemo(() => {
    if (!code) return '';
    const username = (shareBotUsername || '').replace(/^@/, '');
    if (!username) return '';
    return `https://t.me/${username}?start=ref_${encodeURIComponent(code)}`;
  }, [code, shareBotUsername]);

  const handleShare = () => {
    if (!shareUrl) {
      alert('Поделиться можно только из Telegram-бота. Попробуй открыть игру через Telegram.');
      return;
    }
    const text = 'Заходи в GFT Arena — крафт, бои и реальная крипта. Жми по ссылке и получи стартовый бонус.';
    const url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
    openExternalLink(url);
  };

  return (
    <Background
      background={background}
      gradient="linear-gradient(180deg, rgba(10,15,42,0.56) 0%, rgba(10,15,42,0.42) 100%)"
      style={{
        minHeight: '100dvh',
        ...contentInset,
        paddingBottom: `${bottomInsetPx}px`,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: '980px', margin: '0 auto', padding: '0 12px 20px' }}>
        <GlassCard style={{ marginBottom: '14px' }}>
          <SectionTitle
            title="Рефералы"
            subtitle="Зови друзей по ссылке: активные дают пороги и royalty 5%."
          />
        </GlassCard>

        <GlassCard style={{ border: '1px solid #155e75', marginBottom: '14px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ color: '#67e8f9', fontSize: '12px', marginBottom: '3px' }}>Твой реферальный код</div>
              <div style={{ color: '#e2e8f0', fontSize: '18px', fontWeight: 900, letterSpacing: '0.03em' }}>
                {code || '—'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Button
                onClick={async () => {
                  if (!code) return;
                  try {
                    await navigator.clipboard.writeText(code);
                    alert('Код скопирован.');
                  } catch {
                    alert(`Скопируй вручную: ${code}`);
                  }
                }}
                tone="cyan"
                style={{ minHeight: '36px', padding: '8px 12px', borderRadius: '10px' }}
              >
                Копировать код
              </Button>
              <Button
                onClick={handleShare}
                disabled={!shareUrl}
                tone="violet"
                style={{ minHeight: '36px', padding: '8px 12px', borderRadius: '10px' }}
                title={shareUrl ? 'Откроется share-лист Telegram с готовой ссылкой' : 'Доступно только из Telegram'}
              >
                Поделиться в Telegram
              </Button>
            </div>
          </div>
          <div style={{ marginTop: '10px', display: 'flex', gap: '14px', flexWrap: 'wrap', color: '#94a3b8', fontSize: '12px' }}>
            <div>Активны: <span style={{ color: '#86efac', fontWeight: 800 }}>{activatedCount}</span></div>
            <div>В ожидании: <span style={{ color: '#fde68a', fontWeight: 800 }}>{pendingCount}</span></div>
          </div>
          {referralData?.invitedBy && (
            <div style={{ marginTop: '6px', color: '#94a3b8', fontSize: '12px' }}>
              Ты приглашён игроком: <span style={{ color: '#a5f3fc', fontWeight: 800 }}>#{referralData.invitedBy}</span>
            </div>
          )}
          {buffActive && (
            <div style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '999px', background: 'rgba(234,179,8,0.18)', border: '1px solid #b45309', color: '#fde68a', fontSize: '12px', fontWeight: 800 }}>
              ★ Лидер отряда: +5% к PvE-награде · ещё {formatRemaining(buffUntil - now)}
            </div>
          )}
        </GlassCard>

        {nextTier && (
          <GlassCard style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              <div style={{ ...cardTitleStyle('#fde68a'), fontSize: '14px' }}>До следующего порога</div>
              <div style={{ color: '#fde68a', fontWeight: 900, fontSize: '13px' }}>
                {Math.min(activatedCount, nextTier.invites)} / {nextTier.invites}
              </div>
            </div>
            <div style={{ height: '10px', borderRadius: '999px', background: '#0b1220', border: '1px solid #334155', overflow: 'hidden' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, #f59e0b, #fde047)', transition: 'width 360ms ease' }} />
            </div>
            <div style={{ ...mutedTextStyle, fontSize: '12px', marginTop: '8px' }}>
              Награда: +{nextTier.reward.coins ?? 0} монет, +{nextTier.reward.crystals ?? 0} кристаллов
              {nextTier.reward.gft ? `, +${nextTier.reward.gft} GFT в реферальную копилку (забрать через «Комиссии»)` : ''}
            </div>
          </GlassCard>
        )}

        <GlassCard style={{ marginBottom: '14px' }}>
          <div style={{ ...cardTitleStyle('#a5f3fc'), marginBottom: '8px' }}>Привязать реферальный код</div>
          <div style={{ ...mutedTextStyle, fontSize: '12px', marginBottom: '10px' }}>
            Код привязывается один раз после создания героя. Если зашёл по ссылке из Telegram, мы заполнили поле автоматически.
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={referralCodeInput}
              onChange={(e) => setReferralCodeInput(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="ID пригласившего игрока"
              style={{ flex: '1 1 240px', minWidth: '220px', height: '40px', borderRadius: '10px', border: '1px solid #334155', background: '#0b1220', color: '#fff', padding: '0 12px', fontSize: '14px', boxSizing: 'border-box' }}
              disabled={referralBusy || Boolean(referralData?.invitedBy)}
            />
            <Button
              onClick={onBindReferralCode}
              disabled={referralBusy || Boolean(referralData?.invitedBy)}
              tone="cyan"
              style={{ height: '40px', padding: '0 14px', borderRadius: '10px' }}
            >
              {referralData?.invitedBy ? 'Код уже привязан' : referralBusy ? '...' : 'Привязать'}
            </Button>
          </div>
        </GlassCard>

        <GlassCard style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
            <div style={cardTitleStyle('#fbbf24')}>Комиссии</div>
            <div style={{ ...mutedTextStyle, fontSize: '12px' }}>
              5% L1 · 1% L2 · только мягкая валюта
            </div>
          </div>
          <div style={{ ...mutedTextStyle, fontSize: '12px', marginBottom: '10px' }}>
            Когда твои <strong style={{ color: '#fde68a' }}>активные</strong> рефералы тратят монеты/кристаллы или покупают за крипту, тебе капает royalty в pending. Забирай в любой момент.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', marginBottom: '10px' }}>
            <div style={{ background: '#0b1220', border: '1px solid #334155', borderRadius: '12px', padding: '10px' }}>
              <div style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Монеты к получению</div>
              <div style={{ color: '#fde68a', fontWeight: 900, fontSize: '16px' }}>{commissions.pendingCoins ?? 0}</div>
              <div style={{ color: '#64748b', fontSize: '11px' }}>Всего за всё время: {commissions.lifetimeCoins ?? 0}</div>
            </div>
            <div style={{ background: '#0b1220', border: '1px solid #334155', borderRadius: '12px', padding: '10px' }}>
              <div style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Кристаллы к получению</div>
              <div style={{ color: '#a5f3fc', fontWeight: 900, fontSize: '16px' }}>{commissions.pendingCrystals ?? 0}</div>
              <div style={{ color: '#64748b', fontSize: '11px' }}>Всего за всё время: {commissions.lifetimeCrystals ?? 0}</div>
            </div>
            <div style={{ background: '#0b1220', border: '1px solid #334155', borderRadius: '12px', padding: '10px' }}>
              <div style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>GFT-копилка</div>
              <div style={{ color: '#fbbf24', fontWeight: 900, fontSize: '16px' }}>{commissions.pendingGft ?? 0}</div>
              <div style={{ color: '#64748b', fontSize: '11px' }}>Всего за всё время: {commissions.lifetimeGft ?? 0}</div>
            </div>
          </div>
          <Button
            onClick={onClaimCommissions}
            disabled={!hasPendingCommissions || referralBusy}
            tone="pink"
            style={{
              width: '100%',
              height: '40px',
              borderRadius: '10px',
            }}
          >
            {referralBusy ? '...' : hasPendingCommissions ? 'Забрать комиссии' : 'Пока пусто'}
          </Button>
        </GlassCard>

        <GlassCard style={{ marginBottom: '14px' }}>
          <div style={{ ...cardTitleStyle('#67e8f9'), marginBottom: '10px' }}>Награды пригласившему</div>
          <div style={{ ...mutedTextStyle, fontSize: '12px', marginBottom: '10px' }}>
            Засчитываются только активные рефералы. GFT-часть награды попадает в копилку рядом и забирается отдельно.
          </div>
          <div style={{ display: 'grid', gap: '8px' }}>
            {(referralData?.tiers ?? []).map((tier) => {
              const canClaim = tier.available && !tier.claimed && !referralBusy;
              return (
                <div key={tier.invites} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', background: '#0b1220', border: `1px solid ${tier.claimed ? '#14532d' : tier.available ? '#155e75' : '#334155'}`, borderRadius: '12px', padding: '10px' }}>
                  <div>
                    <div style={{ color: '#e2e8f0', fontWeight: 900, fontSize: '13px' }}>{tier.invites} активных рефералов</div>
                    <div style={{ color: '#94a3b8', fontSize: '12px' }}>
                      +{tier.reward.coins ?? 0} монет, +{tier.reward.crystals ?? 0} кристаллов{tier.reward.gft ? `, +${tier.reward.gft} GFT в копилку` : ''}
                    </div>
                  </div>
                  <Button
                    onClick={() => onClaimTierReward(tier.invites)}
                    disabled={!canClaim}
                    tone={tier.claimed ? 'neutral' : canClaim ? 'cyan' : 'neutral'}
                    style={{ minHeight: '34px', padding: '8px 10px', borderRadius: '10px' }}
                  >
                    {tier.claimed ? 'Получено' : tier.available ? 'Забрать' : 'Недоступно'}
                  </Button>
                </div>
              );
            })}
            {!referralData && (
              <div style={{ ...mutedTextStyle, fontSize: '12px' }}>Загружаем данные рефералов…</div>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <div style={{ ...cardTitleStyle('#a5f3fc'), marginBottom: '10px' }}>Мои рефералы</div>
          {referralsDetails.length === 0 ? (
            <div style={{ ...mutedTextStyle, fontSize: '12px' }}>
              Пока никого нет. Поделись ссылкой выше — друзья появятся здесь сразу после привязки.
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ color: '#86efac', fontWeight: 900, fontSize: '12px', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Активированы · {activatedList.length}
                </div>
                {activatedList.length === 0 ? (
                  <div style={{ ...mutedTextStyle, fontSize: '12px' }}>Никто пока не дошёл до 5 уровня и не сделал платную покупку.</div>
                ) : (
                  <div style={{ display: 'grid', gap: '6px' }}>
                    {activatedList.map((r) => (
                      <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', background: '#052e16', border: '1px solid #14532d', borderRadius: '10px', padding: '8px 10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: '#bbf7d0', fontWeight: 800, fontSize: '13px' }}>
                            {r.name ? r.name : `#${r.id}`}
                            {r.level ? <span style={{ color: '#86efac', fontWeight: 700, marginLeft: '6px' }}>· lvl {r.level}</span> : null}
                          </span>
                          <span style={{ color: '#86efac', fontSize: '11px' }}>#{r.id}</span>
                        </div>
                        {r.activatedAt && (
                          <span style={{ color: '#86efac', fontSize: '11px' }}>с {formatDateShort(r.activatedAt)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div style={{ color: '#fde68a', fontWeight: 900, fontSize: '12px', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  В ожидании · {pendingList.length}
                </div>
                {pendingList.length === 0 ? (
                  <div style={{ ...mutedTextStyle, fontSize: '12px' }}>Все привязанные рефералы уже активированы.</div>
                ) : (
                  <div style={{ display: 'grid', gap: '6px' }}>
                    {pendingList.map((r) => (
                      <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', background: '#0b1220', border: '1px solid #334155', borderRadius: '10px', padding: '8px 10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: '#fde68a', fontWeight: 800, fontSize: '13px' }}>
                            {r.name ? r.name : `#${r.id}`}
                            {r.level ? <span style={{ color: '#fcd34d', fontWeight: 700, marginLeft: '6px' }}>· lvl {r.level}</span> : null}
                          </span>
                          <span style={{ color: '#fcd34d', fontSize: '11px' }}>#{r.id}</span>
                        </div>
                        <span style={{ color: '#fcd34d', fontSize: '11px' }}>ждём 5 lvl или покупку</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </GlassCard>
      </div>
    </Background>
  );
}
