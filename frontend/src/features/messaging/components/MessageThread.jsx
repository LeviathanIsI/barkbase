import { useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';

const MessageThread = ({ 
  conversation, 
  messages, 
  isLoading, 
  currentUserId, 
  messageText, 
  onMessageChange, 
  onSendMessage,
  isSending 
}) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Send className="h-16 w-16 text-muted mx-auto mb-4" />
          <p className="text-muted">Select a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Thread Header */}
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold">{conversation.otherUser?.name || 'Unknown User'}</h3>
        <p className="text-sm text-muted">{conversation.otherUser?.email}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <Skeleton className="h-64" />
        ) : (
          <>
            {messages?.map((msg) => {
              const isCurrentUser = msg.senderId === currentUserId;
              return (
                <div
                  key={msg.recordId}
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      isCurrentUser
                        ? 'bg-primary text-white'
                        : 'bg-surface text-text'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-xs mt-1 ${isCurrentUser ? 'text-white/70' : 'text-muted'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <form onSubmit={onSendMessage} className="p-4 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => onMessageChange(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Button type="submit" disabled={!messageText.trim() || isSending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </>
  );
};

export default MessageThread;

