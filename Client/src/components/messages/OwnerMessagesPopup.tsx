import React from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
import LoadingScreen from '../common/LoadingScreen';
import { getMyConversations, getMyProfile, getPublicVehicles, getUserPublicProfile, sendConversationMessage } from '../../lib/api';
import { getPrimaryVehicleImage, getProfileDisplayName } from '../../lib/profile';
import type { ConversationApi, UserProfile } from '../../types';

type ConversationDisplay = {
  counterpartName: string;
  vehicleName: string;
  vehicleImage: string;
};

interface OwnerMessagesPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const OwnerMessagesPopup: React.FC<OwnerMessagesPopupProps> = ({ isOpen, onClose }) => {
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [conversations, setConversations] = React.useState<ConversationApi[]>([]);
  const [displayByConversationId, setDisplayByConversationId] = React.useState<Map<string, ConversationDisplay>>(new Map());
  const [selectedConversationId, setSelectedConversationId] = React.useState('');
  const [draft, setDraft] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState('');

  const selectedConversation = conversations.find((conversation) => conversation.conversationid === selectedConversationId) || null;

  const hydrateDisplay = React.useCallback(async (items: ConversationApi[]) => {
    const [vehicles, profileEntries] = await Promise.all([
      getPublicVehicles(),
      Promise.all(
        Array.from(new Set(items.map((conversation) => conversation.renter_uid))).map(async (uid) => {
          try {
            const publicProfile = await getUserPublicProfile(uid);
            return [uid, publicProfile] as const;
          } catch {
            return [uid, null] as const;
          }
        }),
      ),
    ]);

    const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.vehicleid, vehicle] as const));
    const profileByUid = new Map(profileEntries);
    const nextDisplay = new Map<string, ConversationDisplay>();

    items.forEach((conversation) => {
      const counterpartProfile = profileByUid.get(conversation.renter_uid);
      const vehicle = vehicleById.get(conversation.vehicle_id);
      nextDisplay.set(conversation.conversationid, {
        counterpartName: counterpartProfile
          ? getProfileDisplayName(counterpartProfile.full_name, counterpartProfile.email)
          : 'Renter',
        vehicleName: vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Vehicle',
        vehicleImage: getPrimaryVehicleImage(vehicle?.image_urls, vehicle?.image_url),
      });
    });

    setDisplayByConversationId(nextDisplay);
  }, []);

  const loadConversations = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const currentProfile = profile || await getMyProfile();
      if (!profile) {
        setProfile(currentProfile);
      }

      const items = await getMyConversations();
      setConversations(items);
      await hydrateDisplay(items);
      setSelectedConversationId((current) => {
        if (current && items.some((conversation) => conversation.conversationid === current)) {
          return current;
        }
        return items[0]?.conversationid || '';
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [hydrateDisplay, profile]);

  React.useEffect(() => {
    if (!isOpen) return;
    void loadConversations();
  }, [isOpen, loadConversations]);

  React.useEffect(() => {
    if (!isOpen) {
      setDraft('');
      setError('');
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!selectedConversation || !draft.trim()) return;

    setSending(true);
    setError('');
    try {
      const updated = await sendConversationMessage(selectedConversation.conversationid, { text: draft.trim() });
      const nextConversations = conversations.map((conversation) =>
        conversation.conversationid === updated.conversationid ? updated : conversation,
      );
      const reordered = [updated, ...nextConversations.filter((conversation) => conversation.conversationid !== updated.conversationid)];
      setConversations(reordered);
      if (profile) {
        await hydrateDisplay(reordered);
      }
      setSelectedConversationId(updated.conversationid);
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-[120] rounded-2xl border border-gray-200 bg-white shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[calc(100vw-2rem)] sm:max-w-md">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">Messages</h2>
          <p className="text-xs text-gray-500">Chat with renters</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <X size={18} />
        </button>
      </div>

      {loading ? (
        <div className="p-4">
          <LoadingScreen message="Loading messages..." />
        </div>
      ) : (
        <div className="space-y-4 p-3 sm:p-4">
          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="max-h-36 overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50 sm:max-h-40">
            {conversations.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                <MessageSquare className="mx-auto mb-3 text-gray-300" size={24} />
                No renter messages yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {conversations.map((conversation) => {
                  const display = displayByConversationId.get(conversation.conversationid);
                  const isActive = conversation.conversationid === selectedConversationId;
                  return (
                    <button
                      key={conversation.conversationid}
                      onClick={() => setSelectedConversationId(conversation.conversationid)}
                      className={`w-full px-4 py-3 text-left transition ${isActive ? 'bg-orange-50' : 'hover:bg-white'}`}
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={display?.vehicleImage || getPrimaryVehicleImage()}
                          alt={display?.vehicleName || 'Vehicle'}
                          className="h-10 w-10 rounded-xl object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-bold text-gray-900">{display?.counterpartName || 'Renter'}</p>
                            <span className="text-[11px] text-gray-400">
                              {conversation.last_message_at ? new Date(conversation.last_message_at).toLocaleDateString() : ''}
                            </span>
                          </div>
                          <p className="truncate text-xs text-gray-500">{display?.vehicleName || 'Vehicle'}</p>
                          <p className="truncate text-xs text-gray-600 mt-1">{conversation.last_message_preview || 'No messages yet'}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl bg-gray-50 px-4 py-3">
            <p className="font-bold text-gray-900">
              {selectedConversation ? displayByConversationId.get(selectedConversation.conversationid)?.counterpartName || 'Conversation' : 'Select a chat'}
            </p>
            <p className="text-sm text-gray-500">
              {selectedConversation ? displayByConversationId.get(selectedConversation.conversationid)?.vehicleName || 'Vehicle' : 'Choose a renter conversation to reply.'}
            </p>
          </div>

          <div className="h-[220px] overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50 px-3 py-3 space-y-4 sm:h-[260px] sm:px-4 sm:py-4">
            {selectedConversation?.messages.length ? (
              selectedConversation.messages.map((message) => {
                const isMine = message.sender_uid === profile?.uid;
                return (
                  <div key={message.messageid} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                        isMine ? 'bg-[#003049] text-white' : 'bg-white text-gray-800 border border-gray-100'
                      }`}
                    >
                      <p>{message.text}</p>
                      <p className={`mt-2 text-[11px] ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
                        {new Date(message.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex h-full items-center justify-center text-center text-sm text-gray-500">
                {conversations.length === 0 ? 'Your conversations will appear here.' : 'No messages in this conversation yet.'}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={3}
              placeholder="Write your reply..."
              disabled={!selectedConversation}
              className="min-h-[72px] flex-1 rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:bg-gray-50"
            />
            <button
              onClick={() => void handleSend()}
              disabled={sending || !draft.trim() || !selectedConversation}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={16} />
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerMessagesPopup;
