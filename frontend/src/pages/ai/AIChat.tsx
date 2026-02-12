/**
 * AI対話アシスタントページ - 3フェーズ完全実装
 *
 * フェーズ1: 診断質問 (Diagnostic)
 * フェーズ2: 解決提案 (Solution)
 * フェーズ3: チケット作成 (Ticket Creation)
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Input,
  Button,
  List,
  Avatar,
  Typography,
  Space,
  Spin,
  message,
  Radio,
  Tabs,
  Timeline,
  Descriptions,
  Alert,
  Tag,
  Divider,
  Steps,
} from 'antd';
import {
  CommentOutlined,
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import {
  Message,
  DiagnosticQuestion,
  SolutionProposal,
  KnowledgeArticlePreview,
  ConversationPhase,
  TicketCreationResult,
} from '../../types/ai-chat.types';
import * as aiService from '../../services/aiService';


const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const AIChat: React.FC = () => {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 初期メッセージ
  const initialMessage: Message = {
    id: '1',
    role: 'assistant',
    content:
      'こんにちは！ITヘルプデスクのAIアシスタントです。どのようなお困りごとでしょうか？\n\n問題の内容を詳しく教えていただければ、診断と解決策の提案をサポートいたします。',
    timestamp: new Date(),
  };

  // 基本State
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [inputValue, setInputValue] = useState('');
  const [loading] = useState(false);

  // フェーズ管理State
  const [currentPhase, setCurrentPhase] = useState<ConversationPhase | 'initial'>('initial');

  // フェーズ1: 診断質問
  const [diagnosticQuestions, setDiagnosticQuestions] = useState<DiagnosticQuestion[]>([]);
  const [diagnosticAnswers, setDiagnosticAnswers] = useState<Record<string, string>>({});
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  // フェーズ2: 解決提案
  const [proposedSolutions, setProposedSolutions] = useState<SolutionProposal[]>([]);
  const [relatedKnowledge, setRelatedKnowledge] = useState<KnowledgeArticlePreview[]>([]);
  const [isGeneratingSolutions, setIsGeneratingSolutions] = useState(false);
  const [selectedSolutionId, setSelectedSolutionId] = useState<string | null>(null);

  // フェーズ3: チケット作成
  const [ticketDraft, setTicketDraft] = useState<TicketCreationResult | null>(null);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  // エラーState
  const [error, setError] = useState<string | null>(null);

  // 自動スクロール
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 会話リロード
  const handleReload = () => {
    setMessages([
      {
        ...initialMessage,
        id: Date.now().toString(),
        timestamp: new Date(),
      },
    ]);
    setInputValue('');
    setCurrentPhase('initial');
    setDiagnosticQuestions([]);
    setDiagnosticAnswers({});
    setProposedSolutions([]);
    setRelatedKnowledge([]);
    setTicketDraft(null);
    setSelectedSolutionId(null);
    setError(null);
    message.success('会話をリロードしました');
  };

  // フェーズ1: 初期問題送信 → 診断質問生成
  const handleInitialSubmit = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsGeneratingQuestions(true);
    setError(null);

    try {
      // API呼び出し: 診断質問を生成
      const result = await aiService.aiService.chatDiagnose({
        initial_problem: userMessage.content,
        conversation_history: messages,
      });

      // 診断質問を保存
      setDiagnosticQuestions(result.questions);

      // AIからの応答メッセージを追加
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `問題内容を確認しました。より詳しく診断するために、以下の質問にお答えください。`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      // フェーズを診断に移行
      setCurrentPhase('diagnostic');

      message.success('診断質問を生成しました');
    } catch (error: any) {
      console.error('AI診断エラー:', error);
      setError(error.message || 'AI診断に失敗しました');
      message.error('AI診断に失敗しました。もう一度お試しください。');
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  // 診断回答の変更
  const handleAnswerChange = (questionId: string, answer: string) => {
    setDiagnosticAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  // フェーズ2: 診断回答送信 → 解決提案生成
  const handleDiagnosticAnswers = async () => {
    // 全ての質問に回答されているか確認
    const unansweredQuestions = diagnosticQuestions.filter(
      (q) => !diagnosticAnswers[q.question_id] || diagnosticAnswers[q.question_id].trim() === ''
    );

    if (unansweredQuestions.length > 0) {
      message.warning('すべての質問に回答してください');
      return;
    }

    setIsGeneratingSolutions(true);
    setError(null);

    // 回答をメッセージとして追加
    const answersText = diagnosticQuestions
      .map((q) => `Q: ${q.question_text}\nA: ${diagnosticAnswers[q.question_id]}`)
      .join('\n\n');

    const userAnswerMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `【診断回答】\n${answersText}`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userAnswerMessage]);

    try {
      // API呼び出し: 解決策を提案
      const result = await aiService.aiService.chatSuggestSolution({
        conversation_history: [...messages, userAnswerMessage],
        diagnostic_answers: diagnosticAnswers,
      });

      // 解決提案とナレッジ記事を保存
      setProposedSolutions(result.solutions);
      setRelatedKnowledge(result.knowledge_articles);

      // AIからの応答メッセージを追加
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `診断結果をもとに、${result.solutions.length}つの解決策を提案します。それぞれの内容を確認して、最適な方法を選択してください。`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      // フェーズを解決提案に移行
      setCurrentPhase('solution');

      message.success('解決策を生成しました');
    } catch (error: any) {
      console.error('AI解決提案エラー:', error);
      setError(error.message || '解決策の生成に失敗しました');
      message.error('解決策の生成に失敗しました。もう一度お試しください。');
    } finally {
      setIsGeneratingSolutions(false);
    }
  };

  // フェーズ3: 解決策選択 → チケット作成へ
  const handleSelectSolution = async (solutionId: string) => {
    setSelectedSolutionId(solutionId);

    const selectedSolution = proposedSolutions.find((s) => s.solution_id === solutionId);
    if (!selectedSolution) return;

    // エスカレーションタイプの場合、チケット作成フェーズへ
    if (selectedSolution.approach_type === 'escalation') {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: `提案${proposedSolutions.indexOf(selectedSolution) + 1}: 「${selectedSolution.title}」を選択しました。チケットを作成します。`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // チケットドラフト生成
      await handleGenerateTicketDraft();
    } else {
      // セルフサービス/回避策の場合、手順を表示
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: `提案${proposedSolutions.indexOf(selectedSolution) + 1}: 「${selectedSolution.title}」を試してみます。`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `了解しました。以下の手順に従って対応してください。\n\n問題が解決しない場合は、チケットを作成してサポートチームに依頼することもできます。`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      message.info('手順を確認して実施してください');
    }
  };

  // チケットドラフト生成
  const handleGenerateTicketDraft = async () => {
    setIsCreatingTicket(true);
    setError(null);

    try {
      // API呼び出し: チケット作成
      const result = await aiService.aiService.chatCreateTicket({
        conversation_history: messages,
        user_confirmed_values: undefined,
      });

      // チケットドラフトを保存
      setTicketDraft(result);

      // AIからの応答メッセージを追加
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `チケットを作成しました。以下の内容でチケットが登録されています。`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      // フェーズをチケット作成に移行
      setCurrentPhase('ticket_creation');

      message.success('チケットを作成しました');
    } catch (error: any) {
      console.error('AIチケット作成エラー:', error);
      setError(error.message || 'チケットの作成に失敗しました');
      message.error('チケットの作成に失敗しました。もう一度お試しください。');
    } finally {
      setIsCreatingTicket(false);
    }
  };

  // チケット詳細ページへ遷移
  const handleViewTicket = () => {
    if (ticketDraft && ticketDraft.ticket) {
      navigate(`/tickets/${ticketDraft.ticket.ticket_id}`);
    }
  };

  // 優先度に応じた色
  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'p1':
      case 'critical':
        return 'red';
      case 'p2':
      case 'high':
        return 'orange';
      case 'p3':
      case 'medium':
        return 'blue';
      case 'p4':
      case 'low':
        return 'green';
      default:
        return 'default';
    }
  };

  // アプローチタイプに応じたアイコンと色
  const getApproachTypeDisplay = (type: string) => {
    switch (type) {
      case 'self_service':
        return { icon: <CheckCircleOutlined />, color: 'green', text: 'セルフサービス' };
      case 'workaround':
        return { icon: <InfoCircleOutlined />, color: 'blue', text: '回避策' };
      case 'escalation':
        return { icon: <WarningOutlined />, color: 'orange', text: 'エスカレーション' };
      default:
        return { icon: <InfoCircleOutlined />, color: 'default', text: type };
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* ヘッダー */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              <CommentOutlined /> AI対話アシスタント
            </Title>
            <Paragraph style={{ marginTop: '8px', marginBottom: 0 }}>
              チケット対応やトラブルシューティングをAIがサポートします。
            </Paragraph>
          </div>
          <Button icon={<ReloadOutlined />} onClick={handleReload} type="default">
            会話をリロード
          </Button>
        </div>
      </Card>

      {/* 進行状況ステップ */}
      {currentPhase !== 'initial' && (
        <Card style={{ marginTop: '16px' }}>
          <Steps
            current={
              currentPhase === 'diagnostic' ? 0 : currentPhase === 'solution' ? 1 : 2
            }
            items={[
              { title: '診断質問', icon: <InfoCircleOutlined /> },
              { title: '解決提案', icon: <CheckCircleOutlined /> },
              { title: 'チケット作成', icon: <FileTextOutlined /> },
            ]}
          />
        </Card>
      )}

      {/* エラー表示 */}
      {error && (
        <Alert
          message="エラー"
          description={error}
          type="error"
          closable
          onClose={() => setError(null)}
          style={{ marginTop: '16px' }}
          showIcon
        />
      )}

      {/* チャットメッセージエリア */}
      <Card
        style={{
          marginTop: '16px',
          height: '600px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            marginBottom: '16px',
            paddingRight: '8px',
          }}
        >
          <List
            dataSource={messages}
            renderItem={(message) => (
              <List.Item
                style={{
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                  border: 'none',
                  padding: '8px 0',
                }}
              >
                <Space
                  direction="horizontal"
                  align="start"
                  style={{
                    maxWidth: '70%',
                    flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                  }}
                >
                  <Avatar
                    icon={message.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                    style={{
                      backgroundColor: message.role === 'user' ? '#1890ff' : '#52c41a',
                    }}
                  />
                  <Card
                    size="small"
                    style={{
                      backgroundColor: message.role === 'user' ? '#e6f7ff' : '#f6ffed',
                      borderColor: message.role === 'user' ? '#91d5ff' : '#b7eb8f',
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
          {(isGeneratingQuestions || isGeneratingSolutions || isCreatingTicket) && (
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <Spin
                tip={
                  isGeneratingQuestions
                    ? 'AI診断質問を生成中...'
                    : isGeneratingSolutions
                    ? 'AI解決策を生成中...'
                    : 'チケットを作成中...'
                }
              />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* フェーズ1: 診断質問表示 */}
        {currentPhase === 'diagnostic' && diagnosticQuestions.length > 0 && (
          <div style={{ marginTop: '16px', marginBottom: '16px' }}>
            <Divider orientation="left">診断質問</Divider>
            <Card style={{ backgroundColor: '#f0f2f5' }}>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {diagnosticQuestions.map((q, index) => (
                  <div key={q.question_id} style={{ marginBottom: '16px' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <Text strong>
                        質問 {index + 1}: {q.question_text}
                      </Text>
                      {q.rationale && (
                        <div>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {q.rationale}
                          </Text>
                        </div>
                      )}
                    </div>
                    {q.suggested_answers && q.suggested_answers.length > 0 ? (
                      <Radio.Group
                        onChange={(e) => handleAnswerChange(q.question_id, e.target.value)}
                        value={diagnosticAnswers[q.question_id]}
                        style={{ width: '100%' }}
                      >
                        <Space direction="vertical">
                          {q.suggested_answers.map((ans) => (
                            <Radio key={ans} value={ans}>
                              {ans}
                            </Radio>
                          ))}
                        </Space>
                      </Radio.Group>
                    ) : (
                      <TextArea
                        placeholder="回答を入力してください"
                        value={diagnosticAnswers[q.question_id] || ''}
                        onChange={(e) => handleAnswerChange(q.question_id, e.target.value)}
                        autoSize={{ minRows: 2, maxRows: 4 }}
                      />
                    )}
                  </div>
                ))}
                <Button
                  type="primary"
                  size="large"
                  onClick={handleDiagnosticAnswers}
                  loading={isGeneratingSolutions}
                  block
                >
                  回答を送信
                </Button>
              </Space>
            </Card>
          </div>
        )}

        {/* フェーズ2: 解決提案表示 */}
        {currentPhase === 'solution' && proposedSolutions.length > 0 && (
          <div style={{ marginTop: '16px', marginBottom: '16px' }}>
            <Divider orientation="left">解決策の提案</Divider>
            <Card style={{ backgroundColor: '#f0f2f5' }}>
              <Tabs defaultActiveKey="0">
                {proposedSolutions.map((sol, index) => {
                  const display = getApproachTypeDisplay(sol.approach_type);
                  return (
                    <Tabs.TabPane
                      tab={
                        <span>
                          {display.icon} 提案{index + 1}
                        </span>
                      }
                      key={String(index)}
                    >
                      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <div>
                          <Title level={4}>{sol.title}</Title>
                          <Space>
                            <Tag color={display.color}>{display.text}</Tag>
                            <Text type="secondary">推定解決時間: {sol.estimated_resolution_time}</Text>
                            <Text type="secondary">信頼度: {(sol.confidence * 100).toFixed(0)}%</Text>
                          </Space>
                        </div>

                        {sol.prerequisites && sol.prerequisites.length > 0 && (
                          <Alert
                            message="前提条件"
                            description={
                              <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
                                {sol.prerequisites.map((pre, idx) => (
                                  <li key={idx}>{pre}</li>
                                ))}
                              </ul>
                            }
                            type="info"
                            showIcon
                          />
                        )}

                        {sol.warnings && sol.warnings.length > 0 && (
                          <Alert
                            message="注意事項"
                            description={
                              <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
                                {sol.warnings.map((warn, idx) => (
                                  <li key={idx}>{warn}</li>
                                ))}
                              </ul>
                            }
                            type="warning"
                            showIcon
                          />
                        )}

                        <Timeline>
                          {sol.steps.map((step) => (
                            <Timeline.Item key={step.step_number}>
                              <div>
                                <Text strong>ステップ {step.step_number}</Text>
                                <Paragraph>{step.instruction}</Paragraph>
                                {step.command && (
                                  <Card
                                    size="small"
                                    style={{
                                      backgroundColor: '#f5f5f5',
                                      fontFamily: 'monospace',
                                    }}
                                  >
                                    <code>{step.command}</code>
                                  </Card>
                                )}
                                {step.expected_result && (
                                  <Text type="secondary">期待される結果: {step.expected_result}</Text>
                                )}
                                {step.screenshot_required && (
                                  <Tag color="blue">スクリーンショット必須</Tag>
                                )}
                              </div>
                            </Timeline.Item>
                          ))}
                        </Timeline>

                        <Button
                          type="primary"
                          size="large"
                          onClick={() => handleSelectSolution(sol.solution_id)}
                          loading={isCreatingTicket && selectedSolutionId === sol.solution_id}
                          block
                        >
                          {sol.approach_type === 'escalation'
                            ? 'この解決策でチケットを作成'
                            : 'この解決策を試す'}
                        </Button>
                      </Space>
                    </Tabs.TabPane>
                  );
                })}
              </Tabs>

              {/* ナレッジ記事表示 */}
              {relatedKnowledge.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <Divider orientation="left">関連ナレッジ記事</Divider>
                  <List
                    dataSource={relatedKnowledge}
                    renderItem={(kb) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={<Avatar icon={<FileTextOutlined />} />}
                          title={
                            <a
                              href={`/knowledge/${kb.article_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {kb.title}
                            </a>
                          }
                          description={kb.summary || kb.content_preview}
                        />
                      </List.Item>
                    )}
                  />
                </div>
              )}
            </Card>
          </div>
        )}

        {/* フェーズ3: チケット作成確認 */}
        {currentPhase === 'ticket_creation' && ticketDraft && (
          <div style={{ marginTop: '16px', marginBottom: '16px' }}>
            <Divider orientation="left">作成されたチケット</Divider>
            <Card style={{ backgroundColor: '#f0f2f5' }}>
              <Alert
                message="チケットが作成されました"
                description="以下の内容でチケットが正常に登録されました。チケット詳細ページで確認できます。"
                type="success"
                showIcon
                style={{ marginBottom: '16px' }}
              />

              <Descriptions bordered column={2}>
                <Descriptions.Item label="チケット番号" span={2}>
                  <Text strong style={{ fontSize: '16px' }}>
                    {ticketDraft.ticket.ticket_number}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="件名" span={2}>
                  {ticketDraft.ticket.subject}
                </Descriptions.Item>
                <Descriptions.Item label="タイプ">
                  {ticketDraft.ticket.type}
                </Descriptions.Item>
                <Descriptions.Item label="ステータス">
                  <Tag color="blue">{ticketDraft.ticket.status}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="優先度">
                  <Tag color={getPriorityColor(ticketDraft.ticket.priority)}>
                    {ticketDraft.ticket.priority}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="影響度">
                  {ticketDraft.ticket.impact}
                </Descriptions.Item>
                <Descriptions.Item label="緊急度">
                  {ticketDraft.ticket.urgency}
                </Descriptions.Item>
                <Descriptions.Item label="作成日時">
                  {new Date(ticketDraft.ticket.created_at).toLocaleString('ja-JP')}
                </Descriptions.Item>
                <Descriptions.Item label="詳細説明" span={2}>
                  <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                    {ticketDraft.ticket.description}
                  </pre>
                </Descriptions.Item>
              </Descriptions>

              {ticketDraft.ai_classification && (
                <div style={{ marginTop: '16px' }}>
                  <Text type="secondary">
                    AI分類による推奨値が適用されています
                  </Text>
                </div>
              )}

              <Space style={{ marginTop: '16px', width: '100%', justifyContent: 'center' }}>
                <Button type="primary" size="large" onClick={handleViewTicket}>
                  チケット詳細を表示
                </Button>
                <Button onClick={handleReload} size="large">
                  新しい会話を開始
                </Button>
              </Space>
            </Card>
          </div>
        )}

        {/* 入力エリア */}
        {currentPhase === 'initial' && (
          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '16px' }}>
            <Space.Compact style={{ width: '100%' }}>
              <TextArea
                id="ai-chat-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    handleInitialSubmit();
                  }
                }}
                placeholder="メッセージを入力してください（Shift+Enterで改行）"
                autoSize={{ minRows: 1, maxRows: 4 }}
                disabled={loading || isGeneratingQuestions}
              />
              <Button
                id="ai-chat-send-button"
                type="primary"
                icon={<SendOutlined />}
                onClick={handleInitialSubmit}
                loading={loading || isGeneratingQuestions}
                disabled={!inputValue.trim()}
              >
                送信
              </Button>
            </Space.Compact>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AIChat;
