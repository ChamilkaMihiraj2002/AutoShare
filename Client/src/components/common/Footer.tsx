import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin, Car } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-[#0a1622] text-gray-400 py-16 px-8 ">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        <div>
          <div className="flex items-center gap-2 text-white font-bold text-xl mb-6">
            <div className="bg-blue-600 p-1 rounded-md"><Car size={20} /></div>
            AutoShare
          </div>
          <p className="text-sm leading-relaxed">Revolutionizing vehicle rental with AI-powered recommendations and seamless booking.</p>
          <div className="flex gap-4 mt-6">
            <Facebook size={18} className="hover:text-white cursor-pointer" />
            <Twitter size={18} className="hover:text-white cursor-pointer" />
            <Instagram size={18} className="hover:text-white cursor-pointer" />
            <Linkedin size={18} className="hover:text-white cursor-pointer" />
          </div>
        </div>
        <div>
          <h4 className="text-white font-bold mb-6">Quick Links</h4>
          <ul className="space-y-4 text-sm">
            <li><Link to="/" className="hover:text-white">Home</Link></li>
            <li><Link to="/services" className="hover:text-white">Services</Link></li>
            <li><Link to="/about" className="hover:text-white">About Us</Link></li>
            <li><Link to="/contact" className="hover:text-white">Contact Us</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-6">Support</h4>
          <ul className="space-y-4 text-sm">
            <li><Link to="/help-center" className="hover:text-white">Help Center</Link></li>
            <li><Link to="/safety-guidelines" className="hover:text-white">Safety Guidelines</Link></li>
            <li><Link to="/terms" className="hover:text-white">Terms of Service</Link></li>
            <li><Link to="/privacy" className="hover:text-white">Privacy Policy</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-6">Contact Info</h4>
          <ul className="space-y-4 text-sm">
            <li className="flex items-center gap-3"><Mail size={16} /> info@autoshare.com</li>
            <li className="flex items-center gap-3"><Phone size={16} /> +1 (555) 123-4567</li>
            <li className="flex items-center gap-3"><MapPin size={16} /> 123 Innovation Drive, SF</li>
          </ul>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
