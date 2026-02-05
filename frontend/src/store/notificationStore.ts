import { create } from 'zustand';

export interface Notification {
  id: string;
  type: 'ticket:created' | 'ticket:updated' | 'ticket:comment' | 'sla:warning' | 'notification:new';
  title: string;
  message: string;
  ticketId?: string;
  ticketNumber?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification) =>
    set((state) => {
      const newNotification: Notification = {
        ...notification,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        read: false,
        createdAt: new Date().toISOString(),
      };
      const updated = [newNotification, ...state.notifications].slice(0, 50); // 最大50件
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    }),

  markAsRead: (id) =>
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    }),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  clearAll: () =>
    set({ notifications: [], unreadCount: 0 }),
}));
