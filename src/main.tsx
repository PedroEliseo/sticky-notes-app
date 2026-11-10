import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MockNotesApi } from './api/MockNotesApi';
import { App } from './App';
import './index.css';

const root = document.getElementById('root');
if (root === null) throw new Error('Root element #root not found');

const api = new MockNotesApi({ storage: window.localStorage });

createRoot(root).render(
  <StrictMode>
    <App api={api} />
  </StrictMode>,
);
