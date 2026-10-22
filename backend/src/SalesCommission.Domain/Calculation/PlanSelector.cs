using SalesCommission.Domain.Entities;

namespace SalesCommission.Domain.Calculation;

public static class PlanSelector
{
    /// <summary>
    /// Picks the plan for an employee on a date: role must match, and among plans whose region/channel
    /// are either empty or equal to the employee's, the most specific one wins.
    /// </summary>
    public static CommissionPlan? Select(IEnumerable<CommissionPlan> plans, Employee employee, DateOnly date) =>
        plans
            .Where(p => p.Role == employee.Role && p.IsEffectiveOn(date))
            .Where(p => p.RegionId is null || p.RegionId == employee.RegionId)
            .Where(p => p.ChannelId is null || p.ChannelId == employee.ChannelId)
            .OrderByDescending(p => (p.RegionId is null ? 0 : 1) + (p.ChannelId is null ? 0 : 1))
            .ThenByDescending(p => p.EffectiveFrom)
            .FirstOrDefault();
}
