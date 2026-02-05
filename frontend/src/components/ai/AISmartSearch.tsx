/**
 * AI Smart Search
 *
 * 自然言語クエリによるチケット検索コンポーネント
 */

import React, { useState } from 'react';
import {
  Card,
  Input,
  Button,
  List,
  Tag,
  Typography,
  Space,
  Alert,
  Collapse,
  Descriptions,
} from 'antd';
import {
  SearchOutlined,
  RobotOutlined,
  CodeOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { aiService } from '../../services/aiService';
import { useAIStore } from '../../store/aiStore';
import { useNavigate } from 'react-router-dom';
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS } from '@appTypes/index';
import dayjs from 'dayjs';

const { Search } = Input;
const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface AISmartSearchProps {
  defaultQuery?: string;
  onSelectTicket?: (ticketId: string) => void;
}

export const AISmartSearch: React.FC<AISmartSearchProps> = ({
  defaultQuery = '',
  onSelectTicket,
}) => {
  const [query, setQuery] = useState(defaultQuery);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { aiEnabled } = useAIStore();
  const navigate = useNavigate();

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery || searchQuery.trim().length < 3) {
      setError('検索クエリは3文字以上入力してください。');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await aiService.smartSearch({
        query: searchQuery,
        max_results: 20,
      });

      setResults(result);
    } catch (err: any) {
      console.error('スマート検索エラー:', err);
      setError(
        err.response?.data?.error?.message ||
          err.message ||
          'スマート検索に失敗しました。'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTicketClick = (ticketId: string) => {
    if (onSelectTicket) {
      onSelectTicket(ticketId);
    } else {
      navigate(`/tickets/${ticketId}`);
    }
  };

  if (!aiEnabled) return null;

  return (
    <Card
      title={
        <Space>
          <RobotOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
          <span>AI スマート検索</span>
        </Space>
      }
    >
      {/* 検索バー */}
      <Search
        placeholder='例: "先週のOutlook関連のP1チケットを表示"'
        enterButton={
          <Button type="primary" icon={<SearchOutlined />}>
            検索
          </Button>
        }
        size="large"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onSearch={handleSearch}
        loading={loading}
        disabled={loading}
      />

      {/* 使用例 */}
      <div style={{ marginTop: 12 }}>
        <Text type="secondary">使用例:</Text>
        <div style={{ marginTop: 8 }}>
          <Space wrap>
            {[
              '今日作成されたP1チケット',
              '未解決のTeams関連チケット',
              '山田さんが担当しているチケット',
              '先月解決したライセンス関連',
            ].map((example) => (
              <Tag
                key={example}
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setQuery(example);
                  handleSearch(example);
                }}
              >
                {example}
              </Tag>
            ))}
          </Space>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <Alert
          message="エラー"
          description={error}
          type="error"
          closable
          onClose={() => setError(null)}
          style={{ marginTop: 16 }}
          showIcon
        />
      )}

      {/* 検索結果 */}
      {results && !loading && (
        <div style={{ marginTop: 16 }}>
          {/* クエリ解釈 */}
          <Alert
            message={
              <Space>
                <FileTextOutlined />
                <Text strong>クエリ解釈</Text>
              </Space>
            }
            description={results.interpretation}
            type="info"
            style={{ marginBottom: 16 }}
          />

          {/* 適用されたフィルター */}
          {results.filters_applied && Object.keys(results.filters_applied).some(key => results.filters_applied[key]) && (
            <Collapse ghost style={{ marginBottom: 16 }}>
              <Panel
                header={
                  <Space>
                    <CodeOutlined />
                    <Text>適用されたフィルター条件</Text>
                  </Space>
                }
                key="filters"
              >
                <Descriptions bordered size="small" column={1}>
                  {results.filters_applied.status && (
                    <Descriptions.Item label="ステータス">
                      {results.filters_applied.status.join(', ')}
                    </Descriptions.Item>
                  )}
                  {results.filters_applied.priority && (
                    <Descriptions.Item label="優先度">
                      {results.filters_applied.priority.join(', ')}
                    </Descriptions.Item>
                  )}
                  {results.filters_applied.category && (
                    <Descriptions.Item label="カテゴリ">
                      {results.filters_applied.category}
                    </Descriptions.Item>
                  )}
                  {results.filters_applied.date_range && (
                    <Descriptions.Item label="期間">
                      {results.filters_applied.date_range.start} 〜 {results.filters_applied.date_range.end}
                    </Descriptions.Item>
                  )}
                  {results.filters_applied.assignee && (
                    <Descriptions.Item label="担当者">
                      {results.filters_applied.assignee}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Panel>
            </Collapse>
          )}

          {/* 検索結果一覧 */}
          <Text strong>検索結果: {results.total_results}件</Text>
          <Text type="secondary" style={{ marginLeft: 12 }}>
            ({(results.processing_time_ms / 1000).toFixed(1)}秒)
          </Text>

          <List
            style={{ marginTop: 12 }}
            itemLayout="vertical"
            dataSource={results.tickets}
            locale={{ emptyText: 'チケットが見つかりませんでした' }}
            renderItem={(ticket: any) => (
              <List.Item
                key={ticket.ticket_id}
                actions={[
                  <Button
                    type="link"
                    onClick={() => handleTicketClick(ticket.ticket_id)}
                  >
                    詳細を見る
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Text strong>{ticket.ticket_number}</Text>
                      <Tag color={STATUS_COLORS[ticket.status]}>
                        {STATUS_LABELS[ticket.status] || ticket.status}
                      </Tag>
                      <Tag color={PRIORITY_COLORS[ticket.priority]}>
                        {ticket.priority}
                      </Tag>
                    </Space>
                  }
                  description={ticket.subject}
                />
                <Paragraph
                  ellipsis={{ rows: 2, expandable: true }}
                  style={{ marginTop: 8 }}
                >
                  {ticket.description || '-'}
                </Paragraph>
                <Text type="secondary">
                  作成日時: {dayjs(ticket.created_at).format('YYYY/MM/DD HH:mm')}
                </Text>
              </List.Item>
            )}
          />
        </div>
      )}
    </Card>
  );
};
