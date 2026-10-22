using SalesCommission.Domain;
using SalesCommission.Domain.Calculation;
using SalesCommission.Domain.Entities;

namespace SalesCommission.Tests;

public class PayoutCurveTests
{
    private static readonly PayoutTier[] Tiers =
    [
        new() { Achievement = 0.80m, PayoutFactor = 0.50m },
        new() { Achievement = 1.00m, PayoutFactor = 1.00m },
        new() { Achievement = 1.20m, PayoutFactor = 1.50m }
    ];

    [Theory]
    [InlineData(0.79, 0.0)]    // below threshold
    [InlineData(0.80, 0.5)]    // at threshold
    [InlineData(0.90, 0.75)]   // interpolated between 0.8 and 1.0
    [InlineData(1.00, 1.0)]
    [InlineData(1.10, 1.25)]   // accelerator zone
    [InlineData(1.20, 1.5)]    // cap reached
    [InlineData(2.00, 1.5)]    // stays capped
    public void Interpolates_between_points_and_caps(double achievement, double expected) =>
        Assert.Equal((decimal)expected, PayoutCurve.Evaluate(Tiers, (decimal)achievement, interpolate: true));

    [Theory]
    [InlineData(0.79, 0.0)]
    [InlineData(0.99, 0.5)]    // step: highest tier reached
    [InlineData(1.00, 1.0)]
    [InlineData(1.19, 1.0)]
    public void Step_mode_uses_highest_reached_tier(double achievement, double expected) =>
        Assert.Equal((decimal)expected, PayoutCurve.Evaluate(Tiers, (decimal)achievement, interpolate: false));
}

public class MoneyTests
{
    [Fact]
    public void Converts_both_directions() =>
        Assert.Equal(4100m, Money.Convert(1m, Currency.USD, Currency.KHR, 4100m));

    [Fact]
    public void Converts_khr_to_usd() =>
        Assert.Equal(2m, Money.Convert(8200m, Currency.KHR, Currency.USD, 4100m));

    [Fact]
    public void Rounds_khr_to_nearest_hundred() =>
        Assert.Equal(12300m, Money.RoundPayout(12349m, Currency.KHR));

    [Fact]
    public void Rounds_usd_to_cents() =>
        Assert.Equal(10.13m, Money.RoundPayout(10.125m, Currency.USD));
}

public class CommissionCalculatorTests
{
    private const decimal Rate = 4000m;

    private static EmployeePeriodData Data(
        IEnumerable<SalesLine>? sales = null, IEnumerable<ReturnLine>? returns = null,
        IEnumerable<Collection>? collections = null, IEnumerable<Visit>? visits = null) => new()
    {
        Sales = sales?.ToList() ?? [],
        Returns = returns?.ToList() ?? [],
        Collections = collections?.ToList() ?? [],
        Visits = visits?.ToList() ?? [],
        ProductGroupByProductId = new Dictionary<int, int> { [1] = 10, [2] = 20 },
        KhrPerUsd = Rate
    };

    private static SalesLine Sale(int outlet, int product, decimal cases, decimal usd, Currency cur = Currency.USD) =>
        new() { InvoiceNo = "I", EmployeeId = 1, OutletId = outlet, ProductId = product, QuantityCases = cases, Amount = usd, Currency = cur };

    private static CommissionPlan Plan(Currency currency = Currency.USD) => new()
    {
        Id = 1, Code = "P", Name = "P", Role = SalesRole.PreSales, PayoutCurrency = currency,
        TargetIncentive = 200m, EffectiveFrom = new DateOnly(2026, 1, 1),
        Components =
        [
            new PlanComponent
            {
                Id = 1, Name = "Volume", KpiType = KpiType.SalesVolumeCases, Weight = 0.6m, SortOrder = 1,
                Tiers = [new() { Achievement = 0.8m, PayoutFactor = 0.5m }, new() { Achievement = 1m, PayoutFactor = 1m }, new() { Achievement = 1.2m, PayoutFactor = 1.5m }]
            },
            new PlanComponent
            {
                Id = 2, Name = "Outlets", KpiType = KpiType.ActiveOutlets, Weight = 0.4m, SortOrder = 2,
                Tiers = [new() { Achievement = 1m, PayoutFactor = 1m }]
            }
        ]
    };

