/**
 * AI Classification Widget
 *
 * チケット作成時のAI分類提案ウィジェット
 */

import React, { useState } from 'react';
import {
  Card,
  Button,
  Descriptions,
  Badge,
  Tooltip,
  Spin,
  Alert,
  Space,
  Typography,
} from 'antd';
import {
  RobotOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { aiService, AIClassificationResult } from '../../services/aiService';
import { useAIStore } from '../../store/aiStore';

const { Text } = Typography;

interface AIClassificationWidgetProps {
  subject: string;
  description: string;
  requesterId: string;
  onAccept: (predictions: AIClassificationResult['predictions']) => void;
  onReject: () => void;
}

export const AIClassificationWidget: React.FC<AIClassificationWidgetProps> = ({
  subject,
  description,
  requesterId,
  onAccept,
  onReject,
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIClassificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { aiEnabled } = useAIStore();

  const handleClassify = async () => {
    if (!subject || subject.trim().length < 5) {
      setError('件名は5文字以上入力してください。');
      return;
    }

    if (!description || description.trim().length < 10) {
      setError('詳細は10文字以上入力してください。');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const classificationResult = await aiService.classifyTicket({
        subject,
        description,
        requester_id: requesterId,
      });

      setResult(classificationResult);
    } catch (err: any) {
      console.error('AI分類エラー:', err);
      setError(
        err.response?.data?.error?.message ||
          err.message ||
          'AI分類に失敗しました。しばらくしてから再試行してください。'
      );
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) {
      return (
        <Badge
          status="success"
          text={
            <Text strong style={{ color: '#52c41a' }}>
              {(confidence * 100).toFixed(0)}%（高信頼度）
            </Text>
          }
        />
      );
    }
    if (confidence >= 0.7) {
      return (
        <Badge
          status="warning"
          text={
            <Text style={{ color: '#faad14' }}>
              {(confidence * 100).toFixed(0)}%（中信頼度）
            </Text>
          }
        />
      );
    }
    return (
      <Badge
        status="error"
        text={
          <Text style={{ color: '#ff4d4f' }}>
            {(confidence * 100).toFixed(0)}%（低信頼度）
          </Text>
        }
      />
    );
  };

  if (!aiEnabled) {
    return null;
  }

  return (
    <Card
      title={
        <Space>
          <RobotOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
          <span>AI分類提案</span>
        </Space>
      }
      extra={
        !result && (
          <Button
            type="primary"
            icon={<RobotOutlined />}
            onClick={handleClassify}
            loading={loading}
            disabled={!subject || !description}
          >
            AI分類を実行
          </Button>
        )
      }
      style={{ marginBottom: 16 }}
    >
      {/* ローディング状態 */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" tip="AI分析中...（約3-5秒）" />
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <Alert
          message="エラー"
          description={error}
          type="error"
          closable
          onClose={() => setError(null)}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* AI分類結果 */}
      {result && !loading && (
        <>
          {/* PII マスキング警告 */}
          {result.pii_masked && (
            <Alert
              message="個人情報検出"
              description="メールアドレスや電話番号が検出されたため、AI分析時にマスキングされました。"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Descriptions bordered column={1} size="small">
            {/* カテゴリ */}
            {result.predictions.category && (
              <Descriptions.Item
                label={
                  <Space>
                    <span>カテゴリ</span>
                    {result.predictions.category.rationale?.reasoning && (
                      <Tooltip title={result.predictions.category.rationale.reasoning}>
                        <InfoCircleOutlined style={{ color: '#1890ff' }} />
                      </Tooltip>
                    )}
                  </Space>
                }
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text strong>{result.predictions.category.label || result.predictions.category.value}</Text>
                  {getConfidenceBadge(result.predictions.category.confidence)}
                </div>
              </Descriptions.Item>
            )}

            {/* 優先度 */}
            {result.predictions.priority && (
              <Descriptions.Item
                label={
                  <Space>
                    <span>優先度</span>
                    {result.predictions.priority.rationale?.reasoning && (
                      <Tooltip title={result.predictions.priority.rationale.reasoning}>
                        <InfoCircleOutlined style={{ color: '#1890ff' }} />
                      </Tooltip>
                    )}
                  </Space>
                }
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text strong>{result.predictions.priority.value}</Text>
                  {getConfidenceBadge(result.predictions.priority.confidence)}
                </div>
              </Descriptions.Item>
            )}

            {/* 影響度 */}
            {result.predictions.impact && (
              <Descriptions.Item label="影響度">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>{result.predictions.impact.value}</span>
                  {getConfidenceBadge(result.predictions.impact.confidence)}
                </div>
              </Descriptions.Item>
            )}

            {/* 緊急度 */}
            {result.predictions.urgency && (
              <Descriptions.Item label="緊急度">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>{result.predictions.urgency.value}</span>
                  {getConfidenceBadge(result.predictions.urgency.confidence)}
                </div>
              </Descriptions.Item>
            )}

            {/* 担当者 */}
            {result.predictions.assignee && (
              <Descriptions.Item label="推奨担当者">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>{result.predictions.assignee.label || '未設定'}</span>
                  {getConfidenceBadge(result.predictions.assignee.confidence)}
                </div>
              </Descriptions.Item>
            )}

            {/* パフォーマンス情報 */}
            <Descriptions.Item label="処理情報">
              <Space direction="vertical" size="small">
                <Text type="secondary">
                  処理時間: {(result.processing_time_ms / 1000).toFixed(1)}秒
                </Text>
                <Text type="secondary">モデル: {result.model_version}</Text>
              </Space>
            </Descriptions.Item>
          </Descriptions>

          {/* アクションボタン */}
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Space>
              <Button icon={<CloseCircleOutlined />} onClick={onReject}>
                手動で入力
              </Button>
              <Button
                icon={<CheckCircleOutlined />}
                type="primary"
                onClick={() => onAccept(result.predictions)}
              >
                この提案を採用
              </Button>
            </Space>
          </div>
        </>
      )}

      {/* 初期状態（結果なし） */}
      {!result && !loading && !error && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Text type="secondary">
            件名と詳細を入力後、「AI分類を実行」ボタンをクリックしてください。
          </Text>
        </div>
      )}
    </Card>
  );
};
