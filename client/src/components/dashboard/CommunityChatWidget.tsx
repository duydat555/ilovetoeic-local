import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  CornerUpLeft,
  Loader2,
  MessageCircle,
  SendHorizontal,
  Smile,
  Trash2,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  ChatMessage,
  communityChatService,
  getCommunityChatWebSocketUrl,
  MessageReaction,
} from '../../services/communityChat';

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '👏', '💡', '😂'];

export const CommunityChatWidget: React.FC = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const reduceMotion = useReducedMotion();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [activeEmojiPickerMsgId, setActiveEmojiPickerMsgId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const scrollToBottom = (smooth = false) => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      if (smooth && !reduceMotion) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth',
        });
      } else {
        container.scrollTop = container.scrollHeight;
      }
    }
  };

  const loadInitialMessages = async () => {
    try {
      setIsLoading(true);
      const data = await communityChatService.getMessages(50);
      setMessages(data);
      setErrorMsg(null);
    } catch (err) {
      console.warn('Lỗi tải lịch sử tin nhắn:', err);
      setErrorMsg(language === 'en' ? 'Unable to connect to community chat.' : 'Không thể kết nối trò chuyện cộng đồng.');
    } finally {
      setIsLoading(false);
    }
  };

  const connectWebSocket = () => {
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const wsUrl = getCommunityChatWebSocketUrl();
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsWsConnected(true);
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'new_message' && payload.data) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.data.id)) return prev;
              return [...prev, payload.data];
            });
            setTimeout(() => scrollToBottom(true), 50);
          } else if (payload.type === 'reaction_update' && payload.messageId) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === payload.messageId
                  ? { ...msg, reactions: payload.reactions }
                  : msg,
              ),
            );
          } else if (payload.type === 'delete_message' && payload.messageId) {
            setMessages((prev) => prev.filter((m) => m.id !== payload.messageId));
          }
        } catch (e) {
          console.warn('Lỗi nhận dữ liệu WebSocket:', e);
        }
      };

      ws.onclose = () => {
        setIsWsConnected(false);
        socketRef.current = null;
        reconnectTimerRef.current = setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = () => {
        setIsWsConnected(false);
        try {
          ws.close();
        } catch {
          // ignore
        }
      };
    } catch (e) {
      console.warn('Không thể khởi tạo WebSocket:', e);
      setIsWsConnected(false);
      reconnectTimerRef.current = setTimeout(connectWebSocket, 5000);
    }
  };

  useEffect(() => {
    void loadInitialMessages();
    connectWebSocket();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, []);

  // Polling fallback when WebSocket is unavailable on VPS
  useEffect(() => {
    if (isWsConnected) return;

    const intervalId = setInterval(async () => {
      try {
        const latest = await communityChatService.getMessages(50);
        setMessages(latest);
      } catch {
        // ignore background fetch error
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [isWsConnected]);

  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      scrollToBottom(false);
    }
  }, [isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || isSending) return;

    try {
      setIsSending(true);
      const replyId = replyToMessage ? replyToMessage.id : undefined;
      setInputText('');
      setReplyToMessage(null);

      const newMsg = await communityChatService.sendMessage(text, replyId);
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setTimeout(() => scrollToBottom(true), 50);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gửi tin nhắn thất bại. Vui lòng thử lại.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    setActiveEmojiPickerMsgId(null);
    try {
      // Optimistic update
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          const currentReactions = msg.reactions || [];
          const existing = currentReactions.find((r) => r.emoji === emoji);

          let updated: MessageReaction[];
          if (existing) {
            if (existing.count <= 1) {
              updated = currentReactions.filter((r) => r.emoji !== emoji);
            } else {
              updated = currentReactions.map((r) =>
                r.emoji === emoji
                  ? { ...r, count: r.count - (r.userReacted ? 1 : -1), userReacted: !r.userReacted }
                  : r,
              );
            }
          } else {
            updated = [...currentReactions, { emoji, count: 1, userReacted: true }];
          }
          return { ...msg, reactions: updated };
        }),
      );

      const updatedReactions = await communityChatService.toggleReaction(messageId, emoji);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions: updatedReactions } : m)),
      );
    } catch (err) {
      console.warn('Lỗi thả cảm xúc:', err);
    }
  };

  const handleDelete = async (msgId: string) => {
    if (!window.confirm(language === 'en' ? 'Do you want to delete this message?' : 'Bạn muốn xoá tin nhắn này?')) return;
    try {
      await communityChatService.deleteMessage(msgId);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch (err: any) {
      alert(err?.message || (language === 'en' ? 'Failed to delete message.' : 'Xoá tin nhắn thất bại.'));
    }
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString(language === 'en' ? 'en-US' : 'vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <article className="overflow-hidden rounded-3xl border border-amber-500/20 bg-surface shadow-[0_12px_40px_-20px_rgba(245,158,11,0.12)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-400/20 via-yellow-500/15 to-amber-600/10 shadow-sm">
            <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 text-slate-950 shadow-xs">
              <Users className="size-4 stroke-[2.2]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black tracking-tight text-content">
                {language === 'en' ? 'Community Chat' : 'Trò chuyện Cộng đồng'}
              </h2>
              {isWsConnected ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Wifi className="size-3 text-emerald-500 animate-pulse" />
                  Live Socket
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 dark:text-amber-300 border border-amber-500/20">
                  <WifiOff className="size-3 text-amber-500" />
                  {language === 'en' ? 'Reconnecting...' : 'Đang kết nối lại...'}
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-content-muted">
              {language === 'en'
                ? 'Real-time WebSocket chat with the TOEIC learner community'
                : 'Kết nối WebSocket thời gian thực cùng cộng đồng học TOEIC'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Stream */}
      <div ref={chatContainerRef} className="relative h-[340px] overflow-y-auto p-4 sm:p-5 space-y-4">
        {isLoading ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-content-muted">
            <Loader2 className="size-5 animate-spin text-amber-500" />
            <span className="text-xs font-semibold">
              {language === 'en' ? 'Loading chat room...' : 'Đang tải phòng chat...'}
            </span>
          </div>
        ) : errorMsg ? (
          <div className="flex h-full items-center justify-center text-center text-xs font-semibold text-rose-500">
            {errorMsg}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-xs font-medium text-content-muted">
            <MessageCircle className="size-8 text-amber-500/40" />
            <span className="mt-2 font-bold text-content">
              {language === 'en' ? 'No messages in the chat room yet.' : 'Chưa có tin nhắn nào trong phòng chat.'}
            </span>
            <span className="mt-0.5 text-[11px]">
              {language === 'en' ? 'Be the first to send a message!' : 'Hãy là người đầu tiên gửi tin nhắn!'}
            </span>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = user?.id === msg.userId;
            const isAdmin = msg.userRole === 'admin';
            const showEmojiPicker = activeEmojiPickerMsgId === msg.id;

            return (
              <motion.div
                key={msg.id}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`group relative flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <img
                  src={msg.userAvatar}
                  alt={msg.userName}
                  className="size-8 rounded-full border border-line object-cover shrink-0 mt-0.5"
                />
                <div className={`max-w-[80%] sm:max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                  {/* Sender Name & Role */}
                  <div className={`flex items-center gap-1.5 text-[11px] mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <span className="font-bold text-content">{msg.userName}</span>
                    {isAdmin ? (
                      <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.2 text-[9px] font-black text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {language === 'en' ? 'Instructor' : 'Giảng viên'}
                      </span>
                    ) : (
                      <span className="rounded-md bg-amber-500/10 px-1.5 py-0.2 text-[9px] font-black text-amber-700 dark:text-amber-300 border border-amber-500/20">
                        {language === 'en' ? 'Student' : 'Học viên'}
                      </span>
                    )}
                    <span className="text-[10px] text-content-muted">{formatTime(msg.createdAt)}</span>
                  </div>

                  {/* Bubble Content */}
                  <div
                    className={`relative rounded-2xl px-4 py-2.5 text-xs font-medium leading-relaxed ${isMe
                        ? 'bg-amber-500/15 border border-amber-500/30 text-content dark:bg-amber-950/40 dark:text-amber-100 rounded-tr-xs'
                        : 'bg-surface-elevated border border-line text-content rounded-tl-xs'
                      }`}
                  >
                    {/* Parent Reply Quote Preview */}
                    {msg.replyTo && (
                      <div className="mb-2 rounded-lg border-l-2 border-amber-500 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-content-muted">
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          @{msg.replyTo.userName}
                        </span>
                        : <span className="italic line-clamp-1">{msg.replyTo.content}</span>
                      </div>
                    )}

                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                    {/* Action Bar (Reply, Reaction, Delete) */}
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-xl border border-line bg-surface/95 backdrop-blur-md px-1.5 py-1 shadow-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity ${isMe ? 'right-full mr-1.5' : 'left-full ml-1.5'
                        }`}
                    >
                      {/* React Button */}
                      <button
                        type="button"
                        onClick={() =>
                          setActiveEmojiPickerMsgId(showEmojiPicker ? null : msg.id)
                        }
                        title={language === 'en' ? 'React' : 'Thả cảm xúc'}
                        className="rounded-lg p-1 text-content-muted hover:bg-surface-hover hover:text-amber-500"
                      >
                        <Smile className="size-3.5" />
                      </button>

                      {/* Reply Button */}
                      <button
                        type="button"
                        onClick={() => setReplyToMessage(msg)}
                        title={language === 'en' ? 'Reply' : 'Trả lời tin nhắn'}
                        className="rounded-lg p-1 text-content-muted hover:bg-surface-hover hover:text-sky-500"
                      >
                        <CornerUpLeft className="size-3.5" />
                      </button>

                      {/* Delete Button */}
                      {(isMe || user?.role === 'admin') && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(msg.id)}
                          title={language === 'en' ? 'Delete message' : 'Xoá tin nhắn'}
                          className="rounded-lg p-1 text-content-muted hover:bg-surface-hover hover:text-rose-500"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Emoji Quick Picker Popup */}
                    <AnimatePresence>
                      {showEmojiPicker && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: 4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 4 }}
                          className={`absolute z-20 top-full mt-1 flex items-center gap-1 rounded-2xl border border-amber-500/30 bg-surface p-1.5 shadow-lg ${isMe ? 'right-0' : 'left-0'
                            }`}
                        >
                          {QUICK_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => void handleToggleReaction(msg.id, emoji)}
                              className="rounded-xl px-1.5 py-1 text-sm transition hover:scale-125 hover:bg-surface-hover active:scale-95"
                            >
                              {emoji}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Reaction Badges List */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div
                      className={`flex flex-wrap items-center gap-1.5 mt-1.5 ${isMe ? 'justify-end' : 'justify-start'
                        }`}
                    >
                      {msg.reactions.map((r) => (
                        <button
                          key={r.emoji}
                          type="button"
                          onClick={() => void handleToggleReaction(msg.id, r.emoji)}
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition active:scale-95 ${r.userReacted
                              ? 'border-amber-500/40 bg-amber-500/20 text-amber-800 dark:text-amber-200 shadow-2xs'
                              : 'border-line bg-surface-hover/80 text-content-muted hover:border-amber-500/30'
                            }`}
                        >
                          <span>{r.emoji}</span>
                          <span>{r.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Reply Banner & Input Footer */}
      <div className="border-t border-line bg-surface-hover/50 p-3 sm:p-4 space-y-2">
        {/* Reply Indicator Bar */}
        <AnimatePresence>
          {replyToMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs"
            >
              <div className="flex items-center gap-2 text-content min-w-0 pr-2">
                <CornerUpLeft className="size-3.5 text-amber-500 shrink-0" />
                <span className="truncate">
                  {language === 'en' ? 'Replying to' : 'Đang trả lời'} <strong className="text-amber-600 dark:text-amber-400">@{replyToMessage.userName}</strong>: "{replyToMessage.content}"
                </span>
              </div>
              <button
                type="button"
                onClick={() => setReplyToMessage(null)}
                className="rounded-lg p-0.5 text-content-muted hover:text-content"
              >
                <X className="size-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSend} className="relative flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              replyToMessage
                ? (language === 'en' ? `Reply to @${replyToMessage.userName}...` : `Nhập câu trả lời cho @${replyToMessage.userName}...`)
                : (language === 'en' ? 'Type a message...' : 'Nhập tin nhắn trò chuyện...')
            }
            maxLength={1000}
            disabled={isSending}
            className="w-full rounded-2xl border border-line bg-surface px-4 py-2.5 pr-12 text-xs font-medium text-content outline-none transition placeholder:text-content-muted focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            aria-label={language === 'en' ? 'Send message' : 'Gửi tin nhắn'}
            className="absolute right-1.5 flex size-8 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold shadow-xs transition hover:opacity-95 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
          >
            {isSending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <SendHorizontal className="size-4" />
            )}
          </button>
        </form>
      </div>
    </article>
  );
};
