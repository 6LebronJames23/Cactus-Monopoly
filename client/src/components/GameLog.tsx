interface Props {
  log: string[];
}

export default function GameLog({ log }: Props) {
  return (
    <div className="game-log">
      <h3 className="panel-title">Game Log</h3>
      <div className="log-entries">
        {log.map((entry, i) => (
          <div key={i} className={`log-entry ${i === 0 ? 'log-entry--latest' : ''}`}>
            {entry}
          </div>
        ))}
      </div>
    </div>
  );
}
