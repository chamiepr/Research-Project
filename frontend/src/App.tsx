import React, { useMemo, useState } from 'react';

type ResultRow = {
  brochure_id: number;
  clicked_item: string;
  Brand_Percentage: number;
  Familiarity_Percentage: number;
  Price_Percentage: number;
  Predicted_Reason: string;
};

const API_BASE = 'http://localhost:5000';

export default function App() {
  const [page, setPage] = useState<'start' | 'running' | 'results'>('start');
  const [participant, setParticipant] = useState({
    id: '',
    age: '',
    gender: '',
  });
  const [results, setResults] = useState<ResultRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const beginTask = async () => {
    setError('');

    if (!participant.id || !participant.age || !participant.gender) {
      setError('Please enter participant ID, age, and gender.');
      return;
    }

    setLoading(true);
    setPage('running');

    try {
      const response = await fetch(`${API_BASE}/api/launch-psychopy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(participant),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to launch PsychoPy test');
      }

      pollResults(participant.id);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setLoading(false);
      setPage('start');
    }
  };

  const pollResults = (participantId: string) => {
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/latest-results?participantId=${encodeURIComponent(participantId)}`
        );

        const data = await response.json();

        if (data.status === 'completed') {
          clearInterval(intervalId);
          setResults(data.results || []);
          setLoading(false);
          setPage('results');
        } else if (data.status === 'error') {
          clearInterval(intervalId);
          setError(data.error || 'Prediction failed');
          setLoading(false);
          setPage('start');
        }
      } catch {
        clearInterval(intervalId);
        setError('Could not connect to backend');
        setLoading(false);
        setPage('start');
      }
    }, 3000);
  };

  const restart = () => {
    setParticipant({ id: '', age: '', gender: '' });
    setResults([]);
    setError('');
    setLoading(false);
    setPage('start');
  };

  const summary = useMemo(() => {
    if (!results.length) return null;

    const totals = results.reduce(
      (acc, row) => {
        acc.brand += row.Brand_Percentage;
        acc.familiarity += row.Familiarity_Percentage;
        acc.price += row.Price_Percentage;
        return acc;
      },
      { brand: 0, familiarity: 0, price: 0 }
    );

    const count = results.length;

    const avg = {
      Brand: totals.brand / count,
      Familiarity: totals.familiarity / count,
      Price: totals.price / count,
    };

    const top = Object.entries(avg).sort((a, b) => b[1] - a[1])[0];

    return {
      avg,
      topReason: top[0],
      topValue: top[1],
    };
  }, [results]);

  if (page === 'running') {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>PsychoPy Test Running</h1>
          <p style={styles.text}>
            Complete the PsychoPy test window. This page will automatically show the results after the test is finished.
          </p>
          <p style={styles.text}>
            <strong>Participant ID:</strong> {participant.id}
          </p>
        </div>
      </div>
    );
  }

  if (page === 'results') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.card}>
            <h1 style={styles.title}>Behaviour Analysis Results</h1>
            <p style={styles.text}>
              <strong>Participant:</strong> {participant.id} | <strong>Age:</strong> {participant.age} |{' '}
              <strong>Gender:</strong> {participant.gender}
            </p>

            {summary && (
              <>
                <p style={styles.text}>
                  <strong>Main Influence:</strong> {summary.topReason}
                </p>
                <p style={styles.text}>
                  <strong>Average Top Score:</strong> {summary.topValue.toFixed(2)}%
                </p>
              </>
            )}

            <button style={styles.button} onClick={restart}>
              Run Another Test
            </button>
          </div>

          <div style={styles.card}>
            <h2 style={styles.subtitle}>Overall Average Percentages</h2>
            {summary && (
              <>
                <ProgressBar label="Brand" value={summary.avg.Brand} />
                <ProgressBar label="Familiarity" value={summary.avg.Familiarity} />
                <ProgressBar label="Price" value={summary.avg.Price} />
              </>
            )}
          </div>

          {results.map((row) => (
            <div key={row.brochure_id} style={styles.card}>
              <h3 style={styles.subtitle}>Brochure {row.brochure_id}</h3>
              <p style={styles.text}>
                <strong>Clicked Item:</strong> {row.clicked_item}
              </p>

              <ProgressBar label="Brand Influence" value={row.Brand_Percentage} />
              <ProgressBar label="Familiarity Influence" value={row.Familiarity_Percentage} />
              <ProgressBar label="Price Influence" value={row.Price_Percentage} />

              <p style={{ ...styles.text, marginTop: 16 }}>
                <strong>Final Decision Most Influenced By:</strong> {row.Predicted_Reason}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Consumer Decision Behaviour Analysis</h1>
        <p style={styles.text}>Enter participant details and press Start Task.</p>

        <input
          style={styles.input}
          placeholder="Participant ID"
          value={participant.id}
          onChange={(e) => setParticipant({ ...participant, id: e.target.value })}
        />

        <input
          style={styles.input}
          placeholder="Age"
          value={participant.age}
          onChange={(e) => setParticipant({ ...participant, age: e.target.value })}
        />

        <input
          style={styles.input}
          placeholder="Gender"
          value={participant.gender}
          onChange={(e) => setParticipant({ ...participant, gender: e.target.value })}
        />

        <button
          style={styles.button}
          onClick={beginTask}
          disabled={loading}
        >
          {loading ? 'Starting...' : 'Start Task'}
        </button>

        {error && <p style={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

function ProgressBar({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={styles.progressHeader}>
        <span>{label}</span>
        <span>{value.toFixed(2)}%</span>
      </div>
      <div style={styles.progressOuter}>
        <div style={{ ...styles.progressInner, width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '24px',
    fontFamily: 'Arial, sans-serif',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: '900px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    marginBottom: '20px',
  },
  title: {
    margin: '0 0 12px 0',
    fontSize: '28px',
    color: '#111827',
  },
  subtitle: {
    margin: '0 0 12px 0',
    fontSize: '22px',
    color: '#111827',
  },
  text: {
    fontSize: '16px',
    color: '#374151',
    marginBottom: '10px',
  },
  input: {
    width: '100%',
    padding: '12px',
    marginTop: '10px',
    marginBottom: '10px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '16px',
    boxSizing: 'border-box',
  },
  button: {
    padding: '12px 20px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '16px',
    marginTop: '10px',
  },
  error: {
    color: '#dc2626',
    marginTop: '12px',
    fontSize: '15px',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '6px',
    color: '#374151',
    fontSize: '15px',
  },
  progressOuter: {
    width: '100%',
    height: '12px',
    backgroundColor: '#e5e7eb',
    borderRadius: '999px',
    overflow: 'hidden',
  },
  progressInner: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: '999px',
  },
};