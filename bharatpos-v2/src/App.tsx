import { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { useDataStore } from './store/useDataStore';
import { fetchProductsFromDB } from './services/inventory';
import Inventory from './pages/merchant/Inventory';
import Sales from './pages/merchant/Sales';
// Import our Layout and Pages
import { AppLayout } from './components/layout/AppLayout';
import PointOfSale from './pages/merchant/PointOfSale';
import Khata from './pages/merchant/Khata';
import Dashboard from './pages/merchant/Dashboard';
import Settings from './pages/merchant/Settings';
import { Login } from './pages/auth/Login';

function App() {
  const setProducts = useDataStore((state) => state.setProducts);

  

  return (
    <HashRouter>
      <Routes>

        {/* Public Login Route */}
     <Route path="/login" element={<Login />} />

        {/* Everything inside this Route will have the Sidebar wrapped around it */}
        <Route element={<AppLayout />}>
          
          {/* Default Route (http://localhost:5173/#/) */}
          <Route path="/" element={<PointOfSale />} />
          
          {/* Khata Route (http://localhost:5173/#/khata) */}
          <Route path="/khata" element={<Khata />} />
          
          {/* Inventory Route */}
          <Route path="/inventory" element={<Inventory />} />
          {/* Sales Route */}
          <Route path="/sales" element={<Sales />} />
          
          {/* Dashboard Route */}
       <Route path="/dashboard" element={<Dashboard />} />
          {/* Settings Route */}
          <Route path="/settings" element={<Settings />} />
        

        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;