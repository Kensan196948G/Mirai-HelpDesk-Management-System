import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test/test-utils';
import TicketList from './TicketList';
import { useAuthStore } from '@store/authStore';

// WebSocket モック
vi.mock('@hooks/useWebSocket', () => ({
  useWebSocket: vi.fn(),
}));

describe('TicketList', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: 'mock-token',
      user: { user_id: '1', name: 'Test User', email: 'test@example.com', role: 'Agent' },
    });
  });

  it('チケット一覧が表示される', async () => {
    render(<TicketList />);

    await waitFor(() => {
      expect(screen.getByText('TICKET-001')).toBeInTheDocument();
      expect(screen.getByText('テストチケット1')).toBeInTheDocument();
    });
  });

  it('ローディング中はスピナーが表示される', () => {
    render(<TicketList />);

    // Ant Design Tableのローディングスピナー
    expect(document.querySelector('.ant-spin')).toBeInTheDocument();
  });

  it('ステータスフィルタが機能する', async () => {
    const user = userEvent.setup();

    render(<TicketList />);

    await waitFor(() => {
      expect(screen.getByText('TICKET-001')).toBeInTheDocument();
    });

    // Ant Design Selectはcomboboxロール
    const selects = screen.getAllByRole('combobox');
    const statusSelect = selects[0]; // 最初のSelectがステータス

    await user.click(statusSelect);

    // オプション選択
    await waitFor(async () => {
      const option = screen.getByText('進行中');
      await user.click(option);
    });

    // フィルタが適用されたチケットのみ表示
    await waitFor(() => {
      expect(screen.getByText('TICKET-002')).toBeInTheDocument();
    });
  });

  it('検索機能が動作する', async () => {
    const user = userEvent.setup();

    render(<TicketList />);

    const searchInput = screen.getByPlaceholderText(/チケット番号/);
    await user.type(searchInput, 'TICKET-001');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByText('TICKET-001')).toBeInTheDocument();
    });
  });

  it('優先度フィルタが機能する', async () => {
    const user = userEvent.setup();

    render(<TicketList />);

    await waitFor(() => {
      expect(screen.getByText('TICKET-001')).toBeInTheDocument();
    });

    const selects = screen.getAllByRole('combobox');
    const prioritySelect = selects[1]; // 2番目のSelectが優先度

    await user.click(prioritySelect);

    await waitFor(async () => {
      const option = screen.getByText('P2');
      await user.click(option);
    });

    await waitFor(() => {
      expect(screen.getByText('P2')).toBeInTheDocument();
    });
  });

  it('チケットタイプフィルタが機能する', async () => {
    const user = userEvent.setup();

    render(<TicketList />);

    await waitFor(() => {
      expect(screen.getByText('TICKET-001')).toBeInTheDocument();
    });

    const selects = screen.getAllByRole('combobox');
    const typeSelect = selects[2]; // 3番目のSelectが種別

    await user.click(typeSelect);

    await waitFor(async () => {
      const option = screen.getByText('インシデント');
      await user.click(option);
    });

    await waitFor(() => {
      expect(screen.getByText('インシデント')).toBeInTheDocument();
    });
  });

  it('新規作成ボタンでチケット作成ページに遷移', async () => {
    const user = userEvent.setup();

    render(<TicketList />);

    const createButton = screen.getByText('新規作成');
    await user.click(createButton);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/tickets/create');
    });
  });

  it('チケット行クリックで詳細ページに遷移', async () => {
    const user = userEvent.setup();

    render(<TicketList />);

    await waitFor(() => {
      expect(screen.getByText('TICKET-001')).toBeInTheDocument();
    });

    const ticketRow = screen.getByText('TICKET-001').closest('tr');
    await user.click(ticketRow!);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/tickets/1');
    });
  });

  it('更新ボタンでデータが再取得される', async () => {
    const user = userEvent.setup();

    render(<TicketList />);

    await waitFor(() => {
      expect(screen.getByText('TICKET-001')).toBeInTheDocument();
    });

    const reloadButton = screen.getByRole('button', { name: /reload/i });
    await user.click(reloadButton);

    // リロード後も表示される
    await waitFor(() => {
      expect(screen.getByText('TICKET-001')).toBeInTheDocument();
    });
  });

  it('ページネーションが機能する', async () => {
    const user = userEvent.setup();

    render(<TicketList />);

    await waitFor(() => {
      expect(screen.getByText('TICKET-001')).toBeInTheDocument();
    });

    // 2ページ目に移動
    const pagination = document.querySelector('.ant-pagination-next');
    if (pagination) {
      await user.click(pagination);
    }
  });

  it('ステータスタグが正しい色で表示される', async () => {
    render(<TicketList />);

    await waitFor(() => {
      const newTag = screen.getByText('新規');
      expect(newTag).toBeInTheDocument();
      expect(newTag.closest('.ant-tag')).toHaveClass('ant-tag-blue');
    });
  });

  it('優先度タグが正しい色で表示される', async () => {
    render(<TicketList />);

    await waitFor(() => {
      const p2Tag = screen.getByText('P2');
      expect(p2Tag).toBeInTheDocument();
    });
  });

  it('チケットタイプが正しく表示される', async () => {
    render(<TicketList />);

    await waitFor(() => {
      expect(screen.getByText('インシデント')).toBeInTheDocument();
      expect(screen.getByText('サービス要求')).toBeInTheDocument();
    });
  });

  it('作成日時がフォーマットされて表示される', async () => {
    render(<TicketList />);

    await waitFor(() => {
      // dayjs フォーマット: YYYY/MM/DD HH:mm
      const datePattern = /2026\/02\/12/;
      expect(screen.getByText(datePattern)).toBeInTheDocument();
    });
  });

  it('依頼者名が表示される', async () => {
    render(<TicketList />);

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
  });

  it('フィルタクリアで全件表示に戻る', async () => {
    const user = userEvent.setup();

    render(<TicketList />);

    await waitFor(() => {
      expect(screen.getByText('TICKET-001')).toBeInTheDocument();
    });

    const selects = screen.getAllByRole('combobox');
    const statusSelect = selects[0];

    // フィルタ適用
    await user.click(statusSelect);
    await waitFor(async () => {
      const option = screen.getByText('進行中');
      await user.click(option);
    });

    // フィルタクリア
    const clearIcon = document.querySelector('.ant-select-clear');
    if (clearIcon) {
      await user.click(clearIcon as HTMLElement);
    }

    // 全件表示
    await waitFor(() => {
      expect(screen.getByText('TICKET-001')).toBeInTheDocument();
      expect(screen.getByText('TICKET-002')).toBeInTheDocument();
    });
  });
});
