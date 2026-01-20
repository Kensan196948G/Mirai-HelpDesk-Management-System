import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Form,
  Input,
  Select,
  Button,
  Card,
  Typography,
  Alert,
  Space,
  Row,
  Col,
  Spin,
} from 'antd';
import {
  TicketType,
  ImpactLevel,
  UrgencyLevel,
  TICKET_TYPE_LABELS,
} from '@types/index';
import {
  createTicket,
  CreateTicketRequest,
} from '@services/ticketService';
import { getCategories, Category } from '@services/categoryService';

const { Title } = Typography;
const { TextArea } = Input;

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

  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string>('');

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

  // フォーム送信処理
  const handleSubmit = async (values: TicketFormValues) => {
    setLoading(true);
    setError('');

    try {
      const requestData: CreateTicketRequest = {
        type: values.type,
        subject: values.subject,
        description: values.description,
        impact: values.impact,
        urgency: values.urgency,
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

  return (
    <div style={{ padding: '24px' }}>
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
              impact: ImpactLevel.INDIVIDUAL,
              urgency: UrgencyLevel.MEDIUM,
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
                  <Select
                    placeholder="チケットタイプを選択"
                    options={[
                      {
                        value: TicketType.INCIDENT,
                        label: TICKET_TYPE_LABELS[TicketType.INCIDENT],
                      },
                      {
                        value: TicketType.SERVICE_REQUEST,
                        label: TICKET_TYPE_LABELS[TicketType.SERVICE_REQUEST],
                      },
                      {
                        value: TicketType.CHANGE,
                        label: TICKET_TYPE_LABELS[TicketType.CHANGE],
                      },
                      {
                        value: TicketType.PROBLEM,
                        label: TICKET_TYPE_LABELS[TicketType.PROBLEM],
                      },
                    ]}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label="カテゴリ" name="category_id">
                  <Select
                    placeholder="カテゴリを選択（任意）"
                    allowClear
                    loading={loadingCategories}
                    options={categories.map((cat) => ({
                      value: cat.category_id,
                      label: cat.name,
                    }))}
                  />
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
              <Input
                placeholder="問題の概要を簡潔に入力してください"
                maxLength={200}
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
              <TextArea
                rows={6}
                placeholder="詳細な状況、発生条件、エラーメッセージなどを記載してください"
                maxLength={5000}
                showCount
              />
            </Form.Item>

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
                  <Select
                    placeholder="影響度を選択"
                    options={[
                      {
                        value: ImpactLevel.INDIVIDUAL,
                        label: ImpactLevel.INDIVIDUAL,
                      },
                      {
                        value: ImpactLevel.DEPARTMENT,
                        label: ImpactLevel.DEPARTMENT,
                      },
                      {
                        value: ImpactLevel.COMPANY_WIDE,
                        label: ImpactLevel.COMPANY_WIDE,
                      },
                      {
                        value: ImpactLevel.EXTERNAL,
                        label: ImpactLevel.EXTERNAL,
                      },
                    ]}
                  />
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
                  <Select
                    placeholder="緊急度を選択"
                    options={[
                      {
                        value: UrgencyLevel.LOW,
                        label: UrgencyLevel.LOW,
                      },
                      {
                        value: UrgencyLevel.MEDIUM,
                        label: UrgencyLevel.MEDIUM,
                      },
                      {
                        value: UrgencyLevel.HIGH,
                        label: UrgencyLevel.HIGH,
                      },
                      {
                        value: UrgencyLevel.IMMEDIATE,
                        label: UrgencyLevel.IMMEDIATE,
                      },
                    ]}
                  />
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
