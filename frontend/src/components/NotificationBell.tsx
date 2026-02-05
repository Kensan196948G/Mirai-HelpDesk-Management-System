import React, { useEffect } from 'react';
import { Badge, Dropdown, List, Typography, Button, Space, Empty } from 'antd';
import {
  BellOutlined,
  FileTextOutlined,
  CommentOutlined,
  WarningOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore, Notification } from '@store/notificationStore';
import { connectSocket, disconnectSocket } from '@services/socketService';
import { useAuthStore } from '@store/authStore';

const { Text } = Typography;

const typeIcons: Record<string, React.ReactNode> = {
  'ticket:created': <FileTextOutlined style={{ color: '#1890ff' }} />,
  'ticket:updated': <FileTextOutlined style={{ color: '#faad14' }} />,
  'ticket:comment': <CommentOutlined style={{ color: '#52c41a' }} />,
  'sla:warning': <WarningOutlined style={{ color: '#ff4d4f' }} />,
  'notification:new': <BellOutlined style={{ color: '#1890ff' }} />,
};

const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const { notifications, unreadCount, addNotification, markAsRead, markAllAsRead } =
    useNotificationStore();

  useEffect(() => {
    if (!token) return;

    const socket = connectSocket();
    if (!socket) return;

    socket.on('ticket:created', (data: any) => {
      addNotification({
        type: 'ticket:created',
        title: '新規チケット',
        message: `${data.ticket?.ticket_number || ''}: ${data.ticket?.subject || '新しいチケットが作成されました'}`,
        ticketId: data.ticket?.ticket_id,
        ticketNumber: data.ticket?.ticket_number,
      });
    });

    socket.on('ticket:updated', (data: any) => {
      addNotification({
        type: 'ticket:updated',
        title: 'チケット更新',
        message: `${data.ticket?.ticket_number || ''}: チケットが更新されました`,
        ticketId: data.ticket?.ticket_id,
        ticketNumber: data.ticket?.ticket_number,
      });
    });

    socket.on('ticket:comment', (data: any) => {
      addNotification({
        type: 'ticket:comment',
        title: '新しいコメント',
        message: `チケットにコメントが追加されました`,
        ticketId: data.ticketId,
      });
    });

    socket.on('sla:warning', (data: any) => {
      addNotification({
        type: 'sla:warning',
        title: 'SLA警告',
        message: `${data.ticket?.ticket_number || ''}: SLA期限が迫っています`,
        ticketId: data.ticket?.ticket_id,
        ticketNumber: data.ticket?.ticket_number,
      });
    });

    socket.on('notification:new', (data: any) => {
      addNotification({
        type: 'notification:new',
        title: data.title || '通知',
        message: data.message || '',
      });
    });

    return () => {
      disconnectSocket();
    };
  }, [token, addNotification]);

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.ticketId) {
      navigate(`/tickets/${notification.ticketId}`);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '今';
    if (minutes < 60) return `${minutes}分前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}時間前`;
    return date.toLocaleDateString('ja-JP');
  };

  const dropdownContent = (
    <div
      style={{
        width: 360,
        maxHeight: 400,
        overflow: 'auto',
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <Text strong>通知</Text>
        {unreadCount > 0 && (
          <Button type="link" size="small" icon={<CheckOutlined />} onClick={markAllAsRead}>
            すべて既読
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Empty
          description="通知はありません"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ padding: '24px 0' }}
        />
      ) : (
        <List
          dataSource={notifications.slice(0, 20)}
          renderItem={(item) => (
            <List.Item
              onClick={() => handleNotificationClick(item)}
              style={{
                padding: '10px 16px',
                cursor: 'pointer',
                background: item.read ? 'transparent' : '#e6f7ff',
              }}
            >
              <List.Item.Meta
                avatar={typeIcons[item.type] || <BellOutlined />}
                title={
                  <Space>
                    <Text strong={!item.read} style={{ fontSize: 13 }}>
                      {item.title}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {formatTime(item.createdAt)}
                    </Text>
                  </Space>
                }
                description={
                  <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                    {item.message}
                  </Text>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <Dropdown
      dropdownRender={() => dropdownContent}
      trigger={['click']}
      placement="bottomRight"
    >
      <Badge count={unreadCount} size="small" offset={[-2, 2]}>
        <BellOutlined style={{ fontSize: 20, cursor: 'pointer' }} />
      </Badge>
    </Dropdown>
  );
};

export default NotificationBell;