    private static TargetLookup Targets(decimal volume, decimal outlets) => (kpi, _) => kpi switch
    {
        KpiType.SalesVolumeCases => volume,
        KpiType.ActiveOutlets => outlets,
        _ => null
    };

    [Fact]
    public void Pays_weighted_components_at_target()
    {
        var data = Data(sales: [Sale(1, 1, 60, 600), Sale(2, 1, 40, 400)]);
        var result = CommissionCalculator.Calculate(Plan(), data, Targets(volume: 100, outlets: 2));

        // Volume 100/100 -> factor 1.0 -> 200*0.6 = 120; Outlets 2/2 -> 1.0 -> 200*0.4 = 80
        Assert.Equal(200m, result.Payout);
        Assert.Equal(1m, result.OverallAchievement);
        Assert.Equal(200m, result.PayoutUsd);
    }

    [Fact]
    public void Below_threshold_pays_nothing_for_that_component()
    {
        var data = Data(sales: [Sale(1, 1, 70, 700), Sale(2, 1, 0, 0)]); // 70% volume, 2 outlets
        var result = CommissionCalculator.Calculate(Plan(), data, Targets(100, 2));

        Assert.Equal(0m, result.Lines.Single(l => l.ComponentName == "Volume").Payout);
        Assert.Equal(80m, result.Lines.Single(l => l.ComponentName == "Outlets").Payout);
        Assert.Equal(80m, result.Payout);
    }

    [Fact]
    public void Returns_reduce_net_volume()
    {
        var data = Data(
            sales: [Sale(1, 1, 110, 1100)],
            returns: [new ReturnLine { EmployeeId = 1, OutletId = 1, ProductId = 1, QuantityCases = 10, Amount = 100 }]);
        var result = CommissionCalculator.Calculate(Plan(), data, Targets(100, 1));

        Assert.Equal(100m, result.Lines[0].Actual);
        Assert.Equal(1m, result.Lines[0].Achievement);
    }

    [Fact]
    public void Gate_blocks_all_payout_when_collection_too_low()
    {
        var plan = Plan();
        plan.GateKpi = KpiType.CollectionRate;
        plan.GateMinValue = 0.90m;
        var data = Data(
            sales: [Sale(1, 1, 100, 1000), Sale(2, 1, 0, 0)],
            collections: [new Collection { EmployeeId = 1, OutletId = 1, Amount = 800 }]); // 80%

        var result = CommissionCalculator.Calculate(plan, data, Targets(100, 2));

        Assert.False(result.GatePassed);
        Assert.Equal(0.8m, result.GateActualValue);
        Assert.Equal(0m, result.Payout);
    }

    [Fact]
    public void Gate_passes_when_collection_meets_minimum()
    {
        var plan = Plan();
        plan.GateKpi = KpiType.CollectionRate;
        plan.GateMinValue = 0.90m;
        var data = Data(
            sales: [Sale(1, 1, 100, 1000), Sale(2, 1, 0, 0)],
            collections: [new Collection { EmployeeId = 1, OutletId = 1, Amount = 950 }]);

        var result = CommissionCalculator.Calculate(plan, data, Targets(100, 2));

        Assert.True(result.GatePassed);
        Assert.Equal(200m, result.Payout);
    }

    [Fact]
    public void Khr_plan_pays_in_riel_and_reports_usd_equivalent()
    {
        var plan = Plan(Currency.KHR);
        plan.TargetIncentive = 800_000m;
        var data = Data(sales: [Sale(1, 1, 100, 1000), Sale(2, 1, 0, 0)]);

        var result = CommissionCalculator.Calculate(plan, data, Targets(100, 2));

        Assert.Equal(800_000m, result.Payout);
        Assert.Equal(200m, result.PayoutUsd); // 800,000 / 4,000
    }

    [Fact]
    public void Mixed_currency_revenue_is_converted_to_plan_currency()
    {
        var data = Data(sales: [Sale(1, 1, 1, 100), Sale(1, 1, 1, 400_000, Currency.KHR)]);
        var revenue = KpiCalculator.Compute(data, KpiType.SalesRevenue, SalesBase.Invoiced, null, Currency.USD);
        Assert.Equal(200m, revenue); // 100 + 400,000/4,000
    }

