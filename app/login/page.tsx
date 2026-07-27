'use client';

import {useState} from 'react';
import {LockKeyhole} from 'lucide-react';
import Link from 'next/link';
import {BrandMark} from '@/components/Brand';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({password}),
      });
      if (response.ok) {
        location.href = '/admin';
        return;
      }
      const data = await response.json().catch(() => ({}));
      setError(data.error || 'Não foi possível entrar.');
    } catch {
      setError('Falha de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="loginPage">
      <form onSubmit={submit}>
        <div className="loginLogo"><BrandMark /></div>
        <small>ÁREA RESTRITA</small>
        <h1>Agenda Vitinho</h1>
        <p>Entre para acompanhar os horários de hoje.</p>
        <label>
          Senha de acesso
          <div>
            <LockKeyhole />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              autoFocus
              placeholder="Digite sua senha"
            />
          </div>
        </label>
        {error && <span className="loginError" role="alert">{error}</span>}
        <button className="btn gold" disabled={loading || !password}>
          {loading ? 'Entrando...' : 'Acessar agenda'}
        </button>
        <Link href="/">← Voltar ao site</Link>
      </form>
    </main>
  );
}
