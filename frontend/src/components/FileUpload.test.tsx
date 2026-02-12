import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test/test-utils';
import FileUpload from './FileUpload';

describe('FileUpload', () => {
  it('ファイル選択ボタンが表示される', () => {
    render(<FileUpload ticketId="1" />);

    expect(screen.getByText('ファイルを選択')).toBeInTheDocument();
  });

  it('ドラッガーモードが表示される', () => {
    render(<FileUpload ticketId="1" dragger />);

    expect(screen.getByText(/クリックまたはドラッグしてファイルをアップロード/)).toBeInTheDocument();
  });

  it('許可されているファイル形式が表示される', () => {
    render(<FileUpload ticketId="1" />);

    expect(screen.getByText(/\.jpg/)).toBeInTheDocument();
    expect(screen.getByText(/\.pdf/)).toBeInTheDocument();
  });

  it('ファイルサイズ制限が表示される', () => {
    render(<FileUpload ticketId="1" />);

    expect(screen.getByText(/10MB/)).toBeInTheDocument();
  });

  it('エビデンスファイルの警告が表示される', () => {
    render(<FileUpload ticketId="1" isEvidence />);

    expect(screen.getByText(/エビデンスファイルとしてマークされます/)).toBeInTheDocument();
  });

  it('disabledプロパティでボタンが無効化される', () => {
    render(<FileUpload ticketId="1" disabled />);

    const selectButton = screen.getByText('ファイルを選択');
    const uploadButton = screen.getByText('アップロード');

    expect(selectButton).toBeDisabled();
    expect(uploadButton).toBeDisabled();
  });

  it('ファイル未選択時はアップロードボタンが無効化される', () => {
    render(<FileUpload ticketId="1" />);

    const uploadButton = screen.getByText('アップロード');
    expect(uploadButton).toBeDisabled();
  });

  it('ファイル選択後にアップロードボタンが有効化される', async () => {
    const user = userEvent.setup();

    render(<FileUpload ticketId="1" />);

    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(input, file);

    await waitFor(() => {
      const uploadButton = screen.getByText('アップロード');
      expect(uploadButton).not.toBeDisabled();
    });
  });

  it('アップロード成功時にコールバックが呼ばれる', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    render(<FileUpload ticketId="1" onUploadSuccess={onSuccess} />);

    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(input, file);

    const uploadButton = screen.getByText('アップロード');
    await user.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText(/正常にアップロードされました/)).toBeInTheDocument();
    });
  });

  it('複数ファイルが選択できる', async () => {
    const user = userEvent.setup();

    render(<FileUpload ticketId="1" multiple />);

    const file1 = new File(['content1'], 'test1.txt', { type: 'text/plain' });
    const file2 = new File(['content2'], 'test2.txt', { type: 'text/plain' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(input, [file1, file2]);

    await waitFor(() => {
      expect(screen.getByText('test1.txt')).toBeInTheDocument();
      expect(screen.getByText('test2.txt')).toBeInTheDocument();
    });
  });

  it('maxCountが設定されている場合に上限を超えない', () => {
    render(<FileUpload ticketId="1" maxCount={3} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
  });
});
