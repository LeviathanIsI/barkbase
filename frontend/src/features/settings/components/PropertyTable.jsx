/**
 * Property Table - Phase 8 Enterprise Table System
 * Token-based styling for consistent theming.
 */

import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/DropdownMenu";
import {
  Archive,
  ChevronDown,
  Copy,
  Download,
  Edit2,
  FolderTree,
  Lock,
  Shield,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/Table';

const TYPE_LABELS = {
  string: "Single-line text",
  text: "Multi-line text",
  number: "Number",
  currency: "Currency",
  date: "Date",
  datetime: "Date & Time",
  boolean: "Yes/No",
  enum: "Dropdown select",
  multi_enum: "Multiple select",
  email: "Email",
  phone: "Phone number",
  url: "URL",
  uuid: "Unique ID",
  association: "Association",
  file: "File",
};

const PropertyTable = ({
  properties,
  objectType,
  onEdit,
  onDelete,
  onArchive,
  onClone,
}) => {
  const navigate = useNavigate();

  if (!properties || properties.length === 0) {
    return (
      <div
        className="rounded-lg border p-[var(--bb-space-12,3rem)] text-center"
        style={{
          borderColor: 'var(--bb-color-border-subtle)',
          backgroundColor: 'var(--bb-color-bg-surface)',
        }}
      >
        <p
          className="text-[var(--bb-font-size-sm,0.875rem)]"
          style={{ color: 'var(--bb-color-text-muted)' }}
        >
          No properties found
        </p>
      </div>
    );
  }

  const handleRowClick = (property, e) => {
    // Don't navigate if clicking on action buttons or checkboxes
    if (
      e.target.closest("button") ||
      e.target.closest('input[type="checkbox"]')
    ) {
      return;
    }
    navigate(`/settings/properties/${objectType}/${property.recordId}`);
  };

  return (
    <div
      className="rounded-lg border overflow-x-auto"
      style={{
        borderColor: 'var(--bb-color-border-subtle)',
        backgroundColor: 'var(--bb-color-bg-surface)',
      }}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/6">Name</TableHead>
            <TableHead className="w-1/4"></TableHead>
            <TableHead className="w-1/6">Group</TableHead>
            <TableHead className="w-1/4">Required</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {properties.map((property) => {
            const typeLabel = TYPE_LABELS[property.type] || property.type;

            return (
              <TableRow
                key={property.recordId}
                clickable
                className="group"
                onClick={(e) => handleRowClick(property, e)}
              >
                <TableCell>
                  <div className="flex items-center gap-[var(--bb-space-3,0.75rem)]">
                    <input
                      type="checkbox"
                      disabled={property.system}
                      className="h-4 w-4 rounded flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        borderColor: 'var(--bb-color-border-subtle)',
                        accentColor: 'var(--bb-color-accent)',
                      }}
                    />
                    <div>
                      <div className="flex items-center gap-[var(--bb-space-2,0.5rem)]">
                        <span
                          className="text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
                          style={{ color: 'var(--bb-color-text-primary)' }}
                        >
                          {property.label}
                        </span>
                        {property.system && (
                          <Lock
                            className="h-3.5 w-3.5"
                            style={{ color: 'var(--bb-color-text-muted)' }}
                          />
                        )}
                      </div>
                      <div
                        className="mt-0.5 text-[var(--bb-font-size-xs,0.75rem)]"
                        style={{ color: 'var(--bb-color-text-muted)' }}
                      >
                        {typeLabel}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell
                  className="text-center relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity relative z-50">
                    <DropdownMenu
                      trigger={
                        <button
                          className="flex items-center justify-center gap-[var(--bb-space-1,0.25rem)] px-[var(--bb-space-3,0.75rem)] py-[var(--bb-space-1,0.25rem)] text-[var(--bb-font-size-sm,0.875rem)] rounded transition-colors"
                          style={{ color: 'var(--bb-color-text-muted)' }}
                          title="More actions"
                          type="button"
                        >
                          <span>More</span>
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      }
                    >
                      <DropdownMenuItem
                        onClick={() => onEdit(property)}
                        icon={Edit2}
                      >
                        Edit
                      </DropdownMenuItem>
                      {onClone && (
                        <DropdownMenuItem
                          onClick={() => onClone(property)}
                          icon={Copy}
                        >
                          Clone
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem icon={FolderTree}>
                        Choose new property group
                      </DropdownMenuItem>
                      <DropdownMenuItem icon={Download}>
                        Export
                      </DropdownMenuItem>
                      <DropdownMenuItem icon={Shield}>
                        Manage access
                      </DropdownMenuItem>
                      {!property.system && (
                        <>
                          <DropdownMenuSeparator />
                          {onArchive && (
                            <DropdownMenuItem
                              onClick={() => onArchive(property)}
                              icon={Archive}
                            >
                              Archive
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => onDelete(property)}
                            icon={Trash2}
                            variant="danger"
                          >
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenu>
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className="text-[var(--bb-font-size-sm,0.875rem)]"
                    style={{ color: 'var(--bb-color-text-primary)' }}
                  >
                    {property.group
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </span>
                </TableCell>
                <TableCell>
                  {property.required && (
                    <span
                      className="inline-flex items-center rounded-md px-[var(--bb-space-2,0.5rem)] py-0.5 text-[var(--bb-font-size-xs,0.75rem)] font-[var(--bb-font-weight-medium,500)]"
                      style={{
                        backgroundColor: 'rgba(239, 112, 112, 0.15)',
                        color: 'var(--bb-color-status-negative)',
                      }}
                    >
                      Required
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default PropertyTable;
