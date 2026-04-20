
import { HashRouter, Routes, Route } from 'react-router-dom';

import Inventory from './pages/merchant/Inventory';
import Sales from './pages/merchant/Sales';
// Import our Layout and Pages
import { AppLayout } from './components/layout/AppLayout';
import PointOfSale from './pages/merchant/PointOfSale';
import Khata from './pages/merchant/Khata';
import Dashboard from './pages/merchant/Dashboard';
import Settings from './pages/merchant/Settings';
import { Login } from './pages/auth/Login';
import Reports from './pages/merchant/Reports';
import { CustomerPortal } from './pages/customer/CustomerPortal';
import FinanceHQ from './pages/merchant/FinanceHQ';
import Forecast from './pages/merchant/Forecast';
import { AI } from './pages/merchant/AI';
import { Landing } from './pages/public/Landing';


function App() {
  


 
  

  return (
    <HashRouter>
      <Routes>
         <Route path="/" element={<Landing />} />
        {/* Public Login Route */}
     <Route path="/login" element={<Login />} />
      <Route path="/khata-app" element={<CustomerPortal />} /> {/* NEW CUSTOMER PORTAL */}

        {/* Everything inside this Route will have the Sidebar wrapped around it */}
        <Route element={<AppLayout />}>
          
          {/* Default Route (http://localhost:5173/#/) */}
          <Route path="/pos" element={<PointOfSale />} />
          
         

          {/* Reports Route (http://localhost:5173/#/reports) */}
          <Route path="/reports" element={<Reports />} />
         

          {/* Inventory Route */}
          <Route path="/inventory" element={<Inventory />} />
          {/* Dashboard Route */}
       <Route path="/dashboard" element={<Dashboard />} />
          {/* Sales Route */}
          <Route path="/sales" element={<Sales />} />
           {/* Khata Route (http://localhost:5173/#/khata) */}
          <Route path="/khata" element={<Khata />} />
          
       {/* Finance HQ Route */}
        <Route path="/finance" element={<FinanceHQ />} />
          {/* Settings Route */}
          <Route path="/settings" element={<Settings />} />
          {/* Sales Forecast Route */}
          <Route path="/forecast" element={<Forecast />} />
          {/* AI Assistant Route */}
          <Route path="/ai" element={<AI />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;