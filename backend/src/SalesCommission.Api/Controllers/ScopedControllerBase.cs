using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalesCommission.Api.Services;
using SalesCommission.Domain.Entities;
using SalesCommission.Infrastructure.Persistence;

namespace SalesCommission.Api.Controllers;

/// <summary>Shared helpers: who is calling, and which employees' results they may see.</summary>
public abstract class ScopedControllerBase(AppDbContext db) : ControllerBase
{
    protected AppDbContext Db => db;

    protected int? CurrentEmployeeId =>
        int.TryParse(User.FindFirstValue(TokenService.EmployeeIdClaim), out var id) ? id : null;

    protected bool IsOffice => User.IsInRole(Roles.Admin) || User.IsInRole(Roles.Finance);

    /// <summary>
    /// Admin/Finance see everyone; a manager sees their region; a supervisor sees their team;
    /// anyone else (reps) only themselves.
    /// </summary>
    protected async Task<IQueryable<CommissionResult>> ScopeAsync(IQueryable<CommissionResult> results)
    {
        if (IsOffice)
            return results;

        var me = CurrentEmployeeId;
        if (me is null)
            return results.Where(_ => false);

        if (User.IsInRole(Roles.Manager))
        {
            var regionId = await db.Employees.Where(e => e.Id == me).Select(e => e.RegionId).SingleAsync();
            return results.Where(r => r.Employee!.RegionId == regionId);
        }
        if (User.IsInRole(Roles.Supervisor))
            return results.Where(r => r.Employee!.ManagerId == me);

        return results.Where(r => r.EmployeeId == me);
    }

    /// <summary>Results of the latest calculation run for a period.</summary>
    protected IQueryable<CommissionResult> LatestResults(int periodId)
    {
        var runId = db.CalculationRuns.Where(r => r.PeriodId == periodId)
            .OrderByDescending(r => r.Id).Select(r => (int?)r.Id).FirstOrDefault();
        return db.Results.AsNoTracking().Where(r => r.CalculationRunId == runId);
    }

    protected static IQueryable<ResultSummaryDto> ToSummary(IQueryable<CommissionResult> q) =>
        q.Select(r => new ResultSummaryDto(
            r.EmployeeId, r.Employee!.Code, r.Employee.FullName, r.Employee.Role, r.Employee.Region!.Name,
            r.Employee.Channel == null ? null : r.Employee.Channel.Name,
            r.Employee.Manager == null ? null : r.Employee.Manager.FullName,
            r.Plan!.Code, r.Plan.Name, r.PayoutCurrency, r.TargetIncentive, r.OverallAchievement, r.GatePassed,
            r.Payout, r.PayoutUsd));
}
