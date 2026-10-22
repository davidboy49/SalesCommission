namespace SalesCommission.Domain.Entities;

/// <summary>One execution of the commission calculation for a period. The latest run is the current result.</summary>
public class CalculationRun
{
    public int Id { get; set; }
    public int PeriodId { get; set; }
    public Period? Period { get; set; }
    public DateTime StartedAtUtc { get; set; }
    public DateTime CompletedAtUtc { get; set; }
    public int EmployeeCount { get; set; }
    public decimal TotalPayoutUsd { get; set; }
    public decimal KhrPerUsd { get; set; }
    public List<CommissionResult> Results { get; set; } = [];
}

public class CommissionResult
{
    public int Id { get; set; }
    public int CalculationRunId { get; set; }
    public int PeriodId { get; set; }
    public int EmployeeId { get; set; }
    public Employee? Employee { get; set; }
    public int PlanId { get; set; }
    public CommissionPlan? Plan { get; set; }
    public Currency PayoutCurrency { get; set; }
    public decimal TargetIncentive { get; set; }
    /// <summary>Weighted achievement across components.</summary>
    public decimal OverallAchievement { get; set; }
    public bool GatePassed { get; set; }
    public decimal? GateActualValue { get; set; }
    /// <summary>Payout in the plan currency, after gate and rounding.</summary>
    public decimal Payout { get; set; }
    public decimal PayoutUsd { get; set; }
    public List<CommissionResultLine> Lines { get; set; } = [];
}

/// <summary>How one plan component contributed to the payout — kept for transparency and audit.</summary>
public class CommissionResultLine
{
    public int Id { get; set; }
    public int CommissionResultId { get; set; }
    public int PlanComponentId { get; set; }
    public required string ComponentName { get; set; }
    public KpiType KpiType { get; set; }
    public int? ProductGroupId { get; set; }
    public decimal Weight { get; set; }
    public decimal Actual { get; set; }
    public decimal Target { get; set; }
    public decimal Achievement { get; set; }
    public decimal PayoutFactor { get; set; }
    public decimal Payout { get; set; }
}
