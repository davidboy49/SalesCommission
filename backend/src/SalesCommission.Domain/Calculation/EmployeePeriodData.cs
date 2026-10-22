using SalesCommission.Domain.Entities;

namespace SalesCommission.Domain.Calculation;

/// <summary>Everything one employee did in one period, plus the history needed for "new outlet" KPIs.</summary>
public sealed class EmployeePeriodData
{
    public IReadOnlyList<SalesLine> Sales { get; init; } = [];
    public IReadOnlyList<ReturnLine> Returns { get; init; } = [];
    public IReadOnlyList<Collection> Collections { get; init; } = [];
    public IReadOnlyList<Visit> Visits { get; init; } = [];
    public IReadOnlyList<OutletAudit> Audits { get; init; } = [];

    /// <summary>Outlets that bought anything before the period started.</summary>
    public IReadOnlySet<int> OutletsWithEarlierSales { get; init; } = new HashSet<int>();
    /// <summary>(Outlet, product group) pairs with sales before the period started.</summary>
    public IReadOnlySet<(int OutletId, int ProductGroupId)> OutletGroupsWithEarlierSales { get; init; } =
        new HashSet<(int, int)>();

    public required IReadOnlyDictionary<int, int> ProductGroupByProductId { get; init; }
    public decimal KhrPerUsd { get; init; }
}
