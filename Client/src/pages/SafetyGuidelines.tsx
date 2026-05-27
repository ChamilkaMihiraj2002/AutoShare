import { AlertTriangle, BadgeCheck, CarFront, Shield } from 'lucide-react';

const guidelines = [
  {
    title: 'Verify Before Every Trip',
    description: 'Confirm the driver, vehicle documents, and pickup details before keys are exchanged.',
    icon: <BadgeCheck className="h-6 w-6 text-[#003049]" />,
  },
  {
    title: 'Inspect the Vehicle',
    description: 'Check fuel level, body condition, tires, lights, and photos at pickup and return.',
    icon: <CarFront className="h-6 w-6 text-[#003049]" />,
  },
  {
    title: 'Drive Responsibly',
    description: 'Follow local traffic laws, avoid distracted driving, and never let unauthorized drivers take over.',
    icon: <Shield className="h-6 w-6 text-[#003049]" />,
  },
  {
    title: 'Report Issues Immediately',
    description: 'If there is damage, a breakdown, or a safety concern, contact support as soon as it is safe to do so.',
    icon: <AlertTriangle className="h-6 w-6 text-[#003049]" />,
  },
];

const SafetyGuidelines = () => {
  return (
    <div className="min-h-screen bg-white pt-24">
      <section className="bg-[#eef4f7] px-6 py-16 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-500">Trust and Safety</p>
          <h1 className="mt-3 text-4xl font-bold text-[#003049]">Safety Guidelines</h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-600">
            These shared expectations help renters and owners protect themselves, their vehicles, and the trip experience.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16 sm:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {guidelines.map((item) => (
            <div key={item.title} className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
              <div className="mb-5 inline-flex rounded-2xl bg-blue-50 p-3">{item.icon}</div>
              <h2 className="text-xl font-bold text-gray-900">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[2rem] bg-[#0f2233] px-8 py-10 text-white">
          <h2 className="text-2xl font-bold">Emergency situations</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            If anyone is in immediate danger, contact local emergency services first. Once everyone is safe, notify AutoShare support with the booking ID and a short incident summary.
          </p>
        </div>
      </section>
    </div>
  );
};

export default SafetyGuidelines;
