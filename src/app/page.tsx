// src/app/page.tsx
import React from 'react';
import FileUpload from '../components/FileUpload';

export default function Home() {
  return (
    <div className="container">
      <div className="header-text">
        <h1>Bem-vindo ao Consultas</h1>
        <p>Faça upload de uma planilha Excel com horários.</p>
        <p className="description">Por favor, faça o upload de uma planilha Excel (.xlsx) com o seguinte formato:</p>
      </div>
      <FileUpload />
    </div>
  );
}
