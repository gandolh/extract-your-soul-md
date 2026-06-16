import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type StudySummary } from '../api/client';
import { Meter } from '../components/Layout';
import { Eyebrow, Headline, buttonClass, cardClass } from '../components/ui';

export function IntroPage() {
  const [studies, setStudies] = useState<StudySummary[]>([]);

  useEffect(() => {
    api.studies().then((r) => setStudies(r.studies)).catch(() => {});
  }, []);

  const total = studies.reduce((n, s) => n + s.total, 0);
  const done = studies.reduce((n, s) => n + s.completed, 0);

  const steps = [
    {
      index: '01',
      to: '/studies',
      eyebrow: 'Studies',
      title: 'Answer the studies',
      desc: 'Three short forms — 11 open-ended prompts in all. Take your time; longer answers carry more of you. Vent, ramble, be informal — that is the signal.',
    },
    {
      index: '02',
      to: '/import',
      eyebrow: 'Conversations',
      title: 'Import conversations',
      desc: 'Drop in WhatsApp exports. Only the lines you wrote are kept; everything else is filtered out.',
    },
    {
      index: '03',
      to: '/results',
      eyebrow: 'Profile',
      title: 'Generate the profile',
      desc: 'Run extraction to synthesize a voice profile — this runs locally and needs a running Ollama server. Re-run any time as you add material.',
    },
  ];

  return (
    <div className="flex flex-col gap-section">
      <section className="max-w-[46ch]">
        <Eyebrow>A study of voice</Eyebrow>
        <Headline size="xl" className="mt-3">
          Your words, read back to you as a <span className="text-primary">pattern</span>.
        </Headline>
      </section>

      <section className="flex max-w-[64ch] flex-col gap-3 text-[14px] leading-[22px] text-text-secondary">
        <p className="text-text-primary">
          This platform reinforces a written profile — a{' '}
          <code className="rounded-sm bg-primary-wash px-1.5 py-0.5 font-mono text-[12px] text-primary">soul.md</code> —
          from material you supply: short structured self-reports and your own past conversations.
        </p>
        <p>
          The premise borrows from narrative-identity and self-report research: how a person frames
          frustration, what they find funny, the register they switch into for a stranger — these
          recur. Read across enough samples, the regularities surface.
        </p>
        <p>
          Nothing is interpreted as you type. Capture is deliberately dumb — all synthesis happens
          when you run extraction, locally, against your own data.
        </p>
      </section>

      <hr className="border-0 border-t border-hairline" />

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Eyebrow>How it works</Eyebrow>
          <div className="min-w-[180px]">
            <Meter completed={done} total={total} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <Link
              key={s.index}
              to={s.to}
              className={cardClass(
                'group flex flex-col p-5 transition-colors hover:border-outline',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-faint">
                  {s.index} / {s.eyebrow}
                </span>
                <span className="font-mono text-text-faint transition-colors group-hover:text-primary">→</span>
              </div>
              <h3 className="mt-3 font-sans text-[20px] font-semibold leading-[26px] tracking-[-0.01em] text-text-primary">
                {s.title}
              </h3>
              <p className="mt-2 text-[13px] leading-[18px] text-text-secondary">{s.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <div>
        <Link className={buttonClass('primary')} to="/studies">
          Begin the first study →
        </Link>
      </div>
    </div>
  );
}
