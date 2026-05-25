import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.tsx';
import Home from './pages/Home.tsx';
import Status from './pages/Status.tsx';
import Auth from './pages/Auth.tsx';
import WalletDemo from './pages/WalletDemo.tsx';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/status" element={<Status />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/wallet" element={<WalletDemo />} />
      </Routes>
    </Layout>
  );
}

