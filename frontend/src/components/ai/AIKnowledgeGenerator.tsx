/**
 * AI Knowledge Generator
 *
 * ナレッジ記事自動生成UIコンポーネント
 */

import React, { useState } from 'react';
import {
  Card,
  Button,
  List,
  Checkbox,
  Typography,
  Space,
  Alert,
  Spin,
  Modal,
  Input,
  Tag,
  Divider,
} from 'antd';
import {
  RobotOutlined,
  FileAddOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { aiService } from '../../services/aiService';
import { useAIStore } from '../../store/aiStore';
import ReactMarkdown from 'react-markdown';

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

interface AIKnowledgeGeneratorProps {
  similarTickets: Array<{
    ticket_id: string;
    ticket_number: string;
    subject: string;
    similarity_score: number;
  }>;
  onGenerated?: (articleId: string) => void;
}

export const AIKnowledgeGenerator: React.FC<AIKnowledgeGeneratorProps> = ({
  similarTickets,
  onGenerated,
}) => {
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>(
    similarTickets.slice(0, 3).map((t) => t.ticket_id)
  );
  const [loading, setLoading] = useState(false);
  const [generatedArticle, setGeneratedArticle] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const { aiEnabled } = useAIStore();

  const handleGenerate = async () => {
    if (selectedTicketIds.length < 3) {
      setError('最低3件のチケットを選択してください。');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await aiService.generateKnowledgeArticle({
        similar_ticket_ids: selectedTicketIds,
      });

      setGeneratedArticle(result);
      setPreviewVisible(true);
    } catch (err: any) {
      console.error('ナレッジ記事生成エラー:', err);
      setError(
        err.response?.data?.error?.message ||
          err.message ||
          'ナレッジ記事の生成に失敗しました。'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!aiEnabled) return null;

  return (
    <>
      <Card
        title={
          <Space>
            <RobotOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
            <span>AI ナレッジ記事生成</span>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<FileAddOutlined />}
            onClick={handleGenerate}
            loading={loading}
            disabled={selectedTicketIds.length < 3}
          >
            FAQ記事を生成
          </Button>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Alert
            message="類似チケットからFAQ記事を自動生成"
            description="3件以上の類似チケットを選択すると、AIが自動的にFAQ記事を生成します。生成された記事は下書きとして保存され、レビュー後に公開できます。"
            type="info"
            showIcon
          />

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

          {/* 類似チケット選択 */}
          <div>
            <Text strong>類似チケットを選択（{selectedTicketIds.length}件選択中）:</Text>
            <List
              style={{ marginTop: 12 }}
              size="small"
              dataSource={similarTickets}
              renderItem={(ticket) => (
                <List.Item>
                  <Checkbox
                    checked={selectedTicketIds.includes(ticket.ticket_id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTicketIds([...selectedTicketIds, ticket.ticket_id]);
                      } else {
                        setSelectedTicketIds(
                          selectedTicketIds.filter((id) => id !== ticket.ticket_id)
                        );
                      }
                    }}
                  >
                    <Space>
                      <Text>{ticket.ticket_number}</Text>
                      <Text>{ticket.subject}</Text>
                      <Tag color="blue">類似度: {(ticket.similarity_score * 100).toFixed(0)}%</Tag>
                    </Space>
                  </Checkbox>
                </List.Item>
              )}
            />
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" tip="FAQ記事を生成中...（約10-15秒）" />
            </div>
          )}
        </Space>
      </Card>

      {/* プレビューモーダル */}
      <Modal
        title="生成されたFAQ記事のプレビュー"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setPreviewVisible(false)}>
            キャンセル
          </Button>,
          <Button
            key="save"
            type="primary"
            onClick={() => {
              if (onGenerated && generatedArticle) {
                onGenerated(generatedArticle.article_id);
              }
              setPreviewVisible(false);
            }}
          >
            下書きとして保存
          </Button>,
        ]}
      >
        {generatedArticle && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {/* タイトル */}
            <div>
              <Text type="secondary">タイトル:</Text>
              <Title level={4} style={{ marginTop: 8 }}>
                {generatedArticle.title}
              </Title>
            </div>

            {/* タグ */}
            <div>
              <Text type="secondary">タグ:</Text>
              <div style={{ marginTop: 8 }}>
                <Space wrap>
                  {generatedArticle.tags.map((tag: string) => (
                    <Tag key={tag} color="blue">
                      {tag}
                    </Tag>
                  ))}
                </Space>
              </div>
            </div>

            {/* 信頼度 */}
            <div>
              <Text type="secondary">
                信頼度: <Text strong>{(generatedArticle.confidence_score * 100).toFixed(0)}%</Text>
              </Text>
            </div>

            <Divider />

            {/* 記事本文（マークダウンプレビュー） */}
            <div
              style={{
                padding: '16px',
                backgroundColor: '#fafafa',
                borderRadius: 4,
                maxHeight: '400px',
                overflowY: 'auto',
              }}
            >
              <ReactMarkdown>{generatedArticle.content}</ReactMarkdown>
            </div>

            {/* 注意事項 */}
            <Alert
              message="レビューが必要です"
              description="この記事は下書きとして保存されます。公開前に内容を確認し、必要に応じて編集してください。"
              type="warning"
              showIcon
            />
          </Space>
        )}
      </Modal>
    </>
  );
};
