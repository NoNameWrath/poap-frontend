
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PostLogin() {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      nav('/app');
    }
  }, [user, loading, nav]);

  return <p className="text-center mt-10">Authenticating...</p>;
}
