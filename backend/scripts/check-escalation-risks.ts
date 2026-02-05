/**
 * エスカレーションリスクバッチチェック
 *
 * Cron で定期実行（推奨: 30分ごと）
 * 0,30 * * * * cd /path/to/backend && ts-node scripts/check-escalation-risks.ts
 */

import dotenv from 'dotenv';
import { AIEscalationService } from '../src/services/ai-escalation.service';

dotenv.config();

async function main() {
  console.log('🚀 エスカレーションリスクバッチチェック開始');
  console.log(`⏰ 実行日時: ${new Date().toISOString()}`);

  try {
    // 全未解決チケットのリスクをチェック
    const result = await AIEscalationService.batchCheckRisks();

    console.log('\n📊 バッチチェック結果:');
    console.log(`  - チェック対象: ${result.total_checked}件`);
    console.log(`  - ハイリスク: ${result.high_risk_tickets.length}件`);

    // ハイリスクチケットの詳細
    if (result.high_risk_tickets.length > 0) {
      console.log('\n⚠️ ハイリスクチケット一覧:');

      for (const ticket of result.high_risk_tickets) {
        console.log(`  - ${ticket.ticket_number}: ${ticket.risk_level} (スコア: ${ticket.risk_score})`);

        // エスカレーションリスク検知結果を再取得して通知
        const riskDetail = await AIEscalationService.detectRisk({ ticket_id: ticket.ticket_id });
        await AIEscalationService.sendRiskNotification(ticket.ticket_id, riskDetail);
      }
    } else {
      console.log('\n✅ ハイリスクチケットはありません');
    }

    console.log('\n✅ エスカレーションリスクバッチチェック完了');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
