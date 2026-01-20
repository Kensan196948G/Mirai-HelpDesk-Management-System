import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Descriptions,
  Timeline,
  Comment,
  Avatar,
  Button,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  Divider,
  Row,
  Col,
  Spin,
  Alert,
  message,
  Radio,
} from 'antd';
import {
  UserOutlined,
  ClockCircleOutlined,
  ArrowLeftOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { getTicket, addComment, updateTicketStatus } from '@services/ticketService';
import { useAuthStore } from '@store/authStore';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_COLORS,
  TICKET_TYPE_LABELS,
  TicketStatus,
  UserRole,
} from '@types/index';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ja';

dayjs.extend(relativeTime);
dayjs.locale('ja');

const { Title, Text } = Typography;
const { TextArea } = Input;

const TicketDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [statusModalVisible, setStatusModalVisible] = useState(false);

  // チケット詳細取得
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => getTicket(id!),
    enabled: !!id,
  });

  // コメント追加
  const addCommentMutation = useMutation({
    mutationFn: ({ body, visibility }: { body: string; visibility: 'public' | 'internal' }) =>
      addComment(id!, body, visibility),
    onSuccess: (response) => {
      if (response.success) {
        message.success('コメントを追加しました');
        form.resetFields();
        refetch();
      } else {
        message.error(response.error?.message || 'コメントの追加に失敗しました');
      }
    },
    onError: () => {
      message.error('コメントの追加に失敗しました');
    },
  });

  // ステータス更新
  const updateStatusMutation = useMutation({
    mutationFn: ({ status, reason }: { status: string; reason?: string }) =>
      updateTicketStatus(id!, status, reason),
    onSuccess: (response) => {
      if (response.success) {
        message.success('ステータスを更新しました');
        queryClient.invalidateQueries({ queryKey: ['ticket', id] });
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
      } else {
        message.error(response.error?.message || 'ステータスの更新に失敗しました');
      }
    },
    onError: () => {
      message.error('ステータスの更新に失敗しました');
    },
  });

  const handleCommentSubmit = (values: { body: string; visibility: 'public' | 'internal' }) => {
    addCommentMutation.mutate(values);
  };

  const handleStatusUpdate = (status: string) => {
    updateStatusMutation.mutate({ status });
  };

  // ステータス遷移可能かチェック（Agent以上のロール）
  const canUpdateStatus = user && [
    UserRole.AGENT,
    UserRole.M365_OPERATOR,
    UserRole.APPROVER,
    UserRole.MANAGER,
  ].includes(user.role as UserRole);

  // 利用可能なステータス遷移を定義
  const getAvailableStatuses = (currentStatus: string): string[] => {
    const statusMap: Record<string, string[]> = {
      [TicketStatus.NEW]: [TicketStatus.TRIAGE, TicketStatus.CANCELED],
      [TicketStatus.TRIAGE]: [TicketStatus.ASSIGNED, TicketStatus.CANCELED],
      [TicketStatus.ASSIGNED]: [TicketStatus.IN_PROGRESS, TicketStatus.CANCELED],
      [TicketStatus.IN_PROGRESS]: [
        TicketStatus.PENDING_CUSTOMER,
        TicketStatus.PENDING_APPROVAL,
        TicketStatus.PENDING_CHANGE_WINDOW,
        TicketStatus.RESOLVED,
        TicketStatus.CANCELED,
      ],
      [TicketStatus.PENDING_CUSTOMER]: [TicketStatus.IN_PROGRESS, TicketStatus.CANCELED],
      [TicketStatus.PENDING_APPROVAL]: [TicketStatus.IN_PROGRESS, TicketStatus.CANCELED],
      [TicketStatus.PENDING_CHANGE_WINDOW]: [TicketStatus.IN_PROGRESS, TicketStatus.CANCELED],
      [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.REOPENED],
      [TicketStatus.REOPENED]: [TicketStatus.IN_PROGRESS],
    };

    return statusMap[currentStatus] || [];
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="読み込み中..." />
      </div>
    );
  }

  if (error || !data?.success || !data.data) {
    return (
      <div style={{ padding: '20px' }}>
        <Alert
          message="エラー"
          description="チケット情報の取得に失敗しました"
          type="error"
          showIcon
        />
        <Button
          type="primary"
          style={{ marginTop: 16 }}
          onClick={() => navigate('/tickets')}
        >
          チケット一覧に戻る
        </Button>
      </div>
    );
  }

  const { ticket, comments } = data.data;
  const availableStatuses = getAvailableStatuses(ticket.status);

  return (
    <div style={{ padding: '24px' }}>
      <Space style={{ marginBottom: 24 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/tickets')}
        >
          戻る
        </Button>
      </Space>

      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <Card title={
            <Space>
              <Text strong style={{ fontSize: 18 }}>
                {ticket.ticket_number}
              </Text>
              <Tag color={STATUS_COLORS[ticket.status]}>
                {STATUS_LABELS[ticket.status] || ticket.status}
              </Tag>
              <Tag color={PRIORITY_COLORS[ticket.priority]}>
                {ticket.priority}
              </Tag>
            </Space>
          }>
            <Title level={3}>{ticket.subject}</Title>

            <Descriptions bordered column={2} style={{ marginTop: 24 }}>
              <Descriptions.Item label="タイプ">
                {TICKET_TYPE_LABELS[ticket.type] || ticket.type}
              </Descriptions.Item>
              <Descriptions.Item label="カテゴリ">
                {ticket.category_name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="依頼者">
                {ticket.requester_name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="担当者">
                {ticket.assignee_name || '未割当'}
              </Descriptions.Item>
              <Descriptions.Item label="影響度">
                {ticket.impact}
              </Descriptions.Item>
              <Descriptions.Item label="緊急度">
                {ticket.urgency}
              </Descriptions.Item>
              <Descriptions.Item label="作成日時">
                {dayjs(ticket.created_at).format('YYYY/MM/DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="更新日時">
                {dayjs(ticket.updated_at).format('YYYY/MM/DD HH:mm')}
              </Descriptions.Item>
              {ticket.response_due_at && (
                <Descriptions.Item label="初動対応期限">
                  <Space>
                    <ClockCircleOutlined />
                    {dayjs(ticket.response_due_at).format('YYYY/MM/DD HH:mm')}
                  </Space>
                </Descriptions.Item>
              )}
              {ticket.due_at && (
                <Descriptions.Item label="解決期限">
                  <Space>
                    <ClockCircleOutlined />
                    {dayjs(ticket.due_at).format('YYYY/MM/DD HH:mm')}
                  </Space>
                </Descriptions.Item>
              )}
              {ticket.resolved_at && (
                <Descriptions.Item label="解決日時">
                  {dayjs(ticket.resolved_at).format('YYYY/MM/DD HH:mm')}
                </Descriptions.Item>
              )}
              {ticket.closed_at && (
                <Descriptions.Item label="完了日時">
                  {dayjs(ticket.closed_at).format('YYYY/MM/DD HH:mm')}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider orientation="left">説明</Divider>
            <div style={{
              padding: '16px',
              backgroundColor: '#fafafa',
              borderRadius: 4,
              whiteSpace: 'pre-wrap',
            }}>
              {ticket.description}
            </div>

            {ticket.resolution_summary && (
              <>
                <Divider orientation="left">解決サマリー</Divider>
                <div style={{
                  padding: '16px',
                  backgroundColor: '#f6ffed',
                  borderRadius: 4,
                  border: '1px solid #b7eb8f',
                  whiteSpace: 'pre-wrap',
                }}>
                  {ticket.resolution_summary}
                </div>
              </>
            )}

            {ticket.root_cause && (
              <>
                <Divider orientation="left">根本原因</Divider>
                <div style={{
                  padding: '16px',
                  backgroundColor: '#fff7e6',
                  borderRadius: 4,
                  border: '1px solid #ffd591',
                  whiteSpace: 'pre-wrap',
                }}>
                  {ticket.root_cause}
                </div>
              </>
            )}
          </Card>

          <Card
            title="コメント"
            style={{ marginTop: 24 }}
          >
            {comments && comments.length > 0 ? (
              <div style={{ marginBottom: 24 }}>
                {comments.map((comment) => (
                  <Comment
                    key={comment.comment_id}
                    author={
                      <Space>
                        <Text strong>{comment.author_name}</Text>
                        {comment.visibility === 'internal' && (
                          <Tag color="orange">内部メモ</Tag>
                        )}
                      </Space>
                    }
                    avatar={<Avatar icon={<UserOutlined />} />}
                    content={
                      <div style={{ whiteSpace: 'pre-wrap' }}>
                        {comment.body}
                      </div>
                    }
                    datetime={
                      <Text type="secondary">
                        {dayjs(comment.created_at).format('YYYY/MM/DD HH:mm')}
                        {' '}
                        ({dayjs(comment.created_at).fromNow()})
                      </Text>
                    }
                  />
                ))}
              </div>
            ) : (
              <Text type="secondary">コメントがありません</Text>
            )}

            <Divider />

            <Form
              form={form}
              onFinish={handleCommentSubmit}
              initialValues={{ visibility: 'public' }}
            >
              <Form.Item
                name="body"
                rules={[{ required: true, message: 'コメントを入力してください' }]}
              >
                <TextArea
                  rows={4}
                  placeholder="コメントを入力してください"
                />
              </Form.Item>

              {canUpdateStatus && (
                <Form.Item name="visibility">
                  <Radio.Group>
                    <Radio value="public">公開（依頼者も閲覧可能）</Radio>
                    <Radio value="internal">内部メモ（担当者のみ）</Radio>
                  </Radio.Group>
                </Form.Item>
              )}

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={addCommentMutation.isPending}
                >
                  コメントを追加
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          {canUpdateStatus && availableStatuses.length > 0 && (
            <Card title="ステータス更新" style={{ marginBottom: 24 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text type="secondary">現在のステータス:</Text>
                <Tag color={STATUS_COLORS[ticket.status]} style={{ fontSize: 14, padding: '4px 12px' }}>
                  {STATUS_LABELS[ticket.status] || ticket.status}
                </Tag>

                <Divider style={{ margin: '16px 0' }} />

                <Text type="secondary">変更可能なステータス:</Text>
                {availableStatuses.map((status) => (
                  <Button
                    key={status}
                    block
                    onClick={() => handleStatusUpdate(status)}
                    loading={updateStatusMutation.isPending}
                  >
                    {STATUS_LABELS[status] || status}
                  </Button>
                ))}
              </Space>
            </Card>
          )}

          <Card title="タイムライン">
            <Timeline
              items={[
                {
                  color: 'blue',
                  children: (
                    <>
                      <Text strong>チケット作成</Text>
                      <br />
                      <Text type="secondary">
                        {dayjs(ticket.created_at).format('YYYY/MM/DD HH:mm')}
                      </Text>
                    </>
                  ),
                },
                ...(comments?.map((comment) => ({
                  children: (
                    <>
                      <Text strong>{comment.author_name}</Text>
                      {' '}がコメントを追加
                      {comment.visibility === 'internal' && (
                        <Tag color="orange" style={{ marginLeft: 8 }}>内部</Tag>
                      )}
                      <br />
                      <Text type="secondary">
                        {dayjs(comment.created_at).format('YYYY/MM/DD HH:mm')}
                      </Text>
                    </>
                  ),
                })) || []),
                ...(ticket.resolved_at
                  ? [
                      {
                        color: 'green',
                        children: (
                          <>
                            <Text strong>解決</Text>
                            <br />
                            <Text type="secondary">
                              {dayjs(ticket.resolved_at).format('YYYY/MM/DD HH:mm')}
                            </Text>
                          </>
                        ),
                      },
                    ]
                  : []),
                ...(ticket.closed_at
                  ? [
                      {
                        color: 'gray',
                        children: (
                          <>
                            <Text strong>完了</Text>
                            <br />
                            <Text type="secondary">
                              {dayjs(ticket.closed_at).format('YYYY/MM/DD HH:mm')}
                            </Text>
                          </>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TicketDetail;
