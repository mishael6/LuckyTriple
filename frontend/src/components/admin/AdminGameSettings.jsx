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
        <SettingInput label="Minimum Bet (GHS)" value={s.minBet} onChange={(v) => setGameSettings({ ...s, minBet: v })} />
        <SettingInput label="Maximum Bet (GHS)" value={s.maxBet} onChange={(v) => setGameSettings({ ...s, maxBet: v })} />

        <div className="setting-item">
          <label>Difficulty Preset</label>
          <select value={s.difficulty || 'medium'} onChange={(e) => setGameSettings({ ...s, difficulty: e.target.value })}>
            {DIFFICULTY_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
          <div className="difficulty-presets">
            {DIFFICULTY_OPTIONS.map((opt) => (
              <button key={opt.id} type="button" className="preset-btn" onClick={() => handleApplyDifficulty(opt.id)}>
                Apply {opt.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h4>🎮 Game Availability</h4>
        <div className="game-toggles">
          <Toggle label="🎰 Lucky Triple" checked={s.gamesEnabled?.luckyTriple !== false} onChange={(v) => setGameSettings(updateNested(s, 'gamesEnabled', 'luckyTriple', v))} />
          <Toggle label="🍾 Spin the Bottle" checked={s.gamesEnabled?.spin !== false} onChange={(v) => setGameSettings(updateNested(s, 'gamesEnabled', 'spin', v))} />
          <Toggle label="🎰 Lucky Slots" checked={s.gamesEnabled?.slots !== false} onChange={(v) => setGameSettings(updateNested(s, 'gamesEnabled', 'slots', v))} />
          <Toggle label="🎡 Golden Roulette" checked={s.gamesEnabled?.roulette !== false} onChange={(v) => setGameSettings(updateNested(s, 'gamesEnabled', 'roulette', v))} />
        </div>
      </section>

      <section className="settings-section">
        <h4>🎰 Lucky Triple — Win Chances (%)</h4>
        <SettingInput label="3 Matches %" value={s.tripleWinChances?.threeMatch} onChange={(v) => setGameSettings(updateNested(s, 'tripleWinChances', 'threeMatch', v))} max={100} />
        <SettingInput label="2 Matches %" value={s.tripleWinChances?.twoMatch} onChange={(v) => setGameSettings(updateNested(s, 'tripleWinChances', 'twoMatch', v))} max={100} />
        <SettingInput label="1 Match %" value={s.tripleWinChances?.oneMatch} onChange={(v) => setGameSettings(updateNested(s, 'tripleWinChances', 'oneMatch', v))} max={100} />
        <SettingInput label="0 Matches %" value={s.tripleWinChances?.zeroMatch} onChange={(v) => setGameSettings(updateNested(s, 'tripleWinChances', 'zeroMatch', v))} max={100} />
        <h5>Payout Multipliers</h5>
        <SettingInput label="3 Matches Multiplier" value={s.payoutMultipliers?.threeMatches} onChange={(v) => setGameSettings(updateNested(s, 'payoutMultipliers', 'threeMatches', v))} />
        <SettingInput label="2 Matches Multiplier" value={s.payoutMultipliers?.twoMatches} onChange={(v) => setGameSettings(updateNested(s, 'payoutMultipliers', 'twoMatches', v))} />
        <SettingInput label="1 Match Multiplier" value={s.payoutMultipliers?.oneMatch} onChange={(v) => setGameSettings(updateNested(s, 'payoutMultipliers', 'oneMatch', v))} />
      </section>

      <section className="settings-section">
        <h4>🍾 Spin the Bottle — Win Chances (%)</h4>
        <SettingInput label="x2 Multiplier Win %" value={s.spinWinChances?.x2} onChange={(v) => setGameSettings(updateNested(s, 'spinWinChances', 'x2', v))} max={100} />
        <SettingInput label="x3 Multiplier Win %" value={s.spinWinChances?.x3} onChange={(v) => setGameSettings(updateNested(s, 'spinWinChances', 'x3', v))} max={100} />
        <SettingInput label="x4 Multiplier Win %" value={s.spinWinChances?.x4} onChange={(v) => setGameSettings(updateNested(s, 'spinWinChances', 'x4', v))} max={100} />
      </section>

      <section className="settings-section">
        <h4>🎰 Lucky Slots</h4>
        <h5>Win Chances (%)</h5>
        <SettingInput label="Jackpot %" value={s.slotsWinChances?.jackpot} onChange={(v) => setGameSettings(updateNested(s, 'slotsWinChances', 'jackpot', v))} max={100} />
        <SettingInput label="Big Win (3-of-kind) %" value={s.slotsWinChances?.bigWin} onChange={(v) => setGameSettings(updateNested(s, 'slotsWinChances', 'bigWin', v))} max={100} />
        <SettingInput label="Small Win (2-of-kind) %" value={s.slotsWinChances?.smallWin} onChange={(v) => setGameSettings(updateNested(s, 'slotsWinChances', 'smallWin', v))} max={100} />
        <h5>Payout Multipliers</h5>
        <SettingInput label="Jackpot Multiplier" value={s.slotsPayouts?.jackpot} onChange={(v) => setGameSettings(updateNested(s, 'slotsPayouts', 'jackpot', v))} />
        <SettingInput label="3-of-kind Multiplier" value={s.slotsPayouts?.threeOfKind} onChange={(v) => setGameSettings(updateNested(s, 'slotsPayouts', 'threeOfKind', v))} />
        <SettingInput label="2-of-kind Multiplier" value={s.slotsPayouts?.twoOfKind} onChange={(v) => setGameSettings(updateNested(s, 'slotsPayouts', 'twoOfKind', v))} />
      </section>

      <section className="settings-section">
        <h4>🎡 Golden Roulette</h4>
        <h5>Win Chances (%)</h5>
        <SettingInput label="Red/Black Win %" value={s.rouletteWinChances?.color} onChange={(v) => setGameSettings(updateNested(s, 'rouletteWinChances', 'color', v))} max={100} />
        <SettingInput label="Number Win %" value={s.rouletteWinChances?.number} onChange={(v) => setGameSettings(updateNested(s, 'rouletteWinChances', 'number', v))} max={100} />
        <h5>Payout Multipliers</h5>
        <SettingInput label="Red/Black Payout" value={s.roulettePayouts?.color} onChange={(v) => setGameSettings(updateNested(s, 'roulettePayouts', 'color', v))} />
        <SettingInput label="Number Payout" value={s.roulettePayouts?.number} onChange={(v) => setGameSettings(updateNested(s, 'roulettePayouts', 'number', v))} />
      </section>

      <button type="button" className="save-settings-btn" onClick={onSave}>
        💾 Save All Game Settings
      </button>
    </div>
  );
};
