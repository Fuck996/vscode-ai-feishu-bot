/**
 * 密码验证函数
 */

export interface PasswordValidationResult {
  isValid: boolean;
  hasLowercase: boolean;
  hasNumbers: boolean;
  hasSpecialChars: boolean;
  lengthValid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
}

/**
 * 验证密码强度
 * 规则：
 * - 必须包含小写字母 (a-z)
 * - 必须包含数字 (0-9)
 * - 必须包含特殊字符 (!@#$%^&*)
 * - 长度 8-20 字符
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const result: PasswordValidationResult = {
    isValid: true,
    hasLowercase: /[a-z]/.test(password),
    hasNumbers: /[0-9]/.test(password),
    hasSpecialChars: /[!@#$%^&*]/.test(password),
    lengthValid: password.length >= 8 && password.length <= 20,
    errors: [],
    strength: 'weak',
  };

  // 检查各项要求
  if (!result.hasLowercase) {
    result.errors.push('必须包含至少一个小写字母 (a-z)');
    result.isValid = false;
  }
  
  if (!result.hasNumbers) {
    result.errors.push('必须包含至少一个数字 (0-9)');
    result.isValid = false;
  }
  
  if (!result.hasSpecialChars) {
    result.errors.push('必须包含至少一个特殊字符 (!@#$%^&*)');
    result.isValid = false;
  }
  
  if (password.length < 8) {
    result.errors.push('密码长度至少需要 8 个字符');
    result.isValid = false;
  }
  
  if (password.length > 20) {
    result.errors.push('密码长度不应超过 20 个字符');
    result.isValid = false;
  }

  // 计算强度
  if (result.isValid) {
    let strengthScore = 0;
    
    // 长度在8-10之间为弱，11-15为中等，16-20为强
    if (password.length >= 16) strengthScore += 3;
    else if (password.length >= 12) strengthScore += 2;
    else strengthScore += 1;
    
    // 包含大写字母加分（可选）
    if (/[A-Z]/.test(password)) strengthScore += 1;
    
    // 包含多个特殊字符加分
    const specialCharCount = (password.match(/[!@#$%^&*]/g) || []).length;
    if (specialCharCount > 1) strengthScore += 1;
    
    if (strengthScore >= 5) result.strength = 'strong';
    else if (strengthScore >= 3) result.strength = 'good';
    else if (strengthScore >= 2) result.strength = 'fair';
    else result.strength = 'weak';
  }

  return result;
}

/**
 * 验证用户名格式
 */
export function validateUsername(username: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!username || username.trim().length === 0) {
    errors.push('用户名不能为空');
  } else if (username.length < 3) {
    errors.push('用户名长度至少 3 个字符');
  } else if (username.length > 32) {
    errors.push('用户名长度不超过 32 个字符');
  } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    errors.push('用户名只能包含字母、数字、下划线和连字符');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 验证两个密码是否匹配
 */
export function validatePasswordMatch(password1: string, password2: string): boolean {
  return password1 === password2 && password1.length > 0;
}
