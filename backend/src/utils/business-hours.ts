/**
 * 営業時間・営業日計算ユーティリティ
 *
 * 営業時間: 9:00 - 18:00
 * 営業日: 月曜日 - 金曜日（土日祝除く）
 */

// 日本の祝日（簡易版）
// 本番環境では祝日APIまたは専用ライブラリの使用を推奨
const JAPANESE_HOLIDAYS_2025 = [
  '2025-01-01', // 元日
  '2025-01-13', // 成人の日
  '2025-02-11', // 建国記念の日
  '2025-02-23', // 天皇誕生日
  '2025-02-24', // 振替休日
  '2025-03-20', // 春分の日
  '2025-04-29', // 昭和の日
  '2025-05-03', // 憲法記念日
  '2025-05-04', // みどりの日
  '2025-05-05', // こどもの日
  '2025-05-06', // 振替休日
  '2025-07-21', // 海の日
  '2025-08-11', // 山の日
  '2025-09-15', // 敬老の日
  '2025-09-23', // 秋分の日
  '2025-10-13', // スポーツの日
  '2025-11-03', // 文化の日
  '2025-11-23', // 勤労感謝の日
  '2025-11-24', // 振替休日
];

const JAPANESE_HOLIDAYS_2026 = [
  '2026-01-01', // 元日
  '2026-01-12', // 成人の日
  '2026-02-11', // 建国記念の日
  '2026-02-23', // 天皇誕生日
  '2026-03-20', // 春分の日
  '2026-04-29', // 昭和の日
  '2026-05-03', // 憲法記念日
  '2026-05-04', // みどりの日
  '2026-05-05', // こどもの日
  '2026-05-06', // 振替休日
  '2026-07-20', // 海の日
  '2026-08-11', // 山の日
  '2026-09-21', // 敬老の日
  '2026-09-22', // 国民の休日
  '2026-09-23', // 秋分の日
  '2026-10-12', // スポーツの日
  '2026-11-03', // 文化の日
  '2026-11-23', // 勤労感謝の日
];

// すべての祝日をセットに格納（高速検索）
const ALL_HOLIDAYS = new Set([...JAPANESE_HOLIDAYS_2025, ...JAPANESE_HOLIDAYS_2026]);

export class BusinessHoursUtil {
  // 営業時間の開始・終了
  private static readonly BUSINESS_HOUR_START = 9;
  private static readonly BUSINESS_HOUR_END = 18;

  /**
   * 日付を YYYY-MM-DD 形式の文字列に変換
   */
  private static formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 指定日が祝日かどうかをチェック
   */
  static isHoliday(date: Date): boolean {
    const dateStr = this.formatDate(date);
    return ALL_HOLIDAYS.has(dateStr);
  }

  /**
   * 指定日が営業日かどうかをチェック（土日祝を除く月-金）
   */
  static isBusinessDay(date: Date): boolean {
    const dayOfWeek = date.getDay();

    // 土曜日(6)または日曜日(0)はNG
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }

    // 祝日はNG
    if (this.isHoliday(date)) {
      return false;
    }

