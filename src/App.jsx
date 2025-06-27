import React, { useState } from 'react';
import JarvisAgent from './components/JarvisAgent.jsx';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Jarvis AI Assistant</h1>
      </header>
      <main>
        <JarvisAgent />
      </main>
    </div>
  );
}

export default App;
