import { Card, Descriptions, Typography, Tag, Space } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useAuthStore } from '@store/authStore';

const { Title } = Typography;

const Profile = () => {
  const { user } = useAuthStore();

  if (!user) {
    return null;
  }

  const roleLabels: Record<string, string> = {
    requester: '一般ユーザー',
    agent: 'エージェント',
    m365_operator: 'M365オペレーター',
    approver: '承認者',
    manager: '管理者',
    auditor: '監査者',
  };

  const roleColors: Record<string, string> = {
    requester: 'default',
    agent: 'blue',
    m365_operator: 'purple',
    approver: 'orange',
    manager: 'red',
    auditor: 'green',
  };

  return (
    <div>
      <Title level={2}>
        <UserOutlined /> プロフィール
      </Title>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Descriptions title="ユーザー情報" bordered column={1}>
            <Descriptions.Item label="表示名">
              {user.display_name}
            </Descriptions.Item>
            <Descriptions.Item label="メールアドレス">
              {user.email}
            </Descriptions.Item>
            <Descriptions.Item label="部署">
              {user.department || '未設定'}
            </Descriptions.Item>
            <Descriptions.Item label="役割">
              <Tag color={roleColors[user.role] || 'default'}>
                {roleLabels[user.role] || user.role}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="ユーザーID">
              <code>{user.user_id}</code>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="権限">
          <Space direction="vertical">
            <div>
              <strong>現在の役割:</strong> {roleLabels[user.role] || user.role}
            </div>
            <div>
              <strong>アクセス可能な機能:</strong>
              <ul style={{ marginTop: 8 }}>
                <li>チケットの作成・閲覧</li>
                {(user.role === 'agent' ||
                  user.role === 'm365_operator' ||
                  user.role === 'manager') && (
                  <>
                    <li>チケットの割り当て・更新</li>
                    <li>内部メモの作成</li>
                  </>
                )}
                {(user.role === 'm365_operator' || user.role === 'manager') && (
                  <li>M365タスクの実行</li>
                )}
                {(user.role === 'approver' || user.role === 'manager') && (
                  <li>承認・却下の実行</li>
                )}
                {user.role === 'manager' && (
                  <>
                    <li>KPIダッシュボードの閲覧</li>
                    <li>システム設定の管理</li>
                  </>
                )}
                {user.role === 'auditor' && <li>監査ログの閲覧</li>}
              </ul>
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default Profile;
