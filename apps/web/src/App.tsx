import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.tsx';
import AuthPage from './pages/AuthPage.tsx';
import WalletPage from './pages/WalletPage.tsx';
import StatusPage from './pages/StatusPage.tsx';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/wallets" element={<WalletPage />} />
        <Route path="/status" element={<StatusPage />} />
      </Routes>
    </Layout>
  );
}
