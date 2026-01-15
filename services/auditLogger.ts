/**
 * Sistema de Auditoria e Logging Centralizado
 * Registra todas as operações críticas com métricas e validação
 */

export interface AuditLog {
  timestamp: Date;
  operation: string;
  status: 'start' | 'success' | 'error' | 'warning';
  duration?: number;
  details: Record<string, any>;
  error?: string;
}

export interface PerformanceMetrics {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsed?: number;
  itemsProcessed?: number;
  throughput?: number; // items/second
}

class AuditLogger {
  private logs: AuditLog[] = [];
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private maxLogs = 1000; // Limita memória

  /**
   * Registra início de operação
   */
  startOperation(operation: string, details: Record<string, any> = {}): string {
    const operationId = `${operation}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    this.logs.push({
      timestamp: new Date(),
      operation,
      status: 'start',
      details: { ...details, operationId }
    });

    this.metrics.set(operationId, {
      operation,
      startTime: performance.now()
    });

    console.log(`🔄 [${operation}] Iniciado`, details);
    return operationId;
  }

  /**
   * Registra sucesso de operação
   */
  endOperation(operationId: string, details: Record<string, any> = {}) {
    const metric = this.metrics.get(operationId);
    if (!metric) {
      console.warn(`⚠️ Operação ${operationId} não encontrada`);
      return;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    if (details.itemsProcessed) {
      metric.itemsProcessed = details.itemsProcessed;
      metric.throughput = details.itemsProcessed / (metric.duration / 1000);
    }

    this.logs.push({
      timestamp: new Date(),
      operation: metric.operation,
      status: 'success',
      duration: metric.duration,
      details: { ...details, operationId }
    });

    console.log(`✅ [${metric.operation}] Concluído em ${metric.duration.toFixed(2)}ms`, details);
    
    // Limita tamanho do array
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  /**
   * Registra erro de operação
   */
  logError(operation: string, error: Error | string, details: Record<string, any> = {}) {
    const errorMsg = error instanceof Error ? error.message : error;
    
    this.logs.push({
      timestamp: new Date(),
      operation,
      status: 'error',
      error: errorMsg,
      details
    });

    console.error(`❌ [${operation}] Erro:`, errorMsg, details);
  }

  /**
   * Registra aviso
   */
  logWarning(operation: string, message: string, details: Record<string, any> = {}) {
    this.logs.push({
      timestamp: new Date(),
      operation,
      status: 'warning',
      details: { message, ...details }
    });

    console.warn(`⚠️ [${operation}] Aviso: ${message}`, details);
  }

  /**
   * Obtém estatísticas de desempenho
   */
  getPerformanceStats(operation: string): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    totalDuration: number;
    successRate: number;
  } {
    const operationLogs = this.logs.filter(log => log.operation === operation);
    const successLogs = operationLogs.filter(log => log.status === 'success' && log.duration);
    
    if (successLogs.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        totalDuration: 0,
        successRate: 0
      };
    }

    const durations = successLogs.map(log => log.duration!);
    
    return {
      count: successLogs.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      totalDuration: durations.reduce((a, b) => a + b, 0),
      successRate: successLogs.length / operationLogs.length
    };
  }

  /**
   * Obtém logs recentes
   */
  getRecentLogs(limit: number = 50): AuditLog[] {
    return this.logs.slice(-limit);
  }

  /**
   * Limpa logs antigos
   */
  clearLogs() {
    this.logs = [];
    this.metrics.clear();
    console.log('🗑️ Logs de auditoria limpos');
  }

  /**
   * Exporta relatório completo
   */
  generateReport(): string {
    const operations = [...new Set(this.logs.map(log => log.operation))];
    let report = '📊 RELATÓRIO DE AUDITORIA\n';
    report += `═══════════════════════════════\n`;
    report += `Total de operações: ${this.logs.length}\n`;
    report += `Período: ${this.logs[0]?.timestamp || 'N/A'} - ${this.logs[this.logs.length - 1]?.timestamp || 'N/A'}\n\n`;

    operations.forEach(op => {
      const stats = this.getPerformanceStats(op);
      report += `\n📌 ${op}\n`;
      report += `   Execuções: ${stats.count}\n`;
      report += `   Taxa de sucesso: ${(stats.successRate * 100).toFixed(1)}%\n`;
      if (stats.count > 0) {
        report += `   Duração média: ${stats.avgDuration.toFixed(2)}ms\n`;
        report += `   Duração min/max: ${stats.minDuration.toFixed(2)}ms / ${stats.maxDuration.toFixed(2)}ms\n`;
      }
    });

    return report;
  }
}

// Singleton global
export const auditLogger = new AuditLogger();
