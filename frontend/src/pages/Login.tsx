import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { login } from '@services/authService';
import { useAuthStore } from '@store/authStore';
import './Login.css';

const { Title, Text } = Typography;

interface LoginForm {
  email: string;
  password: string;
}

const Login = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    try {
      const response = await login(values);

      if (response.success && response.data) {
        const { token, refreshToken, user } = response.data;
        setAuth(token, refreshToken, user);
        message.success('ログインしました');
        navigate('/');
      } else {
        message.error(response.error?.message || 'ログインに失敗しました');
      }
    } catch (error: any) {
      message.error('ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card" bordered={false}>
        <div className="login-header">
          <Title level={2}>Mirai ヘルプデスク</Title>
          <Text type="secondary">管理システムにログイン</Text>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'メールアドレスを入力してください' },
              { type: 'email', message: '有効なメールアドレスを入力してください' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="メールアドレス"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'パスワードを入力してください' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="パスワード"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
            >
              ログイン
            </Button>
          </Form.Item>
        </Form>

        <div className="login-demo-info">
          <Text type="secondary">デモユーザー:</Text>
          <ul>
            <li><Text code>admin@example.com</Text> (管理者)</li>
            <li><Text code>agent@example.com</Text> (エージェント)</li>
            <li><Text code>user@example.com</Text> (一般ユーザー)</li>
          </ul>
          <Text type="secondary">パスワード: <Text code>Admin123!</Text></Text>
        </div>
      </Card>
    </div>
  );
};

export default Login;
