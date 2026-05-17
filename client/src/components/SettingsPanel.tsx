import { GameSettings } from '../types/game';
import { socket } from '../socket';

interface Props {
  settings: GameSettings;
  isHost: boolean;
}

const CASH_OPTIONS = [1000, 1500, 2000, 3000, 5000];

export default function SettingsPanel({ settings, isHost }: Props) {
  const update = (patch: Partial<GameSettings>) => {
    socket.emit('update_settings', patch, (res: any) => {
      if (!res.ok) console.warn(res.error);
    });
  };

  return (
    <div className="settings-panel">
      <div className="settings-section-title">Gameplay Rules</div>

      <SettingRow
        icon="💰"
        label="x2 rent on full set"
        description="Base rent doubled when owner holds the whole country"
        value={settings.doubleRentOnMonopoly}
        onChange={v => update({ doubleRentOnMonopoly: v })}
        isHost={isHost}
      />
      <SettingRow
        icon="🏖️"
        label="Vacation cash"
        description="Taxes and fees pool up on Vacation — winner collects it all"
        value={settings.vacationCash}
        onChange={v => update({ vacationCash: v })}
        isHost={isHost}
      />
      <SettingRow
        icon="🔨"
        label="Auction"
        description="Declined properties go to auction instead of staying unowned"
        value={settings.auction}
        onChange={v => update({ auction: v })}
        isHost={isHost}
      />
      <SettingRow
        icon="🔒"
        label="No rent while in jail"
        description="Owners in jail cannot collect rent"
        value={settings.noRentInJail}
        onChange={v => update({ noRentInJail: v })}
        isHost={isHost}
      />
      <SettingRow
        icon="📜"
        label="Mortgage"
        description="Players can mortgage properties for half their value"
        value={settings.mortgageEnabled}
        onChange={v => update({ mortgageEnabled: v })}
        isHost={isHost}
      />
      <SettingRow
        icon="🏠"
        label="Even build"
        description="Houses must be built and sold evenly across a set"
        value={settings.evenBuild}
        onChange={v => update({ evenBuild: v })}
        isHost={isHost}
      />
      <SettingRow
        icon="🔀"
        label="Randomize order"
        description="Shuffle player turn order at game start"
        value={settings.randomizeOrder}
        onChange={v => update({ randomizeOrder: v })}
        isHost={isHost}
      />

      <div className="settings-row">
        <span className="settings-row__icon">💵</span>
        <div className="settings-row__text">
          <span className="settings-row__label">Starting cash</span>
          <span className="settings-row__desc">How much money each player starts with</span>
        </div>
        <div className="settings-row__control">
          {isHost ? (
            <select
              className="settings-select"
              value={settings.startingCash}
              onChange={e => update({ startingCash: Number(e.target.value) })}
            >
              {CASH_OPTIONS.map(v => (
                <option key={v} value={v}>${v.toLocaleString()}</option>
              ))}
            </select>
          ) : (
            <span className="settings-value">${settings.startingCash.toLocaleString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingRow({ icon, label, description, value, onChange, isHost }: {
  icon: string;
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  isHost: boolean;
}) {
  return (
    <div className="settings-row">
      <span className="settings-row__icon">{icon}</span>
      <div className="settings-row__text">
        <span className="settings-row__label">{label}</span>
        <span className="settings-row__desc">{description}</span>
      </div>
      <div className="settings-row__control">
        {isHost ? (
          <button
            className={`toggle ${value ? 'toggle--on' : ''}`}
            onClick={() => onChange(!value)}
            aria-label={label}
          >
            <span className="toggle__thumb" />
          </button>
        ) : (
          <span className={`settings-badge ${value ? 'settings-badge--on' : 'settings-badge--off'}`}>
            {value ? 'On' : 'Off'}
          </span>
        )}
      </div>
    </div>
  );
}
