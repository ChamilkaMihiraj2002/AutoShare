import { Bell, CalendarClock, CircleAlert, MessageSquare, Undo2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatNotificationTime } from '../../lib/notifications';
import type { AppNotification } from '../../types';

type NotificationsListProps = {
  notifications: AppNotification[];
  readIds: string[];
  emptyMessage: string;
  onNotificationClick?: (notification: AppNotification) => void;
};

function getNotificationIcon(type: AppNotification['type']) {
  switch (type) {
    case 'booking_request':
      return { icon: Bell, className: 'bg-amber-50 text-amber-700' };
    case 'upcoming_booking':
      return { icon: CalendarClock, className: 'bg-blue-50 text-blue-700' };
    case 'booking_cancelled':
      return { icon: Undo2, className: 'bg-red-50 text-red-700' };
    case 'vehicle_handover':
      return { icon: CircleAlert, className: 'bg-orange-50 text-orange-700' };
    case 'message':
      return { icon: MessageSquare, className: 'bg-emerald-50 text-emerald-700' };
    default:
      return { icon: Bell, className: 'bg-gray-50 text-gray-700' };
  }
}

const NotificationsList = ({
  notifications,
  readIds,
  emptyMessage,
  onNotificationClick,
}: NotificationsListProps) => {
  if (notifications.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notifications.map((notification) => {
        const { icon: Icon, className } = getNotificationIcon(notification.type);
        const isRead = readIds.includes(notification.id);

        return (
          <Link
            key={notification.id}
            to={notification.route}
            onClick={() => onNotificationClick?.(notification)}
            className={`flex items-start gap-4 rounded-2xl border px-4 py-4 transition hover:shadow-sm ${
              isRead ? 'border-gray-100 bg-white' : 'border-orange-100 bg-orange-50/40'
            }`}
          >
            <div className={`mt-0.5 rounded-xl p-2.5 ${className}`}>
              <Icon size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-gray-900">{notification.title}</p>
                <div className="flex items-center gap-2">
                  {!isRead && <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />}
                  <span className="shrink-0 text-xs font-medium text-gray-400">
                    {formatNotificationTime(notification.timestamp)}
                  </span>
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-600">{notification.description}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default NotificationsList;
