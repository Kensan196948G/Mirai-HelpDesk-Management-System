import { BusinessHoursUtil } from '../../../src/utils/business-hours';

describe('BusinessHoursUtil', () => {
  describe('isBusinessDay', () => {
    it('月曜日はtrue', () => {
      const monday = new Date('2025-06-02'); // 月曜日
      expect(BusinessHoursUtil.isBusinessDay(monday)).toBe(true);
    });

    it('金曜日はtrue', () => {
      const friday = new Date('2025-06-06'); // 金曜日
      expect(BusinessHoursUtil.isBusinessDay(friday)).toBe(true);
    });

    it('土曜日はfalse', () => {
      const saturday = new Date('2025-06-07'); // 土曜日
      expect(BusinessHoursUtil.isBusinessDay(saturday)).toBe(false);
    });

    it('日曜日はfalse', () => {
      const sunday = new Date('2025-06-08'); // 日曜日
      expect(BusinessHoursUtil.isBusinessDay(sunday)).toBe(false);
    });

    it('祝日（元日）はfalse', () => {
      const newYear = new Date('2025-01-01'); // 元日
      expect(BusinessHoursUtil.isBusinessDay(newYear)).toBe(false);
    });

    it('祝日（建国記念の日）はfalse', () => {
      const holiday = new Date('2025-02-11');
      expect(BusinessHoursUtil.isBusinessDay(holiday)).toBe(false);
    });

    it('2026年の祝日もサポート', () => {
      const holiday2026 = new Date('2026-01-01');
      expect(BusinessHoursUtil.isBusinessDay(holiday2026)).toBe(false);
    });
  });

  describe('isBusinessHour', () => {
    it('9:00はtrue（営業開始）', () => {
      const date = new Date('2025-06-02T09:00:00');
      expect(BusinessHoursUtil.isBusinessHour(date)).toBe(true);
    });

    it('17:59はtrue（営業時間内）', () => {
      const date = new Date('2025-06-02T17:59:00');
      expect(BusinessHoursUtil.isBusinessHour(date)).toBe(true);
    });

    it('18:00はfalse（営業終了）', () => {
      const date = new Date('2025-06-02T18:00:00');
      expect(BusinessHoursUtil.isBusinessHour(date)).toBe(false);
    });

    it('8:59はfalse（営業開始前）', () => {
      const date = new Date('2025-06-02T08:59:00');
      expect(BusinessHoursUtil.isBusinessHour(date)).toBe(false);
    });

    it('23:00はfalse（深夜）', () => {
      const date = new Date('2025-06-02T23:00:00');
      expect(BusinessHoursUtil.isBusinessHour(date)).toBe(false);
    });
  });

  describe('isBusinessTime', () => {
    it('平日9:00はtrue', () => {
      const date = new Date('2025-06-02T09:00:00'); // 月曜09:00
      expect(BusinessHoursUtil.isBusinessTime(date)).toBe(true);
    });

    it('土曜10:00はfalse', () => {
      const date = new Date('2025-06-07T10:00:00'); // 土曜10:00
      expect(BusinessHoursUtil.isBusinessTime(date)).toBe(false);
    });

    it('平日20:00はfalse', () => {
      const date = new Date('2025-06-02T20:00:00'); // 月曜20:00
      expect(BusinessHoursUtil.isBusinessTime(date)).toBe(false);
    });
  });

  describe('addBusinessHours', () => {
    it('同一営業日内で完結する加算', () => {
      const start = new Date('2025-06-02T10:00:00'); // 月曜10:00
      const result = BusinessHoursUtil.addBusinessHours(start, 4);
      expect(result).toEqual(new Date('2025-06-02T14:00:00')); // 月曜14:00
    });

    it('営業日を跨ぐ加算', () => {
      const start = new Date('2025-06-02T17:00:00'); // 月曜17:00
      const result = BusinessHoursUtil.addBusinessHours(start, 2);
      // 当日残り1時間 → 翌日09:00から1時間 = 10:00
      expect(result).toEqual(new Date('2025-06-03T10:00:00'));
    });

    it('金曜夕方から加算すると月曜日になる', () => {
      const start = new Date('2025-06-06T17:00:00'); // 金曜17:00
      const result = BusinessHoursUtil.addBusinessHours(start, 2);
      // 金曜残り1時間 → 月曜09:00から1時間 = 10:00
      expect(result).toEqual(new Date('2025-06-09T10:00:00'));
    });

    it('営業時間外（早朝）からスタートすると営業開始時刻から計算', () => {
      const start = new Date('2025-06-02T07:00:00'); // 月曜07:00
      const result = BusinessHoursUtil.addBusinessHours(start, 1);
      expect(result).toEqual(new Date('2025-06-02T10:00:00')); // 09:00+1h=10:00
    });

    it('営業時間外（夜）からスタートすると翌営業日から計算', () => {
      const start = new Date('2025-06-02T20:00:00'); // 月曜20:00
      const result = BusinessHoursUtil.addBusinessHours(start, 1);
      expect(result).toEqual(new Date('2025-06-03T10:00:00')); // 翌日09:00+1h=10:00
    });

    it('休日からスタートすると次の営業日から計算', () => {
      const start = new Date('2025-06-07T10:00:00'); // 土曜10:00
      const result = BusinessHoursUtil.addBusinessHours(start, 1);
      expect(result).toEqual(new Date('2025-06-09T10:00:00')); // 月曜09:00+1h=10:00
    });

    it('0時間の加算はスタート時刻を返す（営業時間内の場合）', () => {
      const start = new Date('2025-06-02T10:00:00'); // 月曜10:00
      const result = BusinessHoursUtil.addBusinessHours(start, 0);
      expect(result).toEqual(new Date('2025-06-02T10:00:00'));
    });

    it('負の時間でエラーをスロー', () => {
      const start = new Date('2025-06-02T10:00:00');
      expect(() => BusinessHoursUtil.addBusinessHours(start, -1)).toThrow();
    });
  });

  describe('addBusinessDays', () => {
    it('1営業日 = 9時間として加算', () => {
      const start = new Date('2025-06-02T09:00:00'); // 月曜09:00
      const result = BusinessHoursUtil.addBusinessDays(start, 1);
      // 1営業日 = 9時間 → 当日18:00
      expect(result).toEqual(new Date('2025-06-02T18:00:00'));
    });

    it('2営業日の加算', () => {
      const start = new Date('2025-06-02T09:00:00'); // 月曜09:00
      const result = BusinessHoursUtil.addBusinessDays(start, 2);
      // 2営業日 = 18時間 → 月9h + 火9h = 火18:00
      expect(result).toEqual(new Date('2025-06-03T18:00:00'));
    });

    it('負の日数でエラーをスロー', () => {
      const start = new Date('2025-06-02T09:00:00');
      expect(() => BusinessHoursUtil.addBusinessDays(start, -1)).toThrow();
    });
  });

  describe('calculateBusinessHours', () => {
    it('同一営業日内の営業時間を計算', () => {
      const start = new Date('2025-06-02T10:00:00'); // 月曜10:00
      const end = new Date('2025-06-02T14:00:00'); // 月曜14:00
      const hours = BusinessHoursUtil.calculateBusinessHours(start, end);
      expect(hours).toBe(4);
    });

    it('営業時間外を含む場合は営業時間のみカウント', () => {
      const start = new Date('2025-06-02T09:00:00'); // 月曜09:00
      const end = new Date('2025-06-03T12:00:00'); // 火曜12:00
      const hours = BusinessHoursUtil.calculateBusinessHours(start, end);
      // 月曜: 9h (09:00-18:00) + 火曜: 3h (09:00-12:00) = 12h
      expect(hours).toBe(12);
    });

    it('終了日時が開始日時より前だとエラー', () => {
      const start = new Date('2025-06-03T10:00:00');
      const end = new Date('2025-06-02T10:00:00');
      expect(() => BusinessHoursUtil.calculateBusinessHours(start, end)).toThrow();
    });
  });

  describe('isHoliday', () => {
    it('祝日はtrue', () => {
      expect(BusinessHoursUtil.isHoliday(new Date('2025-01-01'))).toBe(true); // 元日
      expect(BusinessHoursUtil.isHoliday(new Date('2025-05-05'))).toBe(true); // こどもの日
    });

    it('通常の営業日はfalse', () => {
      expect(BusinessHoursUtil.isHoliday(new Date('2025-06-02'))).toBe(false); // 月曜日
    });
  });

  describe('addHoliday / getAllHolidays', () => {
    it('カスタム祝日を追加できる', () => {
      const initialCount = BusinessHoursUtil.getAllHolidays().length;
      BusinessHoursUtil.addHoliday('2099-12-25');
      const afterCount = BusinessHoursUtil.getAllHolidays().length;
      expect(afterCount).toBe(initialCount + 1);
      expect(BusinessHoursUtil.isHoliday(new Date('2099-12-25'))).toBe(true);
    });

    it('getAllHolidaysはソート済み配列を返す', () => {
      const holidays = BusinessHoursUtil.getAllHolidays();
      for (let i = 1; i < holidays.length; i++) {
        expect(holidays[i] >= holidays[i - 1]).toBe(true);
      }
    });
  });
});
