import { ArrowUpRight } from 'lucide-react';
import { earningsData } from '../../data/mockData';

const Earnings = () => {
    return (
        <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* This Month */}
                <div className="bg-[#003049] rounded-2xl p-6 text-white shadow-lg">
                    <h3 className="text-gray-300 font-medium mb-1">This Month</h3>
                    <p className="text-3xl font-bold mb-4">{earningsData.summary.thisMonth.value}</p>
                    <div className="flex items-center text-sm text-green-400 font-bold">
                        <ArrowUpRight size={16} className="mr-1" />
                        {earningsData.summary.thisMonth.change}
                    </div>
                </div>

                {/* Last Month */}
                <div className="bg-orange-500 rounded-2xl p-6 text-white shadow-lg">
                    <h3 className="text-white/80 font-medium mb-1">Last Month</h3>
                    <p className="text-3xl font-bold mb-4">{earningsData.summary.lastMonth.value}</p>
                    <div className="flex items-center text-sm text-white/90 font-medium">
                        {earningsData.summary.lastMonth.bookings} bookings
                    </div>
                </div>

                {/* All Time */}
                <div className="bg-green-500 rounded-2xl p-6 text-white shadow-lg">
                    <h3 className="text-white/80 font-medium mb-1">All Time</h3>
                    <p className="text-3xl font-bold mb-4">{earningsData.summary.allTime.value}</p>
                    <div className="flex items-center text-sm text-white/90 font-medium">
                        {earningsData.summary.allTime.bookings} bookings
                    </div>
                </div>
            </div>

            {/* Recent Transactions */}
            <div>
                <h2 className="text-lg font-bold text-[#003049] mb-4">Recent Transactions</h2>
                <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                    {earningsData.transactions.map((transaction) => (
                        <div key={transaction.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition">
                            <div>
                                <h3 className="font-bold text-gray-900">{transaction.car}</h3>
                                <p className="text-sm text-gray-500">{transaction.user} • {transaction.date}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{transaction.status}</p>
                                <p className="font-bold text-green-600 text-lg">{transaction.amount}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Earnings;
