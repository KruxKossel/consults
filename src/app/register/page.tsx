// app/register/page.tsx
"use client";

import { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setMessage('');
    } else {
      setError('');
      setMessage('Registro realizado com sucesso. Verifique seu e-mail para confirmar o cadastro.');
      setTimeout(() => {
        router.push('/login'); // Redireciona para a página de login após registro bem-sucedido
      }, 3000);
    }
  };

  return (
    <div className="container">
      <div className="header-text">
        <h1>Registrar</h1>
      </div>
      <form onSubmit={handleRegister} className="form-container">
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
        <button type="submit" className="submit-button">Registrar</button>
      </form>
      {error && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>}
      <p>Já tem uma conta? <Link href="/login">Login</Link></p>
    </div>
  );
};

export default RegisterPage;
