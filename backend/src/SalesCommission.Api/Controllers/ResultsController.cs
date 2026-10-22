using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalesCommission.Domain;
using SalesCommission.Infrastructure.Persistence;

namespace SalesCommission.Api.Controllers;

[ApiController]
[Authorize]
[Route("api")]
public class ResultsController(AppDbContext db) : ScopedControllerBase(db)
{
    /// <summary>Everyone the caller is allowed to see, for one period (admin, finance, manager, supervisor).</summary>
    [HttpGet("results")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Finance},{Roles.Manager},{Roles.Supervisor}")]
    public async Task<ActionResult<List<ResultSummaryDto>>> List([FromQuery] string period)
    {
        var p = await Db.Periods.AsNoTracking().SingleOrDefaultAsync(x => x.Code == period);
        if (p is null)
            return NotFound(new { message = $"Period {period} not found." });

        var scoped = await ScopeAsync(LatestResults(p.Id));
        return await ToSummary(scoped.OrderBy(r => r.Employee!.Code)).ToListAsync();
    }

    [HttpGet("results/{employeeId:int}")]
    public async Task<ActionResult<ResultDetailDto>> Detail(int employeeId, [FromQuery] string period) =>
        await LoadDetail(employeeId, period);

    /// <summary>The caller's own result — what the rep sees on their phone.</summary>
    [HttpGet("me/commission")]
    public async Task<ActionResult<ResultDetailDto>> Mine([FromQuery] string period)
    {
        if (CurrentEmployeeId is not { } me)
            return NotFound(new { message = "Your login is not linked to an employee." });
        return await LoadDetail(me, period);
    }

    [HttpGet("me/history")]
    public async Task<ActionResult<List<PayoutHistoryDto>>> History()
    {
        if (CurrentEmployeeId is not { } me)
            return NotFound(new { message = "Your login is not linked to an employee." });

        var latestRunIds = Db.CalculationRuns.GroupBy(r => r.PeriodId).Select(g => g.Max(r => r.Id));
        var rows = await Db.Results.AsNoTracking()
            .Where(r => r.EmployeeId == me && latestRunIds.Contains(r.CalculationRunId))
            .Select(r => new
            {
                Period = Db.Periods.Where(p => p.Id == r.PeriodId).Select(p => p.Code).First(),
                r.PayoutCurrency, r.Payout, r.PayoutUsd, r.OverallAchievement, r.GatePassed
            })
            .ToListAsync();
        return rows.OrderByDescending(r => r.Period)
            .Select(r => new PayoutHistoryDto(r.Period, r.PayoutCurrency, r.Payout, r.PayoutUsd, r.OverallAchievement, r.GatePassed))
            .ToList();
    }

    private async Task<ActionResult<ResultDetailDto>> LoadDetail(int employeeId, string periodCode)
    {
        var period = await Db.Periods.AsNoTracking().SingleOrDefaultAsync(x => x.Code == periodCode);
        if (period is null)
            return NotFound(new { message = $"Period {periodCode} not found." });

        // The scope filter is what stops a rep opening someone else's id.
        var scoped = (await ScopeAsync(LatestResults(period.Id))).Where(r => r.EmployeeId == employeeId);
        var summary = await ToSummary(scoped).SingleOrDefaultAsync();
        if (summary is null)
            return NotFound(new { message = "No result for this employee in the selected period." });

        var result = await scoped.Include(r => r.Lines).Include(r => r.Plan).SingleAsync();
        var groups = await Db.ProductGroups.AsNoTracking().ToDictionaryAsync(g => g.Id, g => g.Name);
        var lines = result.Lines.OrderBy(l => l.Id).Select(l => new ResultLineDto(
            l.ComponentName, l.KpiType, l.ProductGroupId is { } g ? groups.GetValueOrDefault(g) : null,
            l.Weight, l.Actual, l.Target, l.Achievement, l.PayoutFactor, l.Payout, l.KpiType.IsRate())).ToList();

        return new ResultDetailDto(summary, period.Code, result.Plan!.GateKpi, result.Plan.GateMinValue,
            result.GateActualValue, result.Plan.Description, lines);
    }
}
