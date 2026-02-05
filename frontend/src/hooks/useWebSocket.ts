import { useEffect, useRef, useCallback } from 'react';
import { connectSocket, getSocket } from '@services/socketService';
import { useAuthStore } from '@store/authStore';

type EventHandler = (data: any) => void;

interface UseWebSocketOptions {
  /** 購読するイベント名とハンドラのマップ */
  events?: Record<string, EventHandler>;
  /** 参加するチケットルーム（チケットIDを指定） */
  joinTicket?: string;
  /** 接続を有効にするか（デフォルト: true） */
  enabled?: boolean;
}

/**
 * WebSocket イベントを購読する React Hook
 *
 * socket.io のイベントリスナーを React ライフサイクルに統合し、
 * マウント時に接続・購読、アンマウント時にクリーンアップを行う。
 *
 * @example
 * // チケット一覧でリアルタイム更新を受信
 * useWebSocket({
 *   events: {
 *     'ticket:created': () => queryClient.invalidateQueries({ queryKey: ['tickets'] }),
 *     'ticket:updated': () => queryClient.invalidateQueries({ queryKey: ['tickets'] }),
 *   },
 * });
 *
 * @example
 * // チケット詳細ページでルーム参加＋リアルタイム更新
 * useWebSocket({
 *   joinTicket: ticketId,
 *   events: {
 *     'ticket:updated': (data) => {
 *       if (data.ticketId === ticketId) refetch();
 *     },
 *     'ticket:comment': (data) => {
 *       if (data.ticketId === ticketId) refetch();
 *     },
 *   },
 * });
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { events = {}, joinTicket, enabled = true } = options;
  const { token } = useAuthStore();
  const joinedRoomRef = useRef<string | null>(null);

  // イベントハンドラの最新版を保持する ref（再レンダリング時にリスナーを付け直さない）
  const eventsRef = useRef(events);
  eventsRef.current = events;

  const emit = useCallback((event: string, data?: any) => {
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit(event, data);
    }
  }, []);

  useEffect(() => {
    if (!enabled || !token) return;

    const socket = connectSocket();
    if (!socket) return;

    // イベントリスナー登録（ラッパー経由で最新のハンドラを呼ぶ）
    const handlers: Record<string, EventHandler> = {};
    for (const eventName of Object.keys(eventsRef.current)) {
      const handler: EventHandler = (data) => {
        eventsRef.current[eventName]?.(data);
      };
      handlers[eventName] = handler;
      socket.on(eventName, handler);
    }

    // チケットルームに参加
    if (joinTicket) {
      socket.emit('join:ticket', joinTicket);
      joinedRoomRef.current = joinTicket;
    }

    return () => {
      // イベントリスナー解除
      for (const [eventName, handler] of Object.entries(handlers)) {
        socket.off(eventName, handler);
      }

      // チケットルームから退出
      if (joinedRoomRef.current) {
        socket.emit('leave:ticket', joinedRoomRef.current);
        joinedRoomRef.current = null;
      }
    };
  }, [enabled, token, joinTicket]);

  return { emit };
}
