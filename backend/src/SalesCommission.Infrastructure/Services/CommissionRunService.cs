using Microsoft.EntityFrameworkCore;
using SalesCommission.Domain;
using SalesCommission.Domain.Calculation;
using SalesCommission.Domain.Entities;
using SalesCommission.Infrastructure.Persistence;

namespace SalesCommission.Infrastructure.Services;

public class CommissionRunException(string message) : Exception(message);

/// <summary>Runs the monthly commission calculation for every employee that has an applicable plan.</summary>
public class CommissionRunService(AppDbContext db)
{
    /// <summary>Roles paid from their own activity. Supervisor/manager overrides arrive in Milestone 3.</summary>
    private static readonly SalesRole[] FieldRoles =
        [SalesRole.PreSales, SalesRole.VanSales, SalesRole.KeyAccount, SalesRole.Merchandiser];

    public async Task<CalculationRun> RunAsync(string periodCode, CancellationToken ct = default)
    {
        var period = await db.Periods.SingleOrDefaultAsync(p => p.Code == periodCode, ct)
            ?? throw new CommissionRunException($"Period {periodCode} does not exist.");
        if (period.Status == PeriodStatus.Locked)
            throw new CommissionRunException($"Period {periodCode} is locked and cannot be recalculated.");

        var started = DateTime.UtcNow;
        var start = period.StartDate;
        var end = period.EndDate;

        var plans = await db.Plans.AsNoTracking()
            .Include(p => p.Components).ThenInclude(c => c.Tiers)
            .ToListAsync(ct);
        var employees = await db.Employees.AsNoTracking()
            .Where(e => e.IsActive && FieldRoles.Contains(e.Role) && e.HireDate <= end)
            .ToListAsync(ct);

        var productGroups = await db.Products.AsNoTracking()
            .ToDictionaryAsync(p => p.Id, p => p.ProductGroupId, ct);

        var sales = (await db.SalesLines.AsNoTracking().Where(x => x.InvoiceDate >= start && x.InvoiceDate <= end).ToListAsync(ct))
            .ToLookup(x => x.EmployeeId);
        var returns = (await db.ReturnLines.AsNoTracking().Where(x => x.ReturnDate >= start && x.ReturnDate <= end).ToListAsync(ct))
            .ToLookup(x => x.EmployeeId);
        var collections = (await db.Collections.AsNoTracking().Where(x => x.CollectionDate >= start && x.CollectionDate <= end).ToListAsync(ct))
            .ToLookup(x => x.EmployeeId);
        var visits = (await db.Visits.AsNoTracking().Where(x => x.VisitDate >= start && x.VisitDate <= end).ToListAsync(ct))
            .ToLookup(x => x.EmployeeId);
        var audits = (await db.OutletAudits.AsNoTracking().Where(x => x.AuditDate >= start && x.AuditDate <= end).ToListAsync(ct))
            .ToLookup(x => x.EmployeeId);

        // "New outlet" KPIs need to know which outlets (and outlet+brand pairs) bought before this period.
        var earlier = await db.SalesLines.AsNoTracking()
            .Where(x => x.InvoiceDate < start)
            .Select(x => new { x.OutletId, x.ProductId })
            .Distinct()
            .ToListAsync(ct);
        var outletsWithEarlierSales = earlier.Select(x => x.OutletId).ToHashSet();
        var outletGroupsWithEarlierSales = earlier
            .Where(x => productGroups.ContainsKey(x.ProductId))
            .Select(x => (x.OutletId, ProductGroupId: productGroups[x.ProductId]))
            .ToHashSet();

        var targets = (await db.Targets.AsNoTracking().Where(t => t.PeriodId == period.Id).ToListAsync(ct))
            .ToLookup(t => t.EmployeeId);

        var run = new CalculationRun
        {
            PeriodId = period.Id,
            StartedAtUtc = started,
            KhrPerUsd = period.KhrPerUsd
        };

        foreach (var employee in employees)
        {
            var plan = PlanSelector.Select(plans, employee, end);
            if (plan is null)
                continue;

            var data = new EmployeePeriodData
            {
                Sales = sales[employee.Id].ToList(),
                Returns = returns[employee.Id].ToList(),
                Collections = collections[employee.Id].ToList(),
                Visits = visits[employee.Id].ToList(),
                Audits = audits[employee.Id].ToList(),
                OutletsWithEarlierSales = outletsWithEarlierSales,
                OutletGroupsWithEarlierSales = outletGroupsWithEarlierSales,
                ProductGroupByProductId = productGroups,
                KhrPerUsd = period.KhrPerUsd
            };

            var employeeTargets = targets[employee.Id].ToList();
            decimal? Lookup(KpiType kpi, int? group) =>
                employeeTargets.FirstOrDefault(t => t.KpiType == kpi && t.ProductGroupId == group)?.Value;

            var result = CommissionCalculator.Calculate(plan, data, Lookup);
            result.PeriodId = period.Id;
            result.EmployeeId = employee.Id;
            run.Results.Add(result);
        }

        run.EmployeeCount = run.Results.Count;
        run.TotalPayoutUsd = run.Results.Sum(r => r.PayoutUsd);
        run.CompletedAtUtc = DateTime.UtcNow;

        db.CalculationRuns.Add(run);
        if (period.Status == PeriodStatus.Open)
            period.Status = PeriodStatus.Calculated;
        await db.SaveChangesAsync(ct);
        return run;
    }
}
