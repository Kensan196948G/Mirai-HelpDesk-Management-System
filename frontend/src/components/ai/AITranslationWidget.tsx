/**
 * AI Translation Widget
 *
 * 多言語翻訳ウィジェットコンポーネント
 */

import React, { useState } from 'react';
import {
  Card,
  Input,
  Button,
  Select,
  Space,
  Typography,
  Alert,
  Tabs,
  Tag,
} from 'antd';
import {
  TranslationOutlined,
  SwapOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { aiService } from '../../services/aiService';
import { useAIStore } from '../../store/aiStore';
import { message } from 'antd';

const { TextArea } = Input;
const { Text, Paragraph } = Typography;
const { Option } = Select;

interface AITranslationWidgetProps {
  initialText?: string;
  onTranslated?: (translatedText: string) => void;
}

export const AITranslationWidget: React.FC<AITranslationWidgetProps> = ({
  initialText = '',
  onTranslated,
}) => {
  const [sourceText, setSourceText] = useState(initialText);
  const [sourceLanguage, setSourceLanguage] = useState<'ja' | 'en' | 'auto'>('auto');
  const [targetLanguage, setTargetLanguage] = useState<'ja' | 'en'>('en');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { aiEnabled } = useAIStore();

  const handleTranslate = async () => {
    if (!sourceText || sourceText.trim().length < 1) {
      setError('翻訳対象テキストを入力してください。');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const translationResult = await aiService.translateText({
        text: sourceText,
        source_language: sourceLanguage,
        target_language: targetLanguage,
      });

      setResult(translationResult);
    } catch (err: any) {
      console.error('翻訳エラー:', err);
      setError(
        err.response?.data?.error?.message ||
          err.message ||
          '翻訳に失敗しました。'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSwapLanguages = () => {
    if (sourceLanguage !== 'auto' && targetLanguage) {
      const temp = sourceLanguage;
      setSourceLanguage(targetLanguage);
      setTargetLanguage(temp as 'ja' | 'en');

      // 翻訳結果を元のテキストに
      if (result) {
        setSourceText(result.translated_text);
        setResult(null);
      }
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('クリップボードにコピーしました');
  };

  if (!aiEnabled) return null;

  return (
    <Card
      title={
        <Space>
          <TranslationOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
          <span>AI 翻訳</span>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* 言語選択 */}
        <Space>
          <Select
            value={sourceLanguage}
            onChange={setSourceLanguage}
            style={{ width: 120 }}
          >
            <Option value="auto">自動検出</Option>
            <Option value="ja">日本語</Option>
            <Option value="en">英語</Option>
          </Select>

          <Button
            icon={<SwapOutlined />}
            onClick={handleSwapLanguages}
            disabled={sourceLanguage === 'auto'}
          />

          <Select
            value={targetLanguage}
            onChange={setTargetLanguage}
            style={{ width: 120 }}
          >
            <Option value="ja">日本語</Option>
            <Option value="en">英語</Option>
          </Select>
        </Space>

        {/* 元のテキスト */}
        <TextArea
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          placeholder="翻訳したいテキストを入力してください"
          rows={6}
          showCount
          maxLength={10000}
        />

        {/* 翻訳ボタン */}
        <Button
          type="primary"
          icon={<TranslationOutlined />}
          onClick={handleTranslate}
          loading={loading}
          block
        >
          翻訳
        </Button>

        {/* エラー表示 */}
        {error && (
          <Alert
            message="エラー"
            description={error}
            type="error"
            closable
            onClose={() => setError(null)}
            showIcon
          />
        )}

        {/* 翻訳結果 */}
        {result && !loading && (
          <div>
            {/* 検出された言語 */}
            {sourceLanguage === 'auto' && (
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary">
                  検出された言語: <Tag>{result.source_language === 'ja' ? '日本語' : '英語'}</Tag>
                </Text>
              </div>
            )}

            {/* メイン翻訳 */}
            <Card
              size="small"
              title={
                <Space>
                  <Text strong>翻訳結果</Text>
                  <Tag color="blue">信頼度: {(result.confidence * 100).toFixed(0)}%</Tag>
                </Space>
              }
              extra={
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => handleCopyToClipboard(result.translated_text)}
                >
                  コピー
                </Button>
              }
            >
              <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
                {result.translated_text}
              </Paragraph>
            </Card>

            {/* 代替翻訳（タブ表示） */}
            {result.alternative_translations && result.alternative_translations.length > 0 && (
              <Tabs
                size="small"
                style={{ marginTop: 12 }}
                items={result.alternative_translations.map((alt: string, index: number) => ({
                  key: index.toString(),
                  label: `代替翻訳 ${index + 1}`,
                  children: (
                    <Card size="small">
                      <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{alt}</Paragraph>
                      <Button
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => handleCopyToClipboard(alt)}
                      >
                        コピー
                      </Button>
                    </Card>
                  ),
                }))}
              />
            )}

            {/* IT用語集（翻訳された用語） */}
            {result.glossary_terms && result.glossary_terms.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <Text type="secondary">使用されたIT用語:</Text>
                <div style={{ marginTop: 8 }}>
                  <Space wrap>
                    {result.glossary_terms.map((term: any, index: number) => (
                      <Tag key={index} color="geekblue">
                        {term.original} → {term.translated}
                      </Tag>
                    ))}
                  </Space>
                </div>
              </div>
            )}

            {/* 採用ボタン */}
            {onTranslated && (
              <Button
                type="primary"
                block
                style={{ marginTop: 16 }}
                onClick={() => onTranslated(result.translated_text)}
              >
                この翻訳を使用
              </Button>
            )}
          </div>
        )}
      </Space>
    </Card>
  );
};
