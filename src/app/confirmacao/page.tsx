"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const Confirmacao = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams) {
      const access_token = searchParams.get('access_token');

      if (access_token) {
        supabase.auth.setSession({
          access_token: access_token,
          refresh_token: ''
        }).then(({ error }) => {
          if (error) {
            console.error('Erro ao definir a sessão:', error);
          } else {
            router.push('/');
          }
        });
      }
    }
  }, [searchParams, router]);

  return (
    <div className="container">
      <h1>Confirmação de Email</h1>
      <p>Seu email foi confirmado com sucesso. Redirecionando...</p>
    </div>
  );
};

export default Confirmacao;
