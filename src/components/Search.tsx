// src/components/Search.tsx
"use client"; // Adiciona esta linha no início do arquivo

import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const Search: React.FC = () => {
  const [cidade, setCidade] = useState('');
  const [resultados, setResultados] = useState<Horario[]>([]); // Especifica o tipo Horario

  const buscarHorarios = async () => {
    const { data, error } = await supabase
      .from('tabela_de_horarios')
      .select('*')
      .eq('cidade', cidade);

    if (!error && data) {
      setResultados(data as Horario[]); // Força a tipagem de data para Horario[]
    }
  };

  return (
    <div className="search">
      <input
        type="text"
        placeholder="Buscar por cidade"
        value={cidade}
        onChange={(e) => setCidade(e.target.value)}
      />
      <button onClick={buscarHorarios}>Buscar</button>
      <ul>
        {resultados.map((item) => (
          <li key={item.id}>
            {item.dia_da_semana}: {item.horario}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Search;

// Definição do tipo Horario
interface Horario {
  id: number;
  cidade: string;
  dia_da_semana: string;
  horario: string;
}
