import { M365AuthService } from './m365-auth.service';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { M365TaskType } from '../types';

/**
 * Microsoft 365 操作サービス
 * Graph API を使用した各種 M365 操作を提供
 */
export class M365Service {
  // ユーザー情報取得
  static async getUser(userPrincipalName: string): Promise<any> {
    try {
      const client = M365AuthService.getClient();

      const user = await client
        .api(`/users/${userPrincipalName}`)
        .select(
          'id,displayName,userPrincipalName,mail,department,jobTitle,accountEnabled'
        )
        .get();

      return user;
    } catch (error: any) {
      logger.error('Failed to get user from Microsoft 365:', error);
      throw new AppError(
        `Failed to get user: ${error.message}`,
        500,
        'M365_GET_USER_ERROR'
      );
    }
  }

  // ユーザー一覧取得
  static async listUsers(filter?: string): Promise<any[]> {
    try {
      const client = M365AuthService.getClient();

      let request = client
        .api('/users')
        .select(
          'id,displayName,userPrincipalName,mail,department,jobTitle,accountEnabled'
        )
        .top(100);

      if (filter) {
        request = request.filter(filter);
      }

      const response = await request.get();
      return response.value || [];
    } catch (error: any) {
      logger.error('Failed to list users from Microsoft 365:', error);
      throw new AppError(
        `Failed to list users: ${error.message}`,
        500,
        'M365_LIST_USERS_ERROR'
      );
    }
  }

  // ライセンス情報取得
  static async getUserLicenses(userPrincipalName: string): Promise<any[]> {
    try {
      const client = M365AuthService.getClient();

      const response = await client
        .api(`/users/${userPrincipalName}/licenseDetails`)
        .get();

      return response.value || [];
    } catch (error: any) {
      logger.error('Failed to get user licenses:', error);
      throw new AppError(
        `Failed to get licenses: ${error.message}`,
        500,
        'M365_GET_LICENSES_ERROR'
      );
    }
  }

  // ライセンス割り当て
  static async assignLicense(
    userPrincipalName: string,
    skuId: string
  ): Promise<any> {
    try {
      const client = M365AuthService.getClient();

      const result = await client
        .api(`/users/${userPrincipalName}/assignLicense`)
        .post({
          addLicenses: [
            {
              skuId: skuId,
            },
          ],
          removeLicenses: [],
        });

      logger.info('License assigned successfully', {
        user: userPrincipalName,
        skuId,
      });

      return result;
    } catch (error: any) {
      logger.error('Failed to assign license:', error);
      throw new AppError(
        `Failed to assign license: ${error.message}`,
        500,
        'M365_ASSIGN_LICENSE_ERROR'
      );
    }
  }

  // ライセンス削除
  static async removeLicense(
    userPrincipalName: string,
    skuId: string
  ): Promise<any> {
    try {
      const client = M365AuthService.getClient();

      const result = await client
        .api(`/users/${userPrincipalName}/assignLicense`)
        .post({
          addLicenses: [],
          removeLicenses: [skuId],
        });

      logger.info('License removed successfully', {
        user: userPrincipalName,
        skuId,
      });

      return result;
    } catch (error: any) {
      logger.error('Failed to remove license:', error);
      throw new AppError(
        `Failed to remove license: ${error.message}`,
        500,
        'M365_REMOVE_LICENSE_ERROR'
      );
    }
  }

  // パスワードリセット
  static async resetPassword(userPrincipalName: string): Promise<string> {
    try {
      const client = M365AuthService.getClient();

      // ランダムパスワード生成（16文字）
      const tempPassword = this.generateTemporaryPassword();

      await client.api(`/users/${userPrincipalName}`).patch({
        passwordProfile: {
          password: tempPassword,
          forceChangePasswordNextSignIn: true,
        },
      });

      logger.info('Password reset successfully', {
        user: userPrincipalName,
      });

      return tempPassword;
    } catch (error: any) {
      logger.error('Failed to reset password:', error);
      throw new AppError(
        `Failed to reset password: ${error.message}`,
        500,
        'M365_RESET_PASSWORD_ERROR'
      );
    }
  }

