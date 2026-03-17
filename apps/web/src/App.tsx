import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import MasterRankings from './pages/MasterRankings';
import PortfolioView from './pages/PortfolioView';
import AnalysisView from './pages/AnalysisView';
import SecurityDetail from './pages/SecurityDetail';
import CoveredCalls from './pages/CoveredCalls';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<MasterRankings />} />
          <Route path="portfolios" element={<PortfolioView />} />
          <Route path="covered-calls" element={<CoveredCalls />} />
          <Route path="analyses" element={<AnalysisView />} />
          <Route path="security/:id" element={<SecurityDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
