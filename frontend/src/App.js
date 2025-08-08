import React from 'react';
import WorkingZombieCarGame from './WorkingZombieCarGame';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/App.css';

function App() {
  return (
    <div className="app">
      <ErrorBoundary>
        <WorkingZombieCarGame />
      </ErrorBoundary>
    </div>
  );
}

export default App;