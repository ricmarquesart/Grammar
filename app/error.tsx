'use client';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <h2>Startup/runtime error</h2>
      <p>Something failed while loading this page.</p>
      <p className="small">{error.message || 'Unknown error'}</p>
      <button className="btn" onClick={reset}>Try again</button>
      <p className="small" style={{ marginTop: '.75rem' }}>
        If this keeps happening, run <strong>DOCTOR.bat</strong> and check logs in the <code>logs</code> folder.
      </p>
    </div>
  );
}
