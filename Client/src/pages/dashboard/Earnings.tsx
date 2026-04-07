import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

import { useOwnerEarnings } from '../../hooks/useOwnerEarnings';
import { formatLkr } from '../../lib/currency';
import { formatOwnerEarningsChange, getOwnerEarningsChangeTone, getOwnerTransactionStatusMeta } from '../../lib/ownerEarnings';

const Earnings = () => {
    const { earnings, isLoading, error } = useOwnerEarnings();

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-sm text-gray-500">
                Loading earnings...
            </div>
        );
    }

    if (error || !earnings) {
        return (
            <div className="bg-white rounded-2xl border border-red-100 p-6 text-sm text-red-600">
                {error || 'Unable to load earnings right now.'}
            </div>
        );
    }

    const changePercentage = earnings.summary.change_percentage;
    const changeToneClass = getOwnerEarningsChangeTone(changePercentage);
    const ChangeIcon = changePercentage > 0 ? ArrowUpRight : changePercentage < 0 ? ArrowDownRight : Minus;

    return (
        <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* This Month */}
                <div className="bg-[#003049] rounded-2xl p-6 text-white shadow-lg">
                    <h3 className="text-gray-300 font-medium mb-1">This Month</h3>
                    <p className="text-3xl font-bold mb-4">{formatLkr(earnings.summary.this_month.amount)}</p>
                    <div className={`flex items-center text-sm font-bold ${changeToneClass}`}>
                        <ChangeIcon size={16} className="mr-1" />
                        {formatOwnerEarningsChange(changePercentage)}
                    </div>
                </div>

                {/* Last Month */}
                <div className="bg-orange-500 rounded-2xl p-6 text-white shadow-lg">
                    <h3 className="text-white/80 font-medium mb-1">Last Month</h3>
                    <p className="text-3xl font-bold mb-4">{formatLkr(earnings.summary.last_month.amount)}</p>
                    <div className="flex items-center text-sm text-white/90 font-medium">
                        {earnings.summary.last_month.bookings} bookings
                    </div>
                </div>

                {/* All Time */}
                <div className="bg-green-500 rounded-2xl p-6 text-white shadow-lg">
                    <h3 className="text-white/80 font-medium mb-1">All Time</h3>
                    <p className="text-3xl font-bold mb-4">{formatLkr(earnings.summary.all_time.amount)}</p>
                    <div className="flex items-center text-sm text-white/90 font-medium">
                        {earnings.summary.all_time.bookings} bookings
                    </div>
                </div>
            </div>

            {/* Recent Transactions */}
            <div>
                <h2 className="text-lg font-bold text-[#003049] mb-4">Recent Transactions</h2>
                {earnings.transactions.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 text-sm text-gray-500">
                        No earnings transactions yet.
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                        {earnings.transactions.map((transaction) => {
                            const statusMeta = getOwnerTransactionStatusMeta(transaction.booking_status);

                            return (
                                <div key={transaction.rent_id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition">
                                    <div>
                                        <h3 className="font-bold text-gray-900">{transaction.vehicle_name}</h3>
                                        <p className="text-sm text-gray-500">
                                            {new Date(transaction.start_date).toLocaleDateString()} - {new Date(transaction.end_date).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${statusMeta.className}`}>{statusMeta.label}</p>
                                        <p className="font-bold text-green-600 text-lg">+{formatLkr(transaction.amount)}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Earnings;
