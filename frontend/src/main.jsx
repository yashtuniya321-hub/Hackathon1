import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { BrightloopProvider } from './context/BrightloopContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <BrightloopProvider>
        <App />
      </BrightloopProvider>
    </BrowserRouter>
  </React.StrictMode>
);
