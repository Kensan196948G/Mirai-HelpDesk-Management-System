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
      label: 'ログアウト',
      onClick: handleLogout,
    },
  ];

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: 'ダッシュボード',
    },
    {
      key: '/tickets',
      icon: <FileTextOutlined />,
      label: 'チケット',
      children: [
        {
          key: '/tickets',
          label: '一覧',
        },
        {
          key: '/tickets/new',
          icon: <PlusOutlined />,
          label: '新規作成',
        },
      ],
    },
    {
      key: '/knowledge',
      icon: <BookOutlined />,
      label: 'ナレッジベース',
    },
  ];

  // M365 Operatorと管理者のみ表示
  if (user?.role === 'm365_operator' || user?.role === 'manager') {
    menuItems.push({
      key: '/m365',
      icon: <CloudOutlined />,
      label: 'M365タスク',
      children: [
        {
          key: '/m365/tasks',
          label: 'タスク一覧',
        },
      ],
    });
  }

  // Approverと管理者のみ表示
  if (user?.role === 'approver' || user?.role === 'manager') {
    menuItems.push({
      key: '/approvals',
      icon: <CheckCircleOutlined />,
      label: '承認',
    });
  }

  // Managerと監査担当者のみ表示
  if (user?.role === 'manager' || user?.role === 'auditor') {
    menuItems.push({
      key: '/audit-logs',
      icon: <AuditOutlined />,
      label: '監査ログ',
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
          {!collapsed && <Text strong>Mirai ヘルプデスク</Text>}
          {collapsed && <Text strong>M</Text>}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['/tickets']}
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
                <div className="user-info">
                  <Text strong>{user?.display_name}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {user?.department}
                  </Text>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="dashboard-content">{children}</Content>
      </Layout>
    </Layout>
  );
};

export default DashboardLayout;
