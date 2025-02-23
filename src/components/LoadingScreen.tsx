// src/components/LoadingScreen.tsx
import React from 'react';
import "../styles/globals.css";

const LoadingScreen = () => {
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>Carregando...</p>
    </div>
  );
};

export default LoadingScreen;
