import { BrowserRouter } from 'react-router-dom';
import RoutesDef from './routes';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RoutesDef />
      </BrowserRouter>
    </AuthProvider>
  );
}
