import React from 'react';
import { Send } from 'lucide-react';
import { X } from 'lucide-react';
import LoadingScreen from '../common/LoadingScreen';
import { createConversation, sendConversationMessage } from '../../lib/api';
import type { ConversationApi } from '../../types';

interface MessagePopupProps {
  isOpen: boolean;
  onClose: () => void;
  ownerUid: string;
  ownerName: string;
  vehicleId: string;
  vehicleName: string;
  currentUserUid: string;
}

const MessagePopup: React.FC<MessagePopupProps> = ({
  isOpen,
  onClose,
  ownerUid,
  ownerName,
  vehicleId,
  vehicleName,
  currentUserUid,
}) => {
  const [conversation, setConversation] = React.useState<ConversationApi | null>(null);
  const [draft, setDraft] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!isOpen || !ownerUid || !vehicleId) {
      return;
    }

    const loadConversation = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await createConversation({
          vehicle_id: vehicleId,
          owner_uid: ownerUid,
        });
        setConversation(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to open chat');
      } finally {
        setLoading(false);
      }
    };

    void loadConversation();
  }, [isOpen, ownerUid, vehicleId]);

  React.useEffect(() => {
    if (!isOpen) {
      setDraft('');
      setError('');
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!conversation || !draft.trim()) return;

    setSending(true);
    setError('');
    try {
      const updated = await sendConversationMessage(conversation.conversationid, {
        text: draft.trim(),
      });
      setConversation(updated);
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
    <div className="fixed bottom-6 right-6 z-[120] w-[calc(100vw-2rem)] max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold text-gray-900">{ownerName}</h2>
          <p className="truncate text-xs text-gray-500">{vehicleName}</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-4 p-4">
        <div className="rounded-xl bg-gray-50 px-4 py-3">
          <p className="font-bold text-gray-900">{vehicleName}</p>
          <p className="text-sm text-gray-500">Chat directly with the owner about availability, pickup, and booking details.</p>
        </div>

        {loading ? (
          <LoadingScreen message="Opening chat..." />
        ) : (
          <>
            <div className="h-[320px] overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 space-y-4">
              {conversation?.messages.length ? (
                conversation.messages.map((message) => {
                  const isMine = message.sender_uid === currentUserUid;
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
                  No messages yet. Start the conversation with the owner.
                </div>
              )}
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <div className="flex items-end gap-3">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={3}
                placeholder="Write your message..."
                className="min-h-[72px] flex-1 rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                onClick={() => void handleSend()}
                disabled={sending || !draft.trim()}
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send size={16} />
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MessagePopup;
