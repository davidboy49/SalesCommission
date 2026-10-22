namespace SalesCommission.Domain.Entities;

/// <summary>
/// A commission plan version. Plans with the same <see cref="Code"/> but different effective
/// ranges are versions of one plan, so past periods always recalculate with the rules of their time.
/// </summary>
public class CommissionPlan
{
    public int Id { get; set; }
    public required string Code { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }

    // Eligibility: role is required; region and channel narrow the plan (more specific wins).
    public SalesRole Role { get; set; }
    public int? RegionId { get; set; }
    public Region? Region { get; set; }
    public int? ChannelId { get; set; }
    public Channel? Channel { get; set; }

    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public bool IsActive { get; set; } = true;

    public Currency PayoutCurrency { get; set; }
    /// <summary>Monthly variable pay at 100% achievement on every component.</summary>
    public decimal TargetIncentive { get; set; }

    /// <summary>Optional gate: if the KPI's actual value is below <see cref="GateMinValue"/>, nothing is paid.</summary>
    public KpiType? GateKpi { get; set; }
    public decimal? GateMinValue { get; set; }

    public List<PlanComponent> Components { get; set; } = [];

    public bool IsEffectiveOn(DateOnly date) =>
        IsActive && EffectiveFrom <= date && (EffectiveTo is null || EffectiveTo >= date);
}

public class PlanComponent
{
    public int Id { get; set; }
    public int PlanId { get; set; }
    public required string Name { get; set; }
    public KpiType KpiType { get; set; }
    /// <summary>Share of the target incentive, as a fraction (0.40 = 40%). Weights in a plan sum to 1.</summary>
    public decimal Weight { get; set; }
    public SalesBase SalesBase { get; set; } = SalesBase.NetOfReturns;
    /// <summary>Restricts volume/revenue/outlet KPIs to one brand (focus brand).</summary>
    public int? ProductGroupId { get; set; }
    public ProductGroup? ProductGroup { get; set; }
    /// <summary>True: linear between tier points. False: step (highest tier reached).</summary>
    public bool Interpolate { get; set; } = true;
    public List<PayoutTier> Tiers { get; set; } = [];
    public int SortOrder { get; set; }
}

/// <summary>A point on the payout curve: at <see cref="Achievement"/> pay <see cref="PayoutFactor"/> of the weighted incentive.</summary>
public class PayoutTier
{
    public int Id { get; set; }
    public int PlanComponentId { get; set; }
    public decimal Achievement { get; set; }
    public decimal PayoutFactor { get; set; }
}
