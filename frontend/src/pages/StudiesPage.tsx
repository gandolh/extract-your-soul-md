import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type StudySummary } from '../api/client';
import { Meter } from '../components/Layout';

export function StudiesPage() {
  const [studies, setStudies] = useState<StudySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.studies().then((r) => setStudies(r.studies)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="stack stack-6">
      <header style={{ maxWidth: '46ch' }}>
        <p className="eyebrow">The studies</p>
        <h1>Self-report instruments</h1>
        <p className="lede" style={{ marginTop: 'var(--s-3)' }}>
          Each study is a small set of open prompts. Answer in whatever language feels natural —
          prompts are shown in English or Romanian. Partial answers are saved; come back any time.
        </p>
      </header>

      {loading ? (
        <p className="muted mono">Loading…</p>
      ) : (
        <div className="grid-cards">
          {studies.map((s, i) => (
            <Link key={s.id} className="card" to={`/studies/${s.id}`}>
              <span className="card-index">{String(i + 1).padStart(2, '0')} / Study</span>
              <h3 className="card-title">{s.title}</h3>
              <p className="card-desc">{s.description}</p>
              <div style={{ marginTop: 'var(--s-4)' }}>
                <Meter completed={s.completed} total={s.total} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
