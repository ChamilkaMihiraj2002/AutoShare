
import { Car, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="absolute top-0 w-full z-50 flex items-center justify-between px-8 py-4 bg-white text-black">
      <div className="flex items-center gap-2 font-bold text-xl">
        <div className="bg-blue-500 p-1 rounded-md"><Car size={30} /></div>
        AutoShare
      </div>
      {/* Desktop Menu */}
      <div className="hidden md:flex gap-8 text-sm font-medium">
        <Link to="/" className="hover:text-orange-400">Home</Link>
        <Link to="/services" className="hover:text-orange-400">Services</Link>
        <Link to="/about" className="hover:text-orange-400">About</Link>
        <Link to="/contact" className="hover:text-orange-400">Contact Us</Link>
      </div>
      {/* Mobile Hamburger Icon */}
      <div className="md:hidden flex items-center">
        <button
          aria-label="Open menu"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="focus:outline-none"
        >
          {menuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>
      {/* Desktop Auth Buttons */}
      <div className="hidden md:flex items-center gap-4">
        <button className="text-sm font-semibold">Sign In</button>
        <button className="bg-orange-500 px-5 py-2 rounded-lg text-sm font-bold hover:bg-orange-600 transition text-white">Sign Up</button>
      </div>
      {/* Mobile Menu */}
      {menuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex justify-end md:hidden">
          <div className="w-2/3 max-w-xs bg-white h-full shadow-lg flex flex-col p-6 gap-6 animate-slide-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-bold text-xl">
                <div className="bg-blue-500 p-1 rounded-md"><Car size={30} /></div>
                AutoShare
              </div>
              <button aria-label="Close menu" onClick={() => setMenuOpen(false)} className="focus:outline-none">
                <X size={28} />
              </button>
            </div>
            <Link to="/" className="hover:text-orange-400 py-2" onClick={() => setMenuOpen(false)}>Home</Link>
            <Link to="/services" className="hover:text-orange-400 py-2" onClick={() => setMenuOpen(false)}>Services</Link>
            <Link to="/about" className="hover:text-orange-400 py-2" onClick={() => setMenuOpen(false)}>About</Link>
            <Link to="/contact" className="hover:text-orange-400 py-2" onClick={() => setMenuOpen(false)}>Contact Us</Link>
            <div className="flex flex-col gap-3 mt-6">
              <button className="text-sm font-semibold w-full text-left">Sign In</button>
              <button className="bg-orange-500 px-5 py-2 rounded-lg text-sm font-bold hover:bg-orange-600 transition text-white w-full text-left">Sign Up</button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;