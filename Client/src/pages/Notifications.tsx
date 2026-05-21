import NotificationsList from '../components/notifications/NotificationsList';
import LoadingScreen from '../components/common/LoadingScreen';
import { useNotifications } from '../hooks/useNotifications';

type NotificationsPageProps = {
  mode: 'owner' | 'renter';
};

const NotificationsPage = ({ mode }: NotificationsPageProps) => {
  const { notifications, loading, error, readIds, markRead, markAllRead } = useNotifications(mode);

  if (loading) {
    return <LoadingScreen message="Loading notifications..." />;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-3xl border border-gray-100 bg-white p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#003049]">Notifications</h2>
          <p className="mt-1 text-sm text-gray-500">
            Booking requests, upcoming trips, cancellations, handovers, and message alerts.
          </p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-[#003049] transition hover:border-orange-200 hover:text-orange-500"
        >
          Mark all as read
        </button>
      </div>

      <NotificationsList
        notifications={notifications}
        readIds={readIds}
        emptyMessage="No notifications yet."
        onNotificationClick={(notification) => markRead(notification.id)}
      />
    </div>
  );
};

export default NotificationsPage;
