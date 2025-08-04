import React from 'react';
import ZombieCarGame from './ZombieCarGame';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/App.css';

function App() {
  return (
    <div className="app">
      <ErrorBoundary>
        <ZombieCarGame />
      </ErrorBoundary>
    </div>
  );
}

export default App;