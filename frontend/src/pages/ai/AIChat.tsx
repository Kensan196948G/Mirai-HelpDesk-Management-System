/**
 * AI対話アシスタントページ
 */

import React, { useState } from 'react';
import { Card, Input, Button, List, Avatar, Typography, Space, Spin } from 'antd';
import { CommentOutlined, SendOutlined, RobotOutlined, UserOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'こんにちは！ITヘルプデスクのAIアシスタントです。どのようなお困りごとでしょうか？',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    // シミュレーション: 実際のAI APIを呼び出す
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `「${userMessage.content}」についてのお問い合わせですね。\n\nこちらの内容は AI 分類機能により、適切なカテゴリとエージェントに自動的に割り当てられます。\n\n詳細な対応が必要な場合は、チケットを作成してください。`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);
      setLoading(false);
    }, 1500);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card>
        <Title level={2}>
          <CommentOutlined /> AI対話アシスタント
        </Title>
        <Paragraph>
          チケット対応やトラブルシューティングをAIがサポートします。
        </Paragraph>
      </Card>

      <Card style={{ marginTop: '16px', height: '600px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px' }}>
          <List
            dataSource={messages}
            renderItem={(message) => (
              <List.Item
                style={{
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                  border: 'none',
                  padding: '8px 0'
                }}
              >
                <Space
                  direction="horizontal"
                  align="start"
                  style={{
                    maxWidth: '70%',
                    flexDirection: message.role === 'user' ? 'row-reverse' : 'row'
                  }}
                >
                  <Avatar
                    icon={message.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                    style={{
                      backgroundColor: message.role === 'user' ? '#1890ff' : '#52c41a'
                    }}
                  />
                  <Card
                    size="small"
                    style={{
                      backgroundColor: message.role === 'user' ? '#e6f7ff' : '#f6ffed',
                      borderColor: message.role === 'user' ? '#91d5ff' : '#b7eb8f'
                    }}
                  >
                    <Text style={{ whiteSpace: 'pre-wrap' }}>{message.content}</Text>
                    <div style={{ marginTop: '8px' }}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {message.timestamp.toLocaleTimeString('ja-JP')}
                      </Text>
                    </div>
                  </Card>
                </Space>
              </List.Item>
            )}
          />
          {loading && (
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <Spin tip="AIが回答を生成中..." />
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '16px' }}>
          <Space.Compact style={{ width: '100%' }}>
            <TextArea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="メッセージを入力してください（Shift+Enterで改行）"
              autoSize={{ minRows: 1, maxRows: 4 }}
              disabled={loading}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              loading={loading}
              disabled={!inputValue.trim()}
            >
              送信
            </Button>
          </Space.Compact>
        </div>
      </Card>
    </div>
  );
};

export default AIChat;
