import { useState } from 'react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import StyledSelect from '@/components/ui/StyledSelect';
import SettingsPage from '../../components/SettingsPage';
import { Plus, Package, Pill, AlertTriangle, Calendar } from 'lucide-react';
import { useTimezoneUtils } from '@/lib/timezone';

const Inventory = () => {
  const tz = useTimezoneUtils();
  const [foodItems, setFoodItems] = useState([
    { recordId: 1, name: 'Premium Dry Food - Adult', currentStock: 25, minStock: 10, unit: 'bags', expiresAt: '2025-12-15' },
    { recordId: 2, name: 'Puppy Formula', currentStock: 8, minStock: 5, unit: 'bags', expiresAt: '2025-11-30' },
  ]);

  const [medications, setMedications] = useState([
    { recordId: 1, name: 'Heartgard Plus', currentStock: 15, minStock: 5, unit: 'doses', expiresAt: '2025-08-20', requiresPrescription: true },
    { recordId: 2, name: 'Benadryl', currentStock: 2, minStock: 3, unit: 'bottles', expiresAt: '2026-01-15', requiresPrescription: false },
  ]);

  const [supplies, setSupplies] = useState([
    { recordId: 1, name: 'Cleaning Supplies - Disinfectant', currentStock: 12, minStock: 8, unit: 'bottles' },
    { recordId: 2, name: 'Dog Toys - Rope', currentStock: 25, minStock: 15, unit: 'pieces' },
  ]);

  const isLowStock = (item) => item.currentStock <= item.minStock;
  const isExpiringSoon = (item) => {
    if (!item.expiresAt) return false;
    const expiryDate = new Date(item.expiresAt);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiryDate <= thirtyDaysFromNow;
  };

  const InventoryTable = ({ title, items, showExpiry = false, icon: Icon }) => (
    <Card title={title} description={`Manage your ${title.toLowerCase()} inventory and stock levels.`}>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-muted" />
            <span className="text-sm font-medium">{items.length} items tracked</span>
          </div>
          <Button size="sm" variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[700px]">
            <thead className="bg-surface/50">
              <tr className="text-left text-xs font-medium text-muted uppercase tracking-wide">
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Current Stock</th>
                <th className="px-4 py-3">Min Stock</th>
                <th className="px-4 py-3">Unit</th>
                {showExpiry && <th className="px-4 py-3">Expires</th>}
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.recordId} className="hover:bg-surface/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text">{item.name}</span>
                      {item.requiresPrescription && (
                        <Badge variant="warning" size="sm">Rx</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{item.currentStock}</td>
                  <td className="px-4 py-3 text-sm">{item.minStock}</td>
                  <td className="px-4 py-3 text-sm text-muted">{item.unit}</td>
                  {showExpiry && (
                    <td className="px-4 py-3 text-sm">
                      {item.expiresAt ? tz.formatShortDate(item.expiresAt) : 'N/A'}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {isLowStock(item) && (
                        <Badge variant="error" size="sm">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Low Stock
                        </Badge>
                      )}
                      {isExpiringSoon(item) && (
                        <Badge variant="warning" size="sm">
                          <Calendar className="w-3 h-3 mr-1" />
                          Expiring Soon
                        </Badge>
                      )}
                      {!isLowStock(item) && !isExpiringSoon(item) && (
                        <Badge variant="success" size="sm">Good</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="ghost">Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );

  return (
    <SettingsPage 
      title="Inventory Management" 
      description="Track food, medications, and supplies to ensure you never run out of essentials"
    >
      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <Card className="text-center">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 dark:bg-surface-secondary text-red-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="text-2xl font-bold text-text">
            {[...foodItems, ...medications, ...supplies].filter(isLowStock).length}
          </div>
          <div className="text-sm text-muted">Low Stock Alerts</div>
        </Card>
        
        <Card className="text-center">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-yellow-100 dark:bg-surface-secondary text-yellow-600">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="text-2xl font-bold text-text">
            {[...foodItems, ...medications].filter(isExpiringSoon).length}
          </div>
          <div className="text-sm text-muted">Expiring Soon</div>
        </Card>
        
        <Card className="text-center">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-blue-100 dark:bg-surface-secondary text-blue-600 dark:text-blue-400">
            <Package className="w-6 h-6" />
          </div>
          <div className="text-2xl font-bold text-text">
            {foodItems.length + medications.length + supplies.length}
          </div>
          <div className="text-sm text-muted">Total Items Tracked</div>
        </Card>
      </div>

      <InventoryTable 
        title="Food Inventory" 
        items={foodItems} 
        showExpiry={true}
        icon={Package}
      />
      
      <InventoryTable 
        title="Medications" 
        items={medications} 
        showExpiry={true}
        icon={Pill}
      />
      
      <InventoryTable 
        title="Supplies & Equipment" 
        items={supplies} 
        showExpiry={false}
        icon={Package}
      />

      <Card 
        title="Automatic Reorder Settings" 
        description="Set up automatic notifications when items reach minimum stock levels."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-text">Notification Recipients</label>
            <Input placeholder="manager@kennel.com, owner@kennel.com" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-text">Notification Frequency</label>
            <StyledSelect
              options={[
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'low_stock', label: 'When stock is low' },
              ]}
              defaultValue="daily"
              isClearable={false}
              isSearchable={false}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-text">Expiry Alert Days</label>
            <Input 
              type="number" 
              defaultValue="30" 
              helpText="Days before expiry to send alerts"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-text">Include in Daily Reports</label>
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked className="rounded border-border" />
              <span className="text-sm">Include inventory status in daily reports</span>
            </label>
          </div>
        </div>
      </Card>
    </SettingsPage>
  );
};

export default Inventory;

