import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test/test-utils';
import Login from './Login';
import { useAuthStore } from '@store/authStore';

describe('Login', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null, refreshToken: null });
  });

  it('ログインフォームが表示される', () => {
    render(<Login />);

    expect(screen.getByText('Mirai ヘルプデスク')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('メールアドレス')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('パスワード')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ログイン/ })).toBeInTheDocument();
  });

  it('バリデーションエラーが表示される', async () => {
    const user = userEvent.setup();

    render(<Login />);

    const loginButton = screen.getByRole('button', { name: /ログイン/ });
    await user.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText('メールアドレスを入力してください')).toBeInTheDocument();
      expect(screen.getByText('パスワードを入力してください')).toBeInTheDocument();
    });
  });

  it('メールアドレスフォーマットエラーが表示される', async () => {
    const user = userEvent.setup();

    render(<Login />);

    const emailInput = screen.getByPlaceholderText('メールアドレス');
    await user.type(emailInput, 'invalid-email');

    const loginButton = screen.getByRole('button', { name: /ログイン/ });
    await user.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText('有効なメールアドレスを入力してください')).toBeInTheDocument();
    });
  });

  it('ログイン成功時にダッシュボードに遷移', async () => {
    const user = userEvent.setup();

    render(<Login />);

    const emailInput = screen.getByPlaceholderText('メールアドレス');
    const passwordInput = screen.getByPlaceholderText('パスワード');

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    const loginButton = screen.getByRole('button', { name: /ログイン/ });
    await user.click(loginButton);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/');
    });
  });

  it('ログイン成功時にトークンが保存される', async () => {
    const user = userEvent.setup();

    render(<Login />);

    const emailInput = screen.getByPlaceholderText('メールアドレス');
    const passwordInput = screen.getByPlaceholderText('パスワード');

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    const loginButton = screen.getByRole('button', { name: /ログイン/ });
    await user.click(loginButton);

    await waitFor(() => {
      const state = useAuthStore.getState();
      expect(state.token).toBe('mock-token');
      expect(state.user?.email).toBe('test@example.com');
    });
  });

  it('ローディング中はボタンが無効化される', async () => {
    const user = userEvent.setup();

    render(<Login />);

    const emailInput = screen.getByPlaceholderText('メールアドレス');
    const passwordInput = screen.getByPlaceholderText('パスワード');

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    const loginButton = screen.getByRole('button', { name: /ログイン/ });
    await user.click(loginButton);

    // ローディング中の確認（即座にチェック）
    expect(loginButton).toBeDisabled();
  });

  it('パスワードフィールドがマスクされている', () => {
    render(<Login />);

    const passwordInput = screen.getByPlaceholderText('パスワード');
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('メールアドレスフィールドにアイコンが表示される', () => {
    render(<Login />);

    const emailInput = screen.getByPlaceholderText('メールアドレス');
    expect(emailInput.parentElement?.querySelector('.anticon-user')).toBeInTheDocument();
  });

  it('パスワードフィールドにアイコンが表示される', () => {
    render(<Login />);

    const passwordInput = screen.getByPlaceholderText('パスワード');
    expect(passwordInput.parentElement?.querySelector('.anticon-lock')).toBeInTheDocument();
  });
});
