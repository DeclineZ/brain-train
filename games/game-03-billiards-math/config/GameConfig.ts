/**
 * Centralized configuration for the billiards math game
 */
export class GameConfig {
    // Responsive sizing constants
    static readonly SIZING = {
        BALL_RADIUS_RATIO: 0.08,
        FONT_SIZE_RATIO: 0.04,
        OPERATOR_FONT_SIZE_RATIO: 0.12,
        SHADOW_OFFSET_RATIO: 0.12,
        BASE_SPACING_RATIO: 0.13,
        TABLE_WIDTH_RATIO: 0.8,
        TABLE_HEIGHT_RATIO: 0.7,
        CORNER_RADIUS_RATIO: 0.03,
        POCKET_RADIUS_RATIO: 0.04,
        GOAL_BALL_RADIUS_RATIO: 0.06,
        SHADOW_BALL_RADIUS_RATIO: 0.05,
        TIMER_BAR_WIDTH_RATIO: 0.8,
        TIMER_BAR_HEIGHT_RATIO: 0.02,
        MESSAGE_FONT_SIZE_RATIO: 0.05,
    } as const;

    // Color constants
    static readonly COLORS = {
        TABLE_FELT: 0x0d5d3d,
        TABLE_BORDER: 0x8b4513,
        POCKET: 0x000000,
        CENTER_SPOT: 0xffffff,
        BALL_WHITE: 0xffffff,
        BALL_BLACK: 0x000000,
        TEXT_PRIMARY: '#2B2115',
        TEXT_STROKE: '#FFFFFF',
        PLACEHOLDER_GRAY: 0xe8e8e8,
        PLACEHOLDER_BORDER: 0xcccccc,
        INCOMPLETE_BALL: 0xcccccc,
        INCOMPLETE_BORDER: 0x666666,
        TIMER_BAR_SUCCESS: 0x76d13d,
        TIMER_BAR_WARNING: 0xff4444,
        TIMER_BAR_BG: 0x8b4513,
        SHADOW_ALPHA: 0.3,
        CENTER_SPOT_ALPHA: 0.5,
    } as const;

    // Animation constants
    static readonly ANIMATION = {
        BALL_HOVER_SCALE: 1.05,
        BALL_DRAG_SCALE: 1.2,
        EQUATION_BALL_SCALE: 1.2,
        GOAL_BALL_PULSE_SCALE: 1.1,
        EMPTY_SLOT_PULSE_SCALE: 1.05,
        SUCCESS_SCALE: 1.2,
        SHAKE_DURATION: 50,
        SHAKE_REPEAT: 5,
        ENTRANCE_DURATION: 300,
        BOUNCE_DURATION: 200,
        HOVER_DURATION: 150,
        PULSE_DURATION: 800,
        SUCCESS_DELAY: 1500,
        ERROR_DELAY: 1500,
        BALL_RETURN_DURATION: 600,
        BALL_ANIMATION_DURATION: 400,
        EMPTY_SLOT_DURATION: 1500,
        SHADOW_BALL_COMPLETION_DURATION: 300,
    } as const;

    // Game constants
    static readonly GAME = {
        MAX_BALL_VALUE: 10,
        MIN_BALL_VALUE: 1,
        BALL_POOL_SIZE: 20,
        MAX_EQUATION_OPERANDS: 4,
        MIN_EQUATION_OPERANDS: 2,
        MAX_DISPLAY_OPERANDS: 3,
        TIMER_WARNING_THRESHOLD: 25,
        TIMER_UPDATE_INTERVAL: 100,
        WARNING_BLINK_SPEED: 150,
        MAX_PLACEMENT_ATTEMPTS: 60,
        BALL_PADDING: 10,
        EXCLUSION_RADIUS: 160,
    } as const;

    // Sound configuration
    static readonly SOUND = {
        VOLUME_BALL_DROP: 0.6,
        VOLUME_BALL_RATTLE: 0.7,
        VOLUME_SUCCESS: 0.8,
        VOLUME_BALL_CLICK: 0.5,
        VOLUME_BG_MUSIC: 0.3,
    } as const;

    // Performance monitoring
    static readonly PERFORMANCE = {
        MAX_ACTIVE_TWEENS: 50,
        MAX_ACTIVE_CONTAINERS: 100,
        MEMORY_CLEANUP_INTERVAL: 30000, // 30 seconds
        LOG_PERFORMANCE_WARNINGS: true,
    } as const;

    /**
     * Get responsive dimensions based on screen size
     */
    static getResponsiveDimensions(width: number, height: number) {
        return {
            ballRadius: Math.min(35, width * this.SIZING.BALL_RADIUS_RATIO),
            fontSize: Math.min(22, width * this.SIZING.FONT_SIZE_RATIO),
            operatorFontSize: Math.min(64, width * this.SIZING.OPERATOR_FONT_SIZE_RATIO),
            shadowOffset: Math.min(35, width * this.SIZING.BALL_RADIUS_RATIO) * this.SIZING.SHADOW_OFFSET_RATIO,
            baseSpacing: Math.min(120, width * this.SIZING.BASE_SPACING_RATIO),
            tableWidth: width * this.SIZING.TABLE_WIDTH_RATIO,
            tableHeight: height * this.SIZING.TABLE_HEIGHT_RATIO,
            cornerRadius: Math.min(20, width * this.SIZING.CORNER_RADIUS_RATIO),
            pocketRadius: Math.min(25, width * this.SIZING.POCKET_RADIUS_RATIO),
            goalBallRadius: Math.min(35, width * this.SIZING.GOAL_BALL_RADIUS_RATIO),
            shadowBallRadius: Math.min(25, width * this.SIZING.SHADOW_BALL_RADIUS_RATIO),
            timerBarWidth: Math.min(width * this.SIZING.TIMER_BAR_WIDTH_RATIO, 400),
            timerBarHeight: Math.min(height * this.SIZING.TIMER_BAR_HEIGHT_RATIO, 12),
            messageFontSize: Math.min(32, width * this.SIZING.MESSAGE_FONT_SIZE_RATIO),
        };
    }

