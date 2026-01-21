import { Car, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";

  // Prevent scrolling when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [menuOpen]);

  // Dynamic styling based on current page
  const navBaseClass = isHome 
    ? "absolute bg-transparent text-white" 
    : "sticky top-0 bg-white/80 backdrop-blur-md text-gray-800 border-b border-gray-100";

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className={`w-full z-[100] flex items-center justify-between px-6 md:px-12 py-4 transition-all duration-300 ${navBaseClass}`}>
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 font-bold text-xl group" onClick={closeMenu}>
        <div className="bg-[#003049] p-1.5 rounded-lg text-white group-hover:scale-110 transition-transform">
          <Car size={24} />
        </div>
        AutoShare
      </Link>

      {/* Desktop Menu */}
      <div className="hidden md:flex gap-8 text-sm font-semibold uppercase tracking-wide">
        <Link to="/" className="hover:text-orange-500 transition-colors">Home</Link>
        <Link to="/services" className="hover:text-orange-500 transition-colors">Services</Link>
        <Link to="/about" className="hover:text-orange-500 transition-colors">About</Link>
        <Link to="/contact" className="hover:text-orange-500 transition-colors">Contact Us</Link>
      </div>

      {/* Auth Buttons */}
      <div className="hidden md:flex items-center gap-6">
        <Link to="/signin" className="text-sm font-bold hover:opacity-80 transition">Sign In</Link>
        <Link to="/signup" className="bg-orange-500 px-6 py-2.5 rounded-xl text-sm font-extrabold hover:bg-orange-600 transition text-white shadow-lg shadow-orange-500/20">
          Sign Up
        </Link>
      </div>

      {/* Mobile Toggle */}
      <button 
        className="md:hidden p-2 rounded-lg hover:bg-gray-100/10 transition-colors"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {menuOpen ? <X size={28} /> : <Menu size={28} />}
      </button>

      {/* Mobile Sidebar Overlay */}
      <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] md:hidden transition-opacity duration-300 ${menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <div className={`absolute right-0 top-0 h-full w-[280px] bg-white text-gray-900 shadow-2xl transition-transform duration-300 transform ${menuOpen ? "translate-x-0" : "translate-x-full"}`}>
          <div className="p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-10">
              <span className="font-bold text-xl flex items-center gap-2">
                <div className="bg-[#003049] p-1 rounded-md text-white"><Car size={20} /></div>
                AutoShare
              </span>
              <button onClick={closeMenu} className="p-2 hover:bg-gray-100 rounded-full transition"><X size={24} /></button>
            </div>

            <div className="flex flex-col gap-5 font-bold text-lg">
              <Link to="/" className="hover:text-orange-500" onClick={closeMenu}>Home</Link>
              <Link to="/services" className="hover:text-orange-500" onClick={closeMenu}>Services</Link>
              <Link to="/about" className="hover:text-orange-500" onClick={closeMenu}>About</Link>
              <Link to="/contact" className="hover:text-orange-500" onClick={closeMenu}>Contact Us</Link>
            </div>

            <div className="mt-auto border-t border-gray-100 pt-8 flex flex-col gap-4">
              <Link to="/signin" className="w-full text-center py-3 font-bold border border-gray-200 rounded-xl" onClick={closeMenu}>Sign In</Link>
              <Link to="/signup" className="w-full text-center py-3 font-bold bg-orange-500 text-white rounded-xl" onClick={closeMenu}>Sign Up</Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;