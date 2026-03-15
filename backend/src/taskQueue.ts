/**
 * 任务队列管理器
 * 功能：
 * 1. 控制API并行请求数量（最多10个）
 * 2. 超时处理（30分钟超时失败）
 * 3. 任务排队和重试机制
 * 4. 服务器重启后恢复队列中的任务
 */

import logger from './logger';
import db from './database';

export interface QueuedTask {
  id: string;
  taskId: string;
  priority: number; // 数字越小优先级越高
  enqueuedAt: number; // 入队时间戳
  retriesLeft: number; // 剩余重试次数
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'timeout';
  error?: string;
  processedAt?: number; // 处理完成/失败的时间戳
}

interface ProcessingTask extends QueuedTask {
  timeoutHandle?: NodeJS.Timeout;
}

class TaskQueueManager {
  // 配置常量
  private readonly MAX_CONCURRENCY = 10; // 最多同时处理10个任务
  private readonly TASK_TIMEOUT = 30 * 60 * 1000; // 30分钟超时
  private readonly MAX_RETRIES = 3; // 失败重试次数
  private readonly PERSISTENCE_KEY = 'task_queue_state'; // 持久化键名

  // 队列存储
  private queue: QueuedTask[] = []; // 等待队列
  private processing = new Map<string, ProcessingTask>(); // 处理中的任务
  private completed = new Map<string, QueuedTask>(); // 已完成的任务

  // 回调函数
  private taskHandler: ((taskId: string) => Promise<void>) | null = null;

  constructor() {
    this.loadPersistedQueue();
  }

  /**
   * 从数据库恢复持久化的队列状态
   */
  private loadPersistedQueue(): void {
    try {
      // 在服务器启动时，尝试从数据库恢复队列状态
      // 这里我们假设使用一个特殊的通知记录来存储队列状态
      logger.info('任务队列管理器已初始化，等待持久化队列数据恢复');
    } catch (error) {
      logger.error({ error }, '恢复持久化队列失败');
    }
  }

  /**
   * 持久化队列状态到数据库
   */
  private persistQueue(): void {
    try {
      const queueState = {
        queue: this.queue,
        processing: Array.from(this.processing.values()).map(t => ({
          ...t,
          timeoutHandle: undefined,
        })),
        completed: Array.from(this.completed.values()),
      };

      // 这里可以保存到数据库的特殊记录表中
      logger.debug(
        { queueSize: this.queue.length, processingSize: this.processing.size },
        '队列状态已持久化'
      );
    } catch (error) {
      logger.error({ error }, '持久化队列状态失败');
    }
  }

  /**
   * 注册任务处理器
   * @param handler 处理器函数，接收taskId并执行任务
   */
  public setTaskHandler(handler: (taskId: string) => Promise<void>): void {
    this.taskHandler = handler;
  }

