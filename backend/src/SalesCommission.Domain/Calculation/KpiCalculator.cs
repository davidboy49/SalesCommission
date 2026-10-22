namespace SalesCommission.Domain.Calculation;

/// <summary>Computes a KPI's actual value from one employee's period data.</summary>
public static class KpiCalculator
{
    public static decimal Compute(EmployeePeriodData data, KpiType kpi, SalesBase salesBase,
        int? productGroupId, Currency currency)
    {
        var value = kpi switch
        {
            KpiType.SalesVolumeCases => Volume(data, salesBase, productGroupId),
            KpiType.SalesRevenue => Revenue(data, salesBase, productGroupId, currency),
            KpiType.ActiveOutlets => SoldOutlets(data, productGroupId).Count,
            KpiType.NewOutlets => NewOutlets(data, productGroupId),
            KpiType.CollectionRate => Ratio(
                CollectedAmount(data, currency),
                Revenue(data, SalesBase.NetOfReturns, null, currency)),
            KpiType.StrikeRate => Ratio(
                data.Visits.Count(v => v.Visited && v.Productive),
                data.Visits.Count(v => v.Visited)),
            KpiType.LinesPerCall => Ratio(
                data.Visits.Where(v => v.Visited && v.Productive).Sum(v => v.LinesSold),
                data.Visits.Count(v => v.Visited && v.Productive)),
            KpiType.VisitCompliance => Ratio(
                data.Visits.Count(v => v.Planned && v.Visited),
                data.Visits.Count(v => v.Planned)),
            KpiType.AuditCompliance => Ratio(
                data.Audits.Count(a => a.Compliant),
                data.Audits.Count),
            _ => throw new ArgumentOutOfRangeException(nameof(kpi), kpi, null)
        };
        return Math.Round(value, 4, MidpointRounding.AwayFromZero);
    }

    private static decimal Volume(EmployeePeriodData data, SalesBase salesBase, int? productGroupId)
    {
        var sold = data.Sales.Where(s => InGroup(data, s.ProductId, productGroupId)).Sum(s => s.QuantityCases);
        if (salesBase == SalesBase.Invoiced)
            return sold;
        var returned = data.Returns.Where(r => InGroup(data, r.ProductId, productGroupId)).Sum(r => r.QuantityCases);
        return sold - returned;
    }

    private static decimal Revenue(EmployeePeriodData data, SalesBase salesBase, int? productGroupId, Currency currency)
    {
        if (salesBase == SalesBase.Collected)
            return CollectedAmount(data, currency);

        var invoiced = data.Sales.Where(s => InGroup(data, s.ProductId, productGroupId))
            .Sum(s => Money.Convert(s.Amount, s.Currency, currency, data.KhrPerUsd));
        if (salesBase == SalesBase.Invoiced)
            return invoiced;
        var returned = data.Returns.Where(r => InGroup(data, r.ProductId, productGroupId))
            .Sum(r => Money.Convert(r.Amount, r.Currency, currency, data.KhrPerUsd));
        return invoiced - returned;
    }

    private static decimal CollectedAmount(EmployeePeriodData data, Currency currency) =>
        data.Collections.Sum(c => Money.Convert(c.Amount, c.Currency, currency, data.KhrPerUsd));

    private static HashSet<int> SoldOutlets(EmployeePeriodData data, int? productGroupId) =>
        data.Sales.Where(s => InGroup(data, s.ProductId, productGroupId)).Select(s => s.OutletId).ToHashSet();

    private static int NewOutlets(EmployeePeriodData data, int? productGroupId) =>
        SoldOutlets(data, productGroupId).Count(outletId => productGroupId is { } group
            ? !data.OutletGroupsWithEarlierSales.Contains((outletId, group))
            : !data.OutletsWithEarlierSales.Contains(outletId));

    private static bool InGroup(EmployeePeriodData data, int productId, int? productGroupId) =>
        productGroupId is null || data.ProductGroupByProductId.GetValueOrDefault(productId) == productGroupId;

    private static decimal Ratio(decimal numerator, decimal denominator) =>
        denominator == 0 ? 0m : numerator / denominator;
}
