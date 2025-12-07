import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import {
  Search,
  Users,
  Send,
  Plus,
  ChevronRight,
  ChevronLeft,
  MoreHorizontal,
  Phone,
  Mail,
  PawPrint,
  User,
  FileText,
  Paperclip,
  Smile,
  CheckCheck,
  Check,
  Clock,
  Filter,
  ArrowUpDown,
  X,
  MessageSquare,
  ExternalLink,
  UserPlus,
  CheckCircle,
  AlertCircle,
  Loader2,
  Menu,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/skeleton';
// Unified loader: replaced inline loading with LoadingState
import LoadingState from '@/components/ui/LoadingState';
import {
  useConversationsQuery,
  useConversationMessagesQuery,
  useSendMessageMutation,
  useMarkConversationReadMutation
} from '../api';
import { useAuthStore } from '@/stores/auth';
import { getSocket } from '@/lib/socket';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';

// Filter options
const FILTER_OPTIONS = [
  { value: 'all', label: 'All Messages' },
  { value: 'unread', label: 'Unread' },
  { value: 'needs-action', label: 'Needs Action' },
  { value: 'assigned', label: 'Assigned to Me' },
];

const SORT_OPTIONS = [
  { value: 'recent', label: 'Recent First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'owner', label: 'By Owner Name' },
];

// Format timestamp for conversation list
const formatConversationTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d');
};

// Format timestamp for message bubbles
const formatMessageTime = (dateStr) => {
  if (!dateStr) return '';
  return format(new Date(dateStr), 'h:mm a');
};

// Get initials from name
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Avatar component
const Avatar = ({ name, size = 'md', className }) => {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500',
    'bg-pink-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-rose-500',
  ];

  const colorIndex = name ? name.charCodeAt(0) % colors.length : 0;

  return (
    <div className={cn(
      'rounded-full flex items-center justify-center text-white font-medium flex-shrink-0',
      sizeClasses[size],
      colors[colorIndex],
      className
    )}>
      {getInitials(name)}
    </div>
  );
};

