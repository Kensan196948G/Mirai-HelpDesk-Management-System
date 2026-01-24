import { useState, useCallback } from 'react';
import { message } from 'antd';
import { apiClient } from '@services/api';

interface Attachment {
  attachment_id: string;
  ticket_id: string;
  uploader_id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  is_evidence: boolean;
  created_at: string;
}

interface UseFileUploadOptions {
  onSuccess?: (attachments: Attachment[]) => void;
  onError?: (error: Error) => void;
}

interface UseFileUploadReturn {
  uploading: boolean;
  uploadFiles: (ticketId: string, files: File[], isEvidence?: boolean) => Promise<void>;
  downloadFile: (attachmentId: string, filename: string) => Promise<void>;
  deleteFile: (attachmentId: string) => Promise<void>;
  getAttachments: (ticketId: string) => Promise<Attachment[]>;
}

export const useFileUpload = (options?: UseFileUploadOptions): UseFileUploadReturn => {
  const [uploading, setUploading] = useState(false);

  // ファイルアップロード
  const uploadFiles = useCallback(
    async (ticketId: string, files: File[], isEvidence: boolean = false) => {
      if (!files || files.length === 0) {
        message.warning('アップロードするファイルを選択してください。');
        return;
      }

      setUploading(true);

      try {
        const formData = new FormData();
        files.forEach((file) => {
          formData.append('files', file);
        });

        if (isEvidence) {
          formData.append('is_evidence', 'true');
        }

        const response = await apiClient.post(
          `/tickets/${ticketId}/attachments`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        if (response.data.success) {
          message.success(`${files.length}個のファイルが正常にアップロードされました。`);
          if (options?.onSuccess) {
            options.onSuccess(response.data.data.attachments);
          }
        } else {
          throw new Error(response.data.error?.message || 'アップロードに失敗しました。');
        }
      } catch (error: any) {
        console.error('Upload error:', error);
        const errorMessage = error.response?.data?.error?.message || error.message || 'アップロードに失敗しました。';
        message.error(`アップロードエラー: ${errorMessage}`);
        if (options?.onError) {
          options.onError(error);
        }
        throw error;
      } finally {
        setUploading(false);
      }
    },
    [options]
  );

  // ファイルダウンロード
  const downloadFile = useCallback(async (attachmentId: string, filename: string) => {
    try {
      const response = await apiClient.get(`/attachments/${attachmentId}/download`, {
        responseType: 'blob',
      });

      // Blobからダウンロードリンクを作成
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      message.success('ファイルのダウンロードが開始されました。');
    } catch (error: any) {
      console.error('Download error:', error);
      const errorMessage = error.response?.data?.error?.message || error.message || 'ダウンロードに失敗しました。';
      message.error(`ダウンロードエラー: ${errorMessage}`);
      throw error;
    }
  }, []);

  // ファイル削除
  const deleteFile = useCallback(async (attachmentId: string) => {
    try {
      const response = await apiClient.delete(`/attachments/${attachmentId}`);

      if (response.data.success) {
        message.success('ファイルが削除されました。');
      } else {
        throw new Error(response.data.error?.message || '削除に失敗しました。');
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      const errorMessage = error.response?.data?.error?.message || error.message || '削除に失敗しました。';
      message.error(`削除エラー: ${errorMessage}`);
      throw error;
    }
  }, []);

  // チケットの添付ファイル一覧取得
  const getAttachments = useCallback(async (ticketId: string): Promise<Attachment[]> => {
    try {
      const response = await apiClient.get(`/tickets/${ticketId}/attachments`);

      if (response.data.success) {
        return response.data.data.attachments;
      } else {
        throw new Error(response.data.error?.message || '添付ファイルの取得に失敗しました。');
      }
    } catch (error: any) {
      console.error('Get attachments error:', error);
      const errorMessage = error.response?.data?.error?.message || error.message || '添付ファイルの取得に失敗しました。';
      message.error(`エラー: ${errorMessage}`);
      throw error;
    }
  }, []);

  return {
    uploading,
    uploadFiles,
    downloadFile,
    deleteFile,
    getAttachments,
  };
};

export default useFileUpload;
