using SalesCommission.Domain;

namespace SalesCommission.Api.Controllers;

public record PeriodDto(int Id, string Code, DateOnly StartDate, DateOnly EndDate, PeriodStatus Status, decimal KhrPerUsd,
    DateTime? LastCalculatedUtc, decimal? TotalPayoutUsd, int? EmployeeCount);

public record ResultSummaryDto(int EmployeeId, string EmployeeCode, string EmployeeName, SalesRole Role, string Region,
    string? Channel, string? Supervisor, string PlanCode, string PlanName, Currency PayoutCurrency, decimal TargetIncentive,
    decimal OverallAchievement, bool GatePassed, decimal Payout, decimal PayoutUsd);

public record ResultLineDto(string Component, KpiType Kpi, string? ProductGroup, decimal Weight, decimal Actual, decimal Target,
    decimal Achievement, decimal PayoutFactor, decimal Payout, bool IsRate);

public record ResultDetailDto(ResultSummaryDto Summary, string PeriodCode, KpiType? GateKpi, decimal? GateMinValue,
    decimal? GateActualValue, string? PlanDescription, List<ResultLineDto> Lines);

public record PayoutHistoryDto(string PeriodCode, Currency PayoutCurrency, decimal Payout, decimal PayoutUsd, decimal OverallAchievement, bool GatePassed);
