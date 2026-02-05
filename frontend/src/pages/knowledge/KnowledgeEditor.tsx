import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  Typography,
  Switch,
  message,
  Tag,
  Divider,
  Modal,
  Spin,
} from 'antd';
import {
  SaveOutlined,
  EyeOutlined,
  ArrowLeftOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import MarkdownEditor from '@components/MarkdownEditor';
import {
  getKnowledgeArticle,
  createKnowledgeArticle,
  updateKnowledgeArticle,
  getKnowledgeCategories,
} from '@services/knowledgeService';
import {
  KnowledgeArticleType,
  KnowledgeVisibility,
  KNOWLEDGE_TYPE_LABELS,
  KNOWLEDGE_VISIBILITY_LABELS,
  KNOWLEDGE_TYPE_COLORS,
} from '@appTypes/index';
import { useAuthStore } from '@store/authStore';
import './KnowledgeEditor.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

const KnowledgeEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [articleContent, setArticleContent] = useState('');

  const isEditMode = !!id;

  // カテゴリ一覧取得
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await getKnowledgeCategories();
        if (response.success && response.data) {
          setCategories(response.data);
        }
      } catch (error) {
        console.error('Failed to load categories:', error);
        // デフォルトカテゴリを設定
        setCategories([
          'アカウント',
          'Microsoft 365',
          'ネットワーク',
          'ハードウェア',
          'ソフトウェア',
          'セキュリティ',
          'その他',
        ]);
      }
    };

    loadCategories();
  }, []);

  // 編集モードの場合、既存記事を読み込む
  useEffect(() => {
    if (!isEditMode) return;

    const loadArticle = async () => {
      setLoading(true);
      try {
        const response = await getKnowledgeArticle(id);
        if (response.success && response.data) {
          const article = response.data;
          form.setFieldsValue({
            title: article.title,
            summary: article.summary,
            type: article.type,
            category: article.category,
            visibility: article.visibility,
            is_published: article.is_published,
            is_featured: article.is_featured,
          });
          setArticleContent(article.body);
          setTags(article.tags || []);
        } else {
          message.error('記事の読み込みに失敗しました');
          navigate('/knowledge');
        }
      } catch (error) {
        message.error('記事の読み込みに失敗しました');
        navigate('/knowledge');
      } finally {
        setLoading(false);
      }
    };

    loadArticle();
  }, [id, isEditMode, form, navigate]);

  // タグ追加
  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (!trimmedTag) return;

    if (tags.includes(trimmedTag)) {
      message.warning('このタグは既に追加されています');
      return;
    }

    setTags([...tags, trimmedTag]);
    setTagInput('');
  };

  // タグ削除
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  // Enter キーでタグ追加
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // カンマ区切りでタグを追加
  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.includes(',')) {
      const newTags = value
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t && !tags.includes(t));
      if (newTags.length > 0) {
        setTags([...tags, ...newTags]);
      }
      setTagInput('');
    } else {
      setTagInput(value);
    }
  };

  // プレビュー表示
  const handlePreview = () => {
    form.validateFields().then(() => {
      setPreviewVisible(true);
    });
  };

  // 保存処理
  const handleSave = async (isDraft: boolean = false) => {
    try {
      const values = await form.validateFields();

      if (!articleContent.trim()) {
        message.error('本文を入力してください');
        return;
      }

      setSaving(true);

      const articleData = {
        title: values.title,
        summary: values.summary,
        body: articleContent,
        type: values.type,
        category: values.category,
        tags: tags,
        visibility: values.visibility,
        is_published: isDraft ? false : values.is_published,
        is_featured: values.is_featured || false,
      };

      let response;
      if (isEditMode) {
        response = await updateKnowledgeArticle(id, articleData);
      } else {
        response = await createKnowledgeArticle(articleData);
      }

      if (response.success) {
        message.success(
          isDraft
            ? 'ドラフトとして保存しました'
            : isEditMode
            ? '記事を更新しました'
            : '記事を作成しました'
        );
        navigate('/knowledge');
      } else {
        message.error(
          response.error?.message || '保存に失敗しました'
        );
      }
    } catch (error: any) {
      if (error.errorFields) {
        message.error('入力内容を確認してください');
      } else {
        message.error('保存に失敗しました');
      }
    } finally {
      setSaving(false);
    }
  };

  // プレビュー用HTML生成
  const renderPreviewHtml = () => {
    const values = form.getFieldsValue();
    const rawHtml = marked.parse(articleContent) as string;
    const sanitizedHtml = DOMPurify.sanitize(rawHtml);

    return (
      <div className="knowledge-preview-modal">
        <Title level={2}>{values.title || '(タイトル未設定)'}</Title>
        <Space wrap style={{ marginBottom: 16 }}>
          {values.type && (
            <Tag color={KNOWLEDGE_TYPE_COLORS[values.type]}>
              {KNOWLEDGE_TYPE_LABELS[values.type]}
            </Tag>
          )}
          {values.category && <Tag>{values.category}</Tag>}
          {tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </Space>
        {values.summary && (
          <>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              {values.summary}
            </Text>
            <Divider />
          </>
        )}
        <div
          className="markdown-preview"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      </div>
    );
  };

  // 権限チェック
  const canEdit = user?.role && ['agent', 'm365_operator', 'approver', 'manager'].includes(user.role);

  if (!canEdit) {
    return (
      <Card>
        <Text type="danger">この機能を利用する権限がありません</Text>
      </Card>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" tip="読み込み中..." />
      </div>
    );
  }

  return (
    <div className="knowledge-editor-page">
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/knowledge')}
        style={{ marginBottom: 16 }}
      >
        一覧に戻る
      </Button>

      <Card>
        <Title level={2}>
          {isEditMode ? 'ナレッジ記事編集' : 'ナレッジ記事作成'}
        </Title>

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            type: KnowledgeArticleType.FAQ,
            visibility: KnowledgeVisibility.PUBLIC,
            is_published: false,
            is_featured: false,
          }}
        >
          {/* 基本情報 */}
          <Card type="inner" title="基本情報" style={{ marginBottom: 24 }}>
            <Form.Item
              label="タイトル"
              name="title"
              rules={[
                { required: true, message: 'タイトルを入力してください' },
                { max: 200, message: 'タイトルは200文字以内で入力してください' },
              ]}
            >
              <Input placeholder="例: Microsoft 365 ライセンスの種類と選び方" size="large" />
            </Form.Item>

            <Form.Item
              label="サマリー"
              name="summary"
              tooltip="検索結果や一覧で表示される概要文です"
            >
              <TextArea
                placeholder="記事の概要を簡潔に記載してください（200文字以内推奨）"
                rows={3}
                maxLength={500}
                showCount
              />
            </Form.Item>
          </Card>

          {/* 本文 */}
          <Card type="inner" title="本文" style={{ marginBottom: 24 }}>
            <MarkdownEditor
              value={articleContent}
              onChange={setArticleContent}
              height={500}
              placeholder="Markdownで記事の本文を記述してください..."
            />
          </Card>

          {/* メタデータ */}
          <Card type="inner" title="メタデータ" style={{ marginBottom: 24 }}>
            <Form.Item
              label="記事種別"
              name="type"
              rules={[{ required: true, message: '記事種別を選択してください' }]}
            >
              <Select size="large">
                {Object.entries(KNOWLEDGE_TYPE_LABELS).map(([value, label]: [string, string]) => (
                  <Select.Option key={value} value={value}>
                    <Tag color={KNOWLEDGE_TYPE_COLORS[value]}>{label}</Tag>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item label="カテゴリ" name="category">
              <Select
                size="large"
                placeholder="カテゴリを選択してください"
                allowClear
                showSearch
              >
                {categories.map((cat) => (
                  <Select.Option key={cat} value={cat}>
                    {cat}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item label="タグ" tooltip="Enterキーまたはカンマで複数のタグを追加できます">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Input
                  placeholder="タグを入力してEnterまたはカンマで追加"
                  value={tagInput}
                  onChange={handleTagInputChange}
                  onKeyDown={handleTagInputKeyDown}
                  suffix={
                    <Button
                      type="text"
                      size="small"
                      icon={<TagsOutlined />}
                      onClick={handleAddTag}
                      disabled={!tagInput.trim()}
                    >
                      追加
                    </Button>
                  }
                  size="large"
                />
                {tags.length > 0 && (
                  <Space wrap>
                    {tags.map((tag) => (
                      <Tag
                        key={tag}
                        closable
                        onClose={() => handleRemoveTag(tag)}
                        color="blue"
                      >
                        {tag}
                      </Tag>
                    ))}
                  </Space>
                )}
              </Space>
            </Form.Item>

            <Form.Item
              label="公開範囲"
              name="visibility"
              rules={[{ required: true, message: '公開範囲を選択してください' }]}
            >
              <Select size="large">
                {Object.entries(KNOWLEDGE_VISIBILITY_LABELS).map(
                  ([value, label]: [string, string]) => (
                    <Select.Option key={value} value={value}>
                      {label}
                    </Select.Option>
                  )
                )}
              </Select>
            </Form.Item>
          </Card>

          {/* 公開設定 */}
          <Card type="inner" title="公開設定" style={{ marginBottom: 24 }}>
            <Form.Item
              label="公開ステータス"
              name="is_published"
              valuePropName="checked"
              tooltip="公開すると利用者が記事を閲覧できるようになります"
            >
              <Switch checkedChildren="公開" unCheckedChildren="下書き" />
            </Form.Item>

            <Form.Item
              label="おすすめ記事"
              name="is_featured"
              valuePropName="checked"
              tooltip="おすすめ記事として一覧の上部に表示されます"
            >
              <Switch checkedChildren="ON" unCheckedChildren="OFF" />
            </Form.Item>
          </Card>

          {/* アクションボタン */}
          <Space size="middle" style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => navigate('/knowledge')} size="large">
              キャンセル
            </Button>
            <Button
              icon={<EyeOutlined />}
              onClick={handlePreview}
              size="large"
            >
              プレビュー
            </Button>
            <Button
              onClick={() => handleSave(true)}
              loading={saving}
              size="large"
            >
              下書き保存
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => handleSave(false)}
              loading={saving}
              size="large"
            >
              {isEditMode ? '更新' : '作成'}
            </Button>
          </Space>
        </Form>
      </Card>

      {/* プレビューモーダル */}
      <Modal
        title="プレビュー"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={900}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            閉じる
          </Button>,
        ]}
      >
        {renderPreviewHtml()}
      </Modal>
    </div>
  );
};

export default KnowledgeEditor;
