import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { approvalService, Approval } from '@services/approvalService';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Input,
  message,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';

const { Title, Text } = Typography;
const { TextArea } = Input;

dayjs.locale('ja');

const ApprovalList = () => {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'approve' | 'reject'>('approve');
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const navigate = useNavigate();

  // データ取得
  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const response = await approvalService.getApprovals({
        state: 'requested,approved,rejected',
        pageSize: 50,
      });

      if (response.success && response.data) {
        setApprovals(response.data.approvals || []);
      } else {
        message.error(response.error?.message || '承認依頼の取得に失敗しました');
      }
    } catch (error: any) {
      console.error('承認依頼取得エラー:', error);
      message.error('承認依頼の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const stateColors: Record<string, string> = {
    requested: 'orange',
    approved: 'green',
    rejected: 'red',
  };

  const stateLabels: Record<string, string> = {
    requested: '承認待ち',
    approved: '承認済み',
    rejected: '却下',
  };

  const handleApprove = (record: any) => {
    setSelectedApproval(record);
    setModalType('approve');
    setReason('');
    setComment('');
    setModalVisible(true);
  };

  const handleReject = (record: any) => {
    setSelectedApproval(record);
    setModalType('reject');
    setReason('');
    setComment('');
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (modalType === 'reject' && !reason.trim()) {
      message.error('却下理由を入力してください');
      return;
    }

    try {
      setSubmitting(true);

      let response;
      if (modalType === 'approve') {
        response = await approvalService.approve(
          selectedApproval!.approval_id,
          comment
        );
      } else {
        response = await approvalService.reject(
          selectedApproval!.approval_id,
          reason,
          comment
        );
      }

      if (response.success) {
        message.success(
          modalType === 'approve' ? '承認しました' : '却下しました'
        );
        setModalVisible(false);
        setReason('');
        setComment('');
        fetchApprovals(); // 再読み込み
      } else {
        message.error(response.error?.message || '処理に失敗しました');
      }
    } catch (error: any) {
      console.error('承認処理エラー:', error);
      message.error('処理中にエラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'チケット番号',
      dataIndex: 'ticket_number',
      key: 'ticket_number',
      render: (text: string, record: any) => (
        <a onClick={() => navigate(`/tickets/${record.ticket_id}`)}>{text}</a>
      ),
    },
    {
      title: '件名',
      dataIndex: 'ticket_subject',
      key: 'ticket_subject',
      ellipsis: true,
    },
    {
      title: '依頼者',
      dataIndex: 'requester_name',
      key: 'requester_name',
    },
    {
      title: 'ステータス',
      dataIndex: 'state',
      key: 'state',
      render: (state: string) => (
        <Tag color={stateColors[state]}>{stateLabels[state]}</Tag>
      ),
    },
    {
      title: '依頼日時',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY/MM/DD HH:mm'),
    },
    {
      title: '対応日時',
      dataIndex: 'responded_at',
      key: 'responded_at',
      render: (date: string) =>
        date ? dayjs(date).format('YYYY/MM/DD HH:mm') : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => {
        if (record.state === 'requested') {
          return (
            <Space>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                size="small"
                onClick={() => handleApprove(record)}
              >
                承認
              </Button>
              <Button
                danger
                icon={<CloseCircleOutlined />}
                size="small"
                onClick={() => handleReject(record)}
              >
                却下
              </Button>
            </Space>
          );
        }
        return '-';
      },
    },
  ];

  return (
    <div>
      <Title level={2}>
        <ClockCircleOutlined /> 承認依頼
      </Title>

      <Card>
        <Table
          columns={columns}
          dataSource={approvals}
          loading={loading}
          rowKey="approval_id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `全 ${total} 件`,
          }}
        />
      </Card>

      <Modal
        title={modalType === 'approve' ? '承認' : '却下'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={submitting}
        okText={modalType === 'approve' ? '承認する' : '却下する'}
        cancelText="キャンセル"
        okButtonProps={{
          danger: modalType === 'reject',
        }}
      >
        {selectedApproval && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <Text strong>チケット: </Text>
              <Text>{selectedApproval.ticket_number}</Text>
            </div>
            <div>
              <Text strong>件名: </Text>
              <Text>{selectedApproval.ticket_subject}</Text>
            </div>
            <div>
              <Text strong>依頼者: </Text>
              <Text>{selectedApproval.requester_name}</Text>
            </div>

            <div>
              <Text strong>
                {modalType === 'approve' ? '承認' : '却下'}理由
                {modalType === 'reject' && <Text type="danger"> *</Text>}:
              </Text>
              <TextArea
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={`${
                  modalType === 'approve' ? '承認' : '却下'
                }理由を入力してください`}
                style={{ marginTop: 8 }}
              />
            </div>

            <div>
              <Text strong>コメント（オプション）:</Text>
              <TextArea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="追加のコメントがあれば入力してください"
                style={{ marginTop: 8 }}
              />
            </div>
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default ApprovalList;
