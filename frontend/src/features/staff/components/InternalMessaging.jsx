import { MessageSquare, Plus, Send } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useState } from 'react';
import { useConversationsQuery, useConversationMessagesQuery, useSendMessageMutation } from '@/features/messaging/api';

const InternalMessaging = () => {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState('');

  const { data: conversationsData } = useConversationsQuery();
  const conversations = Array.isArray(conversationsData) ? conversationsData : (conversationsData?.conversations || []);
  const { data: messagesData } = useConversationMessagesQuery(selectedConversation?.conversationId);
  const messages = Array.isArray(messagesData) ? messagesData : (messagesData?.messages || []);
  const sendMutation = useSendMessageMutation();

  const handleSend = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedConversation) return;
    await sendMutation.mutateAsync({
      conversationId: selectedConversation.conversationId,
      content: messageText,
    });
    setMessageText('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-text-primary">Team Messages</h2>
          <p className="text-gray-600 dark:text-text-secondary">Internal communication hub for your team</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-1" />
          New Message
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Conversation List */}
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-medium text-gray-900 dark:text-text-primary mb-3">Conversations</h3>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {(conversations || []).map((c) => (
                <div
                  key={c.conversationId || c.id}
                  className={`p-2 rounded cursor-pointer ${selectedConversation?.conversationId === (c.conversationId || c.id) ? 'bg-blue-50 dark:bg-surface-primary' : 'hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary'}`}
                  onClick={() => setSelectedConversation({ conversationId: c.conversationId || c.id })}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-900 dark:text-text-primary">{c.title || c.name || 'Conversation'}</span>
                    {c.unreadCount > 0 && (
                      <span className="text-xs bg-red-100 dark:bg-surface-secondary text-red-800 dark:text-red-200 px-2 py-0.5 rounded">{c.unreadCount}</span>
                    )}
                  </div>
                  {c.lastMessage && (
                    <div className="text-xs text-gray-600 dark:text-text-secondary truncate">{c.lastMessage}</div>
                  )}
                </div>
              ))}
              {(!conversations || conversations.length === 0) && (
                <div className="text-sm text-gray-600 dark:text-text-secondary">No conversations.</div>
              )}
            </div>
          </Card>
        </div>

        {/* Messages */}
        <div className="md:col-span-2">
          <Card className="p-0 h-96 flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-surface-border">
              <h3 className="font-medium text-gray-900 dark:text-text-primary">{selectedConversation ? 'Conversation' : 'Select a conversation'}</h3>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {(messages || []).map((m) => (
                <div key={m.recordId || m.id} className="flex gap-3">
                  <div className="w-8 h-8 bg-blue-50 dark:bg-blue-950/20 rounded-full flex items-center justify-center text-white text-sm font-medium">{(m.senderName || m.senderEmail || 'U')[0]}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 dark:text-text-primary">{m.senderName || m.senderEmail || 'User'}</span>
                      <span className="text-xs text-gray-500 dark:text-text-secondary">{new Date(m.createdAt || m.sentAt || Date.now()).toLocaleString()}</span>
                    </div>
                    <p className="text-gray-700 dark:text-text-primary">{m.content}</p>
                  </div>
                </div>
              ))}
              {(!messages || messages.length === 0) && (
                <div className="text-sm text-gray-600 dark:text-text-secondary">No messages.</div>
              )}
            </div>

            <form onSubmit={handleSend} className="p-4 border-t border-gray-200 dark:border-surface-border">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button type="submit" disabled={!selectedConversation || !messageText.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InternalMessaging;
