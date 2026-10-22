using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalesCommission.Infrastructure.Persistence;
using SalesCommission.Infrastructure.Services;

namespace SalesCommission.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/periods")]
public class PeriodsController(AppDbContext db, CommissionRunService runs) : ControllerBase
{
    [HttpGet]
    public async Task<List<PeriodDto>> List()
    {
        var periods = await db.Periods.AsNoTracking().OrderByDescending(p => p.StartDate).ToListAsync();
        var latestRuns = (await db.CalculationRuns.AsNoTracking().ToListAsync())
            .GroupBy(r => r.PeriodId).ToDictionary(g => g.Key, g => g.OrderByDescending(r => r.Id).First());

        return periods.Select(p =>
        {
            latestRuns.TryGetValue(p.Id, out var run);
            return new PeriodDto(p.Id, p.Code, p.StartDate, p.EndDate, p.Status, p.KhrPerUsd,
                run?.CompletedAtUtc, run?.TotalPayoutUsd, run?.EmployeeCount);
        }).ToList();
    }

    [HttpPost("{code}/calculate")]
    [Authorize(Roles = Roles.Office)]
    public async Task<ActionResult<PeriodDto>> Calculate(string code, CancellationToken ct)
    {
        try
        {
            var run = await runs.RunAsync(code, ct);
            var period = await db.Periods.AsNoTracking().SingleAsync(p => p.Id == run.PeriodId, ct);
            return new PeriodDto(period.Id, period.Code, period.StartDate, period.EndDate, period.Status, period.KhrPerUsd,
                run.CompletedAtUtc, run.TotalPayoutUsd, run.EmployeeCount);
        }
        catch (CommissionRunException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }
}
