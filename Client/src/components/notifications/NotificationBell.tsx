import React from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationsList from './NotificationsList';

type NotificationBellProps = {
  mode: 'owner' | 'renter';
  pageRoute: string;
};

const NotificationBell = ({ mode, pageRoute }: NotificationBellProps) => {
  const [open, setOpen] = React.useState(false);
  const { notifications, loading, error, unreadCount, readIds, markRead, markAllRead } = useNotifications(mode);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Open notifications"
        onClick={() => setOpen((current) => !current)}
        className="relative rounded-full border border-gray-200 bg-white p-2 text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-[120] mt-3 w-[22rem] rounded-3xl border border-gray-100 bg-white p-4 shadow-2xl">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-gray-900">Notifications</p>
              <p className="text-xs text-gray-500">
                {unreadCount > 0 ? `${unreadCount} unread updates` : 'All caught up'}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <button type="button" onClick={markAllRead} className="text-[#003049] hover:text-orange-500">
                Mark all read
              </button>
              <Link to={pageRoute} onClick={() => setOpen(false)} className="text-[#003049] hover:text-orange-500">
                View all
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
              Loading notifications...
            </div>
          ) : error ? (
            <div className="rounded-2xl bg-red-50 px-4 py-8 text-center text-sm text-red-600">{error}</div>
          ) : (
            <NotificationsList
              notifications={notifications.slice(0, 5)}
              readIds={readIds}
              emptyMessage="No notifications yet."
              onNotificationClick={(notification) => {
                markRead(notification.id);
                setOpen(false);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
