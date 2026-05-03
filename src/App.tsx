// File: src/App.tsx
import { Routes, Route, HashRouter, Navigate } from 'react-router-dom';
import { useDataStore } from './store/useDataStore';

// Imports
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

function App() {
  // 1. Check if the user is already authenticated via Zustand local storage
  const profile = useDataStore(state => state.profile);

  return (
   <HashRouter> 
      <PwaUpdatePrompt />
    
      <Routes>
        {/* 2. AUTO-REDIRECTS: If logged in, skip Landing/Login and go to /pos */}
        <Route path="/" element={profile ? <Navigate to="/pos" replace /> : <Landing />} />
        <Route path="/login" element={profile ? <Navigate to="/pos" replace /> : <Login />} />

        {/* 3. ROUTE GUARD: Protect the Merchant App Routes */}
        {/* If a logged-out user tries to type /pos into the URL, kick them to /login */}
        <Route element={profile ? <AppLayout /> : <Navigate to="/login" replace />}>
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