import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Scan from './pages/Scan';
import PostLogin from './pages/PostLogin';
import Admin from "./pages/Admin";
import EventDisplay from './pages/EventDisplay';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="text-center mt-10">Loading…</p>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function RoutesDef() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/post-login" element={<PostLogin />} />
      <Route path="/app" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/scan" element={<PrivateRoute><Scan /></PrivateRoute>} />
      <Route path="/event/:eventId" element={<EventDisplay />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      <Route path="/admin" element={<Admin />} />
      
    </Routes>
  );
}
