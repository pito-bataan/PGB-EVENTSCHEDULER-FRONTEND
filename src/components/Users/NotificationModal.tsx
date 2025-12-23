import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface NotificationModalProps {
  open: boolean;
  notifications: any[];
  readNotifications: Set<string>;
  onClose: () => void;
  onDelete: (ids: string[]) => void;
  onMarkRead: (ids: string[]) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  open,
  notifications,
  readNotifications,
  onClose,
  onDelete,
  onMarkRead,
}) => {
  const [selected, setSelected] = React.useState<string[]>([]);
  const [activeTab, setActiveTab] = React.useState<string>("all");

  const filteredNotifications = React.useMemo(() => {
    if (activeTab === "all") return notifications;
    return notifications.filter((n) => n.category === activeTab);
  }, [notifications, activeTab]);

  const selectedInViewCount = React.useMemo(() => {
    if (filteredNotifications.length === 0) return 0;
    const visibleIds = new Set(filteredNotifications.map((n) => n.id));
    return selected.filter((id) => visibleIds.has(id)).length;
  }, [filteredNotifications, selected]);

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const allSelectedInView =
    filteredNotifications.length > 0 &&
    filteredNotifications.every((n) => selected.includes(n.id));

  const toggleAllInView = () => {
    const viewIds = filteredNotifications.map((n) => n.id);
    setSelected((prev) => {
      if (viewIds.length === 0) return prev;
      if (viewIds.every((id) => prev.includes(id))) {
        return prev.filter((id) => !viewIds.includes(id));
      }
      const merged = new Set([...prev, ...viewIds]);
      return Array.from(merged);
    });
  };

  const handleMarkReadSelected = () => {
    if (selected.length === 0) return;
    onMarkRead(selected);
    setSelected([]);
  };

  const handleDeleteSelected = () => {
    if (selected.length === 0) return;
    onDelete(selected);
    setSelected([]);
  };

  const unreadCountByCategory = React.useMemo(() => {
    const counts: Record<string, number> = {
      all: 0,
      upcoming: 0,
      tagged: 0,
      status: 0,
    };

    for (const n of notifications) {
      const isRead = readNotifications.has(n.id);
      if (!isRead) {
        counts.all += 1;
        if (n.category && counts[n.category] !== undefined) {
          counts[n.category] += 1;
        }
      }
    }
    return counts;
  }, [notifications, readNotifications]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-xl sm:max-w-2xl max-h-[80vh] p-0 overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-5 py-4">
          <DialogHeader className="p-0">
            <DialogTitle className="text-lg sm:text-xl font-bold text-white">Notifications</DialogTitle>
            <div className="text-blue-100 text-xs sm:text-sm">View, filter, and manage your notifications</div>
          </DialogHeader>
        </div>

        <div className="px-4 sm:px-5 pt-3 sm:pt-4 flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col gap-3">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all" className="relative">
                  All
                  {unreadCountByCategory.all > 0 && (
                    <Badge variant="destructive" className="ml-2 h-4 px-1.5 text-[10px]">
                      {unreadCountByCategory.all > 99 ? "99+" : unreadCountByCategory.all}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="upcoming" className="relative">
                  Upcoming
                  {unreadCountByCategory.upcoming > 0 && (
                    <Badge variant="destructive" className="ml-2 h-4 px-1.5 text-[10px]">
                      {unreadCountByCategory.upcoming > 99 ? "99+" : unreadCountByCategory.upcoming}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="tagged" className="relative">
                  Tagged
                  {unreadCountByCategory.tagged > 0 && (
                    <Badge variant="destructive" className="ml-2 h-4 px-1.5 text-[10px]">
                      {unreadCountByCategory.tagged > 99 ? "99+" : unreadCountByCategory.tagged}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="status" className="relative">
                  Status
                  {unreadCountByCategory.status > 0 && (
                    <Badge variant="destructive" className="ml-2 h-4 px-1.5 text-[10px]">
                      {unreadCountByCategory.status > 99 ? "99+" : unreadCountByCategory.status}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border bg-white px-3 py-2">
                <label className="flex items-center gap-3 select-none">
                  <input
                    type="checkbox"
                    checked={allSelectedInView}
                    onChange={toggleAllInView}
                    className="accent-blue-600"
                  />
                  <div className="text-xs sm:text-sm">
                    <div className="font-medium text-gray-900">Select all (current tab)</div>
                    <div className="text-[11px] text-gray-500">
                      {selectedInViewCount} selected in view · {selected.length} total selected
                    </div>
                  </div>
                </label>

                <div className="flex gap-2">
                  <Button
                    disabled={selected.length === 0}
                    size="sm"
                    variant="outline"
                    onClick={handleMarkReadSelected}
                  >
                    Mark as read
                  </Button>
                  <Button
                    disabled={selected.length === 0}
                    size="sm"
                    variant="destructive"
                    onClick={handleDeleteSelected}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-3 sm:mt-4 flex-1 overflow-hidden rounded-xl border bg-white">
              <TabsContent value={activeTab} className="m-0">
                {filteredNotifications.length === 0 ? (
                  <div className="text-center text-gray-500 py-8 text-sm">No notifications</div>
                ) : (
                  <div className="divide-y overflow-y-auto max-h-[calc(80vh-220px)]">
                    {filteredNotifications.map((n) => {
                      const isRead = readNotifications.has(n.id);
                      const isSelected = selected.includes(n.id);

                      return (
                        <div
                          key={n.id}
                          className={
                            "group flex items-start gap-3 px-3 sm:px-4 py-3 sm:py-4 cursor-pointer transition " +
                            (isSelected
                              ? "bg-blue-50/50"
                              : "hover:bg-gray-50")
                          }
                          onClick={() => toggleSelect(n.id)}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(n.id)}
                            className="mt-1 accent-blue-600"
                            onClick={(e) => e.stopPropagation()}
                          />

                          <div className={
                            "mt-0.5 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border bg-gray-50 " +
                            (isRead ? "opacity-70" : "")
                          }>
                            {n.icon && React.createElement(n.icon, { className: "h-5 w-5 text-blue-600" })}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className={"truncate font-semibold text-sm " + (isRead ? "text-gray-600" : "text-gray-900")}>
                                  {n.title}
                                </div>
                                <div className={"mt-1 text-xs leading-relaxed " + (isRead ? "text-gray-500" : "text-gray-700")}>
                                  {n.message}
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                <span className="text-[11px] text-gray-400">{n.time}</span>
                                {!isRead && (
                                  <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
                                    New
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <DialogFooter className="p-4 border-t bg-gray-50 flex-row gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
