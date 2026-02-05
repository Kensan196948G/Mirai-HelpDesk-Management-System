import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  Card,
  Typography,
  Space,
  Tag,
  Button,
  Divider,
  message,
  Descriptions,
  Spin,
} from 'antd';
import {
  ArrowLeftOutlined,
  LikeOutlined,
  DislikeOutlined,
  EyeOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import {
  getKnowledgeArticle,
  submitKnowledgeFeedback,
  incrementKnowledgeViewCount,
} from '@services/knowledgeService';
import { KnowledgeArticle, KNOWLEDGE_TYPE_COLORS, KNOWLEDGE_TYPE_LABELS } from '@types';
import { useAuthStore } from '@store/authStore';
import '@components/MarkdownEditor.css';

const { Title, Paragraph, Text } = Typography;

const KnowledgeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState<KnowledgeArticle | null>(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // 記事取得
  useEffect(() => {
    if (!id) return;

    const loadArticle = async () => {
      setLoading(true);
      try {
        const response = await getKnowledgeArticle(id);
        if (response.success && response.data) {
          setArticle(response.data);
          // 閲覧数カウント
          incrementKnowledgeViewCount(id);
        } else {
          message.error('記事の取得に失敗しました');
          navigate('/knowledge');
        }
      } catch (error) {
        message.error('記事の取得に失敗しました');
        navigate('/knowledge');
      } finally {
        setLoading(false);
      }
    };

    loadArticle();
  }, [id, navigate]);

  // フィードバック送信
  const handleHelpful = async (isHelpful: boolean) => {
    if (!id) return;

    setSubmittingFeedback(true);
    try {
      const response = await submitKnowledgeFeedback(id, isHelpful);
      if (response.success) {
        message.success('フィードバックありがとうございます');
      } else {
        message.error('フィードバックの送信に失敗しました');
      }
    } catch (error) {
      message.error('フィードバックの送信に失敗しました');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Markdown レンダリング
  const renderMarkdown = (markdown: string): string => {
    try {
      const rawHtml = marked.parse(markdown) as string;
      return DOMPurify.sanitize(rawHtml);
    } catch (error) {
      console.error('Markdown parsing error:', error);
      return '<p>コンテンツの表示に失敗しました</p>';
    }
  };

  // 編集権限チェック
  const canEdit = () => {
    if (!user || !article) return false;
    return user.role === 'manager' || article.owner_id === user.user_id;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" tip="読み込み中..." />
      </div>
    );
  }

  if (!article) {
    return (
      <Card>
        <Text type="danger">記事が見つかりませんでした</Text>
      </Card>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/knowledge')}
        >
          一覧に戻る
        </Button>
        {canEdit() && (
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => navigate(`/knowledge/edit/${article.article_id}`)}
          >
            編集
          </Button>
        )}
      </Space>

      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={2}>{article.title}</Title>
            <Space wrap>
              <Tag color={KNOWLEDGE_TYPE_COLORS[article.type]}>
                {KNOWLEDGE_TYPE_LABELS[article.type]}
              </Tag>
              {article.category && <Tag>{article.category}</Tag>}
              {article.tags && article.tags.map((tag, index) => (
                <Tag key={index}>{tag}</Tag>
              ))}
            </Space>
          </div>

          {article.summary && (
            <>
              <Text type="secondary" style={{ fontSize: 16 }}>
                {article.summary}
              </Text>
            </>
          )}

          <Descriptions column={3}>
            <Descriptions.Item
              label={
                <>
                  <EyeOutlined /> 閲覧数
                </>
              }
            >
              {article.view_count || 0}
            </Descriptions.Item>
            <Descriptions.Item label="作成者">
              {article.owner_name || '不明'}
            </Descriptions.Item>
            <Descriptions.Item label="更新日時">
              {new Date(article.updated_at).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Descriptions.Item>
          </Descriptions>

          <Divider />

          <div
            className="markdown-preview"
            style={{ minHeight: 300 }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(article.body) }}
          />

          <Divider />

          <div style={{ textAlign: 'center' }}>
            <Text strong style={{ fontSize: 16, marginBottom: 16, display: 'block' }}>
              この記事は役に立ちましたか？
            </Text>
            <Space size="large">
              <Button
                icon={<LikeOutlined />}
                size="large"
                onClick={() => handleHelpful(true)}
                loading={submittingFeedback}
              >
                役に立った ({article.helpful_count || 0})
              </Button>
              <Button
                icon={<DislikeOutlined />}
                size="large"
                onClick={() => handleHelpful(false)}
                loading={submittingFeedback}
              >
                役に立たなかった ({article.not_helpful_count || 0})
              </Button>
            </Space>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default KnowledgeDetail;
