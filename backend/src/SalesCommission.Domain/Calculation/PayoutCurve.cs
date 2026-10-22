using SalesCommission.Domain.Entities;

namespace SalesCommission.Domain.Calculation;

/// <summary>
/// Turns an achievement ratio into a payout factor using a component's tier points.
/// Below the first point nothing is paid (threshold); above the last point the last factor applies (cap).
/// </summary>
public static class PayoutCurve
{
    public static decimal Evaluate(IEnumerable<PayoutTier> tiers, decimal achievement, bool interpolate)
    {
        var points = tiers.OrderBy(t => t.Achievement).ToList();
        if (points.Count == 0)
            return achievement;
        if (achievement < points[0].Achievement)
            return 0m;
        if (achievement >= points[^1].Achievement)
            return points[^1].PayoutFactor;

        for (var i = 0; i < points.Count - 1; i++)
        {
            var lower = points[i];
            var upper = points[i + 1];
            if (achievement < lower.Achievement || achievement >= upper.Achievement)
                continue;
            if (!interpolate)
                return lower.PayoutFactor;

            var span = upper.Achievement - lower.Achievement;
            var position = (achievement - lower.Achievement) / span;
            return lower.PayoutFactor + position * (upper.PayoutFactor - lower.PayoutFactor);
        }

        return points[^1].PayoutFactor;
    }
}
