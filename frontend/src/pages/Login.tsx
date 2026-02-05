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
  const [errorMessage, setErrorMessage] = useState<string>('');
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const response = await login(values);

      if (response.success && response.data) {
        const { token, refreshToken, user } = response.data;
        setAuth(token, refreshToken, user);
        message.success('ログインしました');
        navigate('/');
      } else {
        const errorMsg = response.error?.message || 'ログインに失敗しました';
        setErrorMessage(errorMsg);
        message.error(errorMsg);
      }
    } catch (error: any) {
      const errorMsg = 'ログインに失敗しました';
      setErrorMessage(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card id="login-modal" className="login-card" variant="borderless">
        <div className="login-header">
          <Title level={2}>Mirai ヘルプデスク</Title>
          <Text type="secondary">管理システムにログイン</Text>
        </div>

        <Form
          id="login-form"
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          {errorMessage && (
            <div id="login-error" style={{ color: '#ff4d4f', marginBottom: '16px', padding: '8px', backgroundColor: '#fff2f0', border: '1px solid #ffccc7', borderRadius: '4px' }}>
              {errorMessage}
            </div>
          )}
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'メールアドレスを入力してください' },
              { type: 'email', message: '有効なメールアドレスを入力してください' },
            ]}
          >
            <Input
              id="login-email"
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
              id="login-password"
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