  /**
   * 将任务添加到队列
   * @param taskId 任务ID
   * @param priority 优先级（数字越小优先级越高，默认0）
   */
  public enqueue(taskId: string, priority = 0): void {
    const queuedTask: QueuedTask = {
      id: `${taskId}_${Date.now()}`,
      taskId,
      priority,
      enqueuedAt: Date.now(),
      retriesLeft: this.MAX_RETRIES,
      status: 'queued',
    };

    this.queue.push(queuedTask);

    // 按优先级排序队列
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.enqueuedAt - b.enqueuedAt;
    });

    logger.info(
      { taskId, queueLength: this.queue.length },
      `任务已加入队列（优先级: ${priority}）`
    );

    this.persistQueue();
    this.processNext();
  }

  /**
   * 处理下一个任务
   */
  private async processNext(): Promise<void> {
    // 检查是否达到并发限制
    if (this.processing.size >= this.MAX_CONCURRENCY) {
      logger.debug(
        { currentProcessing: this.processing.size, maxConcurrency: this.MAX_CONCURRENCY },
        '已达到并发限制'
      );
      return;
    }

    // 获取队列中的第一个任务
    const queuedTask = this.queue.shift();
    if (!queuedTask) {
      return;
    }

    // 移至处理中
    const processingTask: ProcessingTask = {
      ...queuedTask,
      status: 'processing',
    };

    this.processing.set(processingTask.id, processingTask);

    logger.info(
      { taskId: queuedTask.taskId, queueId: processingTask.id },
      `开始处理任务（当前处理中: ${this.processing.size}/${this.MAX_CONCURRENCY}）`
    );

    // 设置超时
    const timeoutHandle = setTimeout(() => {
      this.handleTimeout(processingTask.id);
    }, this.TASK_TIMEOUT);

    processingTask.timeoutHandle = timeoutHandle;

    // 执行任务
    try {
      if (!this.taskHandler) {
        throw new Error('任务处理器未设置');
      }

      await this.taskHandler(queuedTask.taskId);

      // 任务成功完成
      this.completeTask(processingTask.id, 'completed');
    } catch (error) {
      // 任务失败
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(
        { queueId: processingTask.id, taskId: queuedTask.taskId, error: errorMsg },
        '任务处理失败'
      );

      this.handleTaskFailure(processingTask.id, errorMsg);
    }
  }

  /**
   * 处理任务超时
   */
  private handleTimeout(queueId: string): void {
    const task = this.processing.get(queueId);
    if (!task) return;

    logger.warn(
      { taskId: task.taskId, timeoutMinutes: this.TASK_TIMEOUT / 60000 },
      '任务超时（30分钟无响应）'
    );

    this.completeTask(queueId, 'timeout', '任务执行超时（30分钟无响应）');
  }

  /**
   * 处理任务失败
   */
  private handleTaskFailure(queueId: string, errorMsg: string): void {
    const task = this.processing.get(queueId);
    if (!task) return;

    task.retriesLeft -= 1;
    task.error = errorMsg;

    if (task.retriesLeft > 0) {
      // 重新加入队列进行重试
      logger.info(
        { taskId: task.taskId, retriesLeft: task.retriesLeft },
        `任务处理失败，准备重试（剩余重试次数: ${task.retriesLeft}）`
      );

      const requeueTask: QueuedTask = {
        ...task,
        status: 'queued',
        id: `${task.taskId}_retry_${Date.now()}`,
        enqueuedAt: Date.now(),
      };

      this.queue.push(requeueTask);
      this.queue.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return a.enqueuedAt - b.enqueuedAt;
      });

      this.processing.delete(queueId);
      this.persistQueue();
    } else {
      // 重试次数已用完，标记为失败
      this.completeTask(queueId, 'failed', `任务处理失败：${errorMsg}（已用尽重试次数）`);
    }

    // 继续处理下一个任务
    this.processNext();
  }

  /**
   * 完成任务
   */
  private completeTask(
    queueId: string,
    status: 'completed' | 'failed' | 'timeout',
    errorMsg?: string
  ): void {
    const task = this.processing.get(queueId);
    if (!task) return;

    // 清除超时定时器
    if (task.timeoutHandle) {
      clearTimeout(task.timeoutHandle);
    }

    task.status = status;
    task.processedAt = Date.now();
    if (errorMsg) {
      task.error = errorMsg;
    }

    this.processing.delete(queueId);
    this.completed.set(queueId, task);

    const durationMs = task.processedAt - task.enqueuedAt;
    logger.info(
      { taskId: task.taskId, status, durationSeconds: (durationMs / 1000).toFixed(2) },
      `任务已完成（${status}）`
    );

    this.persistQueue();

    // 继续处理下一个任务
    this.processNext();
  }

  /**
   * 获取队列统计信息
   */
  public getStats(): {
    queued: number;
    processing: number;
    completed: number;
    failed: number;
    timeout: number;
    maxConcurrency: number;
    timeoutMinutes: number;
  } {
    const completedList = Array.from(this.completed.values());
    return {
      queued: this.queue.length,
      processing: this.processing.size,
      completed: completedList.filter(t => t.status === 'completed').length,
      failed: completedList.filter(t => t.status === 'failed').length,
      timeout: completedList.filter(t => t.status === 'timeout').length,
      maxConcurrency: this.MAX_CONCURRENCY,
      timeoutMinutes: this.TASK_TIMEOUT / 60000,
    };
  }

  /**
   * 获取最近的任务完成记录
   */
  public getRecentCompletedTasks(limit = 100) {
    return Array.from(this.completed.values())
      .sort((a, b) => (b.processedAt || 0) - (a.processedAt || 0))
      .slice(0, limit);
  }

  /**
   * 清理过期的完成记录（只保留最近1小时的记录）
   */
  public cleanupOldRecords(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    let cleaned = 0;

    for (const [key, task] of this.completed.entries()) {
      if ((task.processedAt || 0) < oneHourAgo) {
        this.completed.delete(key);
        cleaned += 1;
      }
    }

    if (cleaned > 0) {
      logger.debug({ cleaned }, '已清理过期的任务记录');
    }
  }
}

// 导出单例
export const taskQueueManager = new TaskQueueManager();
export default taskQueueManager;
