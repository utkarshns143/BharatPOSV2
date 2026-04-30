// File: src/App.tsx
import { Routes, Route, HashRouter } from 'react-router-dom';

import Inventory from './pages/merchant/Inventory';
import Sales from './pages/merchant/Sales';
import { AppLayout } from './components/layout/AppLayout';
import PointOfSale from './pages/merchant/PointOfSale';
import Khata from './pages/merchant/Khata';
import Dashboard from './pages/merchant/Dashboard';
import Settings from './pages/merchant/Settings';
import { Login } from './pages/auth/Login';
import Reports from './pages/merchant/Reports';
import FinanceHQ from './pages/merchant/FinanceHQ';
import Forecast from './pages/merchant/Forecast';
import { AI } from './pages/merchant/AI';
import { Landing } from './pages/public/Landing';
import { PwaUpdatePrompt } from './components/shared/PwaUpdatePrompt';

// 🛑 REMOVED CustomerPortal IMPORT

function App() {
  return (
   <HashRouter> 
      <PwaUpdatePrompt />
    
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        
        {/* 🛑 REMOVED /khata-app ROUTE */}

        {/* Merchant App Routes */}
        <Route element={<AppLayout />}>
          <Route path="/pos" element={<PointOfSale />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/khata" element={<Khata />} />
          <Route path="/finance" element={<FinanceHQ />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/forecast" element={<Forecast />} />
          <Route path="/ai" element={<AI />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;