import React from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

const ContactPage = () => {
  return (
    <div className="pt-24 bg-[#fcfcfc] min-h-screen">
      {/* Header */}
      <section className="py-16 px-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
        <p className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed">
          Have questions or need assistance? We're here to help. Reach out to us and we'll get back to you as soon as possible.
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-8 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Contact Details */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 flex items-start gap-4">
              <div className="bg-blue-50 p-3 rounded-xl">
                <Mail className="w-5 h-5 text-blue-900" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Email</h3>
                <p className="text-sm text-gray-500 mt-1">support@autoshare.com</p>
                <p className="text-sm text-gray-500">info@autoshare.com</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 flex items-start gap-4">
              <div className="bg-blue-50 p-3 rounded-xl">
                <Phone className="w-5 h-5 text-blue-900" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Phone</h3>
                <p className="text-sm text-gray-500 mt-1">+1 (555) 123-4567</p>
                <p className="text-sm text-gray-500">Mon-Fri, 9am-6pm EST</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 flex items-start gap-4">
              <div className="bg-blue-50 p-3 rounded-xl">
                <MapPin className="w-5 h-5 text-blue-900" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Office</h3>
                <p className="text-sm text-gray-500 mt-1">123 Innovation Drive</p>
                <p className="text-sm text-gray-500">San Francisco, CA 94105</p>
              </div>
            </div>

            {/* Sidebar CTA */}
            <div className="bg-[#00283d] p-8 rounded-2xl text-white">
              <h3 className="text-lg font-bold mb-3">Need Immediate Help?</h3>
              <p className="text-sm text-gray-400 mb-6">
                Check out our FAQ section or live chat with our support team.
              </p>
              <button className="w-full bg-white text-gray-900 py-3 rounded-xl font-bold text-sm hover:bg-gray-100 transition">
                Visit Help Center
              </button>
            </div>
          </div>

          {/* Right Column: Message Form */}
          <div className="lg:col-span-2 bg-white p-10 rounded-3xl border border-gray-100 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-8">Send us a Message</h2>
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Your Name</label>
                  <input 
                    type="text" 
                    placeholder="John Doe" 
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Email Address</label>
                  <input 
                    type="email" 
                    placeholder="john@example.com" 
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Subject</label>
                <input 
                  type="text" 
                  placeholder="How can we help you?" 
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Message</label>
                <textarea 
                  rows={5}
                  placeholder="Tell us more about your inquiry..." 
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition resize-none"
                ></textarea>
              </div>

              <button className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition shadow-lg shadow-orange-100">
                <Send size={18} />
                Send Message
              </button>
            </form>
          </div>

        </div>
      </section>
    </div>
  );
};

export default ContactPage;