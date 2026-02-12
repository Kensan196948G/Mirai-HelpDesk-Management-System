import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test/test-utils';
import MarkdownEditor from './MarkdownEditor';

describe('MarkdownEditor', () => {
  it('エディタが表示される', () => {
    const onChange = vi.fn();

    render(<MarkdownEditor value="" onChange={onChange} />);

    expect(screen.getByPlaceholderText(/Markdownで記述してください/)).toBeInTheDocument();
  });

  it('初期値が表示される', () => {
    const onChange = vi.fn();

    render(<MarkdownEditor value="# テスト" onChange={onChange} />);

    expect(screen.getByText('# テスト')).toBeInTheDocument();
  });

  it('テキスト入力でonChangeが呼ばれる', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<MarkdownEditor value="" onChange={onChange} />);

    const textarea = screen.getByPlaceholderText(/Markdownで記述してください/);
    await user.type(textarea, 'Hello');

    expect(onChange).toHaveBeenCalled();
  });

  it('プレビュータブに切り替えられる', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<MarkdownEditor value="# タイトル" onChange={onChange} />);

    const previewTab = screen.getByText('プレビュー');
    await user.click(previewTab);

    // プレビューが表示される
    expect(screen.getByText('プレビュー')).toBeInTheDocument();
  });

  it('太字ボタンが表示される', () => {
    const onChange = vi.fn();

    render(<MarkdownEditor value="" onChange={onChange} />);

    const boldButton = document.querySelector('[aria-label="bold"]');
    expect(boldButton).toBeInTheDocument();
  });

  it('イタリックボタンが表示される', () => {
    const onChange = vi.fn();

    render(<MarkdownEditor value="" onChange={onChange} />);

    const italicButton = document.querySelector('[aria-label="italic"]');
    expect(italicButton).toBeInTheDocument();
  });

  it('リンクボタンが表示される', () => {
    const onChange = vi.fn();

    render(<MarkdownEditor value="" onChange={onChange} />);

    const linkButton = document.querySelector('[aria-label="link"]');
    expect(linkButton).toBeInTheDocument();
  });

  it('コードボタンが表示される', () => {
    const onChange = vi.fn();

    render(<MarkdownEditor value="" onChange={onChange} />);

    const codeButton = document.querySelector('[aria-label="code"]');
    expect(codeButton).toBeInTheDocument();
  });
});