    [Fact]
    public void Focus_brand_kpi_counts_only_that_group()
    {
        var data = Data(sales: [Sale(1, 1, 30, 300), Sale(1, 2, 70, 700)]);
        Assert.Equal(30m, KpiCalculator.Compute(data, KpiType.SalesVolumeCases, SalesBase.NetOfReturns, 10, Currency.USD));
    }

    [Fact]
    public void New_outlets_exclude_outlets_that_bought_before()
    {
        var data = new EmployeePeriodData
        {
            Sales = [Sale(1, 1, 5, 50), Sale(2, 1, 5, 50), Sale(3, 1, 5, 50)],
            OutletsWithEarlierSales = new HashSet<int> { 1 },
            ProductGroupByProductId = new Dictionary<int, int> { [1] = 10 },
            KhrPerUsd = Rate
        };
        Assert.Equal(2m, KpiCalculator.Compute(data, KpiType.NewOutlets, SalesBase.Invoiced, null, Currency.USD));
    }

    [Fact]
    public void Visit_kpis_use_correct_denominators()
    {
        var visits = new[]
        {
            new Visit { Planned = true, Visited = true, Productive = true, LinesSold = 4 },
            new Visit { Planned = true, Visited = true, Productive = false },
            new Visit { Planned = true, Visited = false },
            new Visit { Planned = false, Visited = true, Productive = true, LinesSold = 2 }
        };
        var data = Data(visits: visits);

        Assert.Equal(0.6667m, KpiCalculator.Compute(data, KpiType.StrikeRate, SalesBase.Invoiced, null, Currency.USD)); // 2 of 3 visited
        Assert.Equal(0.6667m, KpiCalculator.Compute(data, KpiType.VisitCompliance, SalesBase.Invoiced, null, Currency.USD)); // 2 of 3 planned
        Assert.Equal(3m, KpiCalculator.Compute(data, KpiType.LinesPerCall, SalesBase.Invoiced, null, Currency.USD)); // 6 lines / 2 productive
    }

    [Fact]
    public void Missing_target_gives_zero_achievement_not_a_crash()
    {
        var data = Data(sales: [Sale(1, 1, 100, 1000)]);
        var result = CommissionCalculator.Calculate(Plan(), data, (_, _) => null);
        Assert.Equal(0m, result.Payout);
    }
}

public class PlanSelectorTests
{
    private static CommissionPlan P(string code, int? region = null, int? channel = null, DateOnly? from = null, DateOnly? to = null,
        SalesRole role = SalesRole.PreSales) => new()
    {
        Code = code, Name = code, Role = role, RegionId = region, ChannelId = channel,
        EffectiveFrom = from ?? new DateOnly(2026, 1, 1), EffectiveTo = to
    };

    private static readonly Employee Rep = new() { Code = "E1", FullName = "Rep", Role = SalesRole.PreSales, RegionId = 3, ChannelId = 5 };
    private static readonly DateOnly Day = new(2026, 9, 15);

    [Fact]
    public void Most_specific_plan_wins()
    {
        var plans = new[] { P("generic"), P("region", region: 3), P("both", region: 3, channel: 5), P("other-region", region: 4) };
        Assert.Equal("both", PlanSelector.Select(plans, Rep, Day)?.Code);
    }

    [Fact]
    public void Ignores_wrong_role_and_out_of_range_versions()
    {
        var plans = new[]
        {
            P("van", role: SalesRole.VanSales),
            P("expired", to: new DateOnly(2026, 6, 30)),
            P("future", from: new DateOnly(2027, 1, 1))
        };
        Assert.Null(PlanSelector.Select(plans, Rep, Day));
    }

    [Fact]
    public void Newer_version_wins_when_equally_specific()
    {
        var plans = new[]
        {
            P("old", from: new DateOnly(2026, 1, 1)),
            P("new", from: new DateOnly(2026, 7, 1))
        };
        Assert.Equal("new", PlanSelector.Select(plans, Rep, Day)?.Code);
    }
}
