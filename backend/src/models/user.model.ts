import { query } from '../config/database';
import { User, UserRole, UserStatus } from '../types';
import bcrypt from 'bcrypt';

export class UserModel {
  // bcryptラウンド数（環境変数で設定可能、デフォルト12）
  private static readonly BCRYPT_ROUNDS = parseInt(
    process.env.BCRYPT_ROUNDS || '12',
    10
  );

  // ユーザー作成
  static async create(userData: {
    email: string;
    display_name: string;
    department?: string;
    role: UserRole;
    password?: string;
    azure_object_id?: string;
  }): Promise<User> {
    let passwordHash: string | undefined;

    if (userData.password) {
      passwordHash = await bcrypt.hash(userData.password, UserModel.BCRYPT_ROUNDS);
    }

    const result = await query(
      `INSERT INTO users (email, display_name, department, role, password_hash, azure_object_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        userData.email,
        userData.display_name,
        userData.department,
        userData.role,
        passwordHash,
        userData.azure_object_id,
      ]
    );

    return result.rows[0];
  }

  // メールでユーザー検索
  static async findByEmail(email: string): Promise<User | null> {
    const result = await query(
      'SELECT * FROM users WHERE email = $1 AND status = $2',
      [email, UserStatus.ACTIVE]
    );

    return result.rows[0] || null;
  }

  // IDでユーザー検索
  static async findById(userId: string): Promise<User | null> {
    const result = await query('SELECT * FROM users WHERE user_id = $1', [
      userId,
    ]);

    return result.rows[0] || null;
  }

  // Azure Object IDでユーザー検索
  static async findByAzureObjectId(
    azureObjectId: string
  ): Promise<User | null> {
    const result = await query(
      'SELECT * FROM users WHERE azure_object_id = $1 AND status = $2',
      [azureObjectId, UserStatus.ACTIVE]
    );

    return result.rows[0] || null;
  }

  // パスワード検証
  static async verifyPassword(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  // ユーザー一覧取得
  static async findAll(filters?: {
    role?: UserRole;
    status?: UserStatus;
    department?: string;
  }): Promise<User[]> {
    let queryText = 'SELECT * FROM users WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.role) {
      queryText += ` AND role = $${paramIndex}`;
      params.push(filters.role);
      paramIndex++;
    }

    if (filters?.status) {
      queryText += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters?.department) {
      queryText += ` AND department = $${paramIndex}`;
      params.push(filters.department);
      paramIndex++;
    }

    queryText += ' ORDER BY created_at DESC';

    const result = await query(queryText, params);
    return result.rows;
  }

  // ユーザー更新
  static async update(
    userId: string,
    updates: Partial<{
      display_name: string;
      department: string;
      role: UserRole;
      status: UserStatus;
    }>
  ): Promise<User> {
    const fields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.display_name !== undefined) {
      fields.push(`display_name = $${paramIndex}`);
      params.push(updates.display_name);
      paramIndex++;
    }

    if (updates.department !== undefined) {
      fields.push(`department = $${paramIndex}`);
      params.push(updates.department);
      paramIndex++;
    }

    if (updates.role !== undefined) {
      fields.push(`role = $${paramIndex}`);
      params.push(updates.role);
      paramIndex++;
    }

    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex}`);
      params.push(updates.status);
      paramIndex++;
    }

    params.push(userId);

    const result = await query(
      `UPDATE users SET ${fields.join(', ')} WHERE user_id = $${paramIndex} RETURNING *`,
      params
    );

    return result.rows[0];
  }

  // 最終ログイン時刻更新
  static async updateLastLogin(userId: string): Promise<void> {
    await query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE user_id = $1', [
      userId,
    ]);
  }

  // ユーザー削除（論理削除）
  static async softDelete(userId: string): Promise<void> {
    await query(
      'UPDATE users SET status = $1 WHERE user_id = $2',
      [UserStatus.INACTIVE, userId]
    );
  }
}
