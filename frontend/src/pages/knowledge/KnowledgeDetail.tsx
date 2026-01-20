import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Space,
  Tag,
  Button,
  Divider,
  Rate,
  message,
  Descriptions,
} from 'antd';
import {
  ArrowLeftOutlined,
  LikeOutlined,
  DislikeOutlined,
  EyeOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

// ダミーデータ（実際はAPIから取得）
const knowledgeDetail = {
  article_id: '1',
  title: 'Microsoft 365 ライセンスの種類と選び方',
  body: `
# Microsoft 365 ライセンスの種類

Microsoft 365には複数のライセンスプランがあります。主なプランを紹介します。

## Business Basic
- Exchange Online
- OneDrive for Business
- Microsoft Teams
- SharePoint Online

価格: ¥540/ユーザー/月

## Business Standard
- Business Basicの全機能
- デスクトップ版Officeアプリ（Word、Excel、PowerPoint等）

価格: ¥1,360/ユーザー/月

## Business Premium
- Business Standardの全機能
- 高度なセキュリティ機能
- デバイス管理機能

価格: ¥2,390/ユーザー/月

## E3
- エンタープライズ向け
- 高度なコンプライアンス機能
- 音声会議機能

価格: ¥3,480/ユーザー/月

## E5
- E3の全機能
- 高度な分析機能
- 電話システム機能
- 高度な脅威保護

価格: ¥6,200/ユーザー/月

## 選び方のポイント

1. **従業員数**: 300人未満ならBusiness、それ以上ならEnterprise
2. **デスクトップアプリの必要性**: WebアプリのみならBasic
3. **セキュリティ要件**: 高度なセキュリティが必要ならPremium以上
4. **コンプライアンス**: 厳格な要件があるならE3以上

詳細は社内IT部門にお問い合わせください。
  `,
  type: 'how_to',
  tags: ['Microsoft 365', 'ライセンス', '初心者向け', '選び方'],
  visibility: 'public',
  owner_name: '管理者',
  view_count: 245,
  helpful_count: 32,
  not_helpful_count: 3,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

const KnowledgeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const typeColors: Record<string, string> = {
    faq: 'blue',
    how_to: 'green',
    known_error: 'red',
    workaround: 'orange',
    policy: 'purple',
    announcement: 'cyan',
  };

  const typeLabels: Record<string, string> = {
    faq: 'FAQ',
    how_to: '手順書',
    known_error: '既知の問題',
    workaround: '回避策',
    policy: 'ポリシー',
    announcement: 'お知らせ',
  };

  const handleHelpful = (isHelpful: boolean) => {
    message.success(
      isHelpful
        ? 'フィードバックありがとうございます'
        : 'フィードバックを送信しました'
    );
  };

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/knowledge')}
        style={{ marginBottom: 16 }}
      >
        一覧に戻る
      </Button>

      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={2}>{knowledgeDetail.title}</Title>
            <Space wrap>
              <Tag color={typeColors[knowledgeDetail.type]}>
                {typeLabels[knowledgeDetail.type]}
              </Tag>
              {knowledgeDetail.tags.map((tag, index) => (
                <Tag key={index}>{tag}</Tag>
              ))}
            </Space>
          </div>

          <Descriptions column={3}>
            <Descriptions.Item
              label={
                <>
                  <EyeOutlined /> 閲覧数
                </>
              }
            >
              {knowledgeDetail.view_count}
            </Descriptions.Item>
            <Descriptions.Item label="作成者">
              {knowledgeDetail.owner_name}
            </Descriptions.Item>
            <Descriptions.Item label="更新日時">
              {new Date(knowledgeDetail.updated_at).toLocaleDateString('ja-JP')}
            </Descriptions.Item>
          </Descriptions>

          <Divider />

          <div style={{ minHeight: 300 }}>
            <Paragraph style={{ whiteSpace: 'pre-wrap', fontSize: 16 }}>
              {knowledgeDetail.body}
            </Paragraph>
          </div>

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
              >
                役に立った ({knowledgeDetail.helpful_count})
              </Button>
              <Button
                icon={<DislikeOutlined />}
                size="large"
                onClick={() => handleHelpful(false)}
              >
                役に立たなかった ({knowledgeDetail.not_helpful_count})
              </Button>
            </Space>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default KnowledgeDetail;
