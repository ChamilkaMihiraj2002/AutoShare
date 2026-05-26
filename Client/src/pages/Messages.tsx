import React from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { MessageSquare, Send } from 'lucide-react';
import LoadingScreen from '../components/common/LoadingScreen';
import { createConversation, getMyConversations, getMyProfile, getPublicVehicles, getUserPublicProfile, sendConversationMessage } from '../lib/api';
import { getPrimaryVehicleImage, getProfileDisplayName } from '../lib/profile';
import type { ConversationApi, UserProfile } from '../types';

type ConversationDisplay = {
  counterpartName: string;
  vehicleName: string;
  vehicleImage: string;
};

const Messages: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [conversations, setConversations] = React.useState<ConversationApi[]>([]);
  const [displayByConversationId, setDisplayByConversationId] = React.useState<Map<string, ConversationDisplay>>(new Map());
  const [selectedConversationId, setSelectedConversationId] = React.useState('');
  const [draft, setDraft] = React.useState('');
  const [newConversationDraft, setNewConversationDraft] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  const selectedConversation = conversations.find((conversation) => conversation.conversationid === selectedConversationId) || null;

  const hydrateDisplay = React.useCallback(async (items: ConversationApi[], currentProfile: UserProfile) => {
    const [vehicles, profileEntries] = await Promise.all([
      getPublicVehicles(),
      Promise.all(
        Array.from(
          new Set(
            items.flatMap((conversation) => [conversation.owner_uid, conversation.renter_uid]).filter((uid) => uid !== currentProfile.uid),
          ),
        ).map(async (uid) => {
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
      const counterpartUid = conversation.owner_uid === currentProfile.uid ? conversation.renter_uid : conversation.owner_uid;
      const counterpartProfile = profileByUid.get(counterpartUid);
      const vehicle = vehicleById.get(conversation.vehicle_id);
      nextDisplay.set(conversation.conversationid, {
        counterpartName: counterpartProfile
          ? getProfileDisplayName(counterpartProfile.full_name, counterpartProfile.email)
          : 'User',
        vehicleName: vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Vehicle',
        vehicleImage: getPrimaryVehicleImage(vehicle?.image_urls, vehicle?.image_url),
      });
    });

    setDisplayByConversationId(nextDisplay);
  }, []);

  const loadConversations = React.useCallback(async (preferredConversationId?: string) => {
    setLoading(true);
    setError('');
    try {
      const currentProfile = profile || await getMyProfile();
      if (!profile) {
        setProfile(currentProfile);
      }

      const initialVehicleId = searchParams.get('vehicleId');
      const initialOwnerUid = searchParams.get('ownerUid');
      let initialConversation: ConversationApi | null = null;

      if (initialVehicleId && initialOwnerUid) {
        initialConversation = await createConversation({
          vehicle_id: initialVehicleId,
          owner_uid: initialOwnerUid,
        });
      }

      const items = await getMyConversations();
      setConversations(items);
      await hydrateDisplay(items, currentProfile);

      const nextSelectedId =
        preferredConversationId ||
        searchParams.get('conversation') ||
        initialConversation?.conversationid ||
        items[0]?.conversationid ||
        '';
      setSelectedConversationId(nextSelectedId);

      if (initialConversation && location.search.includes('vehicleId=')) {
        navigate(`${location.pathname}?conversation=${initialConversation.conversationid}`, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [hydrateDisplay, location.pathname, location.search, navigate, profile, searchParams]);

  React.useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    navigate(`${location.pathname}?conversation=${conversationId}`, { replace: true });
  };

  const handleStartConversation = async () => {
    const vehicleId = searchParams.get('vehicleId');
    const ownerUid = searchParams.get('ownerUid');
    if (!vehicleId || !ownerUid) {
      setError('Vehicle information is missing for this conversation.');
      return;
    }
    if (!newConversationDraft.trim()) {
      setError('Write a message before starting the chat.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const conversation = await createConversation({
        vehicle_id: vehicleId,
        owner_uid: ownerUid,
        initial_message: newConversationDraft.trim(),
      });
      setNewConversationDraft('');
      await loadConversations(conversation.conversationid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start conversation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedConversationId || !draft.trim()) return;

    setSubmitting(true);
    setError('');
    try {
      const updated = await sendConversationMessage(selectedConversationId, { text: draft.trim() });
      const nextConversations = conversations.map((conversation) =>
        conversation.conversationid === updated.conversationid ? updated : conversation,
      );
      const reordered = [updated, ...nextConversations.filter((conversation) => conversation.conversationid !== updated.conversationid)];
      setConversations(reordered);
      if (profile) {
        await hydrateDisplay(reordered, profile);
      }
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading messages..." />;
  }

  if (error && conversations.length === 0 && !searchParams.get('vehicleId')) {
    return <div className="text-red-600">{error}</div>;
  }

  const pendingVehicleId = searchParams.get('vehicleId');
  const pendingOwnerUid = searchParams.get('ownerUid');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#003049]">Messages</h2>
          <p className="text-sm text-gray-500 mt-1">Chat with vehicle owners and renters inside AutoShare.</p>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>

      {pendingVehicleId && pendingOwnerUid && !selectedConversation ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Start a conversation</h3>
          <textarea
            value={newConversationDraft}
            onChange={(event) => setNewConversationDraft(event.target.value)}
            rows={4}
            placeholder="Ask about availability, pickup, or anything else."
            className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleStartConversation}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={16} />
              Send first message
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4">
            <h3 className="font-bold text-gray-900">Conversations</h3>
          </div>
          {conversations.length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-500">
              <MessageSquare className="mx-auto mb-3 text-gray-300" size={28} />
              No conversations yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {conversations.map((conversation) => {
                const display = displayByConversationId.get(conversation.conversationid);
                const isActive = conversation.conversationid === selectedConversationId;
                return (
                  <button
                    key={conversation.conversationid}
                    onClick={() => handleSelectConversation(conversation.conversationid)}
                    className={`w-full px-5 py-4 text-left transition ${isActive ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={display?.vehicleImage || getPrimaryVehicleImage()}
                        alt={display?.vehicleName || 'Vehicle'}
                        className="h-12 w-12 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-bold text-gray-900">{display?.counterpartName || 'User'}</p>
                          <span className="shrink-0 text-xs text-gray-400">
                            {conversation.last_message_at ? new Date(conversation.last_message_at).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <p className="truncate text-sm text-gray-500">{display?.vehicleName || 'Vehicle'}</p>
                        <p className="truncate text-sm text-gray-600 mt-1">
                          {conversation.last_message_preview || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm flex min-h-[520px] flex-col">
          {selectedConversation ? (
            <>
              <div className="border-b border-gray-100 px-6 py-4">
                <p className="font-bold text-gray-900">
                  {displayByConversationId.get(selectedConversation.conversationid)?.counterpartName || 'Conversation'}
                </p>
                <p className="text-sm text-gray-500">
                  {displayByConversationId.get(selectedConversation.conversationid)?.vehicleName || 'Vehicle'}
                </p>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5 bg-gray-50">
                {selectedConversation.messages.length === 0 ? (
                  <div className="text-center text-sm text-gray-500 pt-12">No messages yet.</div>
                ) : (
                  selectedConversation.messages.map((message) => {
                    const isMine = message.sender_uid === profile?.uid;
                    return (
                      <div key={message.messageid} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
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
                )}
              </div>

              <div className="border-t border-gray-100 p-4">
                <div className="flex items-end gap-3">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    rows={2}
                    placeholder="Write a message..."
                    className="min-h-[56px] flex-1 rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={submitting || !draft.trim()}
                    className="inline-flex h-12 items-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Send size={16} />
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-gray-500">
              <MessageSquare className="mb-4 text-gray-300" size={32} />
              <p className="font-medium">Choose a conversation to start chatting.</p>
              <p className="text-sm mt-2">
                <Link to="/vehicles" className="text-orange-500 hover:text-orange-600">Browse vehicles</Link> to message an owner.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Messages;
