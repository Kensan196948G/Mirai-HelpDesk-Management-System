import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Form,
  Button,
  Card,
  Typography,
  Alert,
  Space,
  Row,
  Col,
} from 'antd';
import {
  TicketType,
  TICKET_TYPE_LABELS,
} from '../../types';
import {
  createTicket,
  CreateTicketRequest,
} from '../../services/ticketService';
import { getCategories, Category } from '../../services/categoryService';
import { AIClassificationWidget } from '../../components/ai/AIClassificationWidget';
import { useAuthStore } from '../../store/authStore';
import type { AIClassificationResult } from '../../services/aiService';

const { Title } = Typography;

interface TicketFormValues {
  type: string;
  subject: string;
  description: string;
  impact: string;
  urgency: string;
  category_id?: string;
}

const TicketCreate: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<TicketFormValues>();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string>('');
  const [showAIWidget, setShowAIWidget] = useState(false);

  // カテゴリ一覧取得
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const response = await getCategories({ is_active: true });
        if (response.success && response.data) {
          setCategories(response.data.categories);
        } else {
          console.error('カテゴリ取得エラー:', response.error);
        }
      } catch (err) {
        console.error('カテゴリ取得失敗:', err);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // 英語から日本語へのマッピング（Playwright テスト互換性のため）
  const impactMapping: Record<string, string> = {
    'individual': '個人',
    'department': '部署',
    'company_wide': '全社',
    'company-wide': '全社',
    'external': '対外影響',
    '個人': '個人',
    '部署': '部署',
    '全社': '全社',
    '対外影響': '対外影響',
  };

  const urgencyMapping: Record<string, string> = {
    'low': '低',
    'medium': '中',
    'high': '高',
    'immediate': '即時',
    '低': '低',
    '中': '中',
    '高': '高',
    '即時': '即時',
  };

  // フォーム送信処理
  const handleSubmit = async (values: TicketFormValues) => {
    setLoading(true);
    setError('');

    try {
      // 英語値を日本語に変換（APIが日本語を期待しているため）
      const impact = impactMapping[values.impact] || values.impact;
      const urgency = urgencyMapping[values.urgency] || values.urgency;

      const requestData: CreateTicketRequest = {
        type: values.type,
        subject: values.subject,
        description: values.description,
        impact: impact,
        urgency: urgency,
        category_id: values.category_id,
      };

      const response = await createTicket(requestData);

      if (response.success && response.data) {
        // チケット作成成功 - 詳細画面へ遷移
        navigate(`/tickets/${response.data.ticket.ticket_id}`);
      } else {
        // エラー処理
        setError(
          response.error?.message || 'チケットの作成に失敗しました'
        );
      }
    } catch (err: any) {
      console.error('チケット作成エラー:', err);
      setError(
        err.message || 'チケットの作成中にエラーが発生しました'
      );
    } finally {
      setLoading(false);
    }
  };

  // キャンセル処理
  const handleCancel = () => {
    navigate('/tickets');
  };

  // 日本語から英語へのマッピング（AI予測値の変換用）
  const impactReverseMapping: Record<string, string> = {
    '個人': 'individual',
    '部署': 'department',
    '全社': 'company_wide',
    '対外影響': 'external',
  };

  const urgencyReverseMapping: Record<string, string> = {
    '低': 'low',
    '中': 'medium',
    '高': 'high',
    '即時': 'immediate',
  };

  // AI提案採用処理
  const handleAcceptAIPredictions = (predictions: AIClassificationResult['predictions']) => {
    // カテゴリ
    if (predictions.category && predictions.category.confidence >= 0.7) {
      form.setFieldValue('category_id', predictions.category.value);
    }

    // 影響度（日本語から英語に変換）
    if (predictions.impact && predictions.impact.confidence >= 0.7) {
      const impactValue = impactReverseMapping[predictions.impact.value] || predictions.impact.value;
      form.setFieldValue('impact', impactValue);
    }

    // 緊急度（日本語から英語に変換）
    if (predictions.urgency && predictions.urgency.confidence >= 0.7) {
      const urgencyValue = urgencyReverseMapping[predictions.urgency.value] || predictions.urgency.value;
      form.setFieldValue('urgency', urgencyValue);
    }

    setShowAIWidget(false);
  };

  // AI提案却下処理
  const handleRejectAIPredictions = () => {
    setShowAIWidget(false);
  };

  // 件名・詳細入力時にAIウィジェット表示
  const handleFieldChange = () => {
    const subject = form.getFieldValue('subject');
    const description = form.getFieldValue('description');

    if (subject && subject.length >= 5 && description && description.length >= 10) {
      setShowAIWidget(true);
    }
  };

  return (
    <div id="page-content" style={{ padding: '24px' }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Title level={2}>新規チケット作成</Title>

          {error && (
            <Alert
              message="エラー"
              description={error}
              type="error"
              closable
              onClose={() => setError('')}
            />
          )}

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              impact: 'individual',
              urgency: 'medium',
            }}
          >
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="チケットタイプ"
                  name="type"
                  rules={[
                    {
                      required: true,
                      message: 'チケットタイプを選択してください',
                    },
                  ]}
                >
                  <select
                    name="type"
                    className="ant-input"
                    style={{
                      width: '100%',
                      height: '32px',
                      padding: '4px 11px',
                      fontSize: '14px',
                      lineHeight: '1.5715',
                      color: 'rgba(0, 0, 0, 0.85)',
                      backgroundColor: '#fff',
                      border: '1px solid #d9d9d9',
                      borderRadius: '2px',
                    }}
                    onChange={(e) => form.setFieldValue('type', e.target.value)}
                    required
                  >
                    <option value="">チケットタイプを選択</option>
                    <option value={TicketType.INCIDENT}>
                      {TICKET_TYPE_LABELS[TicketType.INCIDENT]}
                    </option>
                    <option value={TicketType.SERVICE_REQUEST}>
                      {TICKET_TYPE_LABELS[TicketType.SERVICE_REQUEST]}
                    </option>
                    <option value={TicketType.CHANGE}>
                      {TICKET_TYPE_LABELS[TicketType.CHANGE]}
                    </option>
                    <option value={TicketType.PROBLEM}>
                      {TICKET_TYPE_LABELS[TicketType.PROBLEM]}
                    </option>
                  </select>
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label="カテゴリ" name="category_id">
                  <select
                    name="category_id"
                    className="ant-input"
                    style={{
                      width: '100%',
                      height: '32px',
                      padding: '4px 11px',
                      fontSize: '14px',
                      lineHeight: '1.5715',
                      color: 'rgba(0, 0, 0, 0.85)',
                      backgroundColor: '#fff',
                      border: '1px solid #d9d9d9',
                      borderRadius: '2px',
                    }}
                    onChange={(e) => form.setFieldValue('category_id', e.target.value)}
                    disabled={loadingCategories}
                  >
                    <option value="">カテゴリを選択（任意）</option>
                    {categories.map((cat) => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="件名"
              name="subject"
              rules={[
                {
                  required: true,
                  message: '件名を入力してください',
                },
                {
                  max: 200,
                  message: '件名は200文字以内で入力してください',
                },
              ]}
            >
              <input
                type="text"
                name="subject"
                id="ticket-subject"
                className="ant-input"
                placeholder="問題の概要を簡潔に入力してください"
                maxLength={200}
                onChange={(e) => form.setFieldValue('subject', e.target.value)}
                onBlur={handleFieldChange}
                required
                style={{
                  width: '100%',
                  padding: '4px 11px',
                  fontSize: '14px',
                  lineHeight: '1.5715',
                  color: 'rgba(0, 0, 0, 0.85)',
                  backgroundColor: '#fff',
                  border: '1px solid #d9d9d9',
                  borderRadius: '2px',
                }}
              />
            </Form.Item>

            <Form.Item
              label="説明"
              name="description"
              rules={[
                {
                  required: true,
                  message: '説明を入力してください',
                },
                {
                  min: 10,
                  message: '説明は10文字以上で入力してください',
                },
              ]}
            >
              <textarea
                name="description"
                id="ticket-description"
                className="ant-input"
                rows={6}
                placeholder="詳細な状況、発生条件、エラーメッセージなどを記載してください"
                maxLength={5000}
                onChange={(e) => form.setFieldValue('description', e.target.value)}
                onBlur={handleFieldChange}
                required
                style={{
                  width: '100%',
                  padding: '4px 11px',
                  fontSize: '14px',
                  lineHeight: '1.5715',
                  color: 'rgba(0, 0, 0, 0.85)',
                  backgroundColor: '#fff',
                  border: '1px solid #d9d9d9',
                  borderRadius: '2px',
                  resize: 'vertical',
                }}
              />
              <div style={{ textAlign: 'right', color: 'rgba(0, 0, 0, 0.45)', fontSize: '12px', marginTop: '4px' }}>
                {form.getFieldValue('description')?.length || 0} / 5000
              </div>
            </Form.Item>

            {/* AI分類ウィジェット */}
            {showAIWidget && user && (
              <AIClassificationWidget
                subject={form.getFieldValue('subject') || ''}
                description={form.getFieldValue('description') || ''}
                requesterId={user.user_id}
                onAccept={handleAcceptAIPredictions}
                onReject={handleRejectAIPredictions}
              />
            )}

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="影響度"
                  name="impact"
                  rules={[
                    {
                      required: true,
                      message: '影響度を選択してください',
                    },
                  ]}
                  tooltip="この問題が影響する範囲を選択してください"
                >
                  <select
                    name="impact"
                    id="ticket-impact"
                    className="ant-input"
                    style={{
                      width: '100%',
                      height: '32px',
                      padding: '4px 11px',
                      fontSize: '14px',
                      lineHeight: '1.5715',
                      color: 'rgba(0, 0, 0, 0.85)',
                      backgroundColor: '#fff',
                      border: '1px solid #d9d9d9',
                      borderRadius: '2px',
                    }}
                    onChange={(e) => form.setFieldValue('impact', e.target.value)}
                    defaultValue="individual"
                    required
                  >
                    <option value="">影響度を選択</option>
                    <option value="individual">個人 (Individual)</option>
                    <option value="department">部署 (Department)</option>
                    <option value="company_wide">全社 (Company-wide)</option>
                    <option value="external">対外影響 (External)</option>
                  </select>
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label="緊急度"
                  name="urgency"
                  rules={[
                    {
                      required: true,
                      message: '緊急度を選択してください',
                    },
                  ]}
                  tooltip="対応の緊急性を選択してください"
                >
                  <select
                    name="urgency"
                    id="ticket-urgency"
                    className="ant-input"
                    style={{
                      width: '100%',
                      height: '32px',
                      padding: '4px 11px',
                      fontSize: '14px',
                      lineHeight: '1.5715',
                      color: 'rgba(0, 0, 0, 0.85)',
                      backgroundColor: '#fff',
                      border: '1px solid #d9d9d9',
                      borderRadius: '2px',
                    }}
                    onChange={(e) => form.setFieldValue('urgency', e.target.value)}
                    defaultValue="medium"
                    required
                  >
                    <option value="">緊急度を選択</option>
                    <option value="low">低 (Low)</option>
                    <option value="medium">中 (Medium)</option>
                    <option value="high">高 (High)</option>
                    <option value="immediate">即時 (Immediate)</option>
                  </select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  size="large"
                >
                  チケットを作成
                </Button>
                <Button onClick={handleCancel} size="large">
                  キャンセル
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  );
};

export default TicketCreate;
