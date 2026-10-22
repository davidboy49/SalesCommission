using SalesCommission.Domain.Entities;

namespace SalesCommission.Domain.Calculation;

/// <summary>Looks up an employee's target for a KPI (and optional product group) in the period.</summary>
public delegate decimal? TargetLookup(KpiType kpi, int? productGroupId);

/// <summary>Applies a plan to one employee's period data and produces a traceable result.</summary>
public static class CommissionCalculator
{
    public static CommissionResult Calculate(CommissionPlan plan, EmployeePeriodData data, TargetLookup targets)
    {
        var currency = plan.PayoutCurrency;
        var result = new CommissionResult
        {
            PlanId = plan.Id,
            PayoutCurrency = currency,
            TargetIncentive = plan.TargetIncentive,
            GatePassed = true
        };

        foreach (var component in plan.Components.OrderBy(c => c.SortOrder))
        {
            var actual = KpiCalculator.Compute(data, component.KpiType, component.SalesBase,
                component.ProductGroupId, currency);
            var target = targets(component.KpiType, component.ProductGroupId) ?? 0m;
            var achievement = target == 0 ? 0m : Math.Round(actual / target, 4, MidpointRounding.AwayFromZero);
            var factor = Math.Round(PayoutCurve.Evaluate(component.Tiers, achievement, component.Interpolate), 4,
                MidpointRounding.AwayFromZero);

            result.Lines.Add(new CommissionResultLine
            {
                PlanComponentId = component.Id,
                ComponentName = component.Name,
                KpiType = component.KpiType,
                ProductGroupId = component.ProductGroupId,
                Weight = component.Weight,
                Actual = actual,
                Target = target,
                Achievement = achievement,
                PayoutFactor = factor,
                Payout = Money.RoundPayout(plan.TargetIncentive * component.Weight * factor, currency)
            });
        }

        result.OverallAchievement = Math.Round(result.Lines.Sum(l => l.Weight * l.Achievement), 4,
            MidpointRounding.AwayFromZero);

        if (plan is { GateKpi: { } gateKpi, GateMinValue: { } gateMin })
        {
            result.GateActualValue = KpiCalculator.Compute(data, gateKpi, SalesBase.NetOfReturns, null, currency);
            result.GatePassed = result.GateActualValue >= gateMin;
        }

        if (!result.GatePassed)
        {
            foreach (var line in result.Lines)
                line.Payout = 0m;
        }

        result.Payout = result.Lines.Sum(l => l.Payout);
        result.PayoutUsd = Math.Round(Money.Convert(result.Payout, currency, Currency.USD, data.KhrPerUsd), 2,
            MidpointRounding.AwayFromZero);
        return result;
    }
}
