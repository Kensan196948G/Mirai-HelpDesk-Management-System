/**
 * PII (Personally Identifiable Information) マスキングユーティリティ
 *
 * Claude APIに送信する前に個人情報を自動マスキング
 */

export interface PIIMaskingResult {
  masked: string;
  hasPII: boolean;
  maskedFields: string[];
}

export class PIIMasking {
  // 正規表現パターン
  private static readonly EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  private static readonly PHONE_REGEX = /(\d{2,4}[-\s]?\d{2,4}[-\s]?\d{4}|\d{10,11})/g;
  private static readonly IP_REGEX = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
  private static readonly JAPANESE_NAME_REGEX = /[一-龯]{2,}[　\s][一-龯]{2,}/g;
  private static readonly URL_REGEX = /(https?:\/\/[^\s]+)/g;

  /**
   * AI送信用マスキング（基本的なPIIのみ）
   *
   * @param text マスキング対象テキスト
   * @returns マスキング結果
   */
  static maskForAI(text: string): PIIMaskingResult {
    if (!text) {
      return { masked: text, hasPII: false, maskedFields: [] };
    }

    let masked = text;
    let hasPII = false;
    const maskedFields: string[] = [];

    // メールアドレス
    if (this.EMAIL_REGEX.test(text)) {
      masked = masked.replace(this.EMAIL_REGEX, '[EMAIL_MASKED]');
      hasPII = true;
      maskedFields.push('email');
    }

    // 電話番号
    if (this.PHONE_REGEX.test(text)) {
      masked = masked.replace(this.PHONE_REGEX, '[PHONE_MASKED]');
      hasPII = true;
      maskedFields.push('phone');
    }

    // IPアドレス
    if (this.IP_REGEX.test(text)) {
      // ただし、localhost や プライベートIPは除外
      masked = masked.replace(this.IP_REGEX, (match) => {
        if (
          match.startsWith('127.') ||
          match.startsWith('192.168.') ||
          match.startsWith('10.') ||
          match.startsWith('172.')
        ) {
          return match; // プライベートIPはマスクしない
        }
        return '[IP_MASKED]';
      });
      hasPII = true;
      maskedFields.push('ip_address');
    }

    return { masked, hasPII, maskedFields };
  }

  /**
   * ログ記録用マスキング（より厳格）
   *
   * @param text マスキング対象テキスト
   * @returns マスキングされたテキスト
   */
  static maskForLog(text: string): string {
    if (!text) {
      return text;
    }

    const result = this.maskForAI(text);
    let masked = result.masked;

    // 日本語氏名（姓 名のパターン）
    masked = masked.replace(this.JAPANESE_NAME_REGEX, '[NAME_MASKED]');

    // 3桁以上の連続する数字（社員番号、ID等）
    masked = masked.replace(/\b\d{3,}\b/g, '[NUMBER_MASKED]');

    // URL（社内システムのURL等）
    masked = masked.replace(this.URL_REGEX, '[URL_MASKED]');

    return masked;
  }

  /**
   * マスキングプレビュー（デバッグ用）
   *
   * @param text 元のテキスト
   * @returns マスキング前後の比較
   */
  static preview(text: string): {
    original: string;
    masked: string;
    hasPII: boolean;
    maskedFields: string[];
  } {
    const result = this.maskForAI(text);
    return {
      original: text,
      masked: result.masked,
      hasPII: result.hasPII,
      maskedFields: result.maskedFields,
    };
  }

  /**
   * マスキング検証（送信前チェック）
   *
   * @param text マスキング対象テキスト
   * @returns マスキングが必要かどうか
   */
  static requiresMasking(text: string): boolean {
    if (!text) {
      return false;
    }

    return (
      this.EMAIL_REGEX.test(text) ||
      this.PHONE_REGEX.test(text) ||
      this.IP_REGEX.test(text)
    );
  }

  /**
   * 環境変数によるマスキング制御
   */
  static isEnabled(): boolean {
    return process.env.ENABLE_PII_MASKING !== 'false';
  }

  /**
   * マスキング統計（監査用）
   */
  static getMaskingStats(texts: string[]): {
    total: number;
    masked: number;
    maskedPercentage: number;
    fieldCounts: Record<string, number>;
  } {
    const results = texts.map((text) => this.maskForAI(text));
    const maskedCount = results.filter((r) => r.hasPII).length;

    const fieldCounts: Record<string, number> = {};
    results.forEach((result) => {
      result.maskedFields.forEach((field) => {
        fieldCounts[field] = (fieldCounts[field] || 0) + 1;
      });
    });

    return {
      total: texts.length,
      masked: maskedCount,
      maskedPercentage: texts.length > 0 ? (maskedCount / texts.length) * 100 : 0,
      fieldCounts,
    };
  }
}
