import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@store/authStore';

let socket: Socket | null = null;

/**
 * WebSocket 接続を確立する
 * JWT トークンを認証に使用し、自動再接続を有効にする
 */
export function connectSocket(): Socket | null {
  const { token } = useAuthStore.getState();
  if (!token) return null;

  // 既に接続済みの場合はそのまま返す
  if (socket?.connected) return socket;

  // 前の接続があれば切断
  if (socket) {
    socket.disconnect();
  }

  // Viteプロキシ経由の場合はパスのみ、直接接続の場合はフルURL
  const baseUrl = import.meta.env.VITE_API_BASE_URL
    ? new URL(import.meta.env.VITE_API_BASE_URL).origin
    : window.location.origin;

  socket = io(baseUrl, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 30000,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('[WebSocket] Connected');
  });

  socket.on('disconnect', (reason) => {
    console.log('[WebSocket] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.warn('[WebSocket] Connection error:', error.message);
  });

  return socket;
}

/**
 * WebSocket 接続を切断する
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * 現在のソケットインスタンスを取得する
 */
export function getSocket(): Socket | null {
  return socket;
}
