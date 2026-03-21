import { useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import LuckyTripleGame from './LuckyTripleGame'
import { ReferralApp } from './components/referral/ReferralApp';

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");

    if (status) {
      // Remove query params and refresh home
      navigate("/", { replace: true });
      window.location.reload();
    }
  }, [navigate]);

  return (
    <Routes>
      {/* Main Game Route */}
      <Route path="/" element={<LuckyTripleGame />} />
      <Route path="/signup" element={<LuckyTripleGame />} />
      
      {/* Referral Portal Route */}
      <Route path="/referral/*" element={<ReferralApp />} />
    </Routes>
  )
}

export default App