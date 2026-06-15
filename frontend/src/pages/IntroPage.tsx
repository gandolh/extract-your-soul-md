import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type StudySummary } from '../api/client';
import { Meter } from '../components/Layout';

export function IntroPage() {
  const [studies, setStudies] = useState<StudySummary[]>([]);

  useEffect(() => {
    api.studies().then((r) => setStudies(r.studies)).catch(() => {});
  }, []);

  const total = studies.reduce((n, s) => n + s.total, 0);
  const done = studies.reduce((n, s) => n + s.completed, 0);

  return (
    <div className="stack stack-7">
      <section style={{ maxWidth: '40ch' }}>
        <p className="eyebrow">A study of voice</p>
        <h1>
          Your words, read back to you as a&nbsp;
          <span style={{ color: 'var(--accent)' }}>pattern</span>.
        </h1>
      </section>

      <section className="stack stack-4">
        <p className="lede">
          This platform reinforces a written profile — a <code>soul.md</code> — from material you
          supply: short structured self-reports and your own past conversations.
        </p>
        <p>
          The premise borrows from narrative-identity and self-report research: how a person frames
          frustration, what they find funny, the register they switch into for a stranger — these
          recur. Read across enough samples, the regularities surface. The studies below are designed
          to elicit those samples quickly; imported conversations supply the unguarded ones.
        </p>
        <p>
          Nothing is interpreted as you type. Capture is deliberately dumb — all synthesis happens
          when you run extraction, locally, against your own data.
        </p>
      </section>

      <hr className="divider" />

      <section className="stack stack-4">
        <div className="row-between">
          <p className="eyebrow" style={{ margin: 0 }}>How it works</p>
          <div style={{ minWidth: 180 }}>
            <Meter completed={done} total={total} />
          </div>
        </div>
        <div className="grid-cards">
          <Link className="card" to="/studies">
            <span className="card-index">01 / Studies</span>
            <h3 className="card-title">Answer the studies</h3>
            <p className="card-desc">Three short forms of open-ended prompts. Vent, ramble, be informal — that is the signal.</p>
          </Link>
          <Link className="card" to="/import">
            <span className="card-index">02 / Conversations</span>
            <h3 className="card-title">Import conversations</h3>
            <p className="card-desc">Drop in WhatsApp exports. Only the lines you wrote are kept; everything else is filtered out.</p>
          </Link>
          <Link className="card" to="/results">
            <span className="card-index">03 / Profile</span>
            <h3 className="card-title">Generate the profile</h3>
            <p className="card-desc">Run extraction to synthesize a voice profile. Re-run any time as you add material.</p>
          </Link>
        </div>
      </section>

      <div className="btn-row">
        <Link className="btn btn-accent" to="/studies">
          Begin the first study →
        </Link>
      </div>
    </div>
  );
}