    /**
     * Get responsive dimensions for tutorial (larger sizes for elderly users)
     */
    static getTutorialDimensions(width: number, height: number) {
        const base = this.getResponsiveDimensions(width, height);
        return {
            ...base,
            ballRadius: Math.min(40, width * this.SIZING.BALL_RADIUS_RATIO * 1.2),
            fontSize: Math.min(32, width * this.SIZING.FONT_SIZE_RATIO * 1.5),
            operatorFontSize: Math.min(64, width * this.SIZING.OPERATOR_FONT_SIZE_RATIO),
            messageFontSize: Math.min(48, width * this.SIZING.MESSAGE_FONT_SIZE_RATIO * 1.5),
        };
    }

    /**
     * Validate configuration values
     */
    static validateConfig(): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (this.SIZING.BALL_RADIUS_RATIO <= 0 || this.SIZING.BALL_RADIUS_RATIO > 1) {
            errors.push('BALL_RADIUS_RATIO must be between 0 and 1');
        }

        if (this.GAME.MAX_BALL_VALUE < this.GAME.MIN_BALL_VALUE) {
            errors.push('MAX_BALL_VALUE must be greater than MIN_BALL_VALUE');
        }

        if (this.GAME.MAX_EQUATION_OPERANDS < this.GAME.MIN_EQUATION_OPERANDS) {
            errors.push('MAX_EQUATION_OPERANDS must be greater than MIN_EQUATION_OPERANDS');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Get color with alpha
     */
    static getColorWithAlpha(color: number, alpha: number): number {
        return (color & 0x00ffffff) | (Math.floor(alpha * 255) << 24);
    }

    /**
     * Clamp value between min and max
     */
    static clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Check if performance monitoring should be enabled
     */
    static shouldMonitorPerformance(): boolean {
        return this.PERFORMANCE.LOG_PERFORMANCE_WARNINGS;
    }

    /**
     * Get memory cleanup interval
     */
    static getMemoryCleanupInterval(): number {
        return this.PERFORMANCE.MEMORY_CLEANUP_INTERVAL;
    }

    /**
     * Get maximum active tweens allowed
     */
    static getMaxActiveTweens(): number {
        return this.PERFORMANCE.MAX_ACTIVE_TWEENS;
    }

    /**
     * Get maximum active containers allowed
     */
    static getMaxActiveContainers(): number {
        return this.PERFORMANCE.MAX_ACTIVE_CONTAINERS;
    }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
    private static activeTweens = 0;
    private static activeContainers = 0;
    private static lastCleanup = Date.now();

    /**
     * Track tween creation
     */
    static trackTween(): void {
        if (!GameConfig.shouldMonitorPerformance()) return;
        
        this.activeTweens++;
        if (this.activeTweens > GameConfig.getMaxActiveTweens()) {
            console.warn(`Performance warning: Too many active tweens (${this.activeTweens})`);
        }
    }

    /**
     * Track tween completion
     */
    static trackTweenComplete(): void {
        this.activeTweens = Math.max(0, this.activeTweens - 1);
    }

    /**
     * Track container creation
     */
    static trackContainer(): void {
        if (!GameConfig.shouldMonitorPerformance()) return;
        
        this.activeContainers++;
        if (this.activeContainers > GameConfig.getMaxActiveContainers()) {
            console.warn(`Performance warning: Too many active containers (${this.activeContainers})`);
        }
    }

    /**
     * Track container destruction
     */
    static trackContainerDestroyed(): void {
        this.activeContainers = Math.max(0, this.activeContainers - 1);
    }

    /**
     * Check if memory cleanup is needed
     */
    static shouldCleanupMemory(): boolean {
        const now = Date.now();
        return (now - this.lastCleanup) > GameConfig.getMemoryCleanupInterval();
    }

    /**
     * Mark memory cleanup as performed
     */
    static markCleanup(): void {
        this.lastCleanup = Date.now();
    }

    /**
     * Get performance statistics
     */
    static getStats(): { activeTweens: number; activeContainers: number } {
        return {
            activeTweens: this.activeTweens,
            activeContainers: this.activeContainers,
        };
    }
}

/**
 * Error handling utilities
 */
export class ErrorHandler {
    private static errorCount = 0;
    private static maxErrors = 10;

    /**
     * Handle and log errors
     */
    static handleError(error: Error, context?: string): void {
        this.errorCount++;
        
        const errorInfo = {
            message: error.message,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString(),
            count: this.errorCount,
        };

        console.error('Game Error:', errorInfo);

        // Prevent error spam
        if (this.errorCount > this.maxErrors) {
            console.warn('Too many errors detected, disabling further error logging');
            return;
        }

        // Could send to error tracking service here
        this.reportError(errorInfo);
    }

    /**
     * Report error to external service (placeholder)
     */
    private static reportError(errorInfo: any): void {
        // In a real implementation, this would send to an error tracking service
        // For now, just log to console
        console.log('Error Report:', errorInfo);
    }

    /**
     * Reset error counter
     */
    static resetErrorCount(): void {
        this.errorCount = 0;
    }

    /**
     * Get error statistics
     */
    static getErrorStats(): { errorCount: number; maxErrors: number } {
        return {
            errorCount: this.errorCount,
            maxErrors: this.maxErrors,
        };
    }
}
