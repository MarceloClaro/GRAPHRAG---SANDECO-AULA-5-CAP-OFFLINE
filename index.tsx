import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './error-boundary.css';

// Error Boundary para capturar erros de renderização
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🔴 Error Boundary capturou:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-container">
          <h1 className="error-boundary-title">❌ Erro ao Renderizar a Aplicação</h1>
          <p className="error-boundary-message">Verifique o console (F12) para mais detalhes.</p>
          <pre className="error-boundary-pre">
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            className="error-boundary-button"
          >
            🔄 Recarregar Página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ Elemento root não encontrado no HTML!');
  throw new Error("❌ Elemento root não encontrado no HTML!");
}

console.log('✅ Root element encontrado:', rootElement);

const root = ReactDOM.createRoot(rootElement);
console.log('✅ ReactDOM root criado, renderizando App...');

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

console.log('✅ App renderizado com sucesso!');