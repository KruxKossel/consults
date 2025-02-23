// src/components/FileUpload.tsx
"use client";

import React, { useState } from 'react';

const FileUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
      setMessage(null);
    }
  };

  const handleFileUpload = async () => {
    if (file) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        if (result.success) {
          setMessage("Upload realizado com sucesso!");
        } else {
          setMessage("Ocorreu um erro ao fazer o upload da planilha.");
        }
      } catch (error) {
        console.error("Erro ao fazer o upload:", error);
        setMessage("Ocorreu um erro ao fazer o upload da planilha.");
      }
    } else {
      setMessage("Por favor, selecione um arquivo Excel para fazer upload.");
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
        <button type="button" className="button" onClick={handleFileUpload}>Upload</button>
      </div>
      {message && <p>{message}</p>}
    </div>
  );
};

export default FileUpload;
