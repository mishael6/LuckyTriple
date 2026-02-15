import { useEffect } from 'react'
import LuckyTripleGame from './LuckyTripleGame'
import { useNavigate } from "react-router-dom";


function App() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");

    if (status) {
      // Remove query params and refresh home
      navigate("/", { replace: true });
      window.location.reload();
    }
  }, [navigate]);

  return <LuckyTripleGame />
}

export default App