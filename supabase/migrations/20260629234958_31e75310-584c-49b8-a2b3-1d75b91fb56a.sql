ALTER TYPE balance_log_type ADD VALUE IF NOT EXISTS 'admin_adjust';
ALTER TYPE balance_log_type ADD VALUE IF NOT EXISTS 'withdraw_refund';
ALTER TYPE balance_log_type ADD VALUE IF NOT EXISTS 'match_refund';