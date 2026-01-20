import { useState, useCallback } from 'react';
import { Card, Tabs, Button, Space, Tooltip } from 'antd';
import {
  BoldOutlined,
  ItalicOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  LinkOutlined,
  CodeOutlined,
  FileImageOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import './MarkdownEditor.css';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: number;
  placeholder?: string;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  height = 400,
  placeholder = 'Markdownで記述してください...',
}) => {
  const [activeTab, setActiveTab] = useState<string>('edit');

  // Markdown から HTMLへの変換（XSS対策込み）
  const renderMarkdown = useCallback((markdown: string): string => {
    try {
      const rawHtml = marked.parse(markdown) as string;
      return DOMPurify.sanitize(rawHtml);
    } catch (error) {
      console.error('Markdown parsing error:', error);
      return '<p>プレビューの生成に失敗しました</p>';
    }
  }, []);

  // テキストの挿入ヘルパー
  const insertText = useCallback(
    (before: string, after: string = '', placeholder: string = '') => {
      const textarea = document.querySelector(
        '.markdown-editor-textarea'
      ) as HTMLTextAreaElement;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end);
      const textToInsert = selectedText || placeholder;

      const newValue =
        value.substring(0, start) +
        before +
        textToInsert +
        after +
        value.substring(end);

      onChange(newValue);

      // カーソル位置を調整
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + before.length + textToInsert.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    },
    [value, onChange]
  );

  // ツールバーボタンハンドラ
  const handleBold = () => insertText('**', '**', '太字テキスト');
  const handleItalic = () => insertText('*', '*', '斜体テキスト');
  const handleHeading = () => insertText('## ', '', '見出し');
  const handleUnorderedList = () => insertText('- ', '', 'リスト項目');
  const handleOrderedList = () => insertText('1. ', '', 'リスト項目');
  const handleLink = () =>
    insertText('[', '](https://example.com)', 'リンクテキスト');
  const handleCode = () => insertText('`', '`', 'コード');
  const handleCodeBlock = () => insertText('```\n', '\n```', 'コードブロック');
  const handleImage = () =>
    insertText('![', '](https://example.com/image.png)', '画像の説明');

  const toolbar = (
    <Space className="markdown-toolbar">
      <Tooltip title="太字 (Ctrl+B)">
        <Button
          size="small"
          icon={<BoldOutlined />}
          onClick={handleBold}
          type="text"
        />
      </Tooltip>
      <Tooltip title="斜体 (Ctrl+I)">
        <Button
          size="small"
          icon={<ItalicOutlined />}
          onClick={handleItalic}
          type="text"
        />
      </Tooltip>
      <Tooltip title="見出し">
        <Button size="small" onClick={handleHeading} type="text">
          H
        </Button>
      </Tooltip>
      <Tooltip title="箇条書きリスト">
        <Button
          size="small"
          icon={<UnorderedListOutlined />}
          onClick={handleUnorderedList}
          type="text"
        />
      </Tooltip>
      <Tooltip title="番号付きリスト">
        <Button
          size="small"
          icon={<OrderedListOutlined />}
          onClick={handleOrderedList}
          type="text"
        />
      </Tooltip>
      <Tooltip title="リンク">
        <Button
          size="small"
          icon={<LinkOutlined />}
          onClick={handleLink}
          type="text"
        />
      </Tooltip>
      <Tooltip title="インラインコード">
        <Button
          size="small"
          icon={<CodeOutlined />}
          onClick={handleCode}
          type="text"
        />
      </Tooltip>
      <Tooltip title="コードブロック">
        <Button size="small" onClick={handleCodeBlock} type="text">
          {'</>'}
        </Button>
      </Tooltip>
      <Tooltip title="画像">
        <Button
          size="small"
          icon={<FileImageOutlined />}
          onClick={handleImage}
          type="text"
        />
      </Tooltip>
    </Space>
  );

  const items = [
    {
      key: 'edit',
      label: (
        <span>
          <CodeOutlined /> 編集
        </span>
      ),
      children: (
        <div className="markdown-editor-container">
          {toolbar}
          <textarea
            className="markdown-editor-textarea"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            style={{ height: `${height}px` }}
          />
        </div>
      ),
    },
    {
      key: 'preview',
      label: (
        <span>
          <EyeOutlined /> プレビュー
        </span>
      ),
      children: (
        <div
          className="markdown-preview"
          style={{ minHeight: `${height}px` }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
        />
      ),
    },
  ];

  return (
    <Card className="markdown-editor-card" bodyStyle={{ padding: 0 }}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={items}
        size="large"
      />
    </Card>
  );
};

export default MarkdownEditor;
