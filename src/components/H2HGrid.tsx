import { RR_MATCHES, SESSION_BY_KEY } from '../data/fixture';
import { headToHead, type PairedFixture } from '../lib/standings';
import { useStore } from '../store';

/** Round robin cross-table: each cell is the row player's result against the column player. */
export function H2HGrid() {
  const { state, d, name } = useStore();
  const order = d.rrStandings.map((r) => r.id);
  const fixtures: PairedFixture[] = RR_MATCHES.map((m) => ({
    matchId: m.id,
    homeId: d.matches[m.id].homeId!,
    awayId: d.matches[m.id].awayId!,
  }));

  return (
    <div className="h2h-wrap">
      <table className="h2h">
        <thead>
          <tr>
            <th />
            {order.map((id) => (
              <th key={id} className="h2h-col">
                <span>{name(id)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {order.map((row) => (
            <tr key={row}>
              <th className="h2h-row">{name(row)}</th>
              {order.map((col) => {
                if (row === col) return <td key={col} className="h2h-self" />;
                const r = headToHead(row, col, fixtures, state.results);
                if (!r) return <td key={col} />;
                if ('pending' in r) {
                  const s = SESSION_BY_KEY[RR_MATCHES[r.matchId - 1].sessionKey];
                  return (
                    <td key={col} className="h2h-pending" title={`Match #${r.matchId}`}>
                      {s.shortLabel}
                    </td>
                  );
                }
                const won = r.for > r.against;
                return (
                  <td
                    key={col}
                    className={won ? 'h2h-w' : 'h2h-l'}
                    title={`${name(row)} ${r.for}–${r.against} ${name(col)}${r.walkover ? ' (walkover)' : ''}`}
                  >
                    {r.for}–{r.against}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
