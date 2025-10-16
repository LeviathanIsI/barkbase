import { useState, useEffect } from 'react';
import { Card, PageHeader } from '@/components/ui/Card';
import {
  useConversationsQuery,
  useConversationMessagesQuery,
  useSendMessageMutation,
  useMarkConversationReadMutation
} from '../api';
import { useAuthStore } from '@/stores/auth';
import { getSocket } from '@/lib/socket';
import ConversationList from '../components/ConversationList';
import MessageThread from '../components/MessageThread';
import toast from 'react-hot-toast';

const Messages = () => {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState('');
  const currentUser = useAuthStore(state => state.user);

  const { data: conversations, isLoading: conversationsLoading, refetch: refetchConversations } = useConversationsQuery();
  const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = useConversationMessagesQuery(
    selectedConversation?.conversationId
  );
  const sendMutation = useSendMessageMutation();
  const markReadMutation = useMarkConversationReadMutation();

  // Mark conversation as read when selected
  useEffect(() => {
    if (selectedConversation && selectedConversation.unreadCount > 0) {
      markReadMutation.mutate(selectedConversation.conversationId);
    }
  }, [selectedConversation]);

  // Set up socket.io listener for new messages
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = () => {
      refetchConversations();
      if (selectedConversation) {
        refetchMessages();
      }
    };

    socket.on('message:new', handleNewMessage);

    return () => {
      socket.off('message:new', handleNewMessage);
    };
  }, [selectedConversation, refetchConversations, refetchMessages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!messageText.trim() || !selectedConversation) return;

    try {
      await sendMutation.mutateAsync({
        recipientId: selectedConversation.otherUser.recordId,
        conversationId: selectedConversation.conversationId,
        content: messageText
      });
      setMessageText('');
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  return (
    <div>
      <PageHeader title="Messages" breadcrumb="Home > Messages" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Conversations List */}
        <Card className="overflow-y-auto">
          <ConversationList
            conversations={conversations}
            selectedConversation={selectedConversation}
            onSelectConversation={setSelectedConversation}
            isLoading={conversationsLoading}
          />
        </Card>

        {/* Message Thread */}
        <Card className="lg:col-span-2 flex flex-col">
          <MessageThread
            conversation={selectedConversation}
            messages={messages}
            isLoading={messagesLoading}
            currentUserId={currentUser?.recordId}
            messageText={messageText}
            onMessageChange={setMessageText}
            onSendMessage={handleSendMessage}
            isSending={sendMutation.isLoading}
          />
        </Card>
      </div>
    </div>
  );
};

export default Messages;

