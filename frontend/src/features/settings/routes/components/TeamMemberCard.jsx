import { useState } from 'react';
import {
  MoreVertical, Mail, Phone, MessageSquare,
  Calendar, Activity, Star, Clock,
  CheckCircle, X, Edit, Eye, UserX, Trash2
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const TeamMemberCard = ({ member, isSelected, onSelect, onEdit }) => {
  const [showMenu, setShowMenu] = useState(false);

  const getRoleColor = (role) => {
    switch (role.toLowerCase()) {
      case 'owner': return 'bg-purple-100 dark:bg-surface-secondary text-purple-800 dark:text-purple-200';
      case 'manager': return 'bg-blue-100 dark:bg-surface-secondary text-blue-800 dark:text-blue-200';
      case 'staff': return 'bg-green-100 dark:bg-surface-secondary text-green-800';
      case 'groomer': return 'bg-pink-100 dark:bg-surface-secondary text-pink-800';
      case 'trainer': return 'bg-orange-100 dark:bg-surface-secondary text-orange-800';
      default: return 'bg-gray-100 dark:bg-surface-secondary text-gray-800 dark:text-text-primary';
    }
  };

  const getStatusColor = (isOnline) => {
    return isOnline ? 'bg-green-50 dark:bg-green-950/20' : 'bg-gray-400 dark:bg-surface-secondary';
  };

  const formatPermissions = (permissions) => {
    const permissionLabels = {
      checkInOut: 'Check-in/out',
      bookings: 'Bookings',
      reports: 'Reports',
      billing: 'Billing',
      settings: 'Settings',
      staffSchedule: 'Staff Schedule'
    };

    return Object.entries(permissions).map(([key, enabled]) => ({
      label: permissionLabels[key] || key,
      enabled
    }));
  };

  const menuActions = [
    { icon: Edit, label: 'Edit Permissions', action: () => onEdit(member) },
  ];

  return (
    <Card className="relative hover:shadow-md transition-shadow">
      {/* Selection Checkbox */}
      <div className="absolute top-3 left-3 z-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(member.id)}
          className="w-4 h-4 text-blue-600 dark:text-blue-400 rounded border-gray-300 dark:border-surface-border focus:ring-blue-500"
        />
      </div>

      {/* Menu Button */}
      <div className="absolute top-3 right-3 z-10">
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-gray-500 dark:text-text-secondary" />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-md shadow-lg z-20">
              {menuActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <button
                    key={index}
                    onClick={() => {
                      action.action();
                      setShowMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary transition-colors ${
                      action.danger ? 'text-red-600 hover:text-red-700' : 'text-gray-700 dark:text-text-primary'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {action.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Header with Avatar and Status */}
        <div className="flex items-start gap-4 mb-4">
          <div className="relative">
            <Avatar size="lg" fallback={member.name} />
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(member.isOnline)}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary truncate">{member.name}</h3>
            <p className="text-sm text-gray-600 dark:text-text-secondary truncate">{member.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={getRoleColor(member.role)}>{member.role}</Badge>
              <span className="text-xs text-gray-500 dark:text-text-secondary">
                {member.isOnline ? '● Online now' : member.lastActive}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Permissions */}
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 dark:text-text-primary mb-2">Quick Permissions:</p>
          <div className="flex flex-wrap gap-1">
            {formatPermissions(member.permissions).map((perm, index) => (
              <span
                key={index}
                className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                  perm.enabled
                    ? 'bg-green-100 dark:bg-surface-secondary text-green-800'
                    : 'bg-gray-100 dark:bg-surface-secondary text-gray-600 dark:text-text-secondary'
                }`}
              >
                {perm.enabled ? (
                  <CheckCircle className="w-3 h-3" />
                ) : (
                  <X className="w-3 h-3" />
                )}
                {perm.label}
              </span>
            ))}
          </div>
        </div>

        {/* Schedule and Location */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-text-secondary">
            <Calendar className="w-4 h-4" />
            <span>{member.schedule}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-text-secondary">
            <span className="w-4 h-4 flex items-center justify-center">📍</span>
            <span>{member.location}</span>
          </div>
        </div>

        {/* Performance Metrics (if available) */}
        {member.performance && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-surface-secondary rounded-lg">
            <p className="text-sm font-medium text-gray-700 dark:text-text-primary mb-2">Performance (This Month)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div>Check-ins: {member.performance.checkInsProcessed}</div>
              <div>Bookings: {member.performance.bookingsCreated}</div>
              <div className="flex items-center gap-1">
                Rating: {member.performance.satisfaction}
                <Star className="w-3 h-3 text-yellow-500 fill-current" />
              </div>
              <div>On-time: {member.performance.onTimeClockIns}%</div>
            </div>
          </div>
        )}

        {/* Join Date */}
        <div className="text-xs text-gray-500 dark:text-text-secondary">
          Joined: {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'Pending'}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(member)}
            className="flex-1"
          >
            <Edit className="w-3 h-3 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (onEdit) {
                onEdit(member);
              }
            }}
            className="flex-1"
          >
            <Eye className="w-3 h-3 mr-1" />
            View Full
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default TeamMemberCard;