// Conversation Item
const ConversationItem = ({ conversation, isSelected, onClick, isCompact }) => {
  const hasUnread = conversation.unreadCount > 0;
  const needsReply = conversation.needsReply;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 p-3 text-left transition-colors border-b border-border',
        isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-surface',
        isCompact ? 'py-2' : 'py-3'
      )}
    >
      {/* Avatar with unread indicator */}
      <div className="relative flex-shrink-0">
        <Avatar name={conversation.otherUser?.name} size={isCompact ? 'sm' : 'md'} />
        {hasUnread && (
          <div className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-primary rounded-full border-2 border-white dark:border-surface-primary" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className={cn(
            'font-medium truncate',
            hasUnread ? 'text-text' : 'text-text'
          )}>
            {conversation.otherUser?.name || 'Unknown User'}
          </span>
          <span className="text-xs text-muted flex-shrink-0">
            {formatConversationTime(conversation.lastMessage?.createdAt)}
          </span>
        </div>

        {/* Pet names */}
        {conversation.pets?.length > 0 && (
          <div className="flex items-center gap-1 mb-0.5">
            <PawPrint className="h-3 w-3 text-muted" />
            <span className="text-xs text-muted truncate">
              {conversation.pets.map(p => p.name).join(', ')}
            </span>
          </div>
        )}

        {/* Last message preview */}
        <p className={cn(
          'text-sm truncate',
          hasUnread ? 'text-text font-medium' : 'text-muted'
        )}>
          {conversation.lastMessage?.content || 'No messages yet'}
        </p>

        {/* Status badges */}
        <div className="flex items-center gap-2 mt-1">
          {hasUnread && (
            <Badge variant="primary" size="sm">{conversation.unreadCount} new</Badge>
          )}
          {needsReply && (
            <Badge variant="warning" size="sm">Needs reply</Badge>
          )}
          {conversation.isTyping && (
            <span className="text-xs text-primary flex items-center gap-1">
              <span className="flex gap-0.5">
                <span className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              typing...
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

// Message Bubble
const MessageBubble = ({ message, isCurrentUser, showTimestamp }) => {
  return (
    <div className={cn('flex gap-2', isCurrentUser ? 'justify-end' : 'justify-start')}>
      {!isCurrentUser && (
        <Avatar name={message.senderName} size="sm" className="mt-1" />
      )}
      <div className={cn('max-w-[70%]', isCurrentUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2',
            isCurrentUser
              ? 'bg-primary text-white rounded-br-md'
              : 'bg-surface text-text rounded-bl-md'
          )}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        {showTimestamp && (
          <div className={cn(
            'flex items-center gap-1 mt-1 px-1',
            isCurrentUser ? 'justify-end' : 'justify-start'
          )}>
            <span className="text-xs text-muted">{formatMessageTime(message.createdAt)}</span>
            {isCurrentUser && (
              message.read ? (
                <CheckCheck className="h-3 w-3 text-primary" />
              ) : (
                <Check className="h-3 w-3 text-muted" />
              )
            )}
          </div>
        )}
      </div>
      {isCurrentUser && (
        <Avatar name={message.senderName} size="sm" className="mt-1" />
      )}
    </div>
  );
};

// Date Divider
const DateDivider = ({ date }) => {
  let label;
  if (isToday(date)) label = 'Today';
  else if (isYesterday(date)) label = 'Yesterday';
  else label = format(date, 'MMMM d, yyyy');

  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted font-medium">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
};

// Empty State Components
const EmptyConversationList = ({ onNewConversation }) => (
  <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
    <div className="h-16 w-16 rounded-full bg-surface flex items-center justify-center mb-4">
      <MessageSquare className="h-8 w-8 text-muted" />
    </div>
    <h3 className="font-medium text-text mb-1">No messages yet</h3>
    <p className="text-sm text-muted mb-4">Start a conversation with a pet owner</p>
    <Button size="sm" onClick={onNewConversation}>
      <Plus className="h-4 w-4 mr-1.5" />
      New Conversation
    </Button>
  </div>
);

const EmptyChatPane = ({ onNewConversation }) => (
  <div className="flex flex-col items-center justify-center h-full text-center px-4">
    <div className="h-20 w-20 rounded-full bg-surface flex items-center justify-center mb-4">
      <Send className="h-10 w-10 text-muted" />
    </div>
    <h3 className="font-medium text-text mb-1">Select a conversation</h3>
    <p className="text-sm text-muted mb-4">
      Choose a conversation from the list to start messaging,<br />
      or create a new conversation from the top-right.
    </p>
    <Button variant="outline" size="sm" onClick={onNewConversation}>
      <Plus className="h-4 w-4 mr-1.5" />
      New Conversation
    </Button>
  </div>
);

const Messages = () => {
  const navigate = useNavigate();
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [searchTerm, setSearchTerm] = useState('');
  const [showMobileList, setShowMobileList] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
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

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [messageText]);

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

  // Filter and sort conversations
  const filteredConversations = useMemo(() => {
    let result = conversations || [];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(conv =>
        conv.otherUser?.name?.toLowerCase().includes(term) ||
        conv.pets?.some(p => p.name?.toLowerCase().includes(term)) ||
        conv.lastMessage?.content?.toLowerCase().includes(term)
      );
    }

    // Status filter
    switch (filter) {
      case 'unread':
        result = result.filter(c => c.unreadCount > 0);
        break;
      case 'needs-action':
        result = result.filter(c => c.needsReply);
        break;
      case 'assigned':
        result = result.filter(c => c.assignedTo === currentUser?.recordId);
        break;
    }

    // Sort
    switch (sortBy) {
      case 'oldest':
        result = [...result].sort((a, b) =>
          new Date(a.lastMessage?.createdAt || 0) - new Date(b.lastMessage?.createdAt || 0)
        );
        break;
      case 'owner':
        result = [...result].sort((a, b) =>
          (a.otherUser?.name || '').localeCompare(b.otherUser?.name || '')
        );
        break;
      default: // recent
        result = [...result].sort((a, b) =>
          new Date(b.lastMessage?.createdAt || 0) - new Date(a.lastMessage?.createdAt || 0)
        );
    }

    return result;
  }, [conversations, searchTerm, filter, sortBy, currentUser]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    if (!messages) return [];
    
    const groups = [];
    let currentDate = null;

    messages.forEach((msg, idx) => {
      const msgDate = new Date(msg.createdAt);
      const dateStr = format(msgDate, 'yyyy-MM-dd');

      if (dateStr !== currentDate) {
        groups.push({ type: 'date', date: msgDate });
        currentDate = dateStr;
      }

      // Show timestamp every 5 messages or if gap > 5 minutes
      const prevMsg = messages[idx - 1];
      const showTimestamp = !prevMsg ||
        (idx % 5 === 0) ||
        (new Date(msg.createdAt) - new Date(prevMsg.createdAt)) > 5 * 60 * 1000;

      groups.push({ type: 'message', message: msg, showTimestamp });
    });

    return groups;
  }, [messages]);

  const handleSelectConversation = (conv) => {
    setSelectedConversation(conv);
    setShowMobileList(false);
  };

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

  const handleNewConversation = () => {
    // TODO: Open new conversation modal
    toast.info('New conversation modal coming soon');
  };

  const unreadCount = conversations?.reduce((sum, c) => sum + (c.unreadCount || 0), 0) || 0;

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <nav className="mb-1">
            <ol className="flex items-center gap-1 text-xs text-muted">
              <li><Link to="/operations" className="hover:text-primary">Operations</Link></li>
              <li><ChevronRight className="h-3 w-3" /></li>
              <li className="text-text font-medium">Messages</li>
            </ol>
          </nav>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-text">Messages</h1>
            {unreadCount > 0 && (
              <Badge variant="primary" size="sm">{unreadCount} unread</Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => toast.info('Templates coming soon')}>
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Templates
          </Button>
          <Button size="sm" onClick={handleNewConversation}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Conversation
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex bg-white dark:bg-surface-primary border border-border rounded-lg overflow-hidden">
        {/* Left Panel - Conversation List */}
        <div className={cn(
          'w-80 flex-shrink-0 border-r border-border flex flex-col',
          'lg:block',
          showMobileList ? 'block absolute inset-0 z-20 bg-white dark:bg-surface-primary lg:relative' : 'hidden'
        )}>
          {/* Search & Filters */}
          <div className="p-3 border-b border-border space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-surface border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Filter & Sort Row */}
            <div className="flex items-center gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="flex-1 px-2 py-1.5 text-xs bg-surface border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {FILTER_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 px-2 py-1.5 text-xs bg-surface border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {conversationsLoading ? (
              <div className="p-3 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <EmptyConversationList onNewConversation={handleNewConversation} />
            ) : (
              filteredConversations.map(conv => (
                <ConversationItem
                  key={conv.conversationId}
                  conversation={conv}
                  isSelected={selectedConversation?.conversationId === conv.conversationId}
                  onClick={() => handleSelectConversation(conv)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Chat */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedConversation ? (
            <EmptyChatPane onNewConversation={handleNewConversation} />
          ) : (
            <>
              {/* Conversation Header */}
              <div className="flex items-center justify-between p-3 border-b border-border">
                <div className="flex items-center gap-3">
                  {/* Mobile back button */}
                  <button
                    onClick={() => setShowMobileList(true)}
                    className="lg:hidden p-1.5 text-muted hover:text-text hover:bg-surface rounded"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <Avatar name={selectedConversation.otherUser?.name} size="md" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-text">
                        {selectedConversation.otherUser?.name || 'Unknown User'}
                      </h3>
                      {selectedConversation.isOnline && (
                        <span className="h-2 w-2 bg-green-500 rounded-full" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted">
                      {selectedConversation.otherUser?.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {selectedConversation.otherUser.email}
                        </span>
                      )}
                      {selectedConversation.otherUser?.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {selectedConversation.otherUser.phone}
                        </span>
                      )}
                    </div>
                    {selectedConversation.pets?.length > 0 && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <PawPrint className="h-3 w-3 text-muted" />
                        <span className="text-xs text-muted">
                          {selectedConversation.pets.map(p => p.name).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => selectedConversation.otherUser?.recordId && navigate(`/owners/${selectedConversation.otherUser.recordId}`)}
                    title="View Owner Profile"
                  >
                    <User className="h-4 w-4" />
                  </Button>
                  {selectedConversation.pets?.[0] && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/pets/${selectedConversation.pets[0].recordId}`)}
                      title="View Pet Profile"
                    >
                      <PawPrint className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" title="Assign to Staff">
                    <UserPlus className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" title="Mark as Resolved">
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-surface/30">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <LoadingState label="Loading messages…" variant="skeleton" />
                  </div>
                ) : (
                  <>
                    {groupedMessages.map((item, idx) => {
                      if (item.type === 'date') {
                        return <DateDivider key={`date-${idx}`} date={item.date} />;
                      }
                      return (
                        <MessageBubble
                          key={item.message.id || item.message.recordId || `msg-${idx}`}
                          message={item.message}
                          isCurrentUser={item.message.senderId === currentUser?.recordId || item.message.senderType === 'STAFF'}
                          showTimestamp={item.showTimestamp}
                        />
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Message Composer */}
              <div className="p-3 border-t border-border bg-white dark:bg-surface-primary">
                <form onSubmit={handleSendMessage}>
                  <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <textarea
                        ref={textareaRef}
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e);
                          }
                        }}
                        placeholder="Type your message..."
                        rows={1}
                        className="w-full px-4 py-2.5 bg-surface border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                        style={{ maxHeight: '120px' }}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="p-2 text-muted hover:text-text hover:bg-surface rounded-lg transition-colors"
                        title="Attach file"
                      >
                        <Paperclip className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        className="p-2 text-muted hover:text-text hover:bg-surface rounded-lg transition-colors"
                        title="Emoji"
                      >
                        <Smile className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        className="p-2 text-muted hover:text-text hover:bg-surface rounded-lg transition-colors"
                        title="Use template"
                      >
                        <FileText className="h-5 w-5" />
                      </button>
                      <Button
                        type="submit"
                        disabled={!messageText.trim() || sendMutation.isPending}
                        className="rounded-xl"
                      >
                        {sendMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted mt-1.5 px-1">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
