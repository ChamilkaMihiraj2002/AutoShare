import { BookOpen, CircleHelp, LifeBuoy, MessageSquareWarning } from 'lucide-react';
import { Link } from 'react-router-dom';

const helpTopics = [
  {
    title: 'Booking and Payments',
    description: 'Learn how trip requests, live pricing, payment capture, and refunds work from start to finish.',
    icon: <BookOpen className="h-6 w-6 text-[#003049]" />,
  },
  {
    title: 'Account and Verification',
    description: 'Find steps for profile setup, identity checks, owner verification, and account access issues.',
    icon: <CircleHelp className="h-6 w-6 text-[#003049]" />,
  },
  {
    title: 'Trip Support',
    description: 'Get guidance for date changes, cancellations, pickup coordination, and in-trip communication.',
    icon: <LifeBuoy className="h-6 w-6 text-[#003049]" />,
  },
  {
    title: 'Safety and Reporting',
    description: 'Understand what to do if a vehicle issue, policy concern, or unexpected incident comes up.',
    icon: <MessageSquareWarning className="h-6 w-6 text-[#003049]" />,
  },
];

const HelpCenter = () => {
  return (
    <div className="min-h-screen bg-[#f7f7f2] pt-24">
      <section className="px-6 py-16 sm:px-8">
        <div className="mx-auto max-w-6xl rounded-[2rem] bg-[#0f2233] px-8 py-14 text-white shadow-xl sm:px-12">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-300">Support</p>
          <h1 className="mt-3 text-4xl font-bold">Help Center</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
            Quick answers for renters and owners, plus clear next steps when something needs human support.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20 sm:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {helpTopics.map((topic) => (
            <div key={topic.title} className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
              <div className="mb-5 inline-flex rounded-2xl bg-orange-50 p-3">{topic.icon}</div>
              <h2 className="text-xl font-bold text-gray-900">{topic.title}</h2>
              <p className="mt-3 text-sm leading-6 text-gray-600">{topic.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[2rem] border border-orange-100 bg-orange-50 px-8 py-10">
          <h2 className="text-2xl font-bold text-[#003049]">Still need help?</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-700">
            If your question is time-sensitive or related to an active trip, contact our team and include your booking ID for faster support.
          </p>
          <Link
            to="/contact"
            className="mt-6 inline-flex rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600"
          >
            Contact Support
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HelpCenter;
