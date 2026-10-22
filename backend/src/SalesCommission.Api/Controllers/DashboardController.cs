using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalesCommission.Domain;
using SalesCommission.Infrastructure.Persistence;

namespace SalesCommission.Api.Controllers;

public record DashboardGroupDto(string Name, int Employees, decimal PayoutUsd, decimal AverageAchievement);
public record DashboardDto(string PeriodCode, int Employees, int GateBlocked, decimal TotalPayoutUsd, decimal AveragePayoutUsd,
    decimal AverageAchievement, List<DashboardGroupDto> ByRole, List<DashboardGroupDto> ByRegion,
    List<DashboardGroupDto> ByPlan, List<int> AchievementBuckets);

[ApiController]
[Authorize(Roles = $"{Roles.Admin},{Roles.Finance},{Roles.Manager},{Roles.Supervisor}")]
[Route("api/dashboard")]
public class DashboardController(AppDbContext db) : ScopedControllerBase(db)
{
    [HttpGet]
    public async Task<ActionResult<DashboardDto>> Get([FromQuery] string period)
    {
        var p = await Db.Periods.AsNoTracking().SingleOrDefaultAsync(x => x.Code == period);
        if (p is null)
            return NotFound(new { message = $"Period {period} not found." });

        var rows = await ToSummary(await ScopeAsync(LatestResults(p.Id))).ToListAsync();
        if (rows.Count == 0)
            return new DashboardDto(period, 0, 0, 0, 0, 0, [], [], [], new List<int>(new int[6]));

        static List<DashboardGroupDto> Group(IEnumerable<IGrouping<string, ResultSummaryDto>> groups) =>
            groups.Select(g => new DashboardGroupDto(g.Key, g.Count(), g.Sum(x => x.PayoutUsd),
                Math.Round(g.Average(x => x.OverallAchievement), 4))).OrderByDescending(g => g.PayoutUsd).ToList();

        // 0-60%, 60-80%, 80-100%, 100-120%, 120-150%, 150%+
        decimal[] edges = [0.6m, 0.8m, 1.0m, 1.2m, 1.5m];
        var buckets = new int[6];
        foreach (var r in rows)
            buckets[edges.Count(e => r.OverallAchievement >= e)]++;

        return new DashboardDto(period, rows.Count, rows.Count(r => !r.GatePassed), rows.Sum(r => r.PayoutUsd),
            Math.Round(rows.Average(r => r.PayoutUsd), 2), Math.Round(rows.Average(r => r.OverallAchievement), 4),
            Group(rows.GroupBy(r => r.Role.ToString())), Group(rows.GroupBy(r => r.Region)), Group(rows.GroupBy(r => r.PlanName)),
            buckets.ToList());
    }
}