    return true;
  }

  /**
   * 指定時刻が営業時間内かどうかをチェック（9:00-18:00）
   */
  static isBusinessHour(date: Date): boolean {
    const hour = date.getHours();
    return hour >= this.BUSINESS_HOUR_START && hour < this.BUSINESS_HOUR_END;
  }

  /**
   * 指定時刻が営業時間内の営業日かどうかをチェック
   */
  static isBusinessTime(date: Date): boolean {
    return this.isBusinessDay(date) && this.isBusinessHour(date);
  }

  /**
   * 次の営業日の開始時刻を取得
   */
  private static getNextBusinessDayStart(date: Date): Date {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(this.BUSINESS_HOUR_START, 0, 0, 0);

    // 営業日になるまで繰り返す
    while (!this.isBusinessDay(nextDay)) {
      nextDay.setDate(nextDay.getDate() + 1);
    }

    return nextDay;
  }

  /**
   * 営業時間を加算（9:00-18:00の範囲で計算）
   *
   * @param startDate 開始日時
   * @param hours 加算する営業時間数
   * @returns 計算後の日時
   */
  static addBusinessHours(startDate: Date, hours: number): Date {
    if (hours < 0) {
      throw new Error('営業時間は0以上で指定してください');
    }

    const result = new Date(startDate);
    let remainingHours = hours;

    // 営業時間外からスタートする場合は次の営業日の開始時刻に調整
    if (!this.isBusinessDay(result)) {
      result.setTime(this.getNextBusinessDayStart(result).getTime());
    } else if (!this.isBusinessHour(result)) {
      // 営業日だが営業時間外の場合
      const currentHour = result.getHours();
      if (currentHour < this.BUSINESS_HOUR_START) {
        // 営業開始前なら営業開始時刻に設定
        result.setHours(this.BUSINESS_HOUR_START, 0, 0, 0);
      } else {
        // 営業終了後なら次の営業日の開始時刻に設定
        result.setTime(this.getNextBusinessDayStart(result).getTime());
      }
    }

    while (remainingHours > 0) {
      // 当日の残り営業時間を計算
      const currentHour = result.getHours();
      const currentMinute = result.getMinutes();
      const hoursUntilEndOfDay =
        this.BUSINESS_HOUR_END - currentHour - currentMinute / 60;

      if (remainingHours <= hoursUntilEndOfDay) {
        // 当日中に収まる場合
        const minutesToAdd = Math.round(remainingHours * 60);
        result.setMinutes(result.getMinutes() + minutesToAdd);
        remainingHours = 0;
      } else {
        // 翌営業日に持ち越す場合
        remainingHours -= hoursUntilEndOfDay;
        result.setTime(this.getNextBusinessDayStart(result).getTime());
      }
    }

    return result;
  }

  /**
   * 営業日を加算（1営業日 = 9時間として計算）
   *
   * @param startDate 開始日時
   * @param days 加算する営業日数
   * @returns 計算後の日時
   */
  static addBusinessDays(startDate: Date, days: number): Date {
    if (days < 0) {
      throw new Error('営業日数は0以上で指定してください');
    }

    // 営業日を営業時間に変換（1営業日 = 9時間）
    const businessHours = days * (this.BUSINESS_HOUR_END - this.BUSINESS_HOUR_START);
    return this.addBusinessHours(startDate, businessHours);
  }

  /**
   * 2つの日時間の営業時間数を計算
   *
   * @param startDate 開始日時
   * @param endDate 終了日時
   * @returns 営業時間数
   */
  static calculateBusinessHours(startDate: Date, endDate: Date): number {
    if (endDate < startDate) {
      throw new Error('終了日時は開始日時より後である必要があります');
    }

    let totalHours = 0;
    const current = new Date(startDate);

    while (current < endDate) {
      if (this.isBusinessDay(current)) {
        const currentHour = current.getHours();
        const currentMinute = current.getMinutes();

        // 営業時間内の時刻を計算
        let startHour = currentHour;
        let startMinute = currentMinute;

        if (currentHour < this.BUSINESS_HOUR_START) {
          startHour = this.BUSINESS_HOUR_START;
          startMinute = 0;
        } else if (currentHour >= this.BUSINESS_HOUR_END) {
          // 営業時間外なので次の日へ
          current.setDate(current.getDate() + 1);
          current.setHours(0, 0, 0, 0);
          continue;
        }

        // 終了時刻を決定
        const endOfBusinessDay = new Date(current);
        endOfBusinessDay.setHours(this.BUSINESS_HOUR_END, 0, 0, 0);

        const endTime = endDate < endOfBusinessDay ? endDate : endOfBusinessDay;

        const currentTime = new Date(current);
        currentTime.setHours(startHour, startMinute, 0, 0);

        // 営業時間を加算
        const hours = (endTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
        if (hours > 0) {
          totalHours += hours;
        }
      }

      // 次の日へ
      current.setDate(current.getDate() + 1);
      current.setHours(0, 0, 0, 0);
    }

    return totalHours;
  }

  /**
   * デバッグ用: 祝日を追加
   * 本番環境では祝日APIやライブラリの使用を推奨
   */
  static addHoliday(date: string): void {
    ALL_HOLIDAYS.add(date);
  }

  /**
   * デバッグ用: すべての祝日を取得
   */
  static getAllHolidays(): string[] {
    return Array.from(ALL_HOLIDAYS).sort();
  }
}
