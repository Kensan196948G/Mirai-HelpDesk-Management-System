import React, { useState } from 'react';
import { Upload, Button, message, Progress, Space } from 'antd';
import { UploadOutlined, InboxOutlined } from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd';
import { RcFile } from 'antd/es/upload';

// 許可されたファイルタイプ
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
  'text/x-log',
];

// 許可された拡張子
const ALLOWED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.zip',
  '.txt',
  '.log',
];

// ファイルサイズ制限（10MB）
const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface FileUploadProps {
  ticketId: string;
  onUploadSuccess?: (attachments: any[]) => void;
  onUploadError?: (error: Error) => void;
  multiple?: boolean;
  maxCount?: number;
  dragger?: boolean;
  isEvidence?: boolean;
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  ticketId,
  onUploadSuccess,
  onUploadError,
  multiple = true,
  maxCount = 10,
  dragger = false,
  isEvidence = false,
  disabled = false,
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  // ファイルバリデーション
  const beforeUpload = (file: RcFile): boolean => {
    // ファイルタイプチェック
    const isAllowedType = ALLOWED_FILE_TYPES.includes(file.type);
    if (!isAllowedType) {
      message.error(
        `${file.name} は許可されていないファイル形式です。許可されている形式: ${ALLOWED_EXTENSIONS.join(', ')}`
      );
      return false;
    }

    // 拡張子チェック
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isAllowedExtension = ALLOWED_EXTENSIONS.includes(extension);
    if (!isAllowedExtension) {
      message.error(
        `${file.name} は許可されていない拡張子です。許可されている拡張子: ${ALLOWED_EXTENSIONS.join(', ')}`
      );
      return false;
    }

    // ファイルサイズチェック
    const isLt10M = file.size <= MAX_FILE_SIZE;
    if (!isLt10M) {
      message.error(`${file.name} のサイズが10MBを超えています。`);
      return false;
    }

    return false; // 自動アップロードを無効化（手動でアップロード）
  };

  // ファイルリスト変更時の処理
  const handleChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  // ファイルアップロード処理
  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.warning('アップロードするファイルを選択してください。');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      fileList.forEach((file) => {
        if (file.originFileObj) {
          formData.append('files', file.originFileObj);
        }
      });

      if (isEvidence) {
        formData.append('is_evidence', 'true');
      }

      // APIエンドポイントからトークンを取得
      const token = localStorage.getItem('authToken');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

      const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/attachments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        message.success(`${fileList.length}個のファイルが正常にアップロードされました。`);
        setFileList([]);
        setUploadProgress({});
        if (onUploadSuccess) {
          onUploadSuccess(result.data.attachments);
        }
      } else {
        throw new Error(result.error?.message || 'アップロードに失敗しました。');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      message.error(`アップロードエラー: ${error.message}`);
      if (onUploadError) {
        onUploadError(error);
      }
    } finally {
      setUploading(false);
    }
  };

  // ファイル削除処理
  const handleRemove = (file: UploadFile) => {
    const newFileList = fileList.filter((item) => item.uid !== file.uid);
    setFileList(newFileList);
  };

  const uploadProps: UploadProps = {
    multiple,
    maxCount,
    fileList,
    beforeUpload,
    onChange: handleChange,
    onRemove: handleRemove,
    disabled: disabled || uploading,
  };

  // ドラッガーモード
  if (dragger) {
    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Upload.Dragger {...uploadProps}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">
            クリックまたはドラッグしてファイルをアップロード
          </p>
          <p className="ant-upload-hint">
            複数ファイルのアップロードに対応しています。
            <br />
            許可されているファイル形式: {ALLOWED_EXTENSIONS.join(', ')}
            <br />
            最大ファイルサイズ: 10MB
          </p>
        </Upload.Dragger>
        <Button
          type="primary"
          onClick={handleUpload}
          disabled={fileList.length === 0 || uploading || disabled}
          loading={uploading}
          block
        >
          {uploading ? 'アップロード中...' : 'アップロード'}
        </Button>
        {isEvidence && (
          <div style={{ color: '#faad14', fontSize: '12px' }}>
            ⚠️ エビデンスファイルとしてマークされます（削除不可）
          </div>
        )}
      </Space>
    );
  }

  // 通常モード
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Upload {...uploadProps}>
        <Button icon={<UploadOutlined />} disabled={disabled || uploading}>
          ファイルを選択
        </Button>
        <span style={{ marginLeft: 8, fontSize: '12px', color: '#999' }}>
          最大10MB、形式: {ALLOWED_EXTENSIONS.join(', ')}
        </span>
      </Upload>
      <Button
        type="primary"
        onClick={handleUpload}
        disabled={fileList.length === 0 || uploading || disabled}
        loading={uploading}
      >
        {uploading ? 'アップロード中...' : 'アップロード'}
      </Button>
      {isEvidence && (
        <div style={{ color: '#faad14', fontSize: '12px' }}>
          ⚠️ エビデンスファイルとしてマークされます（削除不可）
        </div>
      )}
    </Space>
  );
};

export default FileUpload;
