import { API } from '../../api-helper';

const DIFFICULTY_OPTIONS = [
  { id: 'easy', label: '😊 Easy (more wins)' },
  { id: 'medium', label: '🎲 Medium (balanced)' },
  { id: 'hard', label: '🔥 Hard (house edge)' },
];

const updateNested = (settings, key, subKey, value) => ({
  ...settings,
  [key]: { ...(settings[key] || {}), [subKey]: value },
});

const SettingInput = ({ label, value, onChange, min, max }) => (
  <div className="setting-item">
    <label>{label}</label>
    <input type="number" value={value ?? ''} min={min} max={max} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />
  </div>
);

const MultiplierChances = ({ title, chancesKey, s, setGameSettings }) => (
  <>
    <h4>{title}</h4>
    <SettingInput label="x2 Win %" value={s[chancesKey]?.x2} onChange={(v) => setGameSettings(updateNested(s, chancesKey, 'x2', v))} max={100} />
    <SettingInput label="x3 Win %" value={s[chancesKey]?.x3} onChange={(v) => setGameSettings(updateNested(s, chancesKey, 'x3', v))} max={100} />
    <SettingInput label="x4 Win %" value={s[chancesKey]?.x4} onChange={(v) => setGameSettings(updateNested(s, chancesKey, 'x4', v))} max={100} />
    <p className="settings-hint">Win pays: bet × multiplier. Lose costs full bet.</p>
  </>
);

const Toggle = ({ label, checked, onChange }) => (
  <label className="game-toggle">
    <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
    <span>{label}</span>
  </label>
);

