import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import Home from './pages/Home';
import ServicesPage from './pages/Services';
import AboutPage from './pages/About';
import ContactPage from './pages/Contact';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import SignUpRole from './pages/SignUpRole';
import SignUpDetails from './pages/SignUpDetails';
import DashboardLayout from './layouts/DashboardLayout';
import OwnerDashboard from './pages/dashboard/OwnerDashboard';
import MyVehicles from './pages/dashboard/MyVehicles';
import VehicleManage from './pages/dashboard/VehicleManage';
import BookingRequests from './pages/dashboard/BookingRequests';
import Earnings from './pages/dashboard/Earnings';
import OwnerProfile from './pages/dashboard/OwnerProfile';
import OwnerSettings from './pages/dashboard/OwnerSettings';

// User Dashboard Imports
import UserDashboardLayout from './layouts/UserDashboardLayout';
import UserProfile from './pages/user-dashboard/UserProfile';
import UserBookings from './pages/user-dashboard/UserBookings';
import SavedVehicles from './pages/user-dashboard/SavedVehicles';
import UserSettings from './pages/user-dashboard/UserSettings';

import SearchVehicles from './pages/SearchVehicles';
import VehicleDetails from './pages/VehicleDetails';
import VehicleBooking from './pages/VehicleBooking';

const AppRoutes = () => {
  const location = useLocation();
  const normalizedPath = (location.pathname.replace(/\/+$/, '') || '/').toLowerCase();
  const authRoutes = ['/signin', '/signup', '/signup/role', '/signup/details'];
  const hideChrome = authRoutes.some(path => normalizedPath.startsWith(path));
  const isOwnerDashboard = normalizedPath.startsWith('/dashboard');

  return (
    <div className="flex flex-col min-h-screen">
      {!isOwnerDashboard && !hideChrome && <Navbar />}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<SearchVehicles />} />
          <Route path="/vehicles/:id" element={<VehicleDetails />} />
          <Route path="/vehicles/:id/book" element={<VehicleBooking />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signup/role" element={<SignUpRole />} />
          <Route path="/signup/details" element={<SignUpDetails />} />

          {/* Owner Dashboard Routes */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<OwnerDashboard />} />
            <Route path="vehicles" element={<MyVehicles />} />
            <Route path="vehicles/:id" element={<VehicleManage />} />
            <Route path="requests" element={<BookingRequests />} />
            <Route path="earnings" element={<Earnings />} />
            <Route path="profile" element={<OwnerProfile />} />
            <Route path="settings" element={<OwnerSettings />} />
          </Route>

          {/* User Dashboard Routes */}
          <Route path="/user-dashboard" element={<UserDashboardLayout />}>
            <Route index element={<UserProfile />} />
            <Route path="bookings" element={<UserBookings />} />
            <Route path="saved" element={<SavedVehicles />} />
            <Route path="settings" element={<UserSettings />} />
          </Route>
        </Routes>
      </main>
      {!hideChrome && <Footer />}
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
