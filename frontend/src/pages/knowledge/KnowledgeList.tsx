import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  List,
  Input,
  Tag,
  Typography,
  Space,
  Button,
  Empty,
  Spin,
} from 'antd';
import {
  BookOutlined,
  SearchOutlined,
  FileTextOutlined,
  QuestionCircleOutlined,
  BugOutlined,
  ToolOutlined,
  FileProtectOutlined,
  BellOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Search } = Input;

// ダミーデータ（実際はAPIから取得）
const knowledgeData = [
  {
    article_id: '1',
    title: 'Microsoft 365 ライセンスの種類と選び方',
    body: 'E3、E5、Business Premiumなど、各ライセンスの違いと選定基準について解説します。',
    type: 'how_to',
    tags: ['Microsoft 365', 'ライセンス', '初心者向け'],
    visibility: 'public',
    view_count: 245,
    helpful_count: 32,
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    article_id: '2',
    title: 'パスワードリセットの手順',
    body: 'セルフサービスでパスワードをリセットする手順を説明します。',
    type: 'faq',
    tags: ['パスワード', 'アカウント', 'よくある質問'],
    visibility: 'public',
    view_count: 523,
    helpful_count: 89,
    created_at: '2024-01-10T14:30:00Z',
  },
  {
    article_id: '3',
    title: 'Teamsの通話が途切れる問題（既知のエラー）',
    body: 'ネットワーク帯域が不足している場合に発生する既知の問題と対処法です。',
    type: 'known_error',
    tags: ['Teams', '通話', '既知のエラー'],
    visibility: 'public',
    view_count: 156,
    helpful_count: 24,
    created_at: '2024-01-08T09:15:00Z',
  },
  {
    article_id: '4',
    title: 'OneDriveの同期エラーの回避策',
    body: 'OneDriveの同期が停止した場合の一時的な回避策を紹介します。',
    type: 'workaround',
    tags: ['OneDrive', '同期', '回避策'],
    visibility: 'public',
    view_count: 342,
    helpful_count: 45,
    created_at: '2024-01-05T16:45:00Z',
  },
];

const KnowledgeList = () => {
  const [searchText, setSearchText] = useState('');
  const [loading] = useState(false);
  const navigate = useNavigate();

  const typeIcons: Record<string, any> = {
    faq: <QuestionCircleOutlined />,
    how_to: <FileTextOutlined />,
    known_error: <BugOutlined />,
    workaround: <ToolOutlined />,
    policy: <FileProtectOutlined />,
    announcement: <BellOutlined />,
  };

  const typeLabels: Record<string, string> = {
    faq: 'FAQ',
    how_to: '手順書',
    known_error: '既知の問題',
    workaround: '回避策',
    policy: 'ポリシー',
    announcement: 'お知らせ',
  };

  const typeColors: Record<string, string> = {
    faq: 'blue',
    how_to: 'green',
    known_error: 'red',
    workaround: 'orange',
    policy: 'purple',
    announcement: 'cyan',
  };

  const filteredData = knowledgeData.filter(
    (item) =>
      item.title.toLowerCase().includes(searchText.toLowerCase()) ||
      item.body.toLowerCase().includes(searchText.toLowerCase()) ||
      item.tags.some((tag) =>
        tag.toLowerCase().includes(searchText.toLowerCase())
      )
  );

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" tip="読み込み中..." />
      </div>
    );
  }

  return (
    <div>
      <Title level={2}>
        <BookOutlined /> ナレッジベース
      </Title>

      <Card style={{ marginBottom: 24 }}>
        <Search
          placeholder="タイトル、本文、タグで検索"
          prefix={<SearchOutlined />}
          size="large"
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: 600 }}
        />
      </Card>

      <Card>
        <List
          itemLayout="vertical"
          size="large"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `全 ${total} 件`,
          }}
          dataSource={filteredData}
          locale={{
            emptyText: (
              <Empty description="該当するナレッジ記事が見つかりませんでした" />
            ),
          }}
          renderItem={(item) => (
            <List.Item
              key={item.article_id}
              extra={
                <Space direction="vertical" align="end">
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {new Date(item.created_at).toLocaleDateString('ja-JP')}
                  </Text>
                  <Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      👁️ {item.view_count}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      👍 {item.helpful_count}
                    </Text>
                  </Space>
                </Space>
              }
              actions={[
                <Button
                  key="view"
                  type="link"
                  onClick={() => navigate(`/knowledge/${item.article_id}`)}
                >
                  詳細を見る
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={typeIcons[item.type]}
                title={
                  <Space>
                    <a onClick={() => navigate(`/knowledge/${item.article_id}`)}>
                      {item.title}
                    </a>
                    <Tag color={typeColors[item.type]}>
                      {typeLabels[item.type]}
                    </Tag>
                  </Space>
                }
                description={
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text ellipsis>{item.body}</Text>
                    <Space wrap>
                      {item.tags.map((tag, index) => (
                        <Tag key={index}>{tag}</Tag>
                      ))}
                    </Space>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
};

export default KnowledgeList;
