import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test/test-utils';
import NotFound from './NotFound';

describe('NotFound', () => {
  it('404ページが表示される', () => {
    render(<NotFound />);

    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('エラーメッセージが表示される', () => {
    render(<NotFound />);

    expect(screen.getByText('お探しのページが見つかりませんでした。')).toBeInTheDocument();
  });

  it('ダッシュボードに戻るボタンが表示される', () => {
    render(<NotFound />);

    expect(screen.getByText('ダッシュボードに戻る')).toBeInTheDocument();
  });

  it('ボタンクリックでダッシュボードに遷移', async () => {
    const user = userEvent.setup();

    render(<NotFound />);

    const button = screen.getByText('ダッシュボードに戻る');
    await user.click(button);

    expect(window.location.pathname).toBe('/');
  });
});
