// src/components/Search.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Select from 'react-select';

interface Semana {
  id: number;
  cidade: string;
  uf: string;
}

interface Planilha {
  id: number;
  semana_id: number;
  dia_semana: string;
  status: number;
}

const Search: React.FC = () => {
  const [cidade, setCidade] = useState<{ label: string; value: string } | null>(null);
  const [cidades, setCidades] = useState<{ label: string; value: string }[]>([]);
  const [resultados, setResultados] = useState<Semana[]>([]);
  const [planilhas, setPlanilhas] = useState<Planilha[]>([]);

  useEffect(() => {
    const carregarCidades = async () => {
      const { data, error } = await supabase
        .from('semanas')
        .select('cidade');

      if (error) {
        console.error('Erro ao carregar cidades:', error);
        return;
      }

      const cidadesDisponiveis = Array.from(new Set(data.map((item: { cidade: string }) => item.cidade)))
        .map((cidade) => ({
          label: cidade,
          value: cidade,
        }));

      setCidades(cidadesDisponiveis);
    };

    carregarCidades();
  }, []);

  const buscarHorarios = async () => {
    if (!cidade) return;

    const { data: semanas, error: errorSemanas } = await supabase
      .from('semanas')
      .select('*')
      .eq('cidade', cidade.value);

    if (errorSemanas || !semanas) {
      console.error('Erro ao buscar semanas:', errorSemanas);
      return;
    }

    const semanaIds = semanas.map((semana: Semana) => semana.id);

    const { data: planilhasData, error: errorPlanilhas } = await supabase
      .from('planilhas')
      .select('*')
      .in('semana_id', semanaIds);

    if (errorPlanilhas || !planilhasData) {
      console.error('Erro ao buscar planilhas:', errorPlanilhas);
      return;
    }

    setResultados(semanas);
    setPlanilhas(planilhasData);
  };

  const diasDaSemana = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

  return (
    <div className="container">
      <div className="header-text">
        <h2>Buscar Horários</h2>
        <div className="input-container">
          <Select
            options={cidades}
            value={cidade}
            onChange={setCidade}
            placeholder="Buscar por cidade"
          />
          <button onClick={buscarHorarios}>Buscar</button>
        </div>
        <div className="results-container">
          {resultados.map((semana: Semana) => (
            <div key={semana.id} className="result-item">
              <h3>{semana.cidade}, {semana.uf}</h3>
              <table>
                <thead>
                  <tr>
                    {diasDaSemana.map((dia) => (
                      <th key={dia}>{dia}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {diasDaSemana.map((dia) => {
                      const planilha = planilhas.find((p) => p.semana_id === semana.id && p.dia_semana === dia.toLowerCase());
                      return (
                        <td key={dia} style={{ borderRight: '1px solid #ccc', padding: '8px' }}>
                          {planilha ? planilha.status : 0}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Search;
