import React from 'react';
import { Bot, LoaderCircle, Send, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { chatVehicleAssistant } from '../../lib/api';
import { formatLkr } from '../../lib/currency';
import { resolveBackendAssetUrl } from '../../lib/profile';
import type { AssistantChatTurn, AssistantVehicleRecommendation } from '../../types';

type AssistantMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendations?: AssistantVehicleRecommendation[];
  meta?: string;
};

const INITIAL_MESSAGE =
  'Tell me what kind of vehicle you need, and I will suggest the best available options.';

const FALLBACK_VEHICLE_IMAGE =
  'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=400&q=80';

const AIAssistantPopup: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState('');
  const [messages, setMessages] = React.useState<AssistantMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: INITIAL_MESSAGE,
    },
  ]);

  const handleSend = async () => {
    const message = draft.trim();
    if (!message || sending) {
      return;
    }

    const nextUserMessage: AssistantMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
    };

    const history: AssistantChatTurn[] = messages.map((item) => ({
      role: item.role,
      content: item.content,
    }));

    setMessages((current) => [...current, nextUserMessage]);
    setDraft('');
    setSending(true);
    setError('');

    try {
      const response = await chatVehicleAssistant({
        message,
        history,
      });

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.reply,
          recommendations: response.recommendations,
          meta:
            response.source === 'ollama'
              ? `Powered by ${response.model ?? 'Ollama'}`
              : response.warning || 'Ollama unavailable, using local recommendation mode',
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get assistant response');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {isOpen ? (
        <div className="fixed bottom-6 right-6 z-[150] w-[calc(100vw-2rem)] max-w-lg overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
          <div className="bg-[linear-gradient(135deg,#003049_0%,#1d4d6d_100%)] px-5 py-4 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI Vehicle Assistant
                </div>
                <h2 className="mt-3 text-lg font-bold">Find the best available vehicle</h2>
                <p className="mt-1 text-sm text-white/75">
                  Ask for budget cars, SUVs, 7-seaters, Colombo pickups, or anything similar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
                aria-label="Close AI assistant"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="space-y-4 bg-slate-50 p-4">
            <div className="h-[380px] space-y-4 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4">
              {messages.map((message) => {
                const isUser = message.role === 'user';
                return (
                  <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex max-w-[88%] flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`rounded-3xl px-4 py-3 text-sm shadow-sm ${
                          isUser
                            ? 'bg-orange-500 text-white'
                            : 'border border-slate-200 bg-slate-50 text-slate-800'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>

                      {message.recommendations?.length ? (
                        <div className="grid gap-3">
                          {message.recommendations.map((vehicle, index) => (
                            <Link
                              key={vehicle.vehicle_id}
                              to={`/vehicles/${vehicle.vehicle_id}`}
                              className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-orange-300 hover:shadow-sm"
                            >
                              <img
                                src={resolveBackendAssetUrl(vehicle.image_url, FALLBACK_VEHICLE_IMAGE)}
                                alt={vehicle.name}
                                className="h-20 w-24 rounded-xl object-cover"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-700">
                                    #{index + 1}
                                  </span>
                                  <p className="truncate font-semibold text-slate-900">{vehicle.name}</p>
                                  {vehicle.verified ? (
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                                      Verified
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-1 text-xs text-slate-500">
                                  {vehicle.location} • {vehicle.seats} seats • {vehicle.transmission}
                                </p>
                                <p className="mt-1 text-sm font-semibold text-orange-600">
                                  {formatLkr(vehicle.price_per_day)}/day
                                </p>
                                <p className="mt-1 text-xs text-slate-600">{vehicle.reason}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ) : null}

                      {message.meta ? <p className="text-[11px] text-slate-400">{message.meta}</p> : null}
                    </div>
                  </div>
                );
              })}

              {sending ? (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Looking through available vehicles...
                  </div>
                </div>
              ) : null}
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <div className="flex items-end gap-3 rounded-[24px] border border-slate-200 bg-white p-3">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                rows={3}
                placeholder="Example: I need the best SUV in Colombo for 5 people"
                className="min-h-[78px] flex-1 resize-none rounded-2xl bg-slate-50 px-4 py-3 text-sm outline-none ring-0"
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={sending || !draft.trim()}
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                Send
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[140] inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#003049] text-white shadow-[0_18px_48px_rgba(0,48,73,0.28)] transition hover:scale-[1.02] hover:bg-[#00263a]"
        aria-label="Open AI vehicle assistant"
      >
        {sending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Bot className="h-5 w-5" />}
      </button>
    </>
  );
};

export default AIAssistantPopup;
