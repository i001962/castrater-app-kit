import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.tsx';
import Home from './pages/Home.tsx';
import Status from './pages/Status.tsx';
import WalletDemo from './pages/WalletDemo.tsx';
import FarcasterDemo from './pages/FarcasterDemo.tsx';
import MiniAppDemo from './pages/MiniAppDemo.tsx';
import JobsDemo from './pages/JobsDemo.tsx';
import ProofsDemo from './pages/ProofsDemo.tsx';
import InferenceDemo from './pages/InferenceDemo.tsx';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/status" element={<Status />} />
        <Route path="/wallet" element={<WalletDemo />} />
        <Route path="/farcaster" element={<FarcasterDemo />} />
        <Route path="/miniapp" element={<MiniAppDemo />} />
        <Route path="/jobs" element={<JobsDemo />} />
        <Route path="/proofs" element={<ProofsDemo />} />
        <Route path="/inference" element={<InferenceDemo />} />
      </Routes>
    </Layout>
  );
}
