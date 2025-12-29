import { useState } from 'react';
import { MoreVertical, Edit, Eye, Trash2 } from 'lucide-react';
import { useTimezoneUtils } from '@/lib/timezone';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const TeamMemberCard = ({ member, isSelected, onSelect, onEdit, onDelete }) => {
  const tz = useTimezoneUtils();
  const [showMenu, setShowMenu] = useState(false);

  const getRoleBadge = (role) => {
    const styles = {
      OWNER: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      ADMIN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      STAFF: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      READONLY: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    };
    return styles[role] || styles.STAFF;
  };

  // Count enabled permissions
  const permissionCount = Object.values(member.permissions || {}).filter(Boolean).length;
  const totalPermissions = Object.keys(member.permissions || {}).length;

  return (
    <Card className="relative p-3 hover:shadow-md transition-shadow">
      {/* Selection + Menu Row */}
      <div className="flex items-center justify-between mb-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(member.id)}
          className="w-3.5 h-3.5 rounded border-border"
        />
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded hover:bg-surface-secondary transition-colors"
          >
            <MoreVertical className="w-3.5 h-3.5 text-muted" />
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-1 w-36 bg-surface-primary border border-border rounded-md shadow-lg z-20">
              <button
                onClick={() => { onEdit(member); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text hover:bg-surface-secondary"
              >
                <Edit className="w-3 h-3" /> Edit
              </button>
              <button
                onClick={() => { onDelete?.(member.id); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-surface-secondary"
              >
                <Trash2 className="w-3 h-3" /> Remove
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Member Info */}
      <div className="flex items-start gap-2.5">
        <div className="relative flex-shrink-0">
          <Avatar size="sm" fallback={member.name} />
          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-surface-primary ${
            member.isOnline ? 'bg-green-500' : 'bg-gray-400'
          }`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-medium text-text truncate">{member.name}</h3>
            {member.isCurrentUser && (
              <span className="text-[10px] text-muted">(you)</span>
            )}
          </div>
          <p className="text-xs text-muted truncate">{member.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded ${getRoleBadge(member.role)}`}>
              {member.role}
            </span>
            <span className="text-[10px] text-muted">
              {permissionCount}/{totalPermissions} permissions
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
        <span className="text-[10px] text-muted">
          {member.joinedAt ? `Joined ${tz.formatShortDate(member.joinedAt)}` : 'Pending'}
        </span>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => onEdit(member)}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => onEdit(member)}>
            View
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default TeamMemberCard;
