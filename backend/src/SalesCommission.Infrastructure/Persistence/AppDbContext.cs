using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using SalesCommission.Domain.Entities;

namespace SalesCommission.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : IdentityDbContext<AppUser>(options)
{
    public DbSet<Region> Regions => Set<Region>();
    public DbSet<Channel> Channels => Set<Channel>();
    public DbSet<ProductGroup> ProductGroups => Set<ProductGroup>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<Outlet> Outlets => Set<Outlet>();

    public DbSet<SalesLine> SalesLines => Set<SalesLine>();
    public DbSet<ReturnLine> ReturnLines => Set<ReturnLine>();
    public DbSet<Collection> Collections => Set<Collection>();
    public DbSet<Visit> Visits => Set<Visit>();
    public DbSet<OutletAudit> OutletAudits => Set<OutletAudit>();

    public DbSet<CommissionPlan> Plans => Set<CommissionPlan>();
    public DbSet<PlanComponent> PlanComponents => Set<PlanComponent>();
    public DbSet<PayoutTier> PayoutTiers => Set<PayoutTier>();

    public DbSet<Period> Periods => Set<Period>();
    public DbSet<Target> Targets => Set<Target>();
    public DbSet<CalculationRun> CalculationRuns => Set<CalculationRun>();
    public DbSet<CommissionResult> Results => Set<CommissionResult>();
    public DbSet<CommissionResultLine> ResultLines => Set<CommissionResultLine>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);

        b.Entity<Region>().HasIndex(x => x.Code).IsUnique();
        b.Entity<Channel>().HasIndex(x => x.Code).IsUnique();
        b.Entity<ProductGroup>().HasIndex(x => x.Code).IsUnique();
        b.Entity<Product>().HasIndex(x => x.Sku).IsUnique();
        b.Entity<Product>().Property(x => x.PricePerCaseUsd).HasPrecision(18, 4);
        b.Entity<Outlet>().HasIndex(x => x.Code).IsUnique();

        b.Entity<Employee>(e =>
        {
            e.HasIndex(x => x.Code).IsUnique();
            e.Property(x => x.Role).HasConversion<string>().HasMaxLength(32);
            e.HasOne(x => x.Manager).WithMany().HasForeignKey(x => x.ManagerId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<SalesLine>(e =>
        {
            e.Property(x => x.Currency).HasConversion<string>().HasMaxLength(3);
            e.Property(x => x.QuantityCases).HasPrecision(18, 4);
            e.Property(x => x.Amount).HasPrecision(18, 4);
            e.HasIndex(x => new { x.EmployeeId, x.InvoiceDate });
            e.HasIndex(x => new { x.OutletId, x.InvoiceDate });
        });
        b.Entity<ReturnLine>(e =>
        {
            e.Property(x => x.Currency).HasConversion<string>().HasMaxLength(3);
            e.Property(x => x.QuantityCases).HasPrecision(18, 4);
            e.Property(x => x.Amount).HasPrecision(18, 4);
            e.HasIndex(x => new { x.EmployeeId, x.ReturnDate });
        });
        b.Entity<Collection>(e =>
        {
            e.Property(x => x.Currency).HasConversion<string>().HasMaxLength(3);
            e.Property(x => x.Amount).HasPrecision(18, 4);
            e.HasIndex(x => new { x.EmployeeId, x.CollectionDate });
        });
        b.Entity<Visit>().HasIndex(x => new { x.EmployeeId, x.VisitDate });
        b.Entity<OutletAudit>().HasIndex(x => new { x.EmployeeId, x.AuditDate });

        b.Entity<CommissionPlan>(e =>
        {
            e.HasIndex(x => x.Code);
            e.Property(x => x.Role).HasConversion<string>().HasMaxLength(32);
            e.Property(x => x.PayoutCurrency).HasConversion<string>().HasMaxLength(3);
            e.Property(x => x.GateKpi).HasConversion<string>().HasMaxLength(32);
            e.Property(x => x.TargetIncentive).HasPrecision(18, 4);
            e.Property(x => x.GateMinValue).HasPrecision(18, 4);
            e.HasMany(x => x.Components).WithOne().HasForeignKey(x => x.PlanId).OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<PlanComponent>(e =>
        {
            e.Property(x => x.KpiType).HasConversion<string>().HasMaxLength(32);
            e.Property(x => x.SalesBase).HasConversion<string>().HasMaxLength(32);
            e.Property(x => x.Weight).HasPrecision(9, 4);
            e.HasMany(x => x.Tiers).WithOne().HasForeignKey(x => x.PlanComponentId).OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<PayoutTier>(e =>
        {
            e.Property(x => x.Achievement).HasPrecision(9, 4);
            e.Property(x => x.PayoutFactor).HasPrecision(9, 4);
        });

        b.Entity<Period>(e =>
        {
            e.HasIndex(x => x.Code).IsUnique();
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(16);
            e.Property(x => x.KhrPerUsd).HasPrecision(18, 4);
        });
        b.Entity<Target>(e =>
        {
            e.Property(x => x.KpiType).HasConversion<string>().HasMaxLength(32);
            e.Property(x => x.Value).HasPrecision(18, 4);
            e.HasIndex(x => new { x.PeriodId, x.EmployeeId });
        });

        b.Entity<CalculationRun>(e =>
        {
            e.Property(x => x.TotalPayoutUsd).HasPrecision(18, 2);
            e.Property(x => x.KhrPerUsd).HasPrecision(18, 4);
            e.HasMany(x => x.Results).WithOne().HasForeignKey(x => x.CalculationRunId).OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<CommissionResult>(e =>
        {
            e.Property(x => x.PayoutCurrency).HasConversion<string>().HasMaxLength(3);
            e.Property(x => x.TargetIncentive).HasPrecision(18, 4);
            e.Property(x => x.OverallAchievement).HasPrecision(9, 4);
            e.Property(x => x.GateActualValue).HasPrecision(18, 4);
            e.Property(x => x.Payout).HasPrecision(18, 4);
            e.Property(x => x.PayoutUsd).HasPrecision(18, 2);
            e.HasIndex(x => new { x.PeriodId, x.EmployeeId });
            e.HasMany(x => x.Lines).WithOne().HasForeignKey(x => x.CommissionResultId).OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<CommissionResultLine>(e =>
        {
            e.Property(x => x.KpiType).HasConversion<string>().HasMaxLength(32);
            foreach (var p in new[] { nameof(CommissionResultLine.Weight), nameof(CommissionResultLine.Actual),
                         nameof(CommissionResultLine.Target), nameof(CommissionResultLine.Achievement),
                         nameof(CommissionResultLine.PayoutFactor), nameof(CommissionResultLine.Payout) })
                e.Property(p).HasPrecision(18, 4);
        });
    }
}