export const AdminGameSettings = ({ gameSettings, setGameSettings, onSave }) => {
  const s = gameSettings;
  if (!s) return null;

  const handleApplyDifficulty = async (level) => {
    try {
      const result = await API.updateGameSettings({ applyDifficultyPreset: level });
      if (result.success) {
        setGameSettings(result.settings);
        alert(`Applied ${level} difficulty preset!`);
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to apply preset');
    }
  };

  return (
    <div className="settings-form settings-form--games">
      <section className="settings-section">
        <h4>🎛️ Global Controls</h4>
        <SettingInput label="House Fee (%)" value={s.houseFee} onChange={(v) => setGameSettings({ ...s, houseFee: v })} />
        <h5>Play Amount Limits</h5>
        <SettingInput label="Minimum Play Amount (GHS)" value={s.minBet} onChange={(v) => setGameSettings({ ...s, minBet: v })} />
        <SettingInput label="Maximum Play Amount (GHS)" value={s.maxBet} onChange={(v) => setGameSettings({ ...s, maxBet: v })} />
        <h5>Deposit Amount Limits</h5>
        <SettingInput label="Minimum Deposit (GHS)" value={s.minDeposit ?? 1} onChange={(v) => setGameSettings({ ...s, minDeposit: v })} />
        <SettingInput label="Maximum Deposit (GHS)" value={s.maxDeposit ?? 5000} onChange={(v) => setGameSettings({ ...s, maxDeposit: v })} />
        <p className="settings-hint">Play limits apply to all games. Deposit limits apply when users top up their wallet.</p>
        <div className="setting-item">
          <label>Difficulty Preset</label>
          <select value={s.difficulty || 'medium'} onChange={(e) => setGameSettings({ ...s, difficulty: e.target.value })}>
            {DIFFICULTY_OPTIONS.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
          </select>
          <div className="difficulty-presets">
            {DIFFICULTY_OPTIONS.map((opt) => (
              <button key={opt.id} type="button" className="preset-btn" onClick={() => handleApplyDifficulty(opt.id)}>Apply {opt.label}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h4>🎮 Game Availability</h4>
        <div className="game-toggles">
          <Toggle label="🎰 Lucky Triple" checked={s.gamesEnabled?.luckyTriple !== false} onChange={(v) => setGameSettings(updateNested(s, 'gamesEnabled', 'luckyTriple', v))} />
          <Toggle label="🍾 Spin the Bottle" checked={s.gamesEnabled?.spin !== false} onChange={(v) => setGameSettings(updateNested(s, 'gamesEnabled', 'spin', v))} />
          <Toggle label="🎡 Golden Roulette" checked={s.gamesEnabled?.roulette !== false} onChange={(v) => setGameSettings(updateNested(s, 'gamesEnabled', 'roulette', v))} />
          <Toggle label="🪙 Coin Flip" checked={s.gamesEnabled?.coin !== false} onChange={(v) => setGameSettings(updateNested(s, 'gamesEnabled', 'coin', v))} />
          <Toggle label="🎲 Dice Duel" checked={s.gamesEnabled?.dice !== false} onChange={(v) => setGameSettings(updateNested(s, 'gamesEnabled', 'dice', v))} />
          <Toggle label="🎰 Lucky Slots" checked={s.gamesEnabled?.slots !== false} onChange={(v) => setGameSettings(updateNested(s, 'gamesEnabled', 'slots', v))} />
        </div>
      </section>

      <section className="settings-section">
        <h4>🎰 Lucky Triple</h4>
        <SettingInput label="3 Matches %" value={s.tripleWinChances?.threeMatch} onChange={(v) => setGameSettings(updateNested(s, 'tripleWinChances', 'threeMatch', v))} max={100} />
        <SettingInput label="2 Matches %" value={s.tripleWinChances?.twoMatch} onChange={(v) => setGameSettings(updateNested(s, 'tripleWinChances', 'twoMatch', v))} max={100} />
        <SettingInput label="1 Match %" value={s.tripleWinChances?.oneMatch} onChange={(v) => setGameSettings(updateNested(s, 'tripleWinChances', 'oneMatch', v))} max={100} />
        <SettingInput label="0 Matches %" value={s.tripleWinChances?.zeroMatch} onChange={(v) => setGameSettings(updateNested(s, 'tripleWinChances', 'zeroMatch', v))} max={100} />
        <h5>Payout Multipliers (win = bet × mult)</h5>
        <SettingInput label="3 Matches" value={s.payoutMultipliers?.threeMatches} onChange={(v) => setGameSettings(updateNested(s, 'payoutMultipliers', 'threeMatches', v))} />
        <SettingInput label="2 Matches" value={s.payoutMultipliers?.twoMatches} onChange={(v) => setGameSettings(updateNested(s, 'payoutMultipliers', 'twoMatches', v))} />
        <SettingInput label="1 Match" value={s.payoutMultipliers?.oneMatch} onChange={(v) => setGameSettings(updateNested(s, 'payoutMultipliers', 'oneMatch', v))} />
      </section>

      <section className="settings-section">
        <MultiplierChances title="🍾 Spin the Bottle" chancesKey="spinWinChances" s={s} setGameSettings={setGameSettings} />
      </section>

      <section className="settings-section">
        <MultiplierChances title="🎡 Golden Roulette" chancesKey="rouletteWinChances" s={s} setGameSettings={setGameSettings} />
      </section>

      <section className="settings-section">
        <MultiplierChances title="🪙 Coin Flip" chancesKey="coinWinChances" s={s} setGameSettings={setGameSettings} />
      </section>

      <section className="settings-section">
        <MultiplierChances title="🎲 Dice Duel" chancesKey="diceWinChances" s={s} setGameSettings={setGameSettings} />
      </section>

      <section className="settings-section">
        <MultiplierChances title="🎰 Lucky Slots" chancesKey="slotsMultiplierWinChances" s={s} setGameSettings={setGameSettings} />
        <p className="settings-hint">Player picks a symbol, then multiplier. Win = 3 matching symbols. Payout = bet × multiplier.</p>
      </section>

      <button type="button" className="save-settings-btn" onClick={onSave}>💾 Save All Game Settings</button>
    </div>
  );
};
