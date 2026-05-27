const termsSections = [
  {
    title: 'Platform Use',
    body: 'AutoShare connects vehicle owners and renters. By using the platform, you agree to provide accurate information, keep your account secure, and use the service only for lawful bookings and listings.',
  },
  {
    title: 'Bookings and Cancellations',
    body: 'Trip requests, approvals, pricing, cancellations, and modifications are subject to the booking rules shown during checkout. Additional charges may apply when a trip is extended, returned late, or changed after confirmation.',
  },
  {
    title: 'User Responsibilities',
    body: 'Renters must drive legally, protect the vehicle, and return it in agreed condition. Owners must provide accurate listing details, valid documentation, and a vehicle that is safe and roadworthy for the reserved trip.',
  },
  {
    title: 'Fees and Limitations',
    body: 'AutoShare may charge service fees and may limit, suspend, or remove access where activity creates trust, payment, legal, or safety risk. Continued use of the platform means you accept updated terms when they are published.',
  },
];

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-[#faf8f3] pt-24">
      <section className="mx-auto max-w-4xl px-6 py-16 sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-500">Legal</p>
        <h1 className="mt-3 text-4xl font-bold text-gray-900">Terms of Service</h1>
        <p className="mt-4 text-sm leading-6 text-gray-600">
          These terms describe the core rules for using AutoShare as a renter, owner, or visitor.
        </p>

        <div className="mt-10 space-y-6">
          {termsSections.map((section) => (
            <article key={section.title} className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
              <h2 className="text-xl font-bold text-[#003049]">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-gray-600">{section.body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default TermsOfService;
