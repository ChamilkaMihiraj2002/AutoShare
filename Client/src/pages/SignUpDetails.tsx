import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Car, MapPin, Phone, FileText, ArrowLeft } from 'lucide-react';
import { loginSocial, loginWithEmail, registerSocial, registerWithEmail } from '../lib/api';
import { getAuthToken, setAuthToken } from '../lib/auth';
import { signInWithGooglePopup } from '../lib/firebase';

interface SignUpDetailsState {
  role: 'renter' | 'owner';
  provider: 'email' | 'google';
  email?: string;
  password?: string;
}

const SignUpDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as SignUpDetailsState;
  const role = state?.role;
  const provider = state?.provider;
  const email = state?.email;
  const password = state?.password;

  const [formData, setFormData] = useState({
    address: '',
    nic: '',
    phone: '',
    role: role || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.address || formData.address.trim().length < 5) {
      newErrors.address = 'Please enter a valid address';
    }
    if (!formData.nic || formData.nic.trim().length < 5) {
      newErrors.nic = 'Please enter a valid NIC';
    }
    if (!formData.phone || !/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!validateForm() || !role || !provider) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (provider === 'email') {
        if (!email || !password) {
          throw new Error('Email sign-up data missing. Please restart sign up.');
        }
        await registerWithEmail({
          email,
          password,
          address: formData.address,
          nic: formData.nic,
          phone: formData.phone,
          role,
        });

        const auth = await loginWithEmail(email, password);
        if (auth.idToken) {
          setAuthToken(auth.idToken);
        }
      } else {
        let token = getAuthToken();
        if (!token) {
          const googleAuth = await signInWithGooglePopup();
          token = googleAuth.idToken;
          setAuthToken(token);
        }
        if (!token) {
          throw new Error('Google authentication token missing.');
        }
        await registerSocial(
          {
            address: formData.address,
            nic: formData.nic,
            phone: formData.phone,
            role,
          },
          token,
        );
        const profile = await loginSocial(token);
        setAuthToken(token);
        navigate(profile.role === 'owner' ? '/dashboard' : '/user-dashboard');
        return;
      }
      navigate(role === 'owner' ? '/dashboard' : '/user-dashboard');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to complete sign up');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!role || !provider || (provider === 'email' && (!email || !password))) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please complete the sign up steps first</p>
          <Link to="/signup" className="text-orange-500 font-bold hover:underline">Go to sign up</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Left Column: Form */}
      <div className="w-full lg:w-[45%] flex-1 px-6 py-12 md:p-16 lg:p-24 flex flex-col justify-center max-w-2xl mx-auto lg:mx-0">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 mb-12">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="mb-10">
          <div className="flex items-center gap-2 font-bold text-xl mb-8">
            <div className="bg-[#003049] p-2 rounded-xl text-white"><Car size={24} /></div>
            AutoShare
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
          <p className="text-gray-500">
            {role === 'renter'
              ? 'Tell us more about yourself to get started renting'
              : 'Provide your details to start listing vehicles'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Phone */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+94771234567"
                className={`w-full pl-12 pr-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition ${errors.phone ? 'border-red-500' : 'border-gray-200'
                  }`}
              />
            </div>
            {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
          </div>

          {/* NIC */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">NIC / ID Number</label>
            <div className="relative">
              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                name="nic"
                value={formData.nic}
                onChange={handleChange}
                placeholder="123456789V"
                className={`w-full pl-12 pr-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition ${errors.nic ? 'border-red-500' : 'border-gray-200'
                  }`}
              />
            </div>
            {errors.nic && <p className="text-red-500 text-sm">{errors.nic}</p>}
          </div>

          {/* Address */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Address</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="123 Main St"
                className={`w-full pl-12 pr-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition ${errors.address ? 'border-red-500' : 'border-gray-200'
                  }`}
              />
            </div>
            {errors.address && <p className="text-red-500 text-sm">{errors.address}</p>}
          </div>

          {/* Role Display */}
          <div className="p-4 bg-gray-50 rounded-xl">
            {email && (
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-semibold text-gray-700">Email: </span>
                <span className="font-medium text-[#003049]">{email}</span>
              </p>
            )}
            {provider === 'google' && !email && (
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-semibold text-gray-700">Sign-up method: </span>
                <span className="font-medium text-[#003049]">Google</span>
              </p>
            )}
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-700">Selected Role: </span>
              <span className="capitalize font-bold text-[#003049]">{role}</span>
            </p>
          </div>

          {submitError && (
            <p className="text-sm font-medium text-red-600">{submitError}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold hover:bg-orange-600 transition shadow-lg shadow-orange-100 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating Account...' : 'Complete Sign Up'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm font-medium">
          <span className="text-gray-500">Already have an account? </span>
          <Link to="/signin" className="text-[#003049] font-bold hover:underline">Sign In</Link>
        </div>
      </div>

      {/* Right Column: Stats */}
      <div className="hidden lg:flex w-[55%] flex-1 bg-[#001d2d] relative items-center justify-center p-16 min-h-screen">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/5 rounded-full -ml-20 -mb-20 blur-3xl"></div>

        <div className="relative z-10 w-full max-w-lg text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            {role === 'renter' ? 'Ready to Explore?' : 'Ready to Earn?'}
          </h2>
          <p className="text-gray-400 mb-12 text-sm leading-relaxed">
            {role === 'renter'
              ? 'Find the perfect vehicle for your next journey. Browse thousands of options and book instantly.'
              : 'Start earning by sharing your vehicle with our community. Set your own prices and availability.'}
          </p>

          <div className="grid grid-cols-2 gap-6">
            {[
              { label: 'Active Users', value: '50K+' },
              { label: 'Vehicles', value: '10K+' },
              { label: 'Trips', value: '100K+' },
              { label: 'Rating', value: '4.9/5' }
            ].map((stat, i) => (
              <div key={i} className="bg-white/5 border border-white/10 p-8 rounded-2xl backdrop-blur-sm">
                <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpDetails;
