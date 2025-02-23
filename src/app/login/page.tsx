// app/login/page.tsx
"use client";

import { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      setError('');
      router.push('/'); // Redireciona para a página inicial após login bem-sucedido
    }
  };

  return (
    <div className="container">
      <div className="header-text">
        <h1>Login</h1>
      </div>
      <form onSubmit={handleLogin} className="form-container">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="input-field"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          required
          className="input-field"
        />
        <button type="submit" className="submit-button">Login</button>
      </form>
      {error && <p className="error-message">{error}</p>}
      <p>Não tem uma conta? <Link href="/register">Registrar</Link></p>
    </div>
  );
};

export default LoginPage;
