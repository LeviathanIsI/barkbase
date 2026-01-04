import { Search, Users } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { useTimezoneUtils } from '@/lib/timezone';

const ConversationList = ({ conversations, selectedConversation, onSelectConversation, isLoading }) => {
  const tz = useTimezoneUtils();

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-surface rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full pl-10 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="divide-y divide-border overflow-y-auto">
        {conversations?.map((conv) => (
          <button
            key={conv.id || conv.conversationId}
            onClick={() => onSelectConversation(conv)}
            className={`w-full p-4 text-left hover:bg-surface transition-colors ${
              (selectedConversation?.id || selectedConversation?.conversationId) === (conv.id || conv.conversationId) ? 'bg-surface' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold truncate">
                  {conv.owner?.firstName} {conv.owner?.lastName}
                </span>
                {conv.pets?.length > 0 && (
                  <span className="text-xs text-muted truncate">
                    ({conv.pets.map(p => p.name).join(', ')})
                  </span>
                )}
              </div>
              {conv.unreadCount > 0 && (
                <Badge variant="primary" className="text-xs shrink-0 ml-2">
                  {conv.unreadCount}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted truncate">{conv.lastMessage?.content}</p>
            <p className="text-xs text-muted mt-1">
              {tz.formatTime(conv.lastMessage?.createdAt)}
            </p>
          </button>
        ))}

        {conversations?.length === 0 && (
          <div className="p-8 text-center">
            <Users className="h-12 w-12 text-muted mx-auto mb-3" />
            <p className="text-sm text-muted">No conversations yet</p>
          </div>
        )}
      </div>
    </>
  );
};

export default ConversationList;