  // グループメンバー追加
  static async addGroupMember(
    groupId: string,
    userPrincipalName: string
  ): Promise<any> {
    try {
      const client = M365AuthService.getClient();

      // ユーザーのIDを取得
      const user = await this.getUser(userPrincipalName);

      await client.api(`/groups/${groupId}/members/$ref`).post({
        '@odata.id': `https://graph.microsoft.com/v1.0/directoryObjects/${user.id}`,
      });

      logger.info('User added to group successfully', {
        user: userPrincipalName,
        groupId,
      });

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to add user to group:', error);
      throw new AppError(
        `Failed to add user to group: ${error.message}`,
        500,
        'M365_ADD_GROUP_MEMBER_ERROR'
      );
    }
  }

  // グループメンバー削除
  static async removeGroupMember(
    groupId: string,
    userId: string
  ): Promise<any> {
    try {
      const client = M365AuthService.getClient();

      await client.api(`/groups/${groupId}/members/${userId}/$ref`).delete();

      logger.info('User removed from group successfully', {
        userId,
        groupId,
      });

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to remove user from group:', error);
      throw new AppError(
        `Failed to remove user from group: ${error.message}`,
        500,
        'M365_REMOVE_GROUP_MEMBER_ERROR'
      );
    }
  }

  // Teams 作成
  static async createTeam(teamName: string, description: string): Promise<any> {
    try {
      const client = M365AuthService.getClient();

      const team = await client.api('/teams').post({
        'template@odata.bind':
          "https://graph.microsoft.com/v1.0/teamsTemplates('standard')",
        displayName: teamName,
        description: description,
      });

      logger.info('Team created successfully', {
        teamName,
        teamId: team.id,
      });

      return team;
    } catch (error: any) {
      logger.error('Failed to create team:', error);
      throw new AppError(
        `Failed to create team: ${error.message}`,
        500,
        'M365_CREATE_TEAM_ERROR'
      );
    }
  }

  // OneDrive ファイル復元（バージョンから）
  static async restoreOneDriveFile(
    userId: string,
    itemId: string,
    versionId: string
  ): Promise<any> {
    try {
      const client = M365AuthService.getClient();

      const result = await client
        .api(
          `/users/${userId}/drive/items/${itemId}/versions/${versionId}/restoreVersion`
        )
        .post({});

      logger.info('OneDrive file restored successfully', {
        userId,
        itemId,
        versionId,
      });

      return result;
    } catch (error: any) {
      logger.error('Failed to restore OneDrive file:', error);
      throw new AppError(
        `Failed to restore file: ${error.message}`,
        500,
        'M365_RESTORE_FILE_ERROR'
      );
    }
  }

  // 一時パスワード生成
  private static generateTemporaryPassword(): string {
    const length = 16;
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    // 最低1つの小文字、大文字、数字、特殊文字を含める
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)];

    // 残りをランダムに生成
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // シャッフル
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  // タスクタイプに応じた操作実行
  static async executeTask(taskType: M365TaskType, taskDetails: any): Promise<any> {
    switch (taskType) {
      case M365TaskType.LICENSE_ASSIGN:
        return await this.assignLicense(
          taskDetails.userPrincipalName,
          taskDetails.skuId
        );

      case M365TaskType.LICENSE_REMOVE:
        return await this.removeLicense(
          taskDetails.userPrincipalName,
          taskDetails.skuId
        );

      case M365TaskType.PASSWORD_RESET:
        return await this.resetPassword(taskDetails.userPrincipalName);

      case M365TaskType.GROUP_MEMBERSHIP:
        if (taskDetails.action === 'add') {
          return await this.addGroupMember(
            taskDetails.groupId,
            taskDetails.userPrincipalName
          );
        } else if (taskDetails.action === 'remove') {
          return await this.removeGroupMember(
            taskDetails.groupId,
            taskDetails.userId
          );
        }
        break;

      case M365TaskType.TEAMS_CREATE:
        return await this.createTeam(taskDetails.teamName, taskDetails.description);

      case M365TaskType.ONEDRIVE_RESTORE:
        return await this.restoreOneDriveFile(
          taskDetails.userId,
          taskDetails.itemId,
          taskDetails.versionId
        );

      default:
        throw new AppError(
          `Task type ${taskType} not implemented`,
          501,
          'M365_TASK_NOT_IMPLEMENTED'
        );
    }
  }
}
