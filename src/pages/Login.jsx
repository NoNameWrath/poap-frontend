import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const { signInWithGoogle } = useAuth();
  const nav = useNavigate();

  const handleLogin = async () => {
    await signInWithGoogle();
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container-px mx-auto pt-20">
        <div className="mx-auto max-w-md card p-6 text-center">
          <h2 className="text-2xl font-bold">Welcome</h2>
          <p className="mt-2 text-zinc-400">Sign in to continue</p>
          <button className="mt-6 btn btn-primary w-full" onClick={handleLogin}>
            Continue with Google
          </button>
        </div>
      </main>
    </div>
  );
}
