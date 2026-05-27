const privacySections = [
  {
    title: 'Information We Collect',
    body: 'We collect account details, booking information, support messages, and other data you provide while using AutoShare. We may also process technical details needed to secure the platform and keep services working.',
  },
  {
    title: 'How We Use Data',
    body: 'Your information helps us manage bookings, verify users, improve support, reduce fraud, and deliver platform features such as notifications and trip coordination.',
  },
  {
    title: 'When Data Is Shared',
    body: 'Relevant trip details may be shared between renters and owners to complete a booking. We may also share limited information with service providers or when required for legal, compliance, or safety reasons.',
  },
  {
    title: 'Your Choices',
    body: 'You can update profile information, review certain stored account details, and contact support about privacy-related questions. Continued platform use remains subject to this policy and future updates.',
  },
];

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-white pt-24">
      <section className="mx-auto max-w-4xl px-6 py-16 sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-500">Legal</p>
        <h1 className="mt-3 text-4xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="mt-4 text-sm leading-6 text-gray-600">
          This page explains the main ways AutoShare handles user information across accounts, bookings, and support interactions.
        </p>

        <div className="mt-10 space-y-6">
          {privacySections.map((section) => (
            <article key={section.title} className="rounded-3xl border border-gray-100 bg-[#fbfbfb] p-8 shadow-sm">
              <h2 className="text-xl font-bold text-[#003049]">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-gray-600">{section.body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicy;
