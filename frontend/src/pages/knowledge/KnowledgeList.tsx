import { useState, useEffect } from 'react';
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
  Select,
  message,
  Popconfirm,
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
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import { getKnowledgeArticles, deleteKnowledgeArticle } from '@services/knowledgeService';
import { KnowledgeArticle } from '@appTypes/index';
import { useAuthStore } from '@store/authStore';

const { Title, Text } = Typography;
const { Search } = Input;

const KnowledgeList = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [visibilityFilter, setVisibilityFilter] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // データ取得
  useEffect(() => {
    loadArticles();
  }, [searchText, typeFilter, visibilityFilter, currentPage, pageSize]);

  const loadArticles = async () => {
    setLoading(true);
    try {
      const response = await getKnowledgeArticles({
        search: searchText || undefined,
        type: typeFilter,
        visibility: visibilityFilter,
        page: currentPage,
        pageSize: pageSize,
      });

      if (response.success && response.data) {
        setArticles(response.data.items);
        setTotal(response.data.total);
      } else {
        message.error('ナレッジ記事の取得に失敗しました');
      }
    } catch (error) {
      console.error('Failed to load articles:', error);
      message.error('ナレッジ記事の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 削除処理
  const handleDelete = async (articleId: string) => {
    try {
      const response = await deleteKnowledgeArticle(articleId);
      if (response.success) {
        message.success('記事を削除しました');
        loadArticles();
      } else {
        message.error(response.error?.message || '削除に失敗しました');
      }
    } catch (error) {
      message.error('削除に失敗しました');
    }
  };

  // 権限チェック
  const canCreate = user?.role && ['agent', 'm365_operator', 'approver', 'manager'].includes(user.role);
  const canEdit = (article: KnowledgeArticle) => {
    if (!user) return false;
    return user.role === 'manager' || article.owner_id === user.user_id;
  };
  const canDelete = user?.role === 'manager';

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

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" tip="読み込み中..." />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          <BookOutlined /> ナレッジベース
        </Title>
        {canCreate && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={() => navigate('/knowledge/new')}
          >
            新規作成
          </Button>
        )}
      </div>

      <Card style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Search
            placeholder="タイトル、本文、タグで検索"
            prefix={<SearchOutlined />}
            size="large"
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={loadArticles}
            style={{ maxWidth: 600 }}
          />
          <Space wrap>
            <Select
              placeholder="記事種別で絞り込み"
              allowClear
              style={{ width: 180 }}
              value={typeFilter}
              onChange={setTypeFilter}
            >
              {Object.entries(typeLabels).map(([value, label]) => (
                <Select.Option key={value} value={value}>
                  {label}
                </Select.Option>
              ))}
            </Select>
            <Select
              placeholder="公開範囲で絞り込み"
              allowClear
              style={{ width: 180 }}
              value={visibilityFilter}
              onChange={setVisibilityFilter}
            >
              <Select.Option value="public">公開</Select.Option>
              <Select.Option value="staff_only">スタッフのみ</Select.Option>
              <Select.Option value="private">非公開</Select.Option>
            </Select>
          </Space>
        </Space>
      </Card>

      <Card>
        <List
          itemLayout="vertical"
          size="large"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showTotal: (total) => `全 ${total} 件`,
            onChange: (page, newPageSize) => {
              setCurrentPage(page);
              if (newPageSize !== pageSize) {
                setPageSize(newPageSize);
                setCurrentPage(1);
              }
            },
          }}
          dataSource={articles}
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
                      <EyeOutlined /> {item.view_count || 0}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      👍 {item.helpful_count || 0}
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
                ...(canEdit(item)
                  ? [
                      <Button
                        key="edit"
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => navigate(`/knowledge/edit/${item.article_id}`)}
                      >
                        編集
                      </Button>,
                    ]
                  : []),
                ...(canDelete
                  ? [
                      <Popconfirm
                        key="delete"
                        title="記事を削除"
                        description="この記事を削除してもよろしいですか？"
                        onConfirm={() => handleDelete(item.article_id)}
                        okText="削除"
                        cancelText="キャンセル"
                        okButtonProps={{ danger: true }}
                      >
                        <Button type="link" danger icon={<DeleteOutlined />}>
                          削除
                        </Button>
                      </Popconfirm>,
                    ]
                  : []),
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
                    {!item.is_published && (
                      <Tag icon={<EyeInvisibleOutlined />} color="default">
                        下書き
                      </Tag>
                    )}
                    {item.is_featured && (
                      <Tag color="gold">おすすめ</Tag>
                    )}
                  </Space>
                }
                description={
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {item.summary && <Text ellipsis>{item.summary}</Text>}
                    <Space wrap>
                      {item.tags && item.tags.map((tag: string, index: number) => (
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
