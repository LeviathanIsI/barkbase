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

const TYPE_COLORS = {
  string: "text-blue-600 dark:text-blue-400",
  text: "text-blue-600 dark:text-blue-400",
  number: "text-purple-600 dark:text-purple-400",
  currency: "text-green-600",
  date: "text-orange-600",
  datetime: "text-orange-600",
  boolean: "text-teal-600",
  enum: "text-indigo-600",
  multi_enum: "text-indigo-600",
  email: "text-pink-600",
  phone: "text-pink-600",
  url: "text-cyan-600",
  uuid: "text-gray-600 dark:text-text-secondary",
  association: "text-violet-600",
  file: "text-amber-600",
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
      <div className="rounded-lg border border-border bg-surface p-12 text-center">
        <p className="text-sm text-muted">No properties found</p>
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
    <div className="rounded-lg border border-border bg-surface overflow-x-auto">
      <table className="w-full min-w-[800px]">
        <thead className="bg-surface border-b border-border">
          <tr>
            <th className="w-1/6 px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
              Name
            </th>
            <th className="w-1/4 px-4 py-3"></th>
            <th className="w-1/6 px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
              Group
            </th>
            <th className="w-1/4 px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
              Required
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {properties.map((property) => {
            const typeLabel = TYPE_LABELS[property.type] || property.type;

            return (
              <tr
                key={property.recordId}
                className="group cursor-pointer hover:bg-surface/50 transition-colors"
                onClick={(e) => handleRowClick(property, e)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      disabled={property.system}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text">
                          {property.label}
                        </span>
                        {property.system && (
                          <Lock className="h-3.5 w-3.5 text-muted" />
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-muted">
                        {typeLabel}
                      </div>
                    </div>
                  </div>
                </td>
                <td
                  className="px-4 py-4 text-center relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity relative z-50">
                    <DropdownMenu
                      trigger={
                        <button
                          className="flex items-center justify-center gap-1 px-3 py-1 text-sm text-muted hover:text-text hover:bg-surface/50 rounded"
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
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-text">
                    {property.group
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {property.required && (
                    <span className="inline-flex items-center rounded-md bg-red-50 dark:bg-surface-primary px-2 py-0.5 text-xs font-medium text-red-700">
                      Required
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PropertyTable;
