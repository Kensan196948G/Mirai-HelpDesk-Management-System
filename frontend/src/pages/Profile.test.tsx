import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import Profile from './Profile';
import { useAuthStore } from '@store/authStore';

describe('Profile', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: 'mock-token',
      user: {
        user_id: '1',
        name: 'Test User',
        display_name: 'テストユーザー',
        email: 'test@example.com',
        role: 'Agent',
        department: 'IT部門',
      },
    });
  });

  it('プロフィールページが表示される', () => {
    render(<Profile />);

    expect(screen.getByText('プロフィール')).toBeInTheDocument();
  });

  it('ユーザー名が表示される', () => {
    render(<Profile />);

    expect(screen.getByText('テストユーザー')).toBeInTheDocument();
  });

  it('メールアドレスが表示される', () => {
    render(<Profile />);

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('部署が表示される', () => {
    render(<Profile />);

    expect(screen.getByText('IT部門')).toBeInTheDocument();
  });

  it('役割が表示される', () => {
    render(<Profile />);

    expect(screen.getByText(/エージェント/)).toBeInTheDocument();
  });

  it('ユーザー情報がない場合は何も表示しない', () => {
    useAuthStore.setState({ user: null });

    const { container } = render(<Profile />);

    expect(container.firstChild).toBeNull();
  });
});
