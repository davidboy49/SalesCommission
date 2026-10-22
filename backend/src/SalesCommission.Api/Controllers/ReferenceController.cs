using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalesCommission.Domain;
using SalesCommission.Infrastructure.Persistence;

namespace SalesCommission.Api.Controllers;

public record EmployeeDto(int Id, string Code, string FullName, SalesRole Role, string Region, string? Channel, string? Manager, bool IsActive);
public record TierDto(decimal Achievement, decimal PayoutFactor);
public record ComponentDto(string Name, KpiType Kpi, decimal Weight, SalesBase SalesBase, string? ProductGroup, bool Interpolate, List<TierDto> Tiers);
public record PlanDto(int Id, string Code, string Name, string? Description, SalesRole Role, string? Region, string? Channel,
    DateOnly EffectiveFrom, DateOnly? EffectiveTo, Currency PayoutCurrency, decimal TargetIncentive, KpiType? GateKpi,
    decimal? GateMinValue, List<ComponentDto> Components);

/// <summary>Read-only master data for the admin screens. Editing arrives with the next slice of Milestone 1.</summary>
[ApiController]
[Authorize(Roles = Roles.Office)]
[Route("api")]
public class ReferenceController(AppDbContext db) : ControllerBase
{
    [HttpGet("employees")]
    public async Task<List<EmployeeDto>> Employees() =>
        await db.Employees.AsNoTracking().OrderBy(e => e.Code)
            .Select(e => new EmployeeDto(e.Id, e.Code, e.FullName, e.Role, e.Region!.Name,
                e.Channel == null ? null : e.Channel.Name, e.Manager == null ? null : e.Manager.FullName, e.IsActive))
            .ToListAsync();

    [HttpGet("plans")]
    public async Task<List<PlanDto>> Plans()
    {
        var groups = await db.ProductGroups.AsNoTracking().ToDictionaryAsync(g => g.Id, g => g.Name);
        var plans = await db.Plans.AsNoTracking()
            .Include(p => p.Region).Include(p => p.Channel)
            .Include(p => p.Components).ThenInclude(c => c.Tiers)
            .OrderBy(p => p.Role).ThenBy(p => p.Code)
            .ToListAsync();

        return plans.Select(p => new PlanDto(p.Id, p.Code, p.Name, p.Description, p.Role, p.Region?.Name, p.Channel?.Name,
            p.EffectiveFrom, p.EffectiveTo, p.PayoutCurrency, p.TargetIncentive, p.GateKpi, p.GateMinValue,
            p.Components.OrderBy(c => c.SortOrder).Select(c => new ComponentDto(c.Name, c.KpiType, c.Weight, c.SalesBase,
                c.ProductGroupId is { } g ? groups.GetValueOrDefault(g) : null, c.Interpolate,
                c.Tiers.OrderBy(t => t.Achievement).Select(t => new TierDto(t.Achievement, t.PayoutFactor)).ToList())).ToList()))
            .ToList();
    }
}
