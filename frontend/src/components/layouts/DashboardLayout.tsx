import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Typography, Badge } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  FileTextOutlined,
  BookOutlined,
  CheckCircleOutlined,
  CloudOutlined,
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
  PlusOutlined,
  AuditOutlined,
  CustomerServiceOutlined,
  RobotOutlined,
  SearchOutlined,
  BulbOutlined,
  CommentOutlined,
  BarChartOutlined,
  TeamOutlined,
  SettingOutlined,
  SafetyOutlined,
  ApiOutlined,
  NotificationOutlined,
  LinkOutlined,
  DatabaseOutlined,
  HistoryOutlined,
  FolderOutlined,
  FireOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@store/authStore';
import { logout } from '@services/authService';
import './DashboardLayout.css';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      // エラーを無視してログアウト
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'プロフィール',
      onClick: () => navigate('/profile'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: <span id="logout-btn">ログアウト</span>,
      onClick: handleLogout,
    },
  ];

  const menuItems = [
    // ダッシュボード（アコーディオン式）
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'ダッシュボード',
      children: [
        {
          key: '/',
          label: '概要',
        },
        {
          key: '/analytics',
          label: '分析レポート',
        },
        {
          key: '/monitoring',
          label: 'リアルタイム監視',
        },
      ],
    },

    // AI機能（アコーディオン式）
    {
      key: 'ai',
      icon: <RobotOutlined />,
      label: 'AI機能',
      children: [
        {
          key: '/ai/chat',
          icon: <CommentOutlined />,
          label: 'AI対話アシスタント',
        },
        {
          key: '/ai/search',
          icon: <SearchOutlined />,
          label: 'AI検索',
        },
        {
          key: '/ai/analyze',
          label: 'AI分析',
        },
        {
          key: '/ai/recommend',
          icon: <BulbOutlined />,
          label: 'AI推奨',
        },
      ],
    },

    // ナレッジ管理（アコーディオン式）
    {
      key: 'knowledge',
      icon: <BookOutlined />,
      label: 'ナレッジ管理',
      children: [
        {
          key: '/knowledge/new',
          icon: <PlusOutlined />,
          label: '新規作成',
        },
        {
          key: '/knowledge',
          label: '一覧・閲覧',
        },
        {
          key: '/knowledge/search',
          label: '高度な検索',
        },
        {
          key: '/knowledge/category',
          icon: <FolderOutlined />,
          label: 'カテゴリ管理',
        },
      ],
    },

    // インシデント管理（アコーディオン式）
    {
      key: 'incidents',
      icon: <FileTextOutlined />,
      label: 'インシデント管理',
      children: [
        {
          key: '/tickets',
          label: '対応一覧',
        },
        {
          key: '/tickets/new',
          icon: <PlusOutlined />,
          label: '新規作成',
        },
        {
          key: '/tickets/history',
          label: '履歴',
        },
      ],
    },
  ];

  // SLA管理
  menuItems.push({
    key: 'sla',
    icon: <ClockCircleOutlined />,
    label: 'SLA管理',
    children: [
      {
        key: '/sla',
        label: 'SLAポリシー',
      },
    ],
  });

  // M365タスク（M365 Operatorと管理者のみ）
  if (user?.role === 'm365_operator' || user?.role === 'manager') {
    menuItems.push({
      key: 'm365',
      icon: <CloudOutlined />,
      label: 'Microsoft 365',
      children: [
        {
          key: '/m365/tasks',
          label: 'タスク一覧',
        },
      ],
    });
  }

  // 承認（Approverと管理者のみ）
  if (user?.role === 'approver' || user?.role === 'manager') {
    menuItems.push({
      key: 'approvals',
      icon: <CheckCircleOutlined />,
      label: '承認管理',
      children: [
        {
          key: '/approvals',
          label: '承認待ち',
        },
      ],
    });
  }

  // ユーザー・チーム（Managerのみ）
  if (user?.role === 'manager') {
    menuItems.push({
      key: 'users-teams',
      icon: <TeamOutlined />,
      label: 'ユーザー・チーム',
      children: [
        {
          key: '/users',
          label: 'ユーザー管理',
        },
        {
          key: '/teams',
          label: 'チーム管理',
        },
        {
          key: '/permissions',
          icon: <SafetyOutlined />,
          label: '権限設定',
        },
      ],
    });
  }

  // システム設定（Managerのみ）
  if (user?.role === 'manager') {
    menuItems.push({
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'システム設定',
      children: [
        {
          key: '/settings/general',
          label: '一般設定',
        },
        {
          key: '/settings/api',
          icon: <ApiOutlined />,
          label: 'API設定',
        },
        {
          key: '/settings/notification',
          icon: <NotificationOutlined />,
          label: '通知設定',
        },
        {
          key: '/settings/integration',
          icon: <LinkOutlined />,
          label: '連携設定',
        },
        {
          key: '/settings/backup',
          icon: <DatabaseOutlined />,
          label: 'バックアップ',
        },
      ],
    });
  }

  // 監査ログ（Managerと監査担当者のみ）
  if (user?.role === 'manager' || user?.role === 'auditor') {
    menuItems.push({
      key: 'audit',
      icon: <AuditOutlined />,
      label: '監査',
      children: [
        {
          key: '/audit-logs',
          label: '監査ログ',
        },
      ],
    });
  }

  return (
    <Layout className="dashboard-layout">
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="light"
        width={250}
      >
        <div className="logo">
          <CustomerServiceOutlined style={{ fontSize: '24px', color: '#1890ff', marginRight: collapsed ? '0' : '12px' }} />
          {!collapsed && <Text strong>Mirai ヘルプデスク</Text>}
        </div>
        <Menu
          id="nav-menu"
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['dashboard', 'ai', 'knowledge', 'incidents']}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header className="dashboard-header">
          <div className="header-left"></div>
          <div className="header-right">
            <Badge count={0}>
              <BellOutlined style={{ fontSize: 20, cursor: 'pointer' }} />
            </Badge>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div className="user-profile">
                <Avatar icon={<UserOutlined />} />
                <div id="user-info" className="user-info">
                  <Text strong>{user?.display_name}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {user?.department}
                  </Text>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content id="page-content" className="dashboard-content">{children}</Content>
      </Layout>
    </Layout>
  );
};

export default DashboardLayout;
