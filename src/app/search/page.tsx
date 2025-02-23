// src/app/search/page.tsx
import React from 'react';
import Search from '../../components/Search';

const SearchPage: React.FC = () => {
  return (
    <div className="container">
      {/* <h1>Buscar Horários</h1> */}
      <Search />
    </div>
  );
};

export default SearchPage;
