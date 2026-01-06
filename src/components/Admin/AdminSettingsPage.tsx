import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

const ADMIN_ENABLE_EVENT_DELETION_KEY = 'admin_enable_event_deletion';

const AdminSettingsPage: React.FC = () => {
  const [enableEventDeletion, setEnableEventDeletion] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADMIN_ENABLE_EVENT_DELETION_KEY);
      setEnableEventDeletion(raw === 'true');
    } catch {
      setEnableEventDeletion(false);
    }
  }, []);

  const handleToggle = (checked: boolean) => {
    setEnableEventDeletion(checked);
    try {
      localStorage.setItem(ADMIN_ENABLE_EVENT_DELETION_KEY, String(checked));
      window.dispatchEvent(new CustomEvent('adminSettingsChanged'));
    } catch {
      // ignore
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold text-gray-900">Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4 rounded-lg border bg-white px-4 py-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">Enable Event Deletion</p>
              <p className="text-xs text-gray-600 mt-1">
                When enabled, All Events will show selection checkboxes and a Delete button.
              </p>
            </div>
            <Switch checked={enableEventDeletion} onCheckedChange={handleToggle} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettingsPage;
