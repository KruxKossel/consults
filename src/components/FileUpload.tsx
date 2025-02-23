// src/components/FileUpload.tsx

"use client";

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

interface Duplicate {
  cidade: string;
  uf: string;
  semana_id: number;
}

const FileUpload: React.FC = () => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [currentDuplicate, setCurrentDuplicate] = useState<Duplicate | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFile = e.target.files[0];
      const fileType = selectedFile.type;

      if (fileType !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        setMessage("Por favor, selecione um arquivo Excel (.xlsx).");
      } else {
        setFile(selectedFile);
        setMessage(null);
      }
    }
  };

  const handleFileUpload = async () => {
    if (!file) {
      setMessage("Por favor, selecione um arquivo Excel para fazer upload.");
      return;
    }

    if (!user) {
      setMessage('Você precisa estar logado para fazer upload de planilhas.');
      return;
    }

    setIsUploading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;

      if (!token) {
        setMessage("Erro de autenticação. Por favor, faça login novamente.");
        setIsUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        setMessage(result.message);
      } else if (result.confirmReplace && result.duplicates) {
        // Solicitar confirmação do usuário para substituir
        setMessage(result.message);
        setDuplicates(result.duplicates);
        setCurrentDuplicate(result.duplicates[0]);
      } else {
        setMessage(result.message);
      }
    } catch (error) {
      console.error("Erro ao fazer o upload:", error);
      setMessage("Ocorreu um erro ao fazer o upload da planilha.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleReplaceConfirm = async () => {
    if (!file || !currentDuplicate) return;

    setIsUploading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;

      if (!token) {
        setMessage("Erro de autenticação. Por favor, faça login novamente.");
        setIsUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('replace', 'true');
      formData.append('cidade', currentDuplicate.cidade);
      formData.append('uf', currentDuplicate.uf);

      const response = await fetch('/api/replace', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        setMessage(`Dados da cidade ${currentDuplicate.cidade} substituídos com sucesso!`);
        const nextIndex = duplicates.indexOf(currentDuplicate) + 1;
        if (nextIndex < duplicates.length) {
          setCurrentDuplicate(duplicates[nextIndex]);
        } else {
          setCurrentDuplicate(null);
          setDuplicates([]);
        }
      } else {
        setMessage(result.message);
      }
    } catch (error) {
      console.error("Erro ao substituir os dados:", error);
      setMessage("Ocorreu um erro ao substituir os dados.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSkipDuplicate = () => {
    const nextIndex = duplicates.indexOf(currentDuplicate as Duplicate) + 1;
    if (nextIndex < duplicates.length) {
      setCurrentDuplicate(duplicates[nextIndex]);
    } else {
      setCurrentDuplicate(null);
      setDuplicates([]);
    }
  };

  return (
    <div className="file-upload">
      <p className="description">Por favor, faça o upload de uma planilha Excel (.xlsx) com o seguinte formato:</p>
      <ul className="file-upload-instructions">
        <li><strong>Coluna A:</strong> NOME DA CIDADE</li>
        <li><strong>Coluna B:</strong> UF</li>
        <li><strong>Coluna C a I:</strong> Dias da semana (segunda a domingo)</li>
      </ul>
      <div className="file-upload-controls">
        <input type="file" onChange={handleFileChange} title="Escolha um arquivo Excel para fazer upload" />
      </div>
      <div className="button-container">
        <button type="button" className="button" onClick={handleFileUpload} disabled={isUploading}>
          {isUploading ? 'Fazendo Upload...' : 'Upload'}
        </button>
      </div>
      {currentDuplicate && (
        <div className="button-container">
          <strong><p>{`A cidade ${currentDuplicate.cidade} já existe. Deseja substituir os dados?`}</p></strong>
          <button type="button" className="confirm-button" onClick={handleReplaceConfirm} disabled={isUploading}>
            {isUploading ? 'Substituindo...' : 'Confirmar Substituição'}
          </button>
          <button type="button" className="skip-button" onClick={handleSkipDuplicate} disabled={isUploading}>
            {isUploading ? 'Pulando...' : 'Pular Substituição'}
          </button>
        </div>
      )}
      {message && <p>{message}</p>}
    </div>
  );
};

export default FileUpload;
