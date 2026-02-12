import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test/test-utils';
import TicketCreate from './TicketCreate';
import { useAuthStore } from '@store/authStore';

describe('TicketCreate', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: 'mock-token',
      user: { user_id: '1', name: 'Test User', email: 'test@example.com', role: 'Agent' },
    });
  });

  it('チケット作成フォームが表示される', () => {
    render(<TicketCreate />);

    expect(screen.getByText('新規チケット作成')).toBeInTheDocument();
    expect(screen.getByLabelText('種別')).toBeInTheDocument();
    expect(screen.getByLabelText('件名')).toBeInTheDocument();
    expect(screen.getByLabelText('説明')).toBeInTheDocument();
  });

  it('必須項目未入力でバリデーションエラーが表示される', async () => {
    const user = userEvent.setup();

    render(<TicketCreate />);

    const submitButton = screen.getByText('作成');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/件名を入力してください/)).toBeInTheDocument();
    });
  });

  it('チケット作成が成功する', async () => {
    const user = userEvent.setup();

    render(<TicketCreate />);

    // 種別選択
    const typeSelect = screen.getByLabelText('種別');
    await user.click(typeSelect);
    await waitFor(async () => {
      const option = screen.getByText('インシデント');
      await user.click(option);
    });

    // 件名入力
    const subjectInput = screen.getByLabelText('件名');
    await user.type(subjectInput, 'テストチケット');

    // 説明入力
    const descriptionInput = screen.getByLabelText('説明');
    await user.type(descriptionInput, 'テスト説明');

    // 影響度選択
    const impactSelect = screen.getByLabelText('影響度');
    await user.click(impactSelect);
    await waitFor(async () => {
      const option = screen.getByText('個人');
      await user.click(option);
    });

    // 緊急度選択
    const urgencySelect = screen.getByLabelText('緊急度');
    await user.click(urgencySelect);
    await waitFor(async () => {
      const option = screen.getByText('中');
      await user.click(option);
    });

    // 送信
    const submitButton = screen.getByText('作成');
    await user.click(submitButton);

    // 成功後に遷移
    await waitFor(() => {
      expect(window.location.pathname).toBe('/tickets/999');
    });
  });

  it('カテゴリが選択できる', async () => {
    const user = userEvent.setup();

    render(<TicketCreate />);

    await waitFor(() => {
      expect(screen.getByLabelText('カテゴリ')).toBeInTheDocument();
    });

    const categorySelect = screen.getByLabelText('カテゴリ');
    await user.click(categorySelect);

    await waitFor(async () => {
      const option = screen.getByText('システム障害');
      await user.click(option);
    });

    expect(categorySelect).toHaveValue('1');
  });

  it('AI分類ウィジェットが表示される', async () => {
    render(<TicketCreate />);

    await waitFor(() => {
      expect(screen.getByText(/AI分類/)).toBeInTheDocument();
    });
  });

  it('キャンセルボタンで一覧ページに戻る', async () => {
    const user = userEvent.setup();

    render(<TicketCreate />);

    const cancelButton = screen.getByText('キャンセル');
    await user.click(cancelButton);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/tickets');
    });
  });

  it('種別が選択できる', async () => {
    const user = userEvent.setup();

    render(<TicketCreate />);

    const typeSelect = screen.getByLabelText('種別');
    await user.click(typeSelect);

    await waitFor(() => {
      expect(screen.getByText('インシデント')).toBeInTheDocument();
      expect(screen.getByText('サービス要求')).toBeInTheDocument();
    });
  });

  it('影響度が選択できる', async () => {
    const user = userEvent.setup();

    render(<TicketCreate />);

    const impactSelect = screen.getByLabelText('影響度');
    await user.click(impactSelect);

    await waitFor(() => {
      expect(screen.getByText('個人')).toBeInTheDocument();
      expect(screen.getByText('部署')).toBeInTheDocument();
      expect(screen.getByText('全社')).toBeInTheDocument();
    });
  });

  it('緊急度が選択できる', async () => {
    const user = userEvent.setup();

    render(<TicketCreate />);

    const urgencySelect = screen.getByLabelText('緊急度');
    await user.click(urgencySelect);

    await waitFor(() => {
      expect(screen.getByText('低')).toBeInTheDocument();
      expect(screen.getByText('中')).toBeInTheDocument();
      expect(screen.getByText('高')).toBeInTheDocument();
    });
  });
});
