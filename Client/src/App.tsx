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

const AppRoutes = () => {
  const location = useLocation();
  const normalizedPath = location.pathname.replace(/\/+$/, '/signup/details') || '/';
  const hideChrome = ['/signin', '/signup', '/signup/role'].includes(normalizedPath.toLowerCase());

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signup/role" element={<SignUpRole />} />
          <Route path="/signup/details" element={<SignUpDetails />} />
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