/**
 * 営業時間計算ユーティリティ テスト例
 *
 * 実際のテストフレームワーク（Jest等）を使用する場合の参考実装
 */

import { BusinessHoursUtil } from './business-hours';

/**
 * テスト実行例
 */
function runTests() {
  console.log('=== 営業時間計算ユーティリティ テスト ===\n');

  // テスト1: 営業日判定
  console.log('【テスト1】営業日判定');
  const testDates = [
    new Date('2026-01-20'), // 火曜日（営業日）
    new Date('2026-01-24'), // 土曜日（休日）
    new Date('2026-01-25'), // 日曜日（休日）
    new Date('2026-01-01'), // 元日（祝日）
    new Date('2026-01-13'), // 成人の日（祝日）
  ];

  testDates.forEach((date) => {
    const isBusinessDay = BusinessHoursUtil.isBusinessDay(date);
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    console.log(
      `${date.toLocaleDateString('ja-JP')} (${dayNames[date.getDay()]}): ${
        isBusinessDay ? '営業日' : '休日'
      }`
    );
  });
  console.log('');

  // テスト2: 営業時間判定
  console.log('【テスト2】営業時間判定');
  const testTimes = [
    new Date('2026-01-20T08:00:00'), // 営業時間前
    new Date('2026-01-20T09:00:00'), // 営業開始
    new Date('2026-01-20T12:00:00'), // 営業時間中
    new Date('2026-01-20T17:59:00'), // 営業時間内
    new Date('2026-01-20T18:00:00'), // 営業時間外
  ];

  testTimes.forEach((time) => {
    const isBusinessHour = BusinessHoursUtil.isBusinessHour(time);
    console.log(
      `${time.toLocaleString('ja-JP')}: ${isBusinessHour ? '営業時間内' : '営業時間外'}`
    );
  });
  console.log('');

  // テスト3: 営業時間加算
  console.log('【テスト3】営業時間加算');
  const startTime = new Date('2026-01-20T10:00:00'); // 火曜日 10:00

  const hoursToAdd = [1, 4, 8, 9, 24];
  hoursToAdd.forEach((hours) => {
    const result = BusinessHoursUtil.addBusinessHours(startTime, hours);
    console.log(
      `${startTime.toLocaleString('ja-JP')} + ${hours}営業時間 = ${result.toLocaleString('ja-JP')}`
    );
  });
  console.log('');

  // テスト4: 営業日加算
  console.log('【テスト4】営業日加算');
  const startDate = new Date('2026-01-20T10:00:00'); // 火曜日 10:00

  const daysToAdd = [1, 3, 5];
  daysToAdd.forEach((days) => {
    const result = BusinessHoursUtil.addBusinessDays(startDate, days);
    console.log(
      `${startDate.toLocaleString('ja-JP')} + ${days}営業日 = ${result.toLocaleString('ja-JP')}`
    );
  });
  console.log('');

  // テスト5: 週末またぎのテスト
  console.log('【テスト5】週末またぎのテスト');
  const fridayAfternoon = new Date('2026-01-23T16:00:00'); // 金曜日 16:00

  const hoursOverWeekend = [2, 4, 10];
  hoursOverWeekend.forEach((hours) => {
    const result = BusinessHoursUtil.addBusinessHours(fridayAfternoon, hours);
    console.log(
      `金曜 16:00 + ${hours}営業時間 = ${result.toLocaleString('ja-JP')}`
    );
  });
  console.log('');

  // テスト6: 祝日またぎのテスト
  console.log('【テスト6】祝日またぎのテスト');
  // 成人の日前日（2026-01-12は月曜日、2026-01-13は成人の日で祝日）
  const beforeHoliday = new Date('2026-01-12T16:00:00');

  const result1 = BusinessHoursUtil.addBusinessHours(beforeHoliday, 4);
  console.log(
    `2026-01-12 16:00（月） + 4営業時間 = ${result1.toLocaleString('ja-JP')}`
  );
  console.log('  ※ 2026-01-13は成人の日（祝日）のため、1/14に飛びます');
  console.log('');

  // テスト7: 営業時間外スタートのテスト
  console.log('【テスト7】営業時間外スタートのテスト');
  const afterHours = new Date('2026-01-20T19:00:00'); // 火曜日 19:00（営業時間外）

  const result2 = BusinessHoursUtil.addBusinessHours(afterHours, 2);
  console.log(
    `${afterHours.toLocaleString('ja-JP')} + 2営業時間 = ${result2.toLocaleString('ja-JP')}`
  );
  console.log('  ※ 営業時間外スタートは翌営業日9:00から計算されます');
  console.log('');

  // テスト8: 営業時間計算
  console.log('【テスト8】営業時間計算');
  const start = new Date('2026-01-20T10:00:00'); // 火曜日 10:00
  const end1 = new Date('2026-01-20T15:00:00'); // 同日 15:00
  const end2 = new Date('2026-01-21T11:00:00'); // 翌日 11:00
  const end3 = new Date('2026-01-23T10:00:00'); // 金曜日 10:00

  console.log(
    `${start.toLocaleString('ja-JP')} → ${end1.toLocaleString('ja-JP')}: ${BusinessHoursUtil.calculateBusinessHours(start, end1)}営業時間`
  );
  console.log(
    `${start.toLocaleString('ja-JP')} → ${end2.toLocaleString('ja-JP')}: ${BusinessHoursUtil.calculateBusinessHours(start, end2)}営業時間`
  );
  console.log(
    `${start.toLocaleString('ja-JP')} → ${end3.toLocaleString('ja-JP')}: ${BusinessHoursUtil.calculateBusinessHours(start, end3)}営業時間`
  );
  console.log('');

  // テスト9: 祝日一覧確認
  console.log('【テスト9】登録されている祝日（最初の10件）');
  const holidays = BusinessHoursUtil.getAllHolidays();
  holidays.slice(0, 10).forEach((holiday) => {
    console.log(`  ${holiday}`);
  });
  console.log(`  ... 全${holidays.length}件の祝日が登録されています`);
  console.log('');
}

// テスト実行（直接実行する場合）
if (require.main === module) {
  runTests();
}

export { runTests };
